import { API_BASE_URL } from '@/lib/api-config';

export async function getWikiSuburbDescription(suburb: string | null, state: string | null): Promise<string | null> {
  if (!suburb || !state) return null;
  try {
    const params = new URLSearchParams({
      suburb: suburb,
      state: state
    });
    
    const response = await fetch(`${API_BASE_URL}/api/wikipedia/suburb-description?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.description || null;
    } else {
      const errorData = await response.json();
      console.error('API error:', errorData.error);
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch suburb description:', error);
    return null;
  }
}
