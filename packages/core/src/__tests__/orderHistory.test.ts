import { analyzeOrderHistory, getHouseholdStaples, normalizeOrder } from '../orderHistory';
import type { OdaOrder } from '../types';
import ordersHistoryFixture from './fixtures/orders-history.json';

const fixture = ordersHistoryFixture as OdaOrder[];

describe('normalizeOrder', () => {
  it('converts price strings to minor currency units', () => {
    const normalized = normalizeOrder(fixture[0]!);

    expect(normalized.id).toBe(1001);
    expect(normalized.status).toBe('delivered');
    expect(normalized.deliveryDate).toBe('2026-01-07');
    expect(normalized.totalPriceCents).toBe(24560);
    expect(normalized.currency).toBe('NOK');
  });

  it('normalizes items correctly', () => {
    const normalized = normalizeOrder(fixture[0]!);

    expect(normalized.items).toHaveLength(3);
    expect(normalized.items[0]).toEqual({
      productId: 1,
      name: 'Oatly Oat Drink 1L',
      brand: 'Oatly',
      quantity: 2,
      linePriceCents: 3980,
    });
    // Product 3 (Bananas) has null brand
    expect(normalized.items[2]?.brand).toBeNull();
  });
});

describe('analyzeOrderHistory', () => {
  it('returns empty array for no orders', () => {
    expect(analyzeOrderHistory([])).toEqual([]);
  });

  it('returns one preference per unique product across multiple orders', () => {
    const preferences = analyzeOrderHistory(fixture);

    // Fixture has 5 unique products across 4 orders
    expect(preferences).toHaveLength(5);
  });

  it('each preference contains reason, confidence, and frequency', () => {
    const preferences = analyzeOrderHistory(fixture);

    for (const pref of preferences) {
      expect(typeof pref.reason).toBe('string');
      expect(pref.reason.length).toBeGreaterThan(0);
      expect(typeof pref.confidence).toBe('number');
      expect(pref.confidence).toBeGreaterThan(0);
      expect(pref.confidence).toBeLessThanOrEqual(1);
      expect(['weekly', 'biweekly', 'monthly', 'occasional']).toContain(pref.frequency);
    }
  });

  it('computes correct confidence and frequency for the most frequent product', () => {
    const preferences = analyzeOrderHistory(fixture);
    // Product 1 (Oatly Oat Drink) appears in all 4 orders
    const oatMilk = preferences.find((p) => p.productId === 1);

    expect(oatMilk).toBeDefined();
    expect(oatMilk?.orderCount).toBe(4);
    expect(oatMilk?.confidence).toBe(1);
    expect(oatMilk?.frequency).toBe('weekly');
    expect(oatMilk?.reason).toBe('Bought in 4 of last 4 orders');
  });

  it('computes correct average quantity', () => {
    const preferences = analyzeOrderHistory(fixture);
    // Product 1: quantities 2 + 3 + 2 + 2 = 9 across 4 orders → avg 2.25
    const oatMilk = preferences.find((p) => p.productId === 1);

    expect(oatMilk?.averageQuantity).toBe(2.25);
  });

  it('correctly identifies biweekly frequency', () => {
    const preferences = analyzeOrderHistory(fixture);
    // Products 3 and 4 both appear in 2 of 4 orders → confidence 0.5 → biweekly
    const bananas = preferences.find((p) => p.productId === 3);
    const yogurt = preferences.find((p) => p.productId === 4);

    expect(bananas?.frequency).toBe('biweekly');
    expect(bananas?.confidence).toBe(0.5);
    expect(yogurt?.frequency).toBe('biweekly');
  });

  it('correctly identifies monthly frequency', () => {
    const preferences = analyzeOrderHistory(fixture);
    // Product 5 (Free Range Eggs) appears in 1 of 4 orders → confidence 0.25 → monthly
    const eggs = preferences.find((p) => p.productId === 5);

    expect(eggs?.frequency).toBe('monthly');
    expect(eggs?.confidence).toBe(0.25);
  });

  it('sorts results by confidence descending (most reliable staples first)', () => {
    const preferences = analyzeOrderHistory(fixture);
    const confidences = preferences.map((p) => p.confidence);

    for (let i = 1; i < confidences.length; i++) {
      expect(confidences[i]!).toBeLessThanOrEqual(confidences[i - 1]!);
    }
  });

  it('is deterministic across multiple calls', () => {
    const first = analyzeOrderHistory(fixture);
    const second = analyzeOrderHistory(fixture);

    expect(first).toEqual(second);
  });
});

describe('getHouseholdStaples', () => {
  it('returns only products meeting the minimum order count threshold', () => {
    const staples = getHouseholdStaples(fixture);

    // Product 5 (Free Range Eggs) appears only once → excluded by default minOrderCount=2
    const eggs = staples.find((p) => p.productId === 5);
    expect(eggs).toBeUndefined();
  });

  it('includes products bought in at least 2 orders', () => {
    const staples = getHouseholdStaples(fixture);
    const ids = staples.map((p) => p.productId).sort((a, b) => a - b);

    // Products 1, 2, 3, 4 each appear in ≥2 orders
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('respects lookback limit', () => {
    // Only look at the last 2 orders (1003, 1004)
    // In those orders: product 1 appears twice, products 2 and 4 once each, products 3 and 5 once each
    const staples = getHouseholdStaples(fixture, 2);

    // With 2 orders and default minOrderCount=2, only product 1 qualifies (appears in both)
    expect(staples).toHaveLength(1);
    expect(staples[0]?.productId).toBe(1);
  });

  it('accepts a custom staple rule', () => {
    const staples = getHouseholdStaples(fixture, undefined, {
      minOrderCount: 1,
      minFrequencyRatio: 0.1,
    });

    // All 5 products should qualify when the bar is lowered
    expect(staples).toHaveLength(5);
  });
});
