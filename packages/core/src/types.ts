/** Oda product image variant. */
export interface OdaProductImageAsset {
  url: string;
}

/** Oda product images. */
export interface OdaProductImage {
  thumbnail: OdaProductImageAsset;
  small_thumbnail: OdaProductImageAsset;
  large_thumbnail: OdaProductImageAsset;
}

/** Product discount metadata. */
export interface OdaDiscount {
  percentage: number;
  description: string;
  undiscounted_gross_price: string;
}

/** Availability information for a product. */
export interface OdaAvailability {
  is_available: boolean;
  description: string | null;
}

/** Oda product as returned by the search and product detail endpoints. */
export interface OdaProduct {
  id: number;
  full_name: string;
  brand: string | null;
  name: string;
  front_url: string;
  gross_price: string;
  gross_unit_price: string;
  unit_price_quantity_abbreviation: string;
  unit_price_quantity_name: string;
  currency: string;
  is_available: boolean;
  is_sponsored: boolean;
  promoted_product: boolean;
  images: OdaProductImage[];
  discount: OdaDiscount | null;
  availability: OdaAvailability;
}

/** A single item in the shopping cart. */
export interface OdaCartItem {
  id: number;
  product: OdaProduct;
  quantity: number;
  line_price: string;
}

/** The full cart object. */
export interface OdaCart {
  id: number;
  items: OdaCartItem[];
  total_price: string;
  currency: string;
  item_count: number;
}

/** A single item in a past order. */
export interface OdaOrderItem {
  product: OdaProduct;
  quantity: number;
  line_price: string;
}

/** A past order. */
export interface OdaOrder {
  id: number;
  status: string;
  delivery_date: string;
  total_price: string;
  currency: string;
  items: OdaOrderItem[];
}

/** A saved shopping list item. */
export interface OdaShoppingListItem {
  product: OdaProduct;
  quantity: number;
}

/** A saved shopping list. */
export interface OdaShoppingList {
  id: number;
  name: string;
  items: OdaShoppingListItem[];
}

/** A delivery time slot. */
export interface OdaDeliverySlot {
  id: number;
  start: string;
  end: string;
  price: string;
  currency: string;
  is_available: boolean;
}

/** Credentials for authenticating with the Oda API. */
export interface OdaCredentials {
  email: string;
  password: string;
}

/** Supported HTTP methods for the Oda client. */
export type OdaHttpMethod = 'GET' | 'POST' | 'DELETE';

/** Low-level HTTP request used by the Oda client abstraction. */
export interface OdaHttpRequest {
  method: OdaHttpMethod;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Low-level HTTP response used by the Oda client abstraction. */
export interface OdaHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/** HTTP client abstraction for Oda API requests. */
export interface OdaHttpClient {
  request(request: OdaHttpRequest): Promise<OdaHttpResponse>;
}

/** Session storage abstraction used by the Oda client. */
export interface OdaSessionStore {
  getSessionToken(): string | null;
  setSessionToken(token: string): void;
  clearSessionToken(): void;
}

/** Configuration options for the OdaClient. */
export interface OdaClientOptions {
  credentials?: OdaCredentials;
  /** Override the base API URL. Defaults to https://oda.com/api/v1 */
  baseUrl?: string;
  /** Override the HTTP transport used by the client. */
  httpClient?: OdaHttpClient;
  /** Override how the client stores session tokens. */
  sessionStore?: OdaSessionStore;
}

/** Backwards-compatible alias for OdaClient construction options. */
export type OdaClientConfig = OdaClientOptions;

/** Pagination wrapper returned by list endpoints. */
export interface OdaPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Search results response. */
export interface OdaSearchResponse {
  results: OdaProduct[];
  count: number;
  query: string;
}
