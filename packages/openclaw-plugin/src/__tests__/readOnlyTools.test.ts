import type { OdaClient, OdaSearchResponse, OdaCart, OdaPage, OdaOrder, OdaDeliverySlot, OdaShoppingList } from '@oda-agent/core';
import {
  searchProducts,
  getCart,
  getOrders,
  getDeliverySlots,
  getShoppingLists,
} from '../tools/readOnlyTools';

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
    getShoppingLists: jest.fn(),
    ...overrides,
  } as unknown as OdaClient;
}

describe('readOnlyTools', () => {
  describe('searchProducts', () => {
    it('delegates to client.searchProducts with the query', async () => {
      const mockResponse: OdaSearchResponse = { results: [], count: 0, query: 'milk' };
      const client = makeClient({
        searchProducts: jest.fn().mockResolvedValue(mockResponse),
      });
      const result = await searchProducts(client, { query: 'milk' });
      expect(client.searchProducts).toHaveBeenCalledWith('milk');
      expect(result).toBe(mockResponse);
    });
  });

  describe('getCart', () => {
    it('delegates to client.getCart', async () => {
      const mockCart: OdaCart = { id: 1, items: [], total_price: '0.00', currency: 'NOK', item_count: 0 };
      const client = makeClient({
        getCart: jest.fn().mockResolvedValue(mockCart),
      });
      const result = await getCart(client);
      expect(client.getCart).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockCart);
    });
  });

  describe('getOrders', () => {
    it('delegates to client.getOrders with page 1 by default', async () => {
      const mockPage: OdaPage<OdaOrder> = { count: 0, next: null, previous: null, results: [] };
      const client = makeClient({
        getOrders: jest.fn().mockResolvedValue(mockPage),
      });
      const result = await getOrders(client);
      expect(client.getOrders).toHaveBeenCalledWith(1);
      expect(result).toBe(mockPage);
    });

    it('passes explicit page number to client.getOrders', async () => {
      const mockPage: OdaPage<OdaOrder> = { count: 0, next: null, previous: null, results: [] };
      const client = makeClient({
        getOrders: jest.fn().mockResolvedValue(mockPage),
      });
      await getOrders(client, { page: 3 });
      expect(client.getOrders).toHaveBeenCalledWith(3);
    });
  });

  describe('getDeliverySlots', () => {
    it('delegates to client.getDeliverySlots', async () => {
      const mockSlots: OdaDeliverySlot[] = [
        { id: 1, start: '2024-01-01T10:00:00Z', end: '2024-01-01T12:00:00Z', price: '49.00', currency: 'NOK', is_available: true },
      ];
      const client = makeClient({
        getDeliverySlots: jest.fn().mockResolvedValue(mockSlots),
      });
      const result = await getDeliverySlots(client);
      expect(client.getDeliverySlots).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockSlots);
    });
  });

  describe('getShoppingLists', () => {
    it('delegates to client.getShoppingLists', async () => {
      const mockLists: OdaShoppingList[] = [
        { id: 10, name: 'Weekly', items: [] },
      ];
      const client = makeClient({
        getShoppingLists: jest.fn().mockResolvedValue(mockLists),
      });
      const result = await getShoppingLists(client);
      expect(client.getShoppingLists).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockLists);
    });
  });
});
