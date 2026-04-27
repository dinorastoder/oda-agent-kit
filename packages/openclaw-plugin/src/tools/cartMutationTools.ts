/**
 * Cart-mutation tools for the Oda shopping assistant.
 *
 * These tools are DISABLED by default and must be explicitly enabled by the
 * user. Each tool mutates the shopping cart and therefore requires explicit
 * user confirmation before it is invoked.
 *
 * Tools exposed:
 *  - addToCart      — add a single product to the cart
 *  - removeFromCart — remove a cart item by its product ID (cart.items[].product.id)
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

/** Parameters for the higher-level updateCart tool. */
export interface UpdateCartParams {
  mode: 'apply-plan' | 'add-products' | 'remove-products' | 'clear-cart';
  plan?: ShoppingList;
  items?: Array<{ productId: number; quantity: number }>;
  productIds?: number[];
}

/** Result of the higher-level updateCart tool. */
export interface CartUpdateResult extends CartMutationResult {
  mode: UpdateCartParams['mode'];
  steps: string[];
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
 * Remove a product from the cart by its product ID (`cart.items[].product.id`).
 *
 * Note: `productId` is the Oda product ID, NOT the cart line-item ID.
 * The Oda API removes the item by setting its quantity to 0 via the product ID.
 *
 * Requires explicit user confirmation before calling.
 */
export async function removeFromCart(
  client: OdaClient,
  productId: number,
): Promise<CartMutationResult> {
  await client.removeFromCart(productId);
  return { summary: `Removed product #${productId} from cart.` };
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

/**
 * Apply one cart update intent by composing the lower-level mutation helpers.
 */
export async function updateCart(
  client: OdaClient,
  params: UpdateCartParams,
): Promise<CartUpdateResult> {
  switch (params.mode) {
    case 'apply-plan': {
      if (!params.plan) {
        throw new Error('updateCart with mode "apply-plan" requires a shopping plan.');
      }

      const result = await prepareCart(client, params.plan);
      return {
        mode: params.mode,
        summary: result.summary,
        steps: params.plan.items.map(
          (item) => `Add ${item.quantity}× product #${item.productId}.`,
        ),
      };
    }

    case 'add-products': {
      if (!params.items || params.items.length === 0) {
        throw new Error('updateCart with mode "add-products" requires at least one item.');
      }

      const steps: string[] = [];
      for (const item of params.items) {
        const result = await addToCart(client, item.productId, item.quantity);
        steps.push(result.summary);
      }

      return {
        mode: params.mode,
        summary: `Added ${params.items.length} product(s) to cart.`,
        steps,
      };
    }

    case 'remove-products': {
      if (!params.productIds || params.productIds.length === 0) {
        throw new Error('updateCart with mode "remove-products" requires at least one product ID.');
      }

      const steps: string[] = [];
      for (const productId of params.productIds) {
        const result = await removeFromCart(client, productId);
        steps.push(result.summary);
      }

      return {
        mode: params.mode,
        summary: `Removed ${params.productIds.length} product(s) from cart.`,
        steps,
      };
    }

    case 'clear-cart': {
      const result = await clearCart(client);
      return {
        mode: params.mode,
        summary: result.summary,
        steps: [result.summary],
      };
    }
  }
}
