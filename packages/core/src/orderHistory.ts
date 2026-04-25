import type {
  FrequencyCategory,
  HouseholdPreference,
  OdaOrder,
  Order,
  OrderItem,
  StapleRule,
} from './types.js';

/** Default staple rule: product must appear in at least 2 orders and ≥20% of orders. */
const DEFAULT_STAPLE_RULE: StapleRule = {
  minOrderCount: 2,
  minFrequencyRatio: 0.2,
};

/** Convert a decimal price string (e.g. "19.90") to integer minor units (e.g. 1990). */
function priceToMinorUnits(price: string): number {
  const normalizedPrice = price.trim();

  if (!/^\d+(?:\.\d+)?$/.test(normalizedPrice)) {
    throw new Error(`Invalid price string: "${price}"`);
  }

  const value = Number(normalizedPrice);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid price value: "${price}"`);
  }

  return Math.round(value * 100);
}

/** Normalize a raw API order into the domain Order model. */
export function normalizeOrder(raw: OdaOrder): Order {
  const items: OrderItem[] = raw.items.map((item) => ({
    productId: item.product.id,
    name: item.product.full_name,
    brand: item.product.brand,
    quantity: item.quantity,
    linePriceMinorUnits: priceToMinorUnits(item.line_price),
  }));

  return {
    id: raw.id,
    status: raw.status,
    deliveryDate: raw.delivery_date,
    totalPriceMinorUnits: priceToMinorUnits(raw.total_price),
    currency: raw.currency,
    items,
  };
}

/** Map a frequency ratio to a FrequencyCategory label. */
function toFrequencyCategory(ratio: number): FrequencyCategory {
  if (ratio >= 0.75) return 'weekly';
  if (ratio >= 0.5) return 'biweekly';
  if (ratio >= 0.25) return 'monthly';
  return 'occasional';
}

/**
 * Analyse a list of raw Oda orders and return per-product household preferences.
 *
 * Products are aggregated across all provided orders. The result is sorted by
 * confidence (descending) so the most reliable staples appear first.
 *
 * @param rawOrders - Raw orders as returned by the Oda API.
 * @returns Deterministic list of household preferences, one per unique product.
 */
export function analyzeOrderHistory(rawOrders: OdaOrder[]): HouseholdPreference[] {
  if (rawOrders.length === 0) return [];

  const totalOrders = rawOrders.length;

  interface Accumulator {
    productId: number;
    name: string;
    brand: string | null;
    totalQuantity: number;
    orderCount: number;
  }

  const byProduct = new Map<number, Accumulator>();

  for (const raw of rawOrders) {
    // Use a Set to count each product only once per order (multiple line items
    // for the same product in a single order are collapsed into one appearance).
    const seenInOrder = new Set<number>();

    for (const item of raw.items) {
      const id = item.product.id;
      const existing = byProduct.get(id);

      if (existing) {
        existing.totalQuantity += item.quantity;
        if (!seenInOrder.has(id)) {
          existing.orderCount += 1;
        }
      } else {
        byProduct.set(id, {
          productId: id,
          name: item.product.full_name,
          brand: item.product.brand,
          totalQuantity: item.quantity,
          orderCount: 1,
        });
      }

      seenInOrder.add(id);
    }
  }

  const preferences: HouseholdPreference[] = [];

  for (const acc of byProduct.values()) {
    const ratio = acc.orderCount / totalOrders;
    const confidence = Math.round(ratio * 100) / 100;
    const frequency = toFrequencyCategory(ratio);
    const averageQuantity = Math.round((acc.totalQuantity / acc.orderCount) * 100) / 100;

    preferences.push({
      productId: acc.productId,
      name: acc.name,
      brand: acc.brand,
      averageQuantity,
      orderCount: acc.orderCount,
      frequency,
      confidence,
      reason: `Bought in ${acc.orderCount} of last ${totalOrders} orders`,
    });
  }

  // Sort by confidence descending, then by productId ascending for determinism.
  preferences.sort((a, b) => {
    const diff = b.confidence - a.confidence;
    return diff !== 0 ? diff : a.productId - b.productId;
  });

  return preferences;
}

/**
 * Return the subset of household preferences that qualify as staples according
 * to the given (or default) staple rule.
 *
 * @param rawOrders   - Raw orders as returned by the Oda API.
 * @param lookback    - Maximum number of most-recent orders to consider.
 * @param stapleRule  - Override the default staple qualification rule.
 */
export function getHouseholdStaples(
  rawOrders: OdaOrder[],
  lookback?: number,
  stapleRule: StapleRule = DEFAULT_STAPLE_RULE,
): HouseholdPreference[] {
  const ordersByDeliveryDate = [...rawOrders].sort(
    (a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime(),
  );
  const slice =
    lookback !== undefined && lookback > 0
      ? ordersByDeliveryDate.slice(-lookback)
      : ordersByDeliveryDate;
  const totalOrders = slice.length;

  const all = analyzeOrderHistory(slice);

  return all.filter((p) => {
    const frequencyRatio = totalOrders > 0 ? p.orderCount / totalOrders : 0;

    return (
      frequencyRatio >= stapleRule.minFrequencyRatio &&
      p.orderCount >= stapleRule.minOrderCount
    );
  });
}
