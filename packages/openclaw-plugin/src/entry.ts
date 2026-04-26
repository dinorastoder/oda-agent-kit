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
  /** Register a named tool with the plugin runtime. */
  registerTool(
    name: string,
    description: string,
    handler: (params: unknown) => Promise<unknown>,
  ): void;
  /** Return the plugin configuration provided by the user or environment. */
  getConfig(): Record<string, unknown>;
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

interface PluginCredentials {
  email: string;
  password: string;
}

interface PluginRuntime {
  client: OdaClient;
  plugin: ReturnType<typeof createOpenClawPlugin>;
}

function readConfiguredCredentials(config: Record<string, unknown>): PluginCredentials {
  const email = typeof config.email === 'string' ? config.email.trim() : '';
  const password = typeof config.password === 'string' ? config.password : '';

  if (!email || !password) {
    throw new Error(
      'Oda credentials are required before using this plugin. ' +
        'Set both the email and password fields in the plugin config.',
    );
  }

  return { email, password };
}

export function register(api: OpenClawApi): void {
  let runtime: PluginRuntime | null = null;
  let loginPromise: Promise<void> | null = null;

  function getRuntime(): PluginRuntime {
    if (runtime === null) {
      const credentials = readConfiguredCredentials(api.getConfig());
      const client = new OdaClient({ credentials });

      runtime = {
        client,
        plugin: createOpenClawPlugin(client),
      };
    }

    return runtime;
  }

  async function ensureLoggedIn(): Promise<PluginRuntime> {
    const currentRuntime = getRuntime();

    if (loginPromise === null) {
      loginPromise = currentRuntime.client.login();
    }

    await loginPromise;
    return currentRuntime;
  }

  // ── Read-only tools ─────────────────────────────────────────────────────

  api.registerTool(
    'searchProducts',
    'Search for products in the Oda catalogue by keyword.',
    async (params) => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.searchProducts(client, params as SearchProductsParams);
    },
  );

  api.registerTool(
    'getCart',
    'Retrieve the current shopping cart.',
    async () => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.getCart(client);
    },
  );

  api.registerTool(
    'getOrders',
    'Fetch paginated order history.',
    async (params) => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.getOrders(client, params as GetOrdersParams | undefined);
    },
  );

  api.registerTool(
    'getDeliverySlots',
    'List available delivery time slots.',
    async () => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.getDeliverySlots(client);
    },
  );

  api.registerTool(
    'getShoppingLists',
    "List the user's saved shopping lists.",
    async () => {
      const { client } = await ensureLoggedIn();
      return readOnlyTools.getShoppingLists(client);
    },
  );

  // ── Higher-level read-only helpers ──────────────────────────────────────

  api.registerTool(
    'analyseOrderHistory',
    'Analyse past orders and return a summary of frequently ordered products.',
    async (params) => {
      const { plugin } = await ensureLoggedIn();
      const p = params as { maxPages?: number } | undefined;
      return plugin.analyseOrderHistory(p?.maxPages);
    },
  );

  api.registerTool(
    'buildShoppingList',
    'Resolve plain-text queries into a structured shopping list without mutating the cart.',
    async (params) => {
      const { plugin } = await ensureLoggedIn();
      const p = params as { name: string; items: Array<{ query: string; quantity: number }> };
      return plugin.buildShoppingList(p.name, p.items);
    },
  );

  api.registerTool(
    'findCheapestDeliverySlot',
    'Return the cheapest available delivery slot without booking it.',
    async () => {
      const { plugin } = await ensureLoggedIn();
      return plugin.findCheapestDeliverySlot();
    },
  );

  // ── Cart-mutation tools (disabled by default in manifest) ───────────────

  api.registerTool(
    'addToCart',
    'Add a single product to the cart. Requires explicit user confirmation before use.',
    async (params) => {
      const { client } = await ensureLoggedIn();
      const p = params as { productId: number; quantity: number };
      return cartMutationTools.addToCart(client, p.productId, p.quantity);
    },
  );

  api.registerTool(
    'removeFromCart',
    'Remove an item from the cart by product ID. Requires explicit user confirmation before use.',
    async (params) => {
      const { client } = await ensureLoggedIn();
      const p = params as { productId: number };
      return cartMutationTools.removeFromCart(client, p.productId);
    },
  );

  api.registerTool(
    'clearCart',
    'Remove all items from the cart. Requires explicit user confirmation before use.',
    async () => {
      const { client } = await ensureLoggedIn();
      return cartMutationTools.clearCart(client);
    },
  );

  api.registerTool(
    'prepareCart',
    'Add all items from a shopping list to the cart. Requires explicit user confirmation before use.',
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
