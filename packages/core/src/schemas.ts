import { z } from 'zod';
import type {
  OdaAvailability,
  OdaCart,
  OdaCartItem,
  OdaDeliverySlot,
  OdaDiscount,
  OdaOrder,
  OdaOrderItem,
  OdaPage,
  OdaProduct,
  OdaProductImage,
  OdaProductImageAsset,
  OdaSearchResponse,
  OdaShoppingList,
  OdaShoppingListItem,
} from './types.js';

/** Zod schema for a product image asset. */
export const OdaProductImageAssetSchema: z.ZodType<OdaProductImageAsset> = z.object({
  url: z.string().min(1),
});

/** Zod schema for product images. */
export const OdaProductImageSchema: z.ZodType<OdaProductImage> = z.object({
  thumbnail: OdaProductImageAssetSchema,
  small_thumbnail: OdaProductImageAssetSchema,
  large_thumbnail: OdaProductImageAssetSchema,
});

/** Zod schema for discount metadata. */
export const OdaDiscountSchema: z.ZodType<OdaDiscount> = z.object({
  percentage: z.number(),
  description: z.string(),
  undiscounted_gross_price: z.string(),
});

/** Zod schema for product availability metadata. */
export const OdaAvailabilitySchema: z.ZodType<OdaAvailability> = z.object({
  is_available: z.boolean(),
  description: z.string().nullable(),
});

/** Zod schema for products. */
export const OdaProductSchema: z.ZodType<OdaProduct> = z.object({
  id: z.number().int(),
  full_name: z.string(),
  brand: z.string().nullable(),
  name: z.string(),
  front_url: z.string(),
  gross_price: z.string(),
  gross_unit_price: z.string(),
  unit_price_quantity_abbreviation: z.string(),
  unit_price_quantity_name: z.string(),
  currency: z.string(),
  is_available: z.boolean(),
  is_sponsored: z.boolean(),
  promoted_product: z.boolean(),
  images: z.array(OdaProductImageSchema),
  discount: OdaDiscountSchema.nullable(),
  availability: OdaAvailabilitySchema,
});

/** Zod schema for cart items. */
export const OdaCartItemSchema: z.ZodType<OdaCartItem> = z.object({
  id: z.number().int(),
  product: OdaProductSchema,
  quantity: z.number().int(),
  line_price: z.string(),
});

/** Zod schema for carts. */
export const OdaCartSchema: z.ZodType<OdaCart> = z.object({
  id: z.number().int(),
  items: z.array(OdaCartItemSchema),
  total_price: z.string(),
  currency: z.string(),
  item_count: z.number().int(),
});

/** Zod schema for order items. */
export const OdaOrderItemSchema: z.ZodType<OdaOrderItem> = z.object({
  product: OdaProductSchema,
  quantity: z.number().int(),
  line_price: z.string(),
});

/** Zod schema for orders. */
export const OdaOrderSchema: z.ZodType<OdaOrder> = z.object({
  id: z.number().int(),
  status: z.string(),
  delivery_date: z.string(),
  total_price: z.string(),
  currency: z.string(),
  items: z.array(OdaOrderItemSchema),
});

/** Zod schema for shopping list items. */
export const OdaShoppingListItemSchema: z.ZodType<OdaShoppingListItem> = z.object({
  product: OdaProductSchema,
  quantity: z.number().int(),
});

/** Zod schema for shopping lists. */
export const OdaShoppingListSchema: z.ZodType<OdaShoppingList> = z.object({
  id: z.number().int(),
  name: z.string(),
  items: z.array(OdaShoppingListItemSchema),
});

/** Zod schema for delivery slots. */
export const OdaDeliverySlotSchema: z.ZodType<OdaDeliverySlot> = z.object({
  id: z.number().int(),
  start: z.string(),
  end: z.string(),
  price: z.string(),
  currency: z.string(),
  is_available: z.boolean(),
});

/** Zod schema for search responses. */
export const OdaSearchResponseSchema: z.ZodType<OdaSearchResponse> = z.object({
  results: z.array(OdaProductSchema),
  count: z.number().int(),
  query: z.string(),
});

/** Zod schema for login responses. */
export const OdaLoginResponseSchema = z.object({
  token: z.string().min(1),
});

/** Create a page schema for a specific result type. */
export function createOdaPageSchema<T>(itemSchema: z.ZodType<T>): z.ZodType<OdaPage<T>> {
  return z.object({
    count: z.number().int(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(itemSchema),
  });
}

// ---------------------------------------------------------------------------
// Raw cart schemas — match the real Oda cart REST API (groups-based format)
// ---------------------------------------------------------------------------

/**
 * Minimal product schema used within cart API responses.
 * The cart API returns a subset of full product fields; unknown extra fields
 * are passed through so we can still populate OdaProduct with defaults.
 */
const OdaRawCartProductSchema = z.object({
  id: z.number().int(),
  full_name: z.string(),
  name: z.string(),
  gross_price: z.string(),
  gross_unit_price: z.string(),
  unit_price_quantity_abbreviation: z.string(),
}).passthrough();

/** Raw cart item as returned by the Oda cart API. */
export const OdaRawCartItemSchema = z.object({
  /** Item-level identifier (called `item_id` in the Oda cart API). */
  item_id: z.number().int(),
  product: OdaRawCartProductSchema,
  quantity: z.number().int(),
  /** Line total price string (called `display_price_total` in the Oda cart API). */
  display_price_total: z.string(),
}).passthrough();

const OdaRawCartGroupSchema = z.object({
  items: z.array(OdaRawCartItemSchema),
}).passthrough();

/**
 * Raw cart schema matching the real Oda cart API response structure.
 * The API returns items grouped under `groups[]` rather than a flat `items[]`,
 * and uses different field names (`total_gross_amount`, `product_quantity_count`).
 */
export const OdaRawCartSchema = z.object({
  id: z.number().int(),
  product_quantity_count: z.number().int(),
  total_gross_amount: z.string(),
  groups: z.array(OdaRawCartGroupSchema),
}).passthrough();

export type OdaRawCart = z.infer<typeof OdaRawCartSchema>;

/**
 * Normalise a raw Oda cart API response into the clean {@link OdaCart}
 * interface used throughout the rest of this package.
 *
 * The raw API response groups items under `groups[].items[]` and uses
 * `item_id`/`display_price_total` field names. This function flattens the
 * groups and maps field names to match `OdaCartItem`.
 */
export function normalizeCart(raw: OdaRawCart): OdaCart {
  const items: OdaCartItem[] = [];

  for (const group of raw.groups) {
    for (const item of group.items) {
      const rawProduct = item.product as Record<string, unknown>;

      const product: OdaProduct = {
        id: item.product.id,
        full_name: item.product.full_name,
        name: item.product.name,
        brand: typeof rawProduct['brand'] === 'string' ? rawProduct['brand'] : null,
        front_url: typeof rawProduct['front_url'] === 'string' ? rawProduct['front_url'] : '',
        gross_price: item.product.gross_price,
        gross_unit_price: item.product.gross_unit_price,
        unit_price_quantity_abbreviation: item.product.unit_price_quantity_abbreviation,
        unit_price_quantity_name: typeof rawProduct['unit_price_quantity_name'] === 'string' ? rawProduct['unit_price_quantity_name'] : '',
        currency: typeof rawProduct['currency'] === 'string' ? rawProduct['currency'] : 'NOK',
        is_available: typeof rawProduct['is_available'] === 'boolean' ? rawProduct['is_available'] : true,
        is_sponsored: typeof rawProduct['is_sponsored'] === 'boolean' ? rawProduct['is_sponsored'] : false,
        promoted_product: typeof rawProduct['promoted_product'] === 'boolean' ? rawProduct['promoted_product'] : false,
        images: Array.isArray(rawProduct['images']) ? (rawProduct['images'] as OdaProductImage[]) : [],
        discount: rawProduct['discount'] != null ? (rawProduct['discount'] as OdaDiscount) : null,
        availability: rawProduct['availability'] != null
          ? (rawProduct['availability'] as OdaAvailability)
          : { is_available: true, description: null },
      };

      items.push({
        id: item.item_id,
        product,
        quantity: item.quantity,
        line_price: item.display_price_total,
      });
    }
  }

  return {
    id: raw.id,
    items,
    total_price: raw.total_gross_amount,
    currency: 'NOK',
    item_count: raw.product_quantity_count,
  };
}
