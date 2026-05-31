import { z } from 'zod';
import {
  createOdaPageSchema,
  normalizeCart,
  OdaDeliverySlotSchema,
  OdaOrderSchema,
  OdaProductListDetailSchema,
  OdaProductListSummaryPageSchema,
  OdaProductSchema,
  OdaRawCartSchema,
  OdaSearchResponseSchema,
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
  OdaProductListSummary,
  OdaProduct,
  OdaSearchResponse,
  OdaSessionStore,
  OdaShoppingList,
} from './types.js';

const DEFAULT_CSRF_PAGE_URL = 'https://oda.com/no/user/login/';

/** node-fetch v3 Headers augmentation for the non-standard `raw()` method. */
interface NodeFetchHeadersWithRaw {
  raw?(): Record<string, string[]>;
}

type FetchResponse = Awaited<ReturnType<typeof import('node-fetch')['default']>>;

class InMemorySessionStore implements OdaSessionStore {
  private token: string | null = null;
  private csrf: string | null = null;

  getSessionToken(): string | null {
    return this.token;
  }

  setSessionToken(token: string): void {
    this.token = token;
  }

  clearSessionToken(): void {
    this.token = null;
  }

  getCsrfToken(): string | null {
    return this.csrf;
  }

  setCsrfToken(token: string): void {
    this.csrf = token;
  }

  clearCsrfToken(): void {
    this.csrf = null;
  }
}

/**
 * Cookie-aware HTTP client for the Oda API.
 *
 * Maintains an internal cookie jar populated from `Set-Cookie` response headers.
 * All requests automatically include the tracked cookies, and POST/DELETE
 * requests also include the `X-CSRFToken` header required by Oda's Django backend.
 *
 * Call `prefetch(url)` before `login()` to acquire the initial CSRF token by
 * loading the Oda login page.
 */
class NodeFetchHttpClient implements OdaHttpClient {
  private readonly cookieJar: Map<string, string> = new Map();

  constructor(private readonly baseUrl: string) {}

  /** GET `url` to seed the cookie jar (e.g. to acquire a CSRF token). */
  async prefetch(url: string): Promise<void> {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; oda-agent-kit)',
        'Accept-Language': 'no,nb;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    this.parseCookies(response as unknown as FetchResponse);
  }

  /** Return the current CSRF token from the cookie jar, or null. */
  getCsrfToken(): string | null {
    return this.cookieJar.get('csrftoken') ?? null;
  }

  private parseCookies(response: FetchResponse): void {
    // node-fetch v3: use raw() if available, else fall back to forEach
    const rawHeaders = (response.headers as NodeFetchHeadersWithRaw).raw?.();
    const setCookieValues: string[] = rawHeaders?.['set-cookie'] ?? [];

    if (setCookieValues.length === 0) {
      response.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() === 'set-cookie') {
          setCookieValues.push(value);
        }
      });
    }

    for (const cookieStr of setCookieValues) {
      const parts = cookieStr.split(';');
      const nameValue = parts[0] ?? '';
      const eqIdx = nameValue.indexOf('=');
      if (eqIdx > 0) {
        const name = nameValue.substring(0, eqIdx).trim();
        const val = nameValue.substring(eqIdx + 1).trim();
        this.cookieJar.set(name, val);
      }
    }
  }

  private buildCookieHeader(extra: Record<string, string> = {}): string {
    const merged = new Map(this.cookieJar);
    for (const [k, v] of Object.entries(extra)) {
      merged.set(k, v);
    }
    return Array.from(merged.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async request(req: OdaHttpRequest): Promise<OdaHttpResponse> {
    const { default: fetch } = await import('node-fetch');

    const url = req.path.startsWith('http') ? req.path : buildUrl(this.baseUrl, req.path);

    const headers: Record<string, string> = { ...req.headers };

    const cookieHeader = this.buildCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // Mutations require the CSRF token both in the Cookie header and as X-CSRFToken
    const csrf = this.getCsrfToken();
    if (csrf && req.method !== 'GET') {
      headers['X-CSRFToken'] = csrf;
    }

    const response = await fetch(url, {
      method: req.method,
      headers,
      body: req.body,
    });

    this.parseCookies(response as unknown as FetchResponse);

    // Capture cookie snapshot for the caller
    const cookieSnapshot: Record<string, string> = Object.fromEntries(this.cookieJar);

    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.json() as Promise<unknown>,
      getCookies: () => cookieSnapshot,
    };
  }
}

/**
 * HTTP client for the Oda grocery API.
 *
 * Handles session-based authentication (cookie + CSRF) and exposes typed
 * methods for products, cart management, order history, shopping lists, and
 * delivery slots.
 *
 * Inspired by the working implementation in gbbirkisson/mcp-oda.
 */
export class OdaClient {
  private readonly credentials: OdaCredentials | undefined;
  private readonly httpClient: OdaHttpClient;
  private readonly sessionStore: OdaSessionStore;
  private readonly csrfPageUrl: string;

  constructor(private readonly config: OdaClientConfig) {
    this.credentials = config.credentials;
    this.httpClient = config.httpClient ?? new NodeFetchHttpClient(config.baseUrl ?? DEFAULT_BASE_URL);
    this.sessionStore = config.sessionStore ?? new InMemorySessionStore();
    this.csrfPageUrl = config.csrfPageUrl ?? DEFAULT_CSRF_PAGE_URL;
  }

  /**
   * Authenticate with the Oda API and store the session token.
   *
   * Uses Oda's cookie-based login flow:
   * 1. GETs the login page (if the HTTP client supports `prefetch`) to acquire
   *    an initial CSRF token.
   * 2. POSTs credentials to `/user/login/` with `X-CSRFToken` header.
   * 3. Extracts the `sessionid` cookie from the response and stores it.
   *
   * Call this before any authenticated method.
   */
  async login(): Promise<void> {
    if (!this.credentials) {
      throw new Error('Credentials are required to login.');
    }

    // Step 1: acquire CSRF token by loading the login page (NodeFetchHttpClient only)
    const cookieCapableClient = this.httpClient as { prefetch?: (url: string) => Promise<void>; getCsrfToken?: () => string | null };
    if (typeof cookieCapableClient.prefetch === 'function') {
      await cookieCapableClient.prefetch(this.csrfPageUrl);
      const csrf = cookieCapableClient.getCsrfToken?.();
      if (csrf) {
        this.sessionStore.setCsrfToken?.(csrf);
      }
    }

    // Step 2: POST credentials — the real Oda API uses `username` (not `email`)
    const response = await this.httpClient.request({
      method: 'POST',
      path: '/user/login/',
      headers: this.mutationHeaders(),
      body: JSON.stringify({
        username: this.credentials.email,
        password: this.credentials.password,
      }),
    });

    if (!response.ok) {
      throw await this.createApiError('/user/login/', response, 'Login failed');
    }

    // Step 3: persist session identity from response cookies
    const cookies = response.getCookies?.();
    if (!cookies) {
      throw await this.createApiError('/user/login/', response, 'Login failed: missing response cookies');
    }

    const sessionId = cookies['sessionid'];
    if (!sessionId) {
      throw await this.createApiError('/user/login/', response, 'Login failed: missing session cookie');
    }

    this.sessionStore.setSessionToken(sessionId);

    if (cookies['csrftoken']) {
      this.sessionStore.setCsrfToken?.(cookies['csrftoken']);
    }
  }

  /** Remove the stored session token. */
  logout(): void {
    this.sessionStore.clearSessionToken();
    this.sessionStore.clearCsrfToken?.();
  }

  /** Search for products by query string. */
  async searchProducts(query: string): Promise<OdaSearchResponse> {
    const response = await this.get(`/search/?q=${encodeURIComponent(query)}`, OdaSearchResponseSchema);
    // The new API format does not echo the query back; return a new object with it injected.
    return response.query ? response : { ...response, query };
  }

  /** Get a single product by its ID. */
  async getProduct(productId: number): Promise<OdaProduct> {
    return this.get(`/products/${productId}/`, OdaProductSchema);
  }

  /** Retrieve the current cart. */
  async getCart(): Promise<OdaCart> {
    const raw = await this.get('/cart/', OdaRawCartSchema);
    return normalizeCart(raw);
  }

  /**
   * Add a product to the cart or update its quantity.
   *
   * The Oda cart API accepts `{items: [{product_id, quantity}]}` and returns
   * the full updated cart. This method normalises the response and returns the
   * matching cart item for the added product.
   */
  async addToCart(productId: number, quantity: number): Promise<OdaCartItem> {
    const raw = await this.post(
      '/cart/items/',
      { items: [{ product_id: productId, quantity }] },
      OdaRawCartSchema,
    );
    const cart = normalizeCart(raw);
    const item = cart.items.find((i) => i.product.id === productId);
    if (!item) {
      throw new OdaApiError(
        500,
        `POST /cart/items/ succeeded but product ${productId} was not found in the returned cart`,
      );
    }
    return item;
  }

  /**
   * Remove a product from the cart by its product ID.
   *
   * Sets the item's quantity to 0 via the Oda cart items endpoint, which
   * causes the API to remove the line item entirely.
   *
   * @param productId - The Oda product ID (i.e. `cart.items[].product.id`).
   */
  async removeFromCart(productId: number): Promise<void> {
    await this.post(
      '/cart/items/',
      { items: [{ product_id: productId, quantity: 0 }] },
      OdaRawCartSchema,
    );
  }

  /** Clear all items from the cart. */
  async clearCart(): Promise<void> {
    const response = await this.httpClient.request({
      method: 'POST',
      path: '/cart/clear/',
      headers: this.mutationHeaders(),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw await this.createApiError('/cart/clear/', response, 'Clear cart failed');
    }
  }

  /** List past orders with optional pagination. */
  async getOrders(page = 1): Promise<OdaPage<OdaOrder>> {
    return this.get(`/orders/?page=${page}`, createOdaPageSchema(OdaOrderSchema));
  }

  /** Get a single order by its ID. */
  async getOrder(orderId: number): Promise<OdaOrder> {
    return this.get(`/orders/${orderId}/`, OdaOrderSchema);
  }

  /** List product-list summaries from the live Oda saved-lists endpoint. */
  async getProductLists(page = 1, size = 50): Promise<OdaProductListSummary[]> {
    const response = await this.get(
      `/product-lists/?filter=product_lists&sort=default&size=${size}&page=${page}`,
      OdaProductListSummaryPageSchema,
    );

    return response.results;
  }

  /** Get a single saved-list detail from the live product-lists endpoint. */
  async getProductList(listId: number): Promise<OdaShoppingList> {
    return this.get(`/product-lists/${listId}/`, OdaProductListDetailSchema);
  }

  /** List saved shopping lists. */
  async getShoppingLists(): Promise<OdaShoppingList[]> {
    const lists = await this.getProductLists();
    return Promise.all(lists.map((list) => this.getProductList(list.id)));
  }

  /** List available delivery slots. */
  async getDeliverySlots(): Promise<OdaDeliverySlot[]> {
    return this.get('/delivery-slots/', z.array(OdaDeliverySlotSchema));
  }

  private readHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; oda-agent-kit)',
      'Accept-Language': 'no,nb;q=0.9,en;q=0.8',
    };

    const cookieParts: string[] = [];
    const sessionToken = this.sessionStore.getSessionToken();
    if (sessionToken) {
      cookieParts.push(`sessionid=${sessionToken}`);
    }
    const csrfToken = this.sessionStore.getCsrfToken?.();
    if (csrfToken) {
      cookieParts.push(`csrftoken=${csrfToken}`);
    }
    if (cookieParts.length > 0) {
      headers['Cookie'] = cookieParts.join('; ');
    }

    return headers;
  }

  private mutationHeaders(): Record<string, string> {
    const headers = this.readHeaders();
    const csrfToken = this.sessionStore.getCsrfToken?.();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
      headers['Origin'] = 'https://oda.com';
      headers['Referer'] = 'https://oda.com/no/';
    }
    return headers;
  }

  private async get<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
    const response = await this.httpClient.request({
      method: 'GET',
      path,
      headers: this.readHeaders(),
    });
    return this.parseResponse(path, response, schema);
  }

  private async post<T>(path: string, body: unknown, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
    const response = await this.httpClient.request({
      method: 'POST',
      path,
      headers: this.mutationHeaders(),
      body: JSON.stringify(body),
    });
    return this.parseResponse(path, response, schema);
  }

  private async parseResponse<T>(path: string, response: OdaHttpResponse, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
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
