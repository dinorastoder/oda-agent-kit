/**
 * OpenClaw native plugin entry.
 *
 * OpenClaw loads `dist/index.js` and expects a **default export** that is a
 * plugin entry object with `register()` and `activate()` methods.  This file
 * provides that entrypoint by registering every tool that the Oda shopping
 * assistant exposes, wired up to a lazily-authenticated OdaClient.
 *
 * The `definePluginEntry` helper is defined locally so that this package has
 * no runtime dependency on the OpenClaw SDK.  When the OpenClaw team publishes
 * `openclaw/plugin-sdk`, this file can be updated to import from there instead.
 */

import { OdaClient } from '@oda-agent/core';
import * as readOnlyTools from './tools/readOnlyTools.js';
import * as cartMutationTools from './tools/cartMutationTools.js';
import { readEnvironmentCredentials } from './credentials.js';
import { createOpenClawPlugin } from './plugin.js';
import type { GroceryRequest, ReviewAccountOptions } from './plugin.js';

// ---------------------------------------------------------------------------
// OpenClaw plugin API surface (mirrors openclaw/plugin-sdk types)
// ---------------------------------------------------------------------------

/**
 * Minimal OpenClaw plugin API surface passed to the `register()` callback.
 * The complete interface is defined by the OpenClaw runtime; only the
 * members used by this plugin are declared here.
 */
export interface OpenClawApi {
  /** Register a tool with the plugin runtime. */
  registerTool(tool: OpenClawToolDefinition): void;
  /** Return the plugin configuration provided by the user or environment. */
  getConfig(): Record<string, unknown>;
}

export interface OpenClawToolDefinition {
  name: string;
  label?: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute(toolCallId: string, params: unknown): Promise<unknown>;
}

/** Shape of an OpenClaw native plugin entry. */
export interface OpenClawPluginEntry {
  /** Unique identifier for the plugin (must match `openclaw.plugin.json` id). */
  id: string;
  /** Human-readable plugin name. */
  name: string;
  /** Short description of the plugin. */
  description: string;
  /**
   * Called once by the OpenClaw runtime during plugin installation.
   * Use the provided `api` to register all tools this plugin exposes.
   */
  register(api: OpenClawApi): void;
  /** Called once by the OpenClaw runtime when the plugin is activated. */
  activate(): void;
}

/**
 * Identity helper that mirrors `definePluginEntry` from the OpenClaw SDK.
 * Defined locally so the package has no runtime dependency on the OpenClaw SDK.
 */
function definePluginEntry(entry: OpenClawPluginEntry): OpenClawPluginEntry {
  return entry;
}

interface PluginRuntime {
  client: OdaClient;
  plugin: ReturnType<typeof createOpenClawPlugin>;
}

function registerTool(
  api: OpenClawApi,
  name: string,
  label: string,
  description: string,
  parameters: OpenClawToolDefinition['parameters'],
  handler: (params: Record<string, unknown>) => Promise<unknown>,
): void {
  api.registerTool({
    name,
    label,
    description,
    parameters,
    async execute(_toolCallId: string, params: unknown) {
      // Normalise params: OpenClaw may pass null/undefined when no arguments
      // are supplied by the caller, which would break Object.keys/entries
      // downstream. Coerce to a plain object to prevent TypeError.
      const safeParams: Record<string, unknown> =
        params != null && typeof params === 'object' && !Array.isArray(params)
          ? (params as Record<string, unknown>)
          : {};
      return handler(safeParams);
    },
  });
}

export function register(api: OpenClawApi): void {
  let runtimePromise: Promise<PluginRuntime> | null = null;
  let authenticatedRuntimePromise: Promise<PluginRuntime> | null = null;

  function getRuntime(): Promise<PluginRuntime> {
    if (runtimePromise === null) {
      runtimePromise = Promise.resolve()
        .then(() => {
          const credentials = readEnvironmentCredentials();
          const client = new OdaClient({ credentials });

          return {
            client,
            plugin: createOpenClawPlugin(client),
          };
        })
        .catch((error: unknown) => {
          runtimePromise = null;
          throw error;
        });
    }

    return runtimePromise;
  }

  async function ensureLoggedIn(): Promise<PluginRuntime> {
    if (authenticatedRuntimePromise === null) {
      authenticatedRuntimePromise = getRuntime()
        .then(async (runtime) => {
          await runtime.client.login();
          return runtime;
        })
        .catch((error: unknown) => {
          authenticatedRuntimePromise = null;
          throw error;
        });
    }

    return authenticatedRuntimePromise;
  }

  // ── Workflow-oriented tools ─────────────────────────────────────────────

  registerTool(
    api,
    'browse_oda_catalog',
    'Browse Catalog',
    'Search the Oda catalog with a short, easy-to-scan result list.',
    {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for the Oda catalog.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of products to return. Defaults to 5.',
        },
      },
      required: ['query'],
    },
    async (params) => {
      const query = typeof params['query'] === 'string' ? params['query'] : '';
      if (!query) {
        throw new Error('A search query is required. Provide a "query" parameter to browse the Oda catalog.');
      }
      const { client } = await ensureLoggedIn();
      return readOnlyTools.browseCatalog(client, {
        query,
        limit: typeof params['limit'] === 'number' ? params['limit'] : undefined,
      });
    },
  );

  registerTool(
    api,
    'review_shopping_overview',
    'Review Shopping Overview',
    'See the cart, saved lists, repeat buys, and delivery options together.',
    {
      type: 'object',
      properties: {
        includeCart: {
          type: 'boolean',
          description: 'Include a cart summary. Defaults to true.',
        },
        includeSavedLists: {
          type: 'boolean',
          description: 'Include saved shopping lists. Defaults to true.',
        },
        includeOrderHistory: {
          type: 'boolean',
          description: 'Include frequent purchase analysis. Defaults to true.',
        },
        includeDelivery: {
          type: 'boolean',
          description: 'Include delivery slot overview. Defaults to true.',
        },
        maxHistoryPages: {
          type: 'number',
          description: 'Maximum number of order-history pages to inspect.',
        },
        maxSavedLists: {
          type: 'number',
          description: 'Maximum number of saved lists to include.',
        },
        maxDeliverySlots: {
          type: 'number',
          description: 'Maximum number of delivery slots to include.',
        },
      },
    },
    async (params) => {
      const { plugin } = await ensureLoggedIn();
      return plugin.reviewAccount(params as ReviewAccountOptions);
    },
  );

  registerTool(
    api,
    'plan_grocery_list',
    'Plan Grocery List',
    'Turn grocery requests into a matched plan without changing the cart.',
    {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Plan name shown back to the user.',
        },
        requests: {
          type: 'array',
          description: 'Requested groceries to resolve into Oda products.',
          items: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Free-text grocery request.',
              },
              quantity: {
                type: 'number',
                description: 'Requested quantity. Defaults to 1.',
              },
            },
            required: ['query'],
          },
        },
      },
      required: ['name', 'requests'],
    },
    async (params) => {
      const { plugin } = await ensureLoggedIn();
      const name = typeof params['name'] === 'string' ? params['name'] : '';
      const rawRequests = Array.isArray(params['requests']) ? params['requests'] : [];
      const requests: GroceryRequest[] = rawRequests
        .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
        .map((r) => ({
          query: typeof r['query'] === 'string' ? r['query'] : '',
          quantity: typeof r['quantity'] === 'number' ? r['quantity'] : undefined,
        }))
        .filter((r) => r.query.length > 0);
      if (!name || requests.length === 0) {
        throw new Error('Both "name" and a non-empty "requests" array (each with a "query" string) are required to plan a grocery list.');
      }
      return plugin.planGroceries(name, requests);
    },
  );

  registerTool(
    api,
    'apply_cart_changes',
    'Apply Cart Changes',
    'Apply one confirmed cart change.',
    {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'Cart update mode.',
          enum: ['apply-plan', 'add-products', 'remove-products', 'clear-cart'],
        },
        plan: {
          type: 'object',
          description: 'Shopping plan to apply when mode is "apply-plan".',
          properties: {
            name: {
              type: 'string',
              description: 'Shopping-plan name.',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'number',
                    description: 'Oda product ID.',
                  },
                  quantity: {
                    type: 'number',
                    description: 'Quantity to add.',
                  },
                },
                required: ['productId', 'quantity'],
              },
            },
          },
          required: ['name', 'items'],
        },
        items: {
          type: 'array',
          description: 'Products to add when mode is "add-products".',
          items: {
            type: 'object',
            properties: {
              productId: {
                type: 'number',
                description: 'Oda product ID.',
              },
              quantity: {
                type: 'number',
                description: 'Quantity to add.',
              },
            },
            required: ['productId', 'quantity'],
          },
        },
        productIds: {
          type: 'array',
          description: 'Products to remove when mode is "remove-products".',
          items: {
            type: 'number',
          },
        },
      },
      required: ['mode'],
    },
    async (params) => {
      const { client } = await ensureLoggedIn();
      const mode = params['mode'];
      if (typeof mode !== 'string' || !['apply-plan', 'add-products', 'remove-products', 'clear-cart'].includes(mode)) {
        throw new Error('A valid "mode" is required: "apply-plan", "add-products", "remove-products", or "clear-cart".');
      }

      const updateParams: cartMutationTools.UpdateCartParams = {
        mode: mode as cartMutationTools.UpdateCartParams['mode'],
      };

      if (mode === 'apply-plan' && params['plan'] != null && typeof params['plan'] === 'object') {
        const rawPlan = params['plan'] as Record<string, unknown>;
        updateParams.plan = {
          name: typeof rawPlan['name'] === 'string' ? rawPlan['name'] : 'Unnamed plan',
          items: Array.isArray(rawPlan['items'])
            ? (rawPlan['items'] as Record<string, unknown>[])
                .filter((i) => typeof i['productId'] === 'number' && typeof i['quantity'] === 'number')
                .map((i) => ({ productId: i['productId'] as number, quantity: i['quantity'] as number }))
            : [],
        };
      }

      if (mode === 'add-products' && Array.isArray(params['items'])) {
        updateParams.items = (params['items'] as Record<string, unknown>[])
          .filter((i) => i != null && typeof i['productId'] === 'number' && typeof i['quantity'] === 'number')
          .map((i) => ({ productId: i['productId'] as number, quantity: i['quantity'] as number }));
      }

      if (mode === 'remove-products' && Array.isArray(params['productIds'])) {
        updateParams.productIds = (params['productIds'] as unknown[]).filter((id): id is number => typeof id === 'number');
      }

      return cartMutationTools.updateCart(client, updateParams);
    },
  );
}

export function activate(): void {
  // Lifecycle hook called when the plugin is activated by OpenClaw.
  // No additional setup is required for the Oda shopping assistant.
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

const pluginEntry = definePluginEntry({
  id: 'oda-groceries',
  name: 'Oda Groceries',
  description:
    'Browse groceries, review your shopping context, and apply confirmed cart changes.',
  register,
  activate,
});

export default pluginEntry;
