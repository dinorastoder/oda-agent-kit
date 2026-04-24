import type { OdaClient, OdaProduct, OdaDeliverySlot } from '@oda-agent/core';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A named shopping list with a list of product IDs and desired quantities. */
export interface ShoppingList {
  name: string;
  items: Array<{ productId: number; quantity: number }>;
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
  return {
    async buildShoppingList(name, items) {
      const resolved: ShoppingList['items'] = [];

      for (const item of items) {
        const results = await client.searchProducts(item.query);
        const first = results.results[0];
        if (first) {
          resolved.push({ productId: first.id, quantity: item.quantity });
        }
      }

      return { name, items: resolved };
    },

    async analyseOrderHistory(maxPages = 5) {
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
    },

    async prepareCart(list) {
      for (const item of list.items) {
        await client.addToCart(item.productId, item.quantity);
      }
    },

    async findCheapestDeliverySlot() {
      const slots = await client.getDeliverySlots();
      const available = slots.filter((s: OdaDeliverySlot) => s.is_available);
      if (available.length === 0) return undefined;

      return available.sort((a: OdaDeliverySlot, b: OdaDeliverySlot) => parseFloat(a.price) - parseFloat(b.price))[0];
    },
  };
}
