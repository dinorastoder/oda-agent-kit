import { OdaClient } from '@oda-agent/core';
import entry, { activate, register } from '../entry';
import type { OpenClawApi, OpenClawToolDefinition } from '../entry';

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
      registerTool: (tool: OpenClawToolDefinition) => {
        registeredTools.push(tool.name);
      },
      getConfig: () => ({}),
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
      registerTool: (tool: OpenClawToolDefinition) => {
        handlers.set(tool.name, (params: unknown) => tool.execute('test-call', params));
      },
      getConfig: () => ({}),
    };

    const env = { ...process.env };
    delete env.ODA_EMAIL;
    delete env.ODA_PASSWORD;

    const replacedEnv = jest.replaceProperty(process, 'env', env);

    try {
      expect(() => entry.register(mockApi)).not.toThrow();
      await expect(handlers.get('getCart')?.({})).rejects.toThrow(
        /Set both ODA_EMAIL and ODA_PASSWORD in the environment before launching OpenClaw/,
      );
    } finally {
      replacedEnv.restore();
    }
  });

  it('uses environment credentials when a tool is invoked', async () => {
    const login = jest.spyOn(OdaClient.prototype, 'login').mockResolvedValue(undefined);
    const getCart = jest.spyOn(OdaClient.prototype, 'getCart').mockResolvedValue({
      id: 1,
      items: [],
      total_price: '0.00',
      currency: 'NOK',
      item_count: 0,
    });
    const handlers = new Map<string, (params: unknown) => Promise<unknown>>();

    const mockApi: OpenClawApi = {
      registerTool: (tool: OpenClawToolDefinition) => {
        handlers.set(tool.name, (params: unknown) => tool.execute('test-call', params));
      },
      getConfig: () => ({}),
    };

    const replacedEnv = jest.replaceProperty(process, 'env', {
      ...process.env,
      ODA_EMAIL: 'test@example.com',
      ODA_PASSWORD: 'test-password',
    });

    try {
      entry.register(mockApi);
      await expect(handlers.get('getCart')?.({})).resolves.toEqual({
        id: 1,
        items: [],
        total_price: '0.00',
        currency: 'NOK',
        item_count: 0,
      });
      expect(login).toHaveBeenCalledTimes(1);
      expect(getCart).toHaveBeenCalledTimes(1);
    } finally {
      replacedEnv.restore();
      login.mockRestore();
      getCart.mockRestore();
    }
  });
});
