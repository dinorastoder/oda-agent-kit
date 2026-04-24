import { z } from 'zod';
import {
  createOdaPageSchema,
  OdaCartItemSchema,
  OdaCartSchema,
  OdaDeliverySlotSchema,
  OdaLoginResponseSchema,
  OdaOrderSchema,
  OdaProductSchema,
  OdaSearchResponseSchema,
  OdaShoppingListSchema,
} from './schemas.js';
import { buildUrl, DEFAULT_BASE_URL } from './utils.js';
import type {
  OdaCart,
  OdaCartItem,
  OdaClientConfig,
  OdaCredentials,
  OdaDeliverySlot,
  OdaHttpClient,
  OdaHttpRequest,
  OdaHttpResponse,
  OdaOrder,
  OdaPage,
  OdaProduct,
  OdaSearchResponse,
  OdaSessionStore,
  OdaShoppingList,
} from './types.js';

type FetchResponse = Awaited<ReturnType<typeof import('node-fetch')['default']>>;

class InMemorySessionStore implements OdaSessionStore {
  private token: string | null = null;

  getSessionToken(): string | null {
    return this.token;
  }

  setSessionToken(token: string): void {
    this.token = token;
  }

  clearSessionToken(): void {
    this.token = null;
  }
}

class NodeFetchHttpClient implements OdaHttpClient {
  constructor(private readonly baseUrl: string) {}

  async request(request: OdaHttpRequest): Promise<OdaHttpResponse> {
    const { default: fetch } = await import('node-fetch');
    const response: FetchResponse = await fetch(buildUrl(this.baseUrl, request.path), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.json() as Promise<unknown>,
    };
  }
}

/**
 * HTTP client for the Oda grocery API.
 *
 * Handles session-based authentication and exposes typed methods for
 * products, cart management, order history, shopping lists, and delivery slots.
 */
export class OdaClient {
  private readonly credentials: OdaCredentials | undefined;
  private readonly httpClient: OdaHttpClient;
  private readonly sessionStore: OdaSessionStore;

  constructor(private readonly config: OdaClientConfig) {
    this.credentials = config.credentials;
    this.httpClient = config.httpClient ?? new NodeFetchHttpClient(config.baseUrl ?? DEFAULT_BASE_URL);
    this.sessionStore = config.sessionStore ?? new InMemorySessionStore();
  }

  /**
   * Authenticate with the Oda API and store the session token.
   * Call this before any other method when credentials are required.
   */
  async login(): Promise<void> {
    if (!this.credentials) {
      throw new Error('Credentials are required to login.');
    }

    const response = await this.post('/auth/token/', {
      email: this.credentials.email,
      password: this.credentials.password,
    }, OdaLoginResponseSchema);
    this.sessionStore.setSessionToken(response.token);
  }

  /** Remove the stored session token. */
  logout(): void {
    this.sessionStore.clearSessionToken();
  }

  /** Search for products by query string. */
  async searchProducts(query: string): Promise<OdaSearchResponse> {
    return this.get(`/search/?q=${encodeURIComponent(query)}`, OdaSearchResponseSchema);
  }

  /** Get a single product by its ID. */
  async getProduct(productId: number): Promise<OdaProduct> {
    return this.get(`/products/${productId}/`, OdaProductSchema);
  }

  /** Retrieve the current cart. */
  async getCart(): Promise<OdaCart> {
    return this.get('/cart/', OdaCartSchema);
  }

  /** Add a product to the cart or update its quantity. */
  async addToCart(productId: number, quantity: number): Promise<OdaCartItem> {
    return this.post('/cart/items/', { product_id: productId, quantity }, OdaCartItemSchema);
  }

  /** Remove an item from the cart. */
  async removeFromCart(itemId: number): Promise<void> {
    await this.delete(`/cart/items/${itemId}/`);
  }

  /** Clear all items from the cart. */
  async clearCart(): Promise<void> {
    await this.delete('/cart/');
  }

  /** List past orders with optional pagination. */
  async getOrders(page = 1): Promise<OdaPage<OdaOrder>> {
    return this.get(`/orders/?page=${page}`, createOdaPageSchema(OdaOrderSchema));
  }

  /** Get a single order by its ID. */
  async getOrder(orderId: number): Promise<OdaOrder> {
    return this.get(`/orders/${orderId}/`, OdaOrderSchema);
  }

  /** List saved shopping lists. */
  async getShoppingLists(): Promise<OdaShoppingList[]> {
    return this.get('/shopping-lists/', z.array(OdaShoppingListSchema));
  }

  /** List available delivery slots. */
  async getDeliverySlots(): Promise<OdaDeliverySlot[]> {
    return this.get('/delivery-slots/', z.array(OdaDeliverySlotSchema));
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const sessionToken = this.sessionStore.getSessionToken();
    if (sessionToken) {
      headers['Authorization'] = `Token ${sessionToken}`;
    }
    return headers;
  }

  private async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const response = await this.httpClient.request({
      method: 'GET',
      path,
      headers: this.headers(),
    });
    return this.parseResponse(path, response, schema);
  }

  private async post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    const response = await this.httpClient.request({
      method: 'POST',
      path,
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return this.parseResponse(path, response, schema);
  }

  private async delete(path: string): Promise<void> {
    const response = await this.httpClient.request({
      method: 'DELETE',
      path,
      headers: this.headers(),
    });

    if (!response.ok) {
      throw await this.createApiError(path, response, `DELETE ${path} failed`);
    }
  }

  private async parseResponse<T>(path: string, response: OdaHttpResponse, schema: z.ZodType<T>): Promise<T> {
    if (!response.ok) {
      throw await this.createApiError(path, response, `HTTP ${response.status}`);
    }

    const json = await response.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new OdaSchemaError(path, parsed.error.issues);
    }

    return parsed.data;
  }

  private async createApiError(path: string, response: OdaHttpResponse, fallbackMessage: string): Promise<OdaApiError> {
    let message = fallbackMessage;

    try {
      const body = await response.json();
      if (body && typeof body === 'object') {
        const payload = body as Record<string, unknown>;
        if (typeof payload['detail'] === 'string') {
          message = payload['detail'];
        }
      }
    } catch {
      // Ignore response parsing errors while preserving the original HTTP failure.
    }

    return new OdaApiError(response.status, `${path}: ${message}`);
  }
}

/** Thrown when the Oda API returns a non-2xx status code. */
export class OdaApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'OdaApiError';
  }
}

/** Thrown when an Oda API response does not match the expected schema. */
export class OdaSchemaError extends Error {
  constructor(
    public readonly path: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(`Invalid Oda API response for ${path}`);
    this.name = 'OdaSchemaError';
  }
}
