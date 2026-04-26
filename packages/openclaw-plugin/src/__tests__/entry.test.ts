import entry, { activate, register } from '../entry';
import type { OpenClawApi } from '../entry';

describe('OpenClaw plugin entry', () => {
  it('exports a default plugin entry with id "@oda-agent/openclaw-plugin"', () => {
    expect(entry.id).toBe('@oda-agent/openclaw-plugin');
  });

  it('has a non-empty name', () => {
    expect(typeof entry.name).toBe('string');
    expect(entry.name.length).toBeGreaterThan(0);
  });

  it('has a non-empty description', () => {
    expect(typeof entry.description).toBe('string');
    expect(entry.description.length).toBeGreaterThan(0);
  });

  it('has a register function', () => {
    expect(typeof entry.register).toBe('function');
  });

  it('has an activate function', () => {
    expect(typeof entry.activate).toBe('function');
  });

  it('exports register and activate as named lifecycle hooks', () => {
    expect(register).toBe(entry.register);
    expect(activate).toBe(entry.activate);
  });

  it('activate is callable without throwing', () => {
    expect(() => entry.activate()).not.toThrow();
  });

  it('register calls api.registerTool for all expected tools', () => {
    const registeredTools: string[] = [];

    const mockApi: OpenClawApi = {
      registerTool: (name: string, _description: string, _handler: (params: unknown) => Promise<unknown>) => {
        registeredTools.push(name);
      },
      getConfig: () => ({ email: 'test@example.com', password: 'test-password' }),
    };

    entry.register(mockApi);

    const expectedTools = [
      'searchProducts',
      'getCart',
      'getOrders',
      'getDeliverySlots',
      'getShoppingLists',
      'analyseOrderHistory',
      'buildShoppingList',
      'findCheapestDeliverySlot',
      'addToCart',
      'removeFromCart',
      'clearCart',
      'prepareCart',
    ];

    for (const tool of expectedTools) {
      expect(registeredTools).toContain(tool);
    }
  });

  it('register succeeds without credentials and defers validation until tool use', async () => {
    const handlers = new Map<string, (params: unknown) => Promise<unknown>>();
    const mockApi: OpenClawApi = {
      registerTool: (name: string, _description: string, handler: (params: unknown) => Promise<unknown>) => {
        handlers.set(name, handler);
      },
      getConfig: () => ({}),
    };

    expect(() => entry.register(mockApi)).not.toThrow();
    await expect(handlers.get('getCart')?.({})).rejects.toThrow(
      /Set both the email and password fields in the plugin config/,
    );
  });
});
