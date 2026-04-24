import { createOpenClawPlugin } from '../plugin';
import type { OdaClient, OdaSearchResponse, OdaPage, OdaOrder, OdaDeliverySlot } from '@oda-agent/core';

function makeClient(overrides: Partial<OdaClient> = {}): OdaClient {
  return {
    login: jest.fn(),
    logout: jest.fn(),
    searchProducts: jest.fn(),
    getProduct: jest.fn(),
    getCart: jest.fn(),
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    clearCart: jest.fn(),
    getOrders: jest.fn(),
    getOrder: jest.fn(),
    getDeliverySlots: jest.fn(),
    ...overrides,
  } as unknown as OdaClient;
}

describe('createOpenClawPlugin', () => {
  describe('buildShoppingList', () => {
    it('resolves queries to product IDs', async () => {
      const mockProduct = { id: 42, full_name: 'Oat Milk 1L' } as OdaSearchResponse['results'][0];
      const client = makeClient({
        searchProducts: jest.fn().mockResolvedValue({ results: [mockProduct], count: 1, query: 'oat milk' } as OdaSearchResponse),
      });
      const plugin = createOpenClawPlugin(client);
      const list = await plugin.buildShoppingList('Test', [{ query: 'oat milk', quantity: 2 }]);
      expect(list.name).toBe('Test');
      expect(list.items).toEqual([{ productId: 42, quantity: 2 }]);
    });

    it('skips queries with no results', async () => {
      const client = makeClient({
        searchProducts: jest.fn().mockResolvedValue({ results: [], count: 0, query: 'xyz' } as OdaSearchResponse),
      });
      const plugin = createOpenClawPlugin(client);
      const list = await plugin.buildShoppingList('Empty', [{ query: 'xyz', quantity: 1 }]);
      expect(list.items).toHaveLength(0);
    });
  });

  describe('findCheapestDeliverySlot', () => {
    it('returns undefined when no slots available', async () => {
      const client = makeClient({
        getDeliverySlots: jest.fn().mockResolvedValue([] as OdaDeliverySlot[]),
      });
      const plugin = createOpenClawPlugin(client);
      const slot = await plugin.findCheapestDeliverySlot();
      expect(slot).toBeUndefined();
    });

    it('returns the cheapest available slot', async () => {
      const slots: OdaDeliverySlot[] = [
        { id: 1, start: '2024-01-01T10:00:00Z', end: '2024-01-01T12:00:00Z', price: '49.00', currency: 'NOK', is_available: true },
        { id: 2, start: '2024-01-01T14:00:00Z', end: '2024-01-01T16:00:00Z', price: '29.00', currency: 'NOK', is_available: true },
        { id: 3, start: '2024-01-01T16:00:00Z', end: '2024-01-01T18:00:00Z', price: '99.00', currency: 'NOK', is_available: false },
      ];
      const client = makeClient({
        getDeliverySlots: jest.fn().mockResolvedValue(slots),
      });
      const plugin = createOpenClawPlugin(client);
      const slot = await plugin.findCheapestDeliverySlot();
      expect(slot?.id).toBe(2);
    });
  });

  describe('prepareCart', () => {
    it('calls addToCart for each item', async () => {
      const addToCart = jest.fn().mockResolvedValue({});
      const client = makeClient({ addToCart });
      const plugin = createOpenClawPlugin(client);
      await plugin.prepareCart({
        name: 'Test',
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
      });
      expect(addToCart).toHaveBeenCalledTimes(2);
      expect(addToCart).toHaveBeenCalledWith(1, 2);
      expect(addToCart).toHaveBeenCalledWith(2, 1);
    });
  });
});
