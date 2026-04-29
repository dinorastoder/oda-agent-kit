import { z } from 'zod';
import {
  createOdaPageSchema,
  normalizeCart,
  OdaDeliverySlotSchema,
  OdaProductListDetailSchema,
  OdaProductListSummaryPageSchema,
  OdaRawCartSchema,
  OdaSearchResponseSchema,
  OdaShoppingListSchema,
} from '../schemas';
import { OdaOrderSchema } from '../schemas';
import cartFixture from './fixtures/cart.json';
import cartWithFeesFixture from './fixtures/cart-with-fees.json';
import deliverySlotsFixture from './fixtures/delivery-slots.json';
import ordersPageFixture from './fixtures/orders-page.json';
import productListDetailFixture from './fixtures/product-list-detail.json';
import productListsPageFixture from './fixtures/product-lists-page.json';
import searchResponseFixture from './fixtures/search-response.json';
import shoppingListsFixture from './fixtures/shopping-lists.json';

describe('core schemas', () => {
  it('parses search fixtures', () => {
    const parsed = OdaSearchResponseSchema.parse(searchResponseFixture);

    expect(parsed.query).toBe('oat milk');
    expect(parsed.results[0]?.full_name).toBe('Oatly Oat Drink 1L');
  });

  it('parses cart fixtures and normalises groups into items', () => {
    const raw = OdaRawCartSchema.parse(cartFixture);
    const parsed = normalizeCart(raw);

    expect(parsed.item_count).toBe(2);
    expect(parsed.items[0]?.product.id).toBe(123);
    expect(parsed.items[0]?.quantity).toBe(2);
    expect(parsed.items[0]?.line_price).toBe('39.80');
    expect(parsed.items[0]?.original_line_price).toBeNull();
    expect(parsed.items[0]?.unit_price).toBe('19.90');
    expect(parsed.items[0]?.label).toBeNull();
    expect(parsed.label).toBeNull();
    expect(parsed.display_price).toBeNull();
    expect(parsed.subtotal_price).toBe('39.80');
    expect(parsed.summary_lines).toEqual([]);
    expect(parsed.fee_lines).toEqual([]);
    expect(parsed.total_price).toBe('39.80');
    expect(parsed.currency).toBe('NOK');
  });

  it('preserves discounted cart subtotal and fee summary lines', () => {
    const raw = OdaRawCartSchema.parse(cartWithFeesFixture);
    const parsed = normalizeCart(raw);

    expect(parsed.items).toEqual([
      expect.objectContaining({
        id: 675765245,
        quantity: 1,
        line_price: '30.00',
        original_line_price: '51.90',
        unit_price: '30.00',
        label: null,
      }),
    ]);
    expect(parsed.label).toBe('1 vare');
    expect(parsed.display_price).toBe('51.90');
    expect(parsed.subtotal_price).toBe('30.00');
    expect(parsed.summary_lines).toEqual([
      { label: '1 vare', price: '51.90', kind: 'item', details: null },
      { label: 'Du sparer', price: '-21.90', kind: 'discount', details: null },
      { label: 'Delsum', price: '30.00', kind: 'subtotal', details: null },
      {
        label: 'Tillegg for mindre bestilling',
        price: '199.00',
        kind: 'fee',
        details: 'På bestillinger under 1100 kr kommer det et pakketillegg i prisen, som reduseres trinnvis. Neste trinn er ved 700 kr.',
      },
      {
        label: 'Leveringsemballasje',
        price: '11.70',
        kind: 'fee',
        details: 'Vi tar en liten avgift for eskene vi leverer varene dine i.',
      },
      { label: 'Total inkl. MVA', price: '240.70', kind: 'total', details: null },
    ]);
    expect(parsed.fee_lines).toEqual([
      {
        label: 'Tillegg for mindre bestilling',
        price: '199.00',
        kind: 'fee',
        details: 'På bestillinger under 1100 kr kommer det et pakketillegg i prisen, som reduseres trinnvis. Neste trinn er ved 700 kr.',
      },
      {
        label: 'Leveringsemballasje',
        price: '11.70',
        kind: 'fee',
        details: 'Vi tar en liten avgift for eskene vi leverer varene dine i.',
      },
    ]);
    expect(parsed.total_price).toBe('240.70');
  });

  it('parses order page fixtures', () => {
    const parsed = createOdaPageSchema(OdaOrderSchema).parse(ordersPageFixture);

    expect(parsed.count).toBe(1);
    expect(parsed.results[0]?.status).toBe('delivered');
  });

  it('parses delivery slot fixtures', () => {
    const parsed = z.array(OdaDeliverySlotSchema).parse(deliverySlotsFixture);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.is_available).toBe(true);
  });

  it('parses shopping list fixtures', () => {
    const parsed = z.array(OdaShoppingListSchema).parse(shoppingListsFixture);

    expect(parsed[0]?.name).toBe('Weekly staples');
    expect(parsed[0]?.items[0]?.quantity).toBe(3);
  });

  it('parses live product-list overview fixtures', () => {
    const parsed = OdaProductListSummaryPageSchema.parse(productListsPageFixture);

    expect(parsed.results[0]?.name).toBe('Standard groceries');
    expect(parsed.results[0]?.number_of_items).toBe(14);
  });

  it('parses live product-list detail fixtures into shopping lists', () => {
    const parsed = OdaProductListDetailSchema.parse(productListDetailFixture);

    expect(parsed.name).toBe('Standard groceries');
    expect(parsed.items[0]?.product.full_name).toBe('Tine Lettmelk 0,5% fett');
    expect(parsed.items[0]?.product.images[0]?.small_thumbnail.url).toBe(
      'https://images.oda.com/local_products/milk-thumb.jpg',
    );
    expect(parsed.items[0]?.quantity).toBe(2);
  });
});
