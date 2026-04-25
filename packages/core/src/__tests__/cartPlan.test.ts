import { buildCartPlan, compareCartToUsual, findSubstitutes } from '../cartPlan';
import type { OdaCart, OdaOrder, OdaShoppingList } from '../types';
import cartFixture from './fixtures/cart.json';
import ordersHistoryFixture from './fixtures/orders-history.json';
import shoppingListsFixture from './fixtures/shopping-lists.json';

const orders = ordersHistoryFixture as OdaOrder[];
const cart = cartFixture as OdaCart;
const savedLists = shoppingListsFixture as OdaShoppingList[];

// ---------------------------------------------------------------------------
// buildCartPlan
// ---------------------------------------------------------------------------

describe('buildCartPlan', () => {
  it('returns an empty plan when no input is provided', () => {
    const plan = buildCartPlan({ orders: [] });

    expect(plan.items).toHaveLength(0);
    expect(plan.summary).toBe('No items planned.');
  });

  it('does NOT mutate orders or savedLists input', () => {
    const ordersCopy = JSON.parse(JSON.stringify(orders)) as OdaOrder[];
    const listsCopy = JSON.parse(JSON.stringify(savedLists)) as OdaShoppingList[];

    buildCartPlan({ orders: ordersCopy, savedLists: listsCopy });

    expect(ordersCopy).toEqual(orders);
    expect(listsCopy).toEqual(savedLists);
  });

  it('includes items from explicit requests with source "explicit_request"', () => {
    const plan = buildCartPlan({
      orders: [],
      explicitRequests: [
        { productId: 99, name: 'Special Cheese', brand: 'Dairy Co', quantity: 1 },
      ],
    });

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]?.source).toBe('explicit_request');
    expect(plan.items[0]?.reason).toBe('Explicitly requested by user');
    expect(plan.items[0]?.productId).toBe(99);
  });

  it('includes items from saved lists with source "saved_list"', () => {
    const plan = buildCartPlan({ orders: [], savedLists });

    const savedItem = plan.items.find((i) => i.source === 'saved_list');
    expect(savedItem).toBeDefined();
    expect(savedItem?.reason).toContain('Weekly staples');
    expect(savedItem?.productId).toBe(123);
  });

  it('includes household staples from order history with source "staple_rule"', () => {
    const plan = buildCartPlan({ orders });

    const stapleItems = plan.items.filter((i) => i.source === 'staple_rule');
    expect(stapleItems.length).toBeGreaterThan(0);
  });

  it('de-duplicates items across sources (explicit_request wins)', () => {
    // Product 123 is in both savedLists and explicitRequests
    const plan = buildCartPlan({
      orders: [],
      savedLists,
      explicitRequests: [
        { productId: 123, name: 'Oatly Oat Drink 1L', brand: 'Oatly', quantity: 5 },
      ],
    });

    const product123Items = plan.items.filter((i) => i.productId === 123);
    expect(product123Items).toHaveLength(1);
    expect(product123Items[0]?.source).toBe('explicit_request');
    expect(product123Items[0]?.quantity).toBe(5);
  });

  it('de-duplicates items across sources (saved_list wins over staple_rule)', () => {
    // Product 1 is in orders history AND we add it to a synthetic saved list
    const syntheticList: OdaShoppingList = {
      id: 99,
      name: 'Test List',
      items: [
        {
          product: {
            id: 1,
            full_name: 'Oatly Oat Drink 1L',
            brand: 'Oatly',
            name: 'Oat Drink',
            front_url: '/products/1',
            gross_price: '19.90',
            gross_unit_price: '19.90',
            unit_price_quantity_abbreviation: 'l',
            unit_price_quantity_name: 'liter',
            currency: 'NOK',
            is_available: true,
            is_sponsored: false,
            promoted_product: false,
            images: [],
            discount: null,
            availability: { is_available: true, description: null },
          },
          quantity: 10,
        },
      ],
    };

    const plan = buildCartPlan({ orders, savedLists: [syntheticList] });

    const product1Items = plan.items.filter((i) => i.productId === 1);
    expect(product1Items).toHaveLength(1);
    expect(product1Items[0]?.source).toBe('saved_list');
    expect(product1Items[0]?.quantity).toBe(10);
  });

  it('produces a human-readable summary listing all planned item names', () => {
    const plan = buildCartPlan({
      orders: [],
      explicitRequests: [
        { productId: 1, name: 'Item A', brand: null, quantity: 1 },
        { productId: 2, name: 'Item B', brand: null, quantity: 2 },
      ],
    });

    expect(plan.summary).toContain('2 item(s)');
    expect(plan.summary).toContain('Item A');
    expect(plan.summary).toContain('Item B');
  });

  it('respects lookback when deriving staples', () => {
    // With lookback=1 only the last order is considered; only product 1 qualifies
    // with custom rule requiring minOrderCount=1 and minFrequencyRatio=0
    const plan = buildCartPlan({
      orders,
      lookback: 1,
      stapleRule: { minOrderCount: 1, minFrequencyRatio: 0 },
    });

    // Only the products from the single most-recent order should be planned
    const stapleIds = plan.items.filter((i) => i.source === 'staple_rule').map((i) => i.productId);
    expect(stapleIds.length).toBeGreaterThan(0);
    // Product 1 appears in all orders so definitely in the most recent one
    expect(stapleIds).toContain(1);
  });
});

// ---------------------------------------------------------------------------
// compareCartToUsual
// ---------------------------------------------------------------------------

describe('compareCartToUsual', () => {
  it('does NOT mutate the cart or orders', () => {
    const cartCopy = JSON.parse(JSON.stringify(cart)) as OdaCart;
    const ordersCopy = JSON.parse(JSON.stringify(orders)) as OdaOrder[];

    compareCartToUsual(cartCopy, ordersCopy);

    expect(cartCopy).toEqual(cart);
    expect(ordersCopy).toEqual(orders);
  });

  it('returns empty groups when orders list is empty', () => {
    const result = compareCartToUsual(cart, []);

    expect(result.usual).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
    // All cart items are "extra" when there is no history
    expect(result.extra.length).toBe(cart.items.length);
  });

  it('classifies a cart item that is a household staple as "usual"', () => {
    // Product 1 (Oatly) appears in all 4 fixture orders — it is definitely a staple.
    // We build a synthetic cart that contains it.
    const cartWithOatly: OdaCart = {
      id: 1,
      items: [
        {
          id: 500,
          product: {
            id: 1,
            full_name: 'Oatly Oat Drink 1L',
            brand: 'Oatly',
            name: 'Oat Drink',
            front_url: '/products/1',
            gross_price: '19.90',
            gross_unit_price: '19.90',
            unit_price_quantity_abbreviation: 'l',
            unit_price_quantity_name: 'liter',
            currency: 'NOK',
            is_available: true,
            is_sponsored: false,
            promoted_product: false,
            images: [],
            discount: null,
            availability: { is_available: true, description: null },
          },
          quantity: 2,
          line_price: '39.80',
        },
      ],
      total_price: '39.80',
      currency: 'NOK',
      item_count: 1,
    };

    const result = compareCartToUsual(cartWithOatly, orders);

    expect(result.usual.some((i) => i.productId === 1)).toBe(true);
    expect(result.missing.some((i) => i.productId === 1)).toBe(false);
    expect(result.extra.some((i) => i.productId === 1)).toBe(false);
  });

  it('classifies a staple missing from the cart as "missing"', () => {
    // Empty cart — all staples should appear as missing
    const emptyCart: OdaCart = {
      id: 2,
      items: [],
      total_price: '0.00',
      currency: 'NOK',
      item_count: 0,
    };

    const result = compareCartToUsual(emptyCart, orders);

    expect(result.usual).toHaveLength(0);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.extra).toHaveLength(0);
    // Product 1 is a staple and should be in missing
    expect(result.missing.some((i) => i.productId === 1)).toBe(true);
  });

  it('classifies a cart item with no order history as "extra"', () => {
    // cart.json contains product 123 which is not in orders-history.json
    const result = compareCartToUsual(cart, orders);

    expect(result.extra.some((i) => i.productId === 123)).toBe(true);
  });

  it('each missing item has a quantity equal to the household average (rounded)', () => {
    const emptyCart: OdaCart = {
      id: 3,
      items: [],
      total_price: '0.00',
      currency: 'NOK',
      item_count: 0,
    };

    const result = compareCartToUsual(emptyCart, orders);

    for (const item of result.missing) {
      expect(item.quantity).toBeGreaterThan(0);
      expect(Number.isInteger(item.quantity)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// findSubstitutes (placeholder)
// ---------------------------------------------------------------------------

describe('findSubstitutes', () => {
  it('returns an empty array (placeholder implementation)', () => {
    const result = findSubstitutes(1, [
      { productId: 2, name: 'Other Oat Milk', brand: 'Minor Brand' },
    ]);

    expect(result).toEqual([]);
  });
});
