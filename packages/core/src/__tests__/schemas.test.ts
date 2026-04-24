import { z } from 'zod';
import {
  createOdaPageSchema,
  OdaCartSchema,
  OdaDeliverySlotSchema,
  OdaSearchResponseSchema,
  OdaShoppingListSchema,
} from '../schemas';
import { OdaOrderSchema } from '../schemas';
import cartFixture from './fixtures/cart.json';
import deliverySlotsFixture from './fixtures/delivery-slots.json';
import ordersPageFixture from './fixtures/orders-page.json';
import searchResponseFixture from './fixtures/search-response.json';
import shoppingListsFixture from './fixtures/shopping-lists.json';

describe('core schemas', () => {
  it('parses search fixtures', () => {
    const parsed = OdaSearchResponseSchema.parse(searchResponseFixture);

    expect(parsed.query).toBe('oat milk');
    expect(parsed.results[0]?.full_name).toBe('Oatly Oat Drink 1L');
  });

  it('parses cart fixtures', () => {
    const parsed = OdaCartSchema.parse(cartFixture);

    expect(parsed.item_count).toBe(2);
    expect(parsed.items[0]?.product.id).toBe(123);
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
});
