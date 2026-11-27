import { API_BASE_URL } from '@/lib/api-config';

export async function getWikiSuburbDescription(suburb: string | null, state: string | null): Promise<string | null> {
  if (!suburb || !state) return null;
  
  // 1. First try the backend endpoint
  try {
    const params = new URLSearchParams({
      suburb: suburb,
      state: state
    });
    
    const response = await fetch(`${API_BASE_URL}/wikipedia/suburb-description?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.description && data.description.trim().length > 0) {
        return data.description.trim();
      }
    } else {
      console.warn('Backend wikipedia endpoint returned non-200, trying direct Wikipedia API fallback...');
    }
  } catch (error) {
    console.warn('Backend wikipedia call failed, trying direct Wikipedia API fallback...', error);
  }

  // 2. Direct fallback to Wikipedia API with origin=* for CORS support
  try {
    const STATE_FULL_MAP: Record<string, string> = {
      'NSW': 'New South Wales',
      'VIC': 'Victoria',
      'QLD': 'Queensland',
      'SA': 'South Australia',
      'WA': 'Western Australia',
      'TAS': 'Tasmania',
      'ACT': 'Australian Capital Territory',
      'NT': 'Northern Territory'
    };

    const cleanSub = suburb
      .replace(/\s*,?\s*(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)(?:\s+\d{4})?\s*$/i, '')
      .replace(/\s+\d{4}\s*$/, '')
      .trim();
    const cleanState = state.trim().toUpperCase();
    const fullState = STATE_FULL_MAP[cleanState] || state.trim();

    const candidates = [
      `${cleanSub}, ${fullState}`,
      cleanSub
    ];

    for (const title of candidates) {
      const directUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&redirects=1&origin=*`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const data = await res.json();
        const pages = data?.query?.pages || {};
        for (const pid of Object.keys(pages)) {
          if (pid !== '-1' && !pages[pid].missing) {
            let ext = pages[pid].extract;
            if (ext && ext.length > 40) {
              ext = ext.replace(/\s*\(\s*(?:\/[^)]+\/|[A-Za-z0-9\s\-əˈˌ\.\:\(\)]*|\s*)\)/g, '');
              ext = ext.replace(/\[\s*(?:\d+|note\s*\d+|citation needed)\s*\]/gi, '');
              ext = ext.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
              return ext;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Direct Wikipedia API fallback error:', err);
  }

  return null;
}
