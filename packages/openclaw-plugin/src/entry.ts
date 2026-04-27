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
import type { SearchProductsParams, GetOrdersParams } from './tools/readOnlyTools.js';
import * as readOnlyTools from './tools/readOnlyTools.js';
import * as cartMutationTools from './tools/cartMutationTools.js';
import { readEnvironmentCredentials } from './credentials.js';
import { createOpenClawPlugin } from './plugin.js';
import type { ShoppingList } from './plugin.js';

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
  description: string,
  parameters: OpenClawToolDefinition['parameters'],
  handler: (params: unknown) => Promise<unknown>,
): void {
  api.registerTool({
    name,
    description,
    parameters,
    async execute(_toolCallId: string, params: unknown) {
      return handler(params);
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

  // ── Read-only tools ─────────────────────────────────────────────────────

  registerTool(
    api,
    'searchProducts',
    'Search for products in the Oda catalogue by keyword.',
    {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for catalogue lookup.',
        },
      },
      required: ['query'],
    },
    async (params) => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.searchProducts(client, params as SearchProductsParams);
    },
  );

  registerTool(
    api,
    'getCart',
    'Retrieve the current shopping cart.',
    {
      type: 'object',
      properties: {},
    },
    async () => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.getCart(client);
    },
  );

  registerTool(
    api,
    'getOrders',
    'Fetch paginated order history.',
    {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          description: 'Page number to fetch. Defaults to 1.',
        },
      },
    },
    async (params) => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.getOrders(client, params as GetOrdersParams | undefined);
    },
  );

  registerTool(
    api,
    'getDeliverySlots',
    'List available delivery time slots.',
    {
      type: 'object',
      properties: {},
    },
    async () => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.getDeliverySlots(client);
    },
  );

  registerTool(
    api,
    'getShoppingLists',
    "List the user's saved shopping lists.",
    {
      type: 'object',
      properties: {},
    },
    async () => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.getShoppingLists(client);
    },
  );

  // ── Higher-level read-only helpers ──────────────────────────────────────

  registerTool(
    api,
    'analyseOrderHistory',
    'Analyse past orders and return a summary of frequently ordered products.',
    {
      type: 'object',
      properties: {
        maxPages: {
          type: 'number',
          description: 'Maximum number of order-history pages to inspect.',
        },
      },
    },
    async (params) => {
      const { plugin } = await ensureLoggedIn();
      const p = params as { maxPages?: number } | undefined;
      return plugin.analyseOrderHistory(p?.maxPages);
    },
  );

  registerTool(
    api,
    'buildShoppingList',
    'Resolve plain-text queries into a structured shopping list without mutating the cart.',
    {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Shopping-list name.',
        },
        items: {
          type: 'array',
          description: 'Requested items to resolve into Oda products.',
          items: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Free-text item query.',
              },
              quantity: {
                type: 'number',
                description: 'Requested quantity.',
              },
            },
            required: ['query', 'quantity'],
          },
        },
      },
      required: ['name', 'items'],
    },
    async (params) => {
      const { plugin } = await ensureLoggedIn();
      const p = params as { name: string; items: Array<{ query: string; quantity: number }> };
      return plugin.buildShoppingList(p.name, p.items);
    },
  );

  registerTool(
    api,
    'findCheapestDeliverySlot',
    'Return the cheapest available delivery slot without booking it.',
    {
      type: 'object',
      properties: {},
    },
    async () => {
      const { plugin } = await ensureLoggedIn();
      return plugin.findCheapestDeliverySlot();
    },
  );

  // ── Cart-mutation tools (disabled by default in manifest) ───────────────

  registerTool(
    api,
    'addToCart',
    'Add a single product to the cart. Requires explicit user confirmation before use.',
    {
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
    async (params) => {
      const { client } = await ensureLoggedIn();
      const p = params as { productId: number; quantity: number };
      return cartMutationTools.addToCart(client, p.productId, p.quantity);
    },
  );

  registerTool(
    api,
    'removeFromCart',
    'Remove an item from the cart by product ID. Requires explicit user confirmation before use.',
    {
      type: 'object',
      properties: {
        productId: {
          type: 'number',
          description: 'Oda product ID to remove.',
        },
      },
      required: ['productId'],
    },
    async (params) => {
      const { client } = await ensureLoggedIn();
      const p = params as { productId: number };
      return cartMutationTools.removeFromCart(client, p.productId);
    },
  );

  registerTool(
    api,
    'clearCart',
    'Remove all items from the cart. Requires explicit user confirmation before use.',
    {
      type: 'object',
      properties: {},
    },
    async () => {
      const { client } = await ensureLoggedIn();
      return cartMutationTools.clearCart(client);
    },
  );

  registerTool(
    api,
    'prepareCart',
    'Add all items from a shopping list to the cart. Requires explicit user confirmation before use.',
    {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Shopping-list name.',
        },
        items: {
          type: 'array',
          description: 'Resolved products to add to the cart.',
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
    async (params) => {
      const { client } = await ensureLoggedIn();
      return cartMutationTools.prepareCart(client, params as ShoppingList);
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
  id: '@oda-agent/openclaw-plugin',
  name: 'oda-shopping-assistant',
  description:
    'Oda grocery shopping assistant — safe cart planning, order history analysis, and delivery slot discovery.',
  register,
  activate,
});

export default pluginEntry;
