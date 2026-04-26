import entry from '../entry';
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

  it('register uses ODA_EMAIL / ODA_PASSWORD env vars when config fields are absent', () => {
    const origEmail = process.env['ODA_EMAIL'];
    const origPassword = process.env['ODA_PASSWORD'];

    process.env['ODA_EMAIL'] = 'env@example.com';
    process.env['ODA_PASSWORD'] = 'env-secret';

    const registeredTools: string[] = [];
    const mockApi: OpenClawApi = {
      registerTool: (name: string) => { registeredTools.push(name); },
      getConfig: () => ({}),
    };

    // Should not throw even with empty config (credentials come from env vars)
    expect(() => entry.register(mockApi)).not.toThrow();
    expect(registeredTools.length).toBeGreaterThan(0);

    // Restore env
    if (origEmail === undefined) {
      delete process.env['ODA_EMAIL'];
    } else {
      process.env['ODA_EMAIL'] = origEmail;
    }
    if (origPassword === undefined) {
      delete process.env['ODA_PASSWORD'];
    } else {
      process.env['ODA_PASSWORD'] = origPassword;
    }
  });
});
