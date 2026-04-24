import { buildUrl, DEFAULT_BASE_URL } from '../utils';

describe('buildUrl', () => {
  it('joins base URL and path', () => {
    expect(buildUrl('https://oda.com/api/v1', '/search/')).toBe(
      'https://oda.com/api/v1/search/',
    );
  });

  it('handles trailing slash on base URL', () => {
    expect(buildUrl('https://oda.com/api/v1/', '/search/')).toBe(
      'https://oda.com/api/v1/search/',
    );
  });

  it('handles path without leading slash', () => {
    expect(buildUrl('https://oda.com/api/v1', 'search/')).toBe(
      'https://oda.com/api/v1/search/',
    );
  });

  it('exports DEFAULT_BASE_URL', () => {
    expect(DEFAULT_BASE_URL).toBe('https://oda.com/api/v1');
  });
});
