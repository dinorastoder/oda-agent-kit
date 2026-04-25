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

// ---------------------------------------------------------------------------
// Cart planning
// ---------------------------------------------------------------------------

/** The source that triggered inclusion of an item in a CartPlan. */
export type CartPlanItemSource =
  | 'order_history'
  | 'saved_list'
  | 'recipe'
  | 'explicit_request'
  | 'substitute'
  | 'staple_rule'
  | 'current_cart';

/** A single item in a proposed cart plan. */
export interface CartPlanItem {
  productId: number;
  name: string;
  brand: string | null;
  quantity: number;
  /** Why this item was included in the plan. */
  source: CartPlanItemSource;
  /** Human-readable explanation suitable for confirmation messages. */
  reason: string;
}

/** A proposed cart plan — no real cart is mutated when this is created. */
export interface CartPlan {
  items: CartPlanItem[];
  /** Short summary suitable for agent confirmation messages. */
  summary: string;
}

/** Input required to build a CartPlan. */
export interface CartPlanInput {
  /** Raw orders used to derive household staples. */
  orders: OdaOrder[];
  /** Saved shopping lists to pull items from. */
  savedLists?: OdaShoppingList[];
  /** Items explicitly requested by the user. */
  explicitRequests?: Array<{
    productId: number;
    name: string;
    brand: string | null;
    quantity: number;
  }>;
  /** Override the default staple qualification rule. */
  stapleRule?: StapleRule;
  /** Maximum number of most-recent orders to consider for staple detection. */
  lookback?: number;
}

/** Result of comparing the current cart to the household's usual purchases. */
export interface CartComparison {
  /** Items in the current cart that the household normally buys. */
  usual: CartPlanItem[];
  /** Items the household normally buys that are NOT in the current cart. */
  missing: CartPlanItem[];
  /** Items in the current cart that are not part of the household's usual purchases. */
  extra: CartPlanItem[];
}

/** Frequency category for a household staple product. */
export type FrequencyCategory = 'weekly' | 'biweekly' | 'monthly' | 'occasional';

/** Normalized order item derived from an OdaOrder. */
export interface OrderItem {
  productId: number;
  name: string;
  brand: string | null;
  quantity: number;
  /** Line price in minor currency units (e.g. øre for NOK). */
  linePriceMinorUnits: number;
}

/** Normalized order derived from an OdaOrder. */
export interface Order {
  id: number;
  status: string;
  deliveryDate: string;
  /** Total price in minor currency units (e.g. øre for NOK). */
  totalPriceMinorUnits: number;
  currency: string;
  items: OrderItem[];
}

/** Household preference for a product, derived from order history analysis. */
export interface HouseholdPreference {
  productId: number;
  name: string;
  brand: string | null;
  averageQuantity: number;
  /** Number of orders in the analysed window that contained this product. */
  orderCount: number;
  frequency: FrequencyCategory;
  /** 0–1 confidence score based on how consistently the product appears across orders. */
  confidence: number;
  /** Human-readable explanation, e.g. "Bought in 8 of last 10 orders". */
  reason: string;
}

/** Rule that configures which products qualify as household staples. */
export interface StapleRule {
  /** Minimum number of orders in which the product must appear. */
  minOrderCount: number;
  /** Minimum ratio of appearances to total orders (0–1). */
  minFrequencyRatio: number;
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
