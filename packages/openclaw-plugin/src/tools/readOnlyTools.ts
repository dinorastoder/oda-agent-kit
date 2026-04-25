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

import type { OdaClient, OdaSearchResponse, OdaCart, OdaPage, OdaOrder, OdaDeliverySlot, OdaShoppingList } from '@oda-agent/core';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Parameters for the searchProducts tool. */
export interface SearchProductsParams {
  query: string;
}

/** Parameters for the getOrders tool. */
export interface GetOrdersParams {
  /** Page number, 1-based. Defaults to 1. */
  page?: number;
}

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
export async function getShoppingLists(client: OdaClient): Promise<OdaShoppingList[]> {
  return client.getShoppingLists();
}
