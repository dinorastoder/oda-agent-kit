import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OdaDeliverySlot } from '@oda-agent/core';
import { OdaClient } from '@oda-agent/core';

/**
 * Build and configure an MCP server with Oda tools.
 *
 * @param client - An already-authenticated OdaClient instance.
 */
export function createOdaMcpServer(client: OdaClient): McpServer {
  const server = new McpServer({
    name: 'oda-agent',
    version: '0.1.0',
  });

  // -------------------------------------------------------------------------
  // Tool: search_products
  // -------------------------------------------------------------------------
  server.registerTool(
    'search_products',
    {
      description: 'Search Oda grocery for products matching a query string.',
      inputSchema: { query: z.string().describe('The search term, e.g. "oat milk"') },
    },
    async ({ query }) => {
      const response = await client.searchProducts(query);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response.results, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: get_cart
  // -------------------------------------------------------------------------
  server.registerTool(
    'get_cart',
    { description: 'Retrieve the current Oda shopping cart.' },
    async () => {
      const cart = await client.getCart();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(cart, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: add_to_cart
  // -------------------------------------------------------------------------
  server.registerTool(
    'add_to_cart',
    {
      description: 'Add a product to the Oda cart by product ID and quantity.',
      inputSchema: {
        product_id: z.number().int().positive().describe('The Oda product ID'),
        quantity: z.number().int().positive().describe('Number of units to add'),
      },
    },
    async ({ product_id, quantity }) => {
      const item = await client.addToCart(product_id, quantity);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Added ${item.quantity}x ${item.product.full_name} to cart.`,
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: get_orders
  // -------------------------------------------------------------------------
  server.registerTool(
    'get_orders',
    {
      description: 'Retrieve a page of past Oda orders.',
      inputSchema: {
        page: z.number().int().positive().default(1).describe('Page number (default: 1)'),
      },
    },
    async ({ page }) => {
      const orders = await client.getOrders(page);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(orders, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: get_delivery_slots
  // -------------------------------------------------------------------------
  server.registerTool(
    'get_delivery_slots',
    { description: 'List available Oda delivery time slots.' },
    async () => {
      const slots = await client.getDeliverySlots();
      const available = slots.filter((s: OdaDeliverySlot) => s.is_available);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(available, null, 2),
          },
        ],
      };
    },
  );

  return server;
}
