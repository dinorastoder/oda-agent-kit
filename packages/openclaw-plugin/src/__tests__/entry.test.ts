import { OdaClient } from '@oda-agent/core';
import entry, { activate, register } from '../entry';
import type { OpenClawApi, OpenClawToolDefinition } from '../entry';

describe('OpenClaw plugin entry', () => {
  it('exports a default plugin entry with id "oda-groceries"', () => {
    expect(entry.id).toBe('oda-groceries');
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
      'browse_oda_catalog',
      'review_shopping_overview',
      'plan_grocery_list',
      'apply_cart_changes',
    ];

    expect(registeredTools).toEqual(expect.arrayContaining(expectedTools));
    expect(registeredTools).toHaveLength(expectedTools.length);
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
      await expect(handlers.get('review_shopping_overview')?.({})).rejects.toThrow(
        /Set both ODA_EMAIL and ODA_PASSWORD in the environment before launching OpenClaw/,
      );
    } finally {
      replacedEnv.restore();
    }
  });

  it('uses environment credentials when a tool is invoked', async () => {
    const login = jest.spyOn(OdaClient.prototype, 'login').mockResolvedValue(undefined);
    const searchProducts = jest.spyOn(OdaClient.prototype, 'searchProducts').mockResolvedValue({
      query: 'milk',
      count: 1,
      results: [
        {
          id: 1,
          full_name: 'Whole Milk 1L',
          brand: 'Oda',
          name: 'Milk',
          front_url: '/products/1',
          gross_price: '29.90',
          gross_unit_price: '29.90',
          unit_price_quantity_abbreviation: 'L',
          unit_price_quantity_name: 'liter',
          currency: 'NOK',
          is_available: true,
          is_sponsored: false,
          promoted_product: false,
          images: [],
          discount: null,
          availability: {
            is_available: true,
            description: null,
          },
        },
      ],
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
      await expect(handlers.get('browse_oda_catalog')?.({ query: 'milk' })).resolves.toEqual({
        query: 'milk',
        totalMatches: 1,
        products: [
          {
            productId: 1,
            name: 'Whole Milk 1L',
            brand: 'Oda',
            price: '29.90',
            currency: 'NOK',
            available: true,
          },
        ],
      });
      expect(login).toHaveBeenCalledTimes(1);
      expect(searchProducts).toHaveBeenCalledWith('milk');
      const registeredToolLabels = new Map<string, string | undefined>();
      entry.register({
        registerTool: (tool: OpenClawToolDefinition) => {
          registeredToolLabels.set(tool.name, tool.label);
        },
        getConfig: () => ({}),
      });
      expect(registeredToolLabels.get('browse_oda_catalog')).toBe('Browse Catalog');
      expect(registeredToolLabels.get('review_shopping_overview')).toBe('Review Shopping Overview');
    } finally {
      replacedEnv.restore();
      login.mockRestore();
      searchProducts.mockRestore();
    }
  });
});
