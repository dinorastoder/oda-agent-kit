/**
 * Read-only tools for the Oda shopping assistant.
 *
 * These tools are ENABLED by default. They do not mutate any state and are
 * safe to invoke without explicit user confirmation.
 *
 * Tools exposed:
 *  - searchProducts   — search the Oda product catalogue
 *  - getCart          — read the current shopping cart
 *  - getOrders        — read paginated order history
 *  - getDeliverySlots — list available delivery time slots
 *  - getShoppingLists — list the user's saved shopping lists
 *
 * Higher-level helpers (buildShoppingList, analyseOrderHistory,
 * findCheapestDeliverySlot) are implemented in plugin.ts and compose
 * these primitives without performing any writes.
 */

import type { OdaClient, OdaSearchResponse, OdaCart, OdaPage, OdaOrder, OdaDeliverySlot } from '@oda-agent/core';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Parameters for the searchProducts tool. */
export interface SearchProductsParams {
  query: string;
}

/** Parameters for the browseCatalog tool. */
export interface BrowseCatalogParams {
  query: string;
  limit?: number;
}

/** A compact search result for UI-facing catalog browsing. */
export interface CatalogBrowseResult {
  query: string;
  totalMatches: number;
  products: Array<{
    productId: number;
    name: string;
    brand: string | null;
    price: string;
    currency: string;
    available: boolean;
  }>;
}

/** Parameters for the getOrders tool. */
export interface GetOrdersParams {
  /** Page number, 1-based. Defaults to 1. */
  page?: number;
}

interface SavedListLike {
  id: number;
  name: string;
  items: unknown[];
}

type OdaClientWithShoppingLists = {
  getShoppingLists?: () => Promise<SavedListLike[]>;
};

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * Search the Oda catalogue for products matching `query`.
 * Returns the raw search response including matched products and result count.
 */
export async function searchProducts(
  client: OdaClient,
  params: SearchProductsParams,
): Promise<OdaSearchResponse> {
  return client.searchProducts(params.query);
}

/**
 * Search the Oda catalogue and return a compact, UI-friendly result list.
 */
export async function browseCatalog(
  client: OdaClient,
  params: BrowseCatalogParams,
): Promise<CatalogBrowseResult> {
  const response = await client.searchProducts(params.query);
  const limit = params.limit ?? 5;

  return {
    query: response.query,
    totalMatches: response.count,
    products: response.results.slice(0, limit).map((product) => ({
      productId: product.id,
      name: product.full_name,
      brand: product.brand,
      price: product.gross_price,
      currency: product.currency,
      available: product.is_available,
    })),
  };
}

/**
 * Retrieve the authenticated user's current shopping cart.
 */
export async function getCart(client: OdaClient): Promise<OdaCart> {
  return client.getCart();
}

/**
 * Fetch a page of the authenticated user's past orders.
 */
export async function getOrders(
  client: OdaClient,
  params: GetOrdersParams = {},
): Promise<OdaPage<OdaOrder>> {
  return client.getOrders(params.page ?? 1);
}

/**
 * List all delivery time slots, both available and unavailable.
 */
export async function getDeliverySlots(client: OdaClient): Promise<OdaDeliverySlot[]> {
  return client.getDeliverySlots();
}

/**
 * List the authenticated user's saved shopping lists.
 */
export async function getShoppingLists(client: OdaClient): Promise<SavedListLike[]> {
  const clientWithLists = client as OdaClientWithShoppingLists;

  if (typeof clientWithLists.getShoppingLists !== 'function') {
    return [];
  }

  return clientWithLists.getShoppingLists();
}
