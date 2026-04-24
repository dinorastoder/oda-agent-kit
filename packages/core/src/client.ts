import { buildUrl, DEFAULT_BASE_URL } from './utils.js';
import type {
  OdaClientConfig,
  OdaCart,
  OdaCartItem,
  OdaDeliverySlot,
  OdaOrder,
  OdaPage,
  OdaProduct,
  OdaSearchResponse,
} from './types.js';

/**
 * HTTP client for the Oda grocery API.
 *
 * Handles session-based authentication and exposes typed methods for
 * products, cart management, order history, and delivery slots.
 */
export class OdaClient {
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;
  private sessionToken: string | null = null;

  constructor(config: OdaClientConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.email = config.credentials.email;
    this.password = config.credentials.password;
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  /**
   * Authenticate with the Oda API and store the session token.
   * Call this before any other method.
   */
  async login(): Promise<void> {
    const res = await this.post<{ token: string }>('/auth/token/', {
      email: this.email,
      password: this.password,
    });
    this.sessionToken = res.token;
  }

  /** Remove the stored session token. */
  logout(): void {
    this.sessionToken = null;
  }

  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------

  /** Search for products by query string. */
  async searchProducts(query: string): Promise<OdaSearchResponse> {
    return this.get<OdaSearchResponse>(`/search/?q=${encodeURIComponent(query)}`);
  }

  /** Get a single product by its ID. */
  async getProduct(productId: number): Promise<OdaProduct> {
    return this.get<OdaProduct>(`/products/${productId}/`);
  }

  // ---------------------------------------------------------------------------
  // Cart
  // ---------------------------------------------------------------------------

  /** Retrieve the current cart. */
  async getCart(): Promise<OdaCart> {
    return this.get<OdaCart>('/cart/');
  }

  /** Add a product to the cart or update its quantity. */
  async addToCart(productId: number, quantity: number): Promise<OdaCartItem> {
    return this.post<OdaCartItem>('/cart/items/', { product_id: productId, quantity });
  }

  /** Remove an item from the cart. */
  async removeFromCart(itemId: number): Promise<void> {
    await this.delete(`/cart/items/${itemId}/`);
  }

  /** Clear all items from the cart. */
  async clearCart(): Promise<void> {
    await this.delete('/cart/');
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  /** List past orders with optional pagination. */
  async getOrders(page = 1): Promise<OdaPage<OdaOrder>> {
    return this.get<OdaPage<OdaOrder>>(`/orders/?page=${page}`);
  }

  /** Get a single order by its ID. */
  async getOrder(orderId: number): Promise<OdaOrder> {
    return this.get<OdaOrder>(`/orders/${orderId}/`);
  }

  // ---------------------------------------------------------------------------
  // Delivery slots
  // ---------------------------------------------------------------------------

  /** List available delivery slots. */
  async getDeliverySlots(): Promise<OdaDeliverySlot[]> {
    return this.get<OdaDeliverySlot[]>('/delivery-slots/');
  }

  // ---------------------------------------------------------------------------
  // Private HTTP helpers
  // ---------------------------------------------------------------------------

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.sessionToken) {
      headers['Authorization'] = `Token ${this.sessionToken}`;
    }
    return headers;
  }

  private async get<T>(path: string): Promise<T> {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(buildUrl(this.baseUrl, path), {
      method: 'GET',
      headers: this.headers(),
    });
    return this.parseResponse<T>(res);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(buildUrl(this.baseUrl, path), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return this.parseResponse<T>(res);
  }

  private async delete(path: string): Promise<void> {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(buildUrl(this.baseUrl, path), {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new OdaApiError(res.status, `DELETE ${path} failed`);
    }
  }

  private async parseResponse<T>(res: Awaited<ReturnType<typeof import('node-fetch')['default']>>): Promise<T> {
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as Record<string, unknown>;
        if (typeof body['detail'] === 'string') {
          message = body['detail'];
        }
      } catch {
        // ignore JSON parse errors
      }
      throw new OdaApiError(res.status, message);
    }
    return res.json() as Promise<T>;
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
