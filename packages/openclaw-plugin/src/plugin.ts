import type { OdaCart, OdaClient, OdaDeliverySlot, OdaProduct } from '@oda-agent/core';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A named shopping list with a list of product IDs and desired quantities. */
export interface ShoppingList {
  name: string;
  items: Array<{ productId: number; quantity: number }>;
}

/** A user-friendly summary of a cart item. */
export interface CartOverviewItem {
  productId: number;
  name: string;
  quantity: number;
  linePrice: string;
  available: boolean;
}

/** A compact cart summary for UI-facing tools. */
export interface CartOverview {
  itemCount: number;
  totalPrice: string;
  currency: string;
  items: CartOverviewItem[];
}

/** A compact saved-list summary for UI-facing tools. */
export interface SavedListOverview {
  id: number;
  name: string;
  itemCount: number;
}

/** A compact product frequency summary. */
export interface FrequentProductOverview {
  productId: number;
  name: string;
  brand: string | null;
  timesOrdered: number;
}

/** A compact delivery-slot summary. */
export interface DeliverySlotOverview {
  id: number;
  start: string;
  end: string;
  price: string;
  currency: string;
}

/** Options for the reviewAccount helper. */
export interface ReviewAccountOptions {
  includeCart?: boolean;
  includeSavedLists?: boolean;
  includeOrderHistory?: boolean;
  includeDelivery?: boolean;
  maxHistoryPages?: number;
  maxSavedLists?: number;
  maxDeliverySlots?: number;
}

/** User-facing account review returned by the OpenClaw tool. */
export interface AccountReview {
  cart?: CartOverview;
  savedLists?: SavedListOverview[];
  orderHistory?: {
    totalOrders: number;
    totalSpend: string;
    currency: string;
    mostOrderedProducts: FrequentProductOverview[];
  };
  delivery?: {
    availableSlotCount: number;
    cheapestSlot?: DeliverySlotOverview;
    upcomingSlots: DeliverySlotOverview[];
  };
}

/** A single request supplied to the grocery planner. */
export interface GroceryRequest {
  query: string;
  quantity?: number;
}

/** A matched request in the grocery planner output. */
export interface PlannedGroceryItem {
  query: string;
  quantity: number;
  productId: number;
  productName: string;
  brand: string | null;
  price: string;
  currency: string;
}

/** A request that could not be matched to a product. */
export interface UnmatchedGroceryRequest {
  query: string;
  quantity: number;
}

/** User-facing grocery plan returned by the OpenClaw tool. */
export interface GroceryPlan {
  name: string;
  shoppingList: ShoppingList;
  matchedItems: PlannedGroceryItem[];
  unmatchedItems: UnmatchedGroceryRequest[];
  summary: string;
}

/** Summary of a user's order history. */
export interface OrderHistorySummary {
  totalOrders: number;
  totalSpend: string;
  currency: string;
  mostOrderedProducts: Array<{ product: OdaProduct; timesOrdered: number }>;
}

/** The OpenClaw plugin object returned by the factory. */
export interface OpenClawPlugin {
  /**
   * Search the current account state in one call for day-to-day planning.
   */
  reviewAccount(options?: ReviewAccountOptions): Promise<AccountReview>;

  /**
   * Build a user-facing grocery plan from free-text requests.
   */
  planGroceries(name: string, requests: GroceryRequest[]): Promise<GroceryPlan>;

  /**
   * Search for products and build a shopping list from a plain-text description.
   * Returns a list of matched products ready to add to cart.
   */
  buildShoppingList(name: string, items: Array<{ query: string; quantity: number }>): Promise<ShoppingList>;

  /**
   * Analyse the user's past orders and return a summary.
   */
  analyseOrderHistory(maxPages?: number): Promise<OrderHistorySummary>;

  /**
   * Prepare the cart from a shopping list — adds all items in one call.
   */
  prepareCart(list: ShoppingList): Promise<void>;

  /**
   * Find the cheapest available delivery slot.
   * Returns undefined if no slots are available.
   */
  findCheapestDeliverySlot(): Promise<
    { id: number; start: string; end: string; price: string; currency: string } | undefined
  >;
}

interface ResolvedShoppingRequests {
  items: ShoppingList['items'];
  matchedItems: PlannedGroceryItem[];
  unmatchedItems: UnmatchedGroceryRequest[];
}

interface SavedListLike {
  id: number;
  name: string;
  items: unknown[];
}

type OdaClientWithShoppingLists = {
  getShoppingLists?: () => Promise<SavedListLike[]>;
};

function summarizeCart(cart: OdaCart): CartOverview {
  return {
    itemCount: cart.item_count,
    totalPrice: cart.total_price,
    currency: cart.currency,
    items: cart.items.map((item) => ({
      productId: item.product.id,
      name: item.product.full_name,
      quantity: item.quantity,
      linePrice: item.line_price,
      available: item.product.is_available,
    })),
  };
}

function summarizeSavedLists(lists: SavedListLike[], maxSavedLists: number): SavedListOverview[] {
  return lists.slice(0, maxSavedLists).map((list) => ({
    id: list.id,
    name: list.name,
    itemCount: list.items.length,
  }));
}

async function loadShoppingLists(client: OdaClient): Promise<SavedListLike[]> {
  const clientWithLists = client as OdaClientWithShoppingLists;

  if (typeof clientWithLists.getShoppingLists !== 'function') {
    return [];
  }

  return clientWithLists.getShoppingLists();
}

function summarizeDeliverySlots(slots: OdaDeliverySlot[], maxDeliverySlots: number): AccountReview['delivery'] {
  const available = slots
    .filter((slot) => slot.is_available)
    .sort((left, right) => parseFloat(left.price) - parseFloat(right.price));

  return {
    availableSlotCount: available.length,
    cheapestSlot: available[0]
      ? {
          id: available[0].id,
          start: available[0].start,
          end: available[0].end,
          price: available[0].price,
          currency: available[0].currency,
        }
      : undefined,
    upcomingSlots: available.slice(0, maxDeliverySlots).map((slot) => ({
      id: slot.id,
      start: slot.start,
      end: slot.end,
      price: slot.price,
      currency: slot.currency,
    })),
  };
}

async function resolveShoppingRequests(
  client: OdaClient,
  requests: GroceryRequest[],
): Promise<ResolvedShoppingRequests> {
  const items: ShoppingList['items'] = [];
  const matchedItems: PlannedGroceryItem[] = [];
  const unmatchedItems: UnmatchedGroceryRequest[] = [];

  for (const request of requests) {
    const quantity = request.quantity ?? 1;
    const results = await client.searchProducts(request.query);
    const first = results.results[0];

    if (!first) {
      unmatchedItems.push({ query: request.query, quantity });
      continue;
    }

    items.push({ productId: first.id, quantity });
    matchedItems.push({
      query: request.query,
      quantity,
      productId: first.id,
      productName: first.full_name,
      brand: first.brand,
      price: first.gross_price,
      currency: first.currency,
    });
  }

  return {
    items,
    matchedItems,
    unmatchedItems,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an OpenClaw plugin that wraps an authenticated OdaClient.
 *
 * @example
 * ```ts
 * const client = new OdaClient({ credentials: { email, password } });
 * await client.login();
 * const plugin = createOpenClawPlugin(client);
 * const list = await plugin.buildShoppingList('Weekly shop', [
 *   { query: 'oat milk', quantity: 2 },
 *   { query: 'sourdough bread', quantity: 1 },
 * ]);
 * await plugin.prepareCart(list);
 * ```
 */
export function createOpenClawPlugin(client: OdaClient): OpenClawPlugin {
  async function analyseOrderHistory(maxPages = 5): Promise<OrderHistorySummary> {
    const productCounts = new Map<number, { product: OdaProduct; count: number }>();
    let totalOrders = 0;
    let totalSpendCents = 0;
    let currency = 'NOK';

    for (let page = 1; page <= maxPages; page++) {
      const orderPage = await client.getOrders(page);
      if (orderPage.results.length === 0) break;

      totalOrders += orderPage.results.length;

      for (const order of orderPage.results) {
        currency = order.currency;
        totalSpendCents += Math.round(parseFloat(order.total_price) * 100);

        for (const item of order.items) {
          const existing = productCounts.get(item.product.id);
          if (existing) {
            existing.count += item.quantity;
          } else {
            productCounts.set(item.product.id, { product: item.product, count: item.quantity });
          }
        }
      }

      if (!orderPage.next) break;
    }

    const sorted = [...productCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ product, count }) => ({ product, timesOrdered: count }));

    return {
      totalOrders,
      totalSpend: (totalSpendCents / 100).toFixed(2),
      currency,
      mostOrderedProducts: sorted,
    };
  }

  async function buildShoppingList(name: string, items: Array<{ query: string; quantity: number }>): Promise<ShoppingList> {
    const resolved = await resolveShoppingRequests(client, items);
    return { name, items: resolved.items };
  }

  async function findCheapestDeliverySlot(): Promise<
    { id: number; start: string; end: string; price: string; currency: string } | undefined
  > {
    const slots = await client.getDeliverySlots();
    const available = slots.filter((slot: OdaDeliverySlot) => slot.is_available);
    if (available.length === 0) return undefined;

    return available.sort((left: OdaDeliverySlot, right: OdaDeliverySlot) => parseFloat(left.price) - parseFloat(right.price))[0];
  }

  return {
    async reviewAccount(options = {}) {
      const {
        includeCart = true,
        includeSavedLists = true,
        includeOrderHistory = true,
        includeDelivery = true,
        maxHistoryPages = 5,
        maxSavedLists = 5,
        maxDeliverySlots = 3,
      } = options;

      const review: AccountReview = {};

      if (includeCart) {
        review.cart = summarizeCart(await client.getCart());
      }

      if (includeSavedLists) {
        review.savedLists = summarizeSavedLists(await loadShoppingLists(client), maxSavedLists);
      }

      if (includeOrderHistory) {
        const summary = await analyseOrderHistory(maxHistoryPages);
        review.orderHistory = {
          totalOrders: summary.totalOrders,
          totalSpend: summary.totalSpend,
          currency: summary.currency,
          mostOrderedProducts: summary.mostOrderedProducts.map(({ product, timesOrdered }) => ({
            productId: product.id,
            name: product.full_name,
            brand: product.brand,
            timesOrdered,
          })),
        };
      }

      if (includeDelivery) {
        review.delivery = summarizeDeliverySlots(await client.getDeliverySlots(), maxDeliverySlots);
      }

      return review;
    },

    async planGroceries(name, requests) {
      const resolved = await resolveShoppingRequests(client, requests);

      return {
        name,
        shoppingList: {
          name,
          items: resolved.items,
        },
        matchedItems: resolved.matchedItems,
        unmatchedItems: resolved.unmatchedItems,
        summary: `Matched ${resolved.matchedItems.length} request(s) and left ${resolved.unmatchedItems.length} unmatched.`,
      };
    },

    buildShoppingList,

    analyseOrderHistory,

    async prepareCart(list) {
      for (const item of list.items) {
        await client.addToCart(item.productId, item.quantity);
      }
    },

    findCheapestDeliverySlot,
  };
}
