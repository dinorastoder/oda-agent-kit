import { OdaClient, OdaApiError } from '../client';
import type { OdaHttpClient, OdaHttpResponse, OdaSessionStore } from '../types';
import cartFixture from './fixtures/cart.json';
import productListDetailFixture from './fixtures/product-list-detail.json';
import productListsPageFixture from './fixtures/product-lists-page.json';
import searchResponseFixture from './fixtures/search-response.json';

function createJsonResponse(body: unknown, status = 200, cookies: Record<string, string> = {}): OdaHttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    getCookies: jest.fn(() => cookies),
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

  it('stores the session token from login response cookies', async () => {
    const httpClient: OdaHttpClient = {
      request: jest.fn(async () =>
        createJsonResponse({}, 200, { sessionid: 'session-cookie-value', csrftoken: 'csrf-abc' }),
      ),
    };
    const sessionStore: OdaSessionStore = {
      getSessionToken: jest.fn(() => null),
      setSessionToken: jest.fn(),
      clearSessionToken: jest.fn(),
      getCsrfToken: jest.fn(() => null),
      setCsrfToken: jest.fn(),
      clearCsrfToken: jest.fn(),
    };
    const client = new OdaClient({
      credentials: { email: 'test@example.com', password: 'secret' },
      httpClient,
      sessionStore,
    });

    await client.login();

    // Login POSTs to /user/login/ (no prefetch call since httpClient has no prefetch method)
    expect(httpClient.request).toHaveBeenCalledTimes(1);
    expect((httpClient.request as jest.Mock).mock.calls[0][0]).toMatchObject({
      method: 'POST',
      path: '/user/login/',
    });
    expect(sessionStore.setSessionToken).toHaveBeenCalledWith('session-cookie-value');
    expect(sessionStore.setCsrfToken).toHaveBeenCalledWith('csrf-abc');
  });

  it('throws OdaApiError when login response lacks a sessionid cookie', async () => {
    const httpClient: OdaHttpClient = {
      request: jest.fn(async () =>
        // 200 OK but no sessionid in cookies
        createJsonResponse({}, 200, { csrftoken: 'csrf-only' }),
      ),
    };
    const client = new OdaClient({
      credentials: { email: 'test@example.com', password: 'secret' },
      httpClient,
    });

    await expect(client.login()).rejects.toThrow(OdaApiError);
    await expect(client.login()).rejects.toThrow('missing session cookie');
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
    // cart fixture is in the real API format (groups[]); getCart() normalises it
    expect(cart.items[0]?.quantity).toBe(2);
    expect(httpClient.request).toHaveBeenCalledTimes(2);
  });

  it('retrieves product-list summaries from the live saved-lists endpoint', async () => {
    const httpClient: OdaHttpClient = {
      request: jest.fn(async () => createJsonResponse(productListsPageFixture)),
    };
    const client = new OdaClient({ httpClient });

    const lists = await client.getProductLists();

    expect(lists).toEqual([
      expect.objectContaining({
        id: 430128,
        name: 'Standard groceries',
        number_of_products: 13,
      }),
    ]);
    expect(httpClient.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/product-lists/?filter=product_lists&sort=default&size=50&page=1',
    }));
  });

  it('hydrates saved shopping lists from product-list detail endpoints', async () => {
    const httpClient: OdaHttpClient = {
      request: jest.fn(async ({ path }) => {
        if (path === '/product-lists/?filter=product_lists&sort=default&size=50&page=1') {
          return createJsonResponse(productListsPageFixture);
        }

        if (path === '/product-lists/430128/') {
          return createJsonResponse(productListDetailFixture);
        }

        throw new Error(`Unexpected path: ${path}`);
      }),
    };
    const client = new OdaClient({ httpClient });

    const lists = await client.getShoppingLists();

    expect(lists).toHaveLength(1);
    expect(lists[0]).toEqual(expect.objectContaining({
      id: 430128,
      name: 'Standard groceries',
    }));
    expect(lists[0]?.items[0]?.product.full_name).toBe('Tine Lettmelk 0,5% fett');
    expect(httpClient.request).toHaveBeenCalledTimes(2);
  });
});
