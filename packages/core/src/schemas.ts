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

const OdaProductListAvailabilitySchema = z.object({
  is_available: z.boolean(),
  description: z.string().nullable().optional(),
}).passthrough();

const OdaProductListImageSchema = z.object({
  thumbnail: OdaProductImageAssetSchema.optional(),
  large: OdaProductImageAssetSchema.optional(),
}).passthrough();

/**
 * Product schema for the product-lists REST endpoint.
 *
 * The real Oda API uses snake_case throughout (e.g. `full_name`, `gross_price`).
 * The transform normalises image variants into the OdaProductImage shape used
 * by the rest of the codebase.
 */
const OdaProductListProductSchema = z.object({
  id: z.number().int(),
  full_name: z.string(),
  brand: z.string().nullable(),
  name: z.string(),
  front_url: z.string().optional(),
  absolute_url: z.string().optional(),
  gross_price: z.string(),
  gross_unit_price: z.string(),
  unit_price_quantity_abbreviation: z.string(),
  unit_price_quantity_name: z.string(),
  currency: z.string(),
  availability: OdaProductListAvailabilitySchema,
  images: z.array(OdaProductListImageSchema),
  metadata: z.object({
    is_sponsor_labeled: z.boolean().nullable().optional(),
    is_promoted: z.boolean().nullable().optional(),
  }).passthrough().optional(),
}).passthrough().transform((product) => {
  const firstImage = product.images[0];
  const thumbnail = firstImage?.thumbnail ?? firstImage?.large ?? { url: '' };
  const large = firstImage?.large ?? firstImage?.thumbnail ?? thumbnail;

  return {
    id: product.id,
    full_name: product.full_name,
    brand: product.brand,
    name: product.name,
    front_url: product.absolute_url ?? product.front_url ?? '',
    gross_price: product.gross_price,
    gross_unit_price: product.gross_unit_price,
    unit_price_quantity_abbreviation: product.unit_price_quantity_abbreviation,
    unit_price_quantity_name: product.unit_price_quantity_name,
    currency: product.currency,
    is_available: product.availability.is_available,
    is_sponsored: product.metadata?.is_sponsor_labeled ?? false,
    promoted_product: product.metadata?.is_promoted ?? false,
    images: [
      {
        thumbnail,
        small_thumbnail: thumbnail,
        large_thumbnail: large,
      },
    ],
    discount: null,
    availability: {
      is_available: product.availability.is_available,
      description: product.availability.description ?? null,
    },
  };
});

/** Zod schema for normalized product-list overview entries. */
export const OdaProductListSummarySchema = z.object({
  id: z.number().int(),
  title: z.string(),
  url: z.string(),
  total_quantity: z.number().int(),
  number_of_products: z.number().int(),
  number_of_items: z.number().int(),
  // The real API may omit product_ids on some list types; treat as optional.
  product_ids: z.array(z.number().int()).optional(),
}).passthrough().transform((list) => ({
  id: list.id,
  name: list.title,
  url: list.url,
  total_quantity: list.total_quantity,
  number_of_products: list.number_of_products,
  number_of_items: list.number_of_items,
  product_ids: list.product_ids ?? [],
}));

/** Zod schema for normalized product-list detail responses. */
export const OdaProductListDetailSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  items: z.array(z.object({
    product: OdaProductListProductSchema,
    quantity: z.number().int(),
  }).passthrough()),
}).passthrough().transform((list) => ({
  id: list.id,
  name: list.title,
  items: list.items,
}));

/** Zod schema for product-list overview pages. */
export const OdaProductListSummaryPageSchema = z.object({
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(OdaProductListSummarySchema),
}).passthrough();

/** Zod schema for delivery slots. */
export const OdaDeliverySlotSchema: z.ZodType<OdaDeliverySlot> = z.object({
  id: z.number().int(),
  start: z.string(),
  end: z.string(),
  price: z.string(),
  currency: z.string(),
  is_available: z.boolean(),
});

/**
 * Product schema for the search endpoint (new API format).
 *
 * The updated Oda search API returns products in a format similar to
 * the product-lists endpoint — with nested `availability` and `metadata`
 * objects instead of top-level boolean flags.
 */
const OdaSearchProductSchema = z.object({
  id: z.number().int(),
  full_name: z.string(),
  brand: z.string().nullable(),
  name: z.string(),
  front_url: z.string().optional(),
  absolute_url: z.string().optional(),
  gross_price: z.string(),
  gross_unit_price: z.string(),
  unit_price_quantity_abbreviation: z.string(),
  unit_price_quantity_name: z.string(),
  currency: z.string(),
  availability: z.object({
    is_available: z.boolean(),
    description: z.string().nullable().optional(),
  }).passthrough(),
  metadata: z.object({
    is_sponsor_labeled: z.boolean().nullable().optional(),
    is_promoted: z.boolean().nullable().optional(),
  }).passthrough().optional(),
  images: z.array(z.object({
    thumbnail: z.object({ url: z.string() }).optional(),
    large: z.object({ url: z.string() }).optional(),
  }).passthrough()),
  discount: z.unknown().nullable().optional(),
}).passthrough().transform((product): OdaProduct => {
  const firstImage = product.images[0];
  const thumbnail = firstImage?.thumbnail ?? firstImage?.large ?? { url: '' };
  const large = firstImage?.large ?? firstImage?.thumbnail ?? thumbnail;

  return {
    id: product.id,
    full_name: product.full_name,
    brand: product.brand,
    name: product.name,
    front_url: product.front_url ?? product.absolute_url ?? '',
    gross_price: product.gross_price,
    gross_unit_price: product.gross_unit_price,
    unit_price_quantity_abbreviation: product.unit_price_quantity_abbreviation,
    unit_price_quantity_name: product.unit_price_quantity_name,
    currency: product.currency,
    is_available: product.availability.is_available,
    is_sponsored: product.metadata?.is_sponsor_labeled ?? false,
    promoted_product: product.metadata?.is_promoted ?? false,
    images: [
      {
        thumbnail,
        small_thumbnail: thumbnail,
        large_thumbnail: large,
      },
    ],
    discount: product.discount != null && typeof product.discount === 'object'
      ? product.discount as OdaDiscount
      : null,
    availability: {
      is_available: product.availability.is_available,
      description: product.availability.description ?? null,
    },
  };
});

/**
 * Zod schema for search responses.
 *
 * Supports both the legacy format (`{results, count, query}`) and the
 * current API format (`{products, attributes, categories}`).
 */
export const OdaSearchResponseSchema: z.ZodType<OdaSearchResponse> = z.union([
  // Current API format
  z.object({
    products: z.array(OdaSearchProductSchema),
    attributes: z.object({
      total_hits: z.number().int(),
    }).passthrough(),
  }).passthrough().transform((data) => ({
    results: data.products,
    count: data.attributes.total_hits,
    query: '',
  })),
  // Legacy format
  z.object({
    results: z.array(OdaProductSchema),
    count: z.number().int(),
    query: z.string(),
  }),
]) as z.ZodType<OdaSearchResponse>;

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

const DEFAULT_CART_CURRENCY = 'NOK';

function priceToMinorUnits(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function classifyCartSummaryLine(
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
      kind: classifyCartSummaryLine(section.id, line.name, line.gross_amount, line.display_style),
      details: line.long_description,
    })),
  );
  let subtotalMinorUnits = 0;

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

  const currency = raw.currency ?? items[0]?.product.currency ?? DEFAULT_CART_CURRENCY;

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
    currency,
    item_count: raw.product_quantity_count,
  };
}
