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

export interface OdaProductImage {
  thumbnail: { url: string };
  small_thumbnail: { url: string };
  large_thumbnail: { url: string };
}

export interface OdaDiscount {
  percentage: number;
  description: string;
  undiscounted_gross_price: string;
}

export interface OdaAvailability {
  is_available: boolean;
  description: string | null;
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

/** A past order. */
export interface OdaOrder {
  id: number;
  status: string;
  delivery_date: string;
  total_price: string;
  currency: string;
  items: OdaOrderItem[];
}

export interface OdaOrderItem {
  product: OdaProduct;
  quantity: number;
  line_price: string;
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

/** Configuration options for the OdaClient. */
export interface OdaClientConfig {
  credentials: OdaCredentials;
  /** Override the base API URL. Defaults to https://oda.com/api/v1 */
  baseUrl?: string;
}

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
