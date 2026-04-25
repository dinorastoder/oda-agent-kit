/**
 * Cart-mutation tools for the Oda shopping assistant.
 *
 * These tools are DISABLED by default and must be explicitly enabled by the
 * user. Each tool mutates the shopping cart and therefore requires explicit
 * user confirmation before it is invoked.
 *
 * Tools exposed:
 *  - addToCart      — add a single product to the cart
 *  - removeFromCart — remove a cart item by its cart-item ID (cart.items[].id)
 *  - clearCart      — remove all items from the cart
 *  - prepareCart    — bulk-add all items from a ShoppingList to the cart
 *
 * SAFETY NOTE: The assistant workflow must present a full summary of intended
 * changes and receive unambiguous user approval before calling any tool in
 * this module. See SKILL.md for the canonical workflow.
 */

import type { OdaClient } from '@oda-agent/core';
import type { ShoppingList } from '../plugin.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Result of a cart mutation operation. */
export interface CartMutationResult {
  /** Human-readable description of what changed. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * Add `quantity` units of `productId` to the cart.
 *
 * Requires explicit user confirmation before calling.
 */
export async function addToCart(
  client: OdaClient,
  productId: number,
  quantity: number,
): Promise<CartMutationResult> {
  await client.addToCart(productId, quantity);
  return { summary: `Added ${quantity}× product #${productId} to cart.` };
}

/**
 * Remove a cart item by its cart-item ID (`cart.items[].id`).
 *
 * Note: `cartItemId` is the ID of the cart line item returned by `getCart`,
 * NOT the product ID. Obtain it from `cart.items[].id` before calling.
 *
 * Requires explicit user confirmation before calling.
 */
export async function removeFromCart(
  client: OdaClient,
  cartItemId: number,
): Promise<CartMutationResult> {
  await client.removeFromCart(cartItemId);
  return { summary: `Removed cart item #${cartItemId} from cart.` };
}

/**
 * Remove all items from the cart.
 *
 * Requires explicit user confirmation before calling.
 */
export async function clearCart(client: OdaClient): Promise<CartMutationResult> {
  await client.clearCart();
  return { summary: 'Cart cleared.' };
}

/**
 * Add every item in `list` to the cart, sequentially one item at a time.
 *
 * Requires explicit user confirmation before calling. The caller should show
 * the full shopping list to the user and wait for approval.
 */
export async function prepareCart(
  client: OdaClient,
  list: ShoppingList,
): Promise<CartMutationResult> {
  for (const item of list.items) {
    await client.addToCart(item.productId, item.quantity);
  }
  return {
    summary: `Added ${list.items.length} item(s) from list "${list.name}" to cart.`,
  };
}
