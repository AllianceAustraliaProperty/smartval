/**
 * centralized api configuration
 */

export function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  // in browser, handle localhost vs remote host
  if (typeof window !== 'undefined') {
    const isLocalhostHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalhostHost) {
      if (envUrl && /^https?:\/\//.test(envUrl)) {
        return envUrl.replace(/\/+$/, '');
      }
      return 'http://localhost:5000/api';
    }

    if (!envUrl || envUrl.startsWith('/')) {
      return (envUrl || '/api').replace(/\/+$/, '');
    }

    try {
      const parsed = new URL(envUrl, window.location.origin);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return '/api';
      }
      return envUrl.replace(/\/+$/, '');
    } catch {
      return '/api';
    }
  }

  // server-side fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }

  return (envUrl || '/api').replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * helper to resolve endpoint against api base url
 */
export function getApiUrl(endpoint: string): string {
  const base = resolveApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}
