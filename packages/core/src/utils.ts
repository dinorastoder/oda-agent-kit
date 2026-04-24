export const DEFAULT_BASE_URL = 'https://oda.com/api/v1';

/** Build a full API URL from a path segment. */
export function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const segment = path.startsWith('/') ? path : `/${path}`;
  return `${base}${segment}`;
}
