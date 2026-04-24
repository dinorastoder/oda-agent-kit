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
