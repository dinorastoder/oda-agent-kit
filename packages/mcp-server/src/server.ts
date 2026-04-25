import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OdaClient } from '@oda-agent/core';

export const READ_ONLY_TOOL_NAMES = [
  'oda_auth_status',
  'oda_search_products',
  'oda_get_product',
  'oda_get_product_image',
  'oda_get_cart',
  'oda_get_orders',
  'oda_get_order_details',
  'oda_get_shopping_lists',
  'oda_get_delivery_slots',
] as const;

export const ZERO_ARGUMENT_TOOL_NAMES = [
  'oda_auth_status',
  'oda_get_cart',
  'oda_get_shopping_lists',
  'oda_get_delivery_slots',
] as const;

export interface OdaMcpServerOptions {
  authStatus?: {
    configured: boolean;
    authenticated: boolean;
  };
}

type OdaReadOnlyClient = Pick<
  OdaClient,
  'searchProducts' | 'getProduct' | 'getCart' | 'getOrders' | 'getOrder' | 'getShoppingLists' | 'getDeliverySlots'
>;

const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;

export const EMPTY_INPUT_SCHEMA = z.object({});
export const EMPTY_INPUT_SCHEMA_JSON = {
  additionalProperties: false,
  properties: {},
  type: 'object',
} as const;

function createJsonResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

/**
 * Build and configure an MCP server with Oda tools.
 *
 * @param client - An Oda client instance for read-only operations.
 */
export function createOdaMcpServer(client: OdaReadOnlyClient, options: OdaMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'oda-agent',
    version: '0.1.0',
  });

  server.registerTool(
    'oda_auth_status',
    {
      description: 'Report whether the MCP server has Oda credentials configured and authenticated.',
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async () =>
      createJsonResult(
        options.authStatus ?? {
          configured: false,
          authenticated: false,
        },
      ),
  );

  server.registerTool(
    'oda_search_products',
    {
      description: 'Search Oda grocery for products matching a query string.',
      inputSchema: z.object({
        query: z.string().min(1).describe('The search term, e.g. "oat milk"'),
      }),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ query }) => createJsonResult(await client.searchProducts(query)),
  );

  server.registerTool(
    'oda_get_product',
    {
      description: 'Retrieve a single Oda product by product ID.',
      inputSchema: z.object({
        productId: z.number().int().positive().describe('The Oda product ID'),
      }),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ productId }) => createJsonResult(await client.getProduct(productId)),
  );

  server.registerTool(
    'oda_get_product_image',
    {
      description: 'Retrieve the image metadata for a single Oda product.',
      inputSchema: z.object({
        productId: z.number().int().positive().describe('The Oda product ID'),
      }),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ productId }) => {
      const product = await client.getProduct(productId);
      return createJsonResult({
        productId: product.id,
        front_url: product.front_url,
        images: product.images,
      });
    },
  );

  server.registerTool(
    'oda_get_cart',
    {
      description: 'Retrieve the current Oda shopping cart.',
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async () => createJsonResult(await client.getCart()),
  );

  server.registerTool(
    'oda_get_orders',
    {
      description: 'Retrieve a page of past Oda orders.',
      inputSchema: z.object({
        page: z.number().int().positive().default(1).describe('Page number (default: 1)'),
      }),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ page }) => createJsonResult(await client.getOrders(page)),
  );

  server.registerTool(
    'oda_get_order_details',
    {
      description: 'Retrieve a single Oda order by order ID.',
      inputSchema: z.object({
        orderId: z.number().int().positive().describe('The Oda order ID'),
      }),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ orderId }) => createJsonResult(await client.getOrder(orderId)),
  );

  server.registerTool(
    'oda_get_shopping_lists',
    {
      description: 'Retrieve saved Oda shopping lists.',
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async () => createJsonResult(await client.getShoppingLists()),
  );

  server.registerTool(
    'oda_get_delivery_slots',
    {
      description: 'Retrieve Oda delivery slot availability.',
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async () => createJsonResult(await client.getDeliverySlots()),
  );

  return server;
}
