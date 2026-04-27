import type { OdaClient } from '@oda-agent/core';
import { updateCart } from '../tools/cartMutationTools';

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

describe('updateCart', () => {
  it('applies a shopping plan through a single tool call', async () => {
    const addToCart = jest.fn().mockResolvedValue({});
    const client = makeClient({ addToCart });

    const result = await updateCart(client, {
      mode: 'apply-plan',
      plan: {
        name: 'Weekly shop',
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
      },
    });

    expect(addToCart).toHaveBeenCalledTimes(2);
    expect(result.mode).toBe('apply-plan');
    expect(result.steps).toEqual([
      'Add 2× product #1.',
      'Add 1× product #2.',
    ]);
  });

  it('removes multiple products through a single tool call', async () => {
    const removeFromCart = jest.fn().mockResolvedValue(undefined);
    const client = makeClient({ removeFromCart });

    const result = await updateCart(client, {
      mode: 'remove-products',
      productIds: [11, 22],
    });

    expect(removeFromCart).toHaveBeenCalledWith(11);
    expect(removeFromCart).toHaveBeenCalledWith(22);
    expect(result.summary).toBe('Removed 2 product(s) from cart.');
  });
});