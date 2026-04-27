import { z } from 'zod';
import type {
  OdaAvailability,
  OdaCart,
  OdaCartItem,
  OdaCartSummaryLine,
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
  original_line_price: z.string().nullable(),
  unit_price: z.string(),
  label: z.string().nullable(),
});

/** Zod schema for cart summary lines. */
export const OdaCartSummaryLineSchema: z.ZodType<OdaCartSummaryLine> = z.object({
  label: z.string(),
  price: z.string(),
  kind: z.enum(['item', 'discount', 'subtotal', 'fee', 'total', 'other']),
  details: z.string().nullable(),
});

/** Zod schema for carts. */
export const OdaCartSchema: z.ZodType<OdaCart> = z.object({
  id: z.number().int(),
  items: z.array(OdaCartItemSchema),
  label: z.string().nullable(),
  display_price: z.string().nullable(),
  subtotal_price: z.string(),
  summary_lines: z.array(OdaCartSummaryLineSchema),
  fee_lines: z.array(OdaCartSummaryLineSchema),
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
  display_price: z.string().optional(),
  /** Line total price string (called `display_price_total` in the Oda cart API). */
  display_price_total: z.string(),
  discounted_display_price_total: z.string().optional(),
  label_text: z.string().nullable().optional(),
}).passthrough();

const OdaRawCartGroupSchema = z.object({
  items: z.array(OdaRawCartItemSchema),
}).passthrough();

const OdaRawCartSummaryLineItemSchema = z.object({
  description: z.string(),
  long_description: z.string().nullable(),
  gross_amount: z.string(),
  name: z.string(),
  display_style: z.string().optional(),
}).passthrough();

const OdaRawCartSummarySectionSchema = z.object({
  id: z.string(),
  lines: z.array(OdaRawCartSummaryLineItemSchema),
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
  label_text: z.string().nullable().optional(),
  display_price: z.string().nullable().optional(),
  currency: z.string().optional(),
  summary_lines: z.array(OdaRawCartSummarySectionSchema).optional(),
  groups: z.array(OdaRawCartGroupSchema),
}).passthrough();

export type OdaRawCart = z.infer<typeof OdaRawCartSchema>;

/**
 * Normalise a raw Oda cart API response into the clean {@link OdaCart}
 * interface used throughout the rest of this package.
 *
 * The raw API response groups items under `groups[].items[]`, exposes
 * discounted pricing on the item rows, and includes a `summary_lines[]`
 * breakdown that explains how the final total is composed. This function
 * flattens the groups, prefers discounted item totals when available, and
 * preserves the pricing breakdown for downstream adapters.
 */
export function normalizeCart(raw: OdaRawCart): OdaCart {
  const items: OdaCartItem[] = [];
  const rawSummaryLines = raw.summary_lines ?? [];
  const summaryLines: OdaCartSummaryLine[] = rawSummaryLines.flatMap((section) =>
    section.lines.map((line) => ({
      label: line.description,
      price: line.gross_amount,
      kind: classifySummaryLine(section.id, line.name, line.gross_amount, line.display_style),
      details: line.long_description,
    })),
  );
  let subtotalMinorUnits = 0;

  function priceToMinorUnits(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  }

  function classifySummaryLine(
    sectionId: string,
    lineName: string,
    grossAmount: string,
    displayStyle?: string,
  ): OdaCartSummaryLine['kind'] {
    const normalizedSectionId = sectionId.split('.').pop();

    if (normalizedSectionId === 'TOTAL' || lineName === 'GrossTotalAmount') {
      return 'total';
    }

    if (lineName === 'GrossSubtotalAmount' || (normalizedSectionId === 'SUBTOTAL' && displayStyle === 'primary')) {
      return 'subtotal';
    }

    if (grossAmount.startsWith('-') || /discount/i.test(lineName)) {
      return 'discount';
    }

    if (/fee/i.test(lineName)) {
      return 'fee';
    }

    if (lineName === 'GrossAmount') {
      return 'item';
    }

    return 'other';
  }

  for (const group of raw.groups) {
    for (const item of group.items) {
      const rawProduct = item.product as Record<string, unknown>;
      const linePrice = item.discounted_display_price_total ?? item.display_price_total;

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
        line_price: linePrice,
        original_line_price: item.discounted_display_price_total ? item.display_price_total : null,
        unit_price: item.display_price ?? item.product.gross_price,
        label: item.label_text ?? null,
      });
      subtotalMinorUnits += priceToMinorUnits(linePrice);
    }
  }

  return {
    id: raw.id,
    items,
    label: raw.label_text ?? null,
    display_price: raw.display_price ?? null,
    subtotal_price:
      summaryLines.find((line) => line.kind === 'subtotal')?.price
      ?? (subtotalMinorUnits / 100).toFixed(2),
    summary_lines: summaryLines,
    fee_lines: summaryLines.filter((line) => line.kind === 'fee'),
    total_price: raw.total_gross_amount,
    currency: raw.currency ?? items[0]?.product.currency ?? 'NOK',
    item_count: raw.product_quantity_count,
  };
}
