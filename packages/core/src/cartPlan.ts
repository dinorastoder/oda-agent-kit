import type {
  CartComparison,
  CartPlan,
  CartPlanInput,
  CartPlanItem,
  OdaCart,
  OdaOrder,
  StapleRule,
} from './types.js';
import { getHouseholdStaples } from './orderHistory.js';

/**
 * Build a proposed cart plan without mutating the real cart.
 *
 * Items are de-duplicated by product ID and added in priority order:
 *  1. Explicit user requests (highest priority)
 *  2. Items from saved shopping lists
 *  3. Household staples derived from order history
 *
 * @param input - Source data used to construct the plan.
 * @returns A CartPlan whose items explain why each product was included.
 */
export function buildCartPlan(input: CartPlanInput): CartPlan {
  const { orders, savedLists = [], explicitRequests = [], stapleRule, lookback } = input;

  const seen = new Set<number>();
  const items: CartPlanItem[] = [];

  // 1. Explicit user requests
  for (const req of explicitRequests) {
    if (!seen.has(req.productId)) {
      seen.add(req.productId);
      items.push({
        productId: req.productId,
        name: req.name,
        brand: req.brand,
        quantity: req.quantity,
        source: 'explicit_request',
        reason: 'Explicitly requested by user',
      });
    }
  }

  // 2. Items from saved shopping lists
  for (const list of savedLists) {
    for (const listItem of list.items) {
      const id = listItem.product.id;
      if (!seen.has(id)) {
        seen.add(id);
        items.push({
          productId: id,
          name: listItem.product.full_name,
          brand: listItem.product.brand,
          quantity: listItem.quantity,
          source: 'saved_list',
          reason: `From saved list "${list.name}"`,
        });
      }
    }
  }

  // 3. Household staples from order history
  if (orders.length > 0) {
    const staples = getHouseholdStaples(orders, lookback, stapleRule);
    for (const staple of staples) {
      if (!seen.has(staple.productId)) {
        seen.add(staple.productId);
        items.push({
          productId: staple.productId,
          name: staple.name,
          brand: staple.brand,
          quantity: Math.round(staple.averageQuantity),
          source: 'staple_rule',
          reason: staple.reason,
        });
      }
    }
  }

  const summary =
    items.length === 0
      ? 'No items planned.'
      : `Planned ${items.length} item(s): ${items.map((i) => i.name).join(', ')}.`;

  return { items, summary };
}

/**
 * Compare the current cart to the household's usual purchases derived from
 * order history.
 *
 * Returns three groups:
 * - `usual`   – items in the cart that the household normally buys
 * - `missing` – items the household normally buys that are NOT in the cart
 * - `extra`   – items in the cart that are not part of usual purchases
 *
 * No cart mutations are performed.
 *
 * @param cart       - The current cart to inspect.
 * @param orders     - Raw orders used to derive household staples.
 * @param stapleRule - Override the default staple qualification rule.
 * @param lookback   - Maximum number of most-recent orders to consider.
 */
export function compareCartToUsual(
  cart: OdaCart,
  orders: OdaOrder[],
  stapleRule?: StapleRule,
  lookback?: number,
): CartComparison {
  const staples = getHouseholdStaples(orders, lookback, stapleRule);
  const stapleMap = new Map(staples.map((s) => [s.productId, s]));
  const cartItemMap = new Map(cart.items.map((item) => [item.product.id, item]));

  const usual: CartPlanItem[] = [];
  const missing: CartPlanItem[] = [];
  const extra: CartPlanItem[] = [];

  for (const staple of staples) {
    const cartItem = cartItemMap.get(staple.productId);
    if (cartItem) {
      usual.push({
        productId: staple.productId,
        name: staple.name,
        brand: staple.brand,
        quantity: cartItem.quantity,
        source: 'staple_rule',
        reason: staple.reason,
      });
    } else {
      missing.push({
        productId: staple.productId,
        name: staple.name,
        brand: staple.brand,
        quantity: Math.round(staple.averageQuantity),
        source: 'staple_rule',
        reason: staple.reason,
      });
    }
  }

  for (const cartItem of cart.items) {
    if (!stapleMap.has(cartItem.product.id)) {
      extra.push({
        productId: cartItem.product.id,
        name: cartItem.product.full_name,
        brand: cartItem.product.brand,
        quantity: cartItem.quantity,
        source: 'current_cart' as CartPlanItem['source'],
        reason: 'In cart but not part of usual purchases',
      });
    }
  }

  return { usual, missing, extra };
}

/**
 * Find substitute products for a given product ID from a list of candidates.
 *
 * @placeholder Not yet implemented — always returns an empty array.
 *
 * @param _productId  - The product ID to find substitutes for.
 * @param _candidates - Pool of candidate products to search.
 */
export function findSubstitutes(
  _productId: number,
  _candidates: Array<{ productId: number; name: string; brand: string | null }>,
): CartPlanItem[] {
  return [];
}
