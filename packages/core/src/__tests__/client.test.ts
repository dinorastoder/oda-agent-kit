import { OdaClient } from '../client';
import type { OdaHttpClient, OdaHttpResponse, OdaSessionStore } from '../types';
import cartFixture from './fixtures/cart.json';
import searchResponseFixture from './fixtures/search-response.json';

function createJsonResponse(body: unknown, status = 200): OdaHttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
  };
}

describe('OdaClient', () => {
  it('does not make network calls in the constructor', () => {
    const httpClient: OdaHttpClient = {
      request: jest.fn(),
    };

    new OdaClient({
      credentials: { email: 'test@example.com', password: 'secret' },
      httpClient,
    });

    expect(httpClient.request).not.toHaveBeenCalled();
  });

  it('stores the session token on login', async () => {
    const httpClient: OdaHttpClient = {
      request: jest.fn(async () => createJsonResponse({ token: 'session-token' })),
    };
    const sessionStore: OdaSessionStore = {
      getSessionToken: jest.fn(() => null),
      setSessionToken: jest.fn(),
      clearSessionToken: jest.fn(),
    };
    const client = new OdaClient({
      credentials: { email: 'test@example.com', password: 'secret' },
      httpClient,
      sessionStore,
    });

    await client.login();

    expect(httpClient.request).toHaveBeenCalledTimes(1);
    expect(sessionStore.setSessionToken).toHaveBeenCalledWith('session-token');
  });

  it('parses typed responses through the configured HTTP client', async () => {
    const httpClient: OdaHttpClient = {
      request: jest.fn(async ({ path }) => {
        if (path === '/search/?q=oat%20milk') {
          return createJsonResponse(searchResponseFixture);
        }

        return createJsonResponse(cartFixture);
      }),
    };
    const client = new OdaClient({
      httpClient,
    });

    const searchResponse = await client.searchProducts('oat milk');
    const cart = await client.getCart();

    expect(searchResponse.results[0]?.id).toBe(123);
    expect(cart.items[0]?.quantity).toBe(2);
    expect(httpClient.request).toHaveBeenCalledTimes(2);
  });
});
