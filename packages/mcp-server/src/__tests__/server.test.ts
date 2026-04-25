import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  createOdaMcpServer,
  EMPTY_INPUT_SCHEMA_JSON,
  READ_ONLY_TOOL_NAMES,
  ZERO_ARGUMENT_TOOL_NAMES,
} from '../server';

function getTextResult(result: unknown): string {
  const content = (result as { content?: unknown }).content as Array<{ type: string; text?: string }> | undefined;
  const firstBlock = content?.[0];
  if (!firstBlock || firstBlock.type !== 'text' || typeof firstBlock.text !== 'string') {
    throw new Error('Expected a text content block.');
  }

  return firstBlock.text;
}

function createMockOdaClient(): Parameters<typeof createOdaMcpServer>[0] {
  return {
    searchProducts: jest.fn().mockResolvedValue({
      query: 'milk',
      count: 1,
      results: [],
    }),
    getProduct: jest.fn().mockResolvedValue({
      id: 123,
      full_name: 'Whole Milk 1L',
      brand: 'Oda',
      name: 'Whole Milk',
      front_url: 'https://example.com/product/123',
      gross_price: '29.90',
      gross_unit_price: '29.90',
      unit_price_quantity_abbreviation: 'l',
      unit_price_quantity_name: 'liter',
      currency: 'NOK',
      is_available: true,
      is_sponsored: false,
      promoted_product: false,
      images: [
        {
          thumbnail: { url: 'https://example.com/images/123-thumb.jpg' },
          small_thumbnail: { url: 'https://example.com/images/123-small.jpg' },
          large_thumbnail: { url: 'https://example.com/images/123-large.jpg' },
        },
      ],
      discount: null,
      availability: {
        is_available: true,
        description: null,
      },
    }),
    getCart: jest.fn().mockResolvedValue({
      id: 1,
      items: [],
      total_price: '0.00',
      currency: 'NOK',
      item_count: 0,
    }),
    getOrders: jest.fn().mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    }),
    getOrder: jest.fn().mockResolvedValue({
      id: 99,
      status: 'delivered',
      delivery_date: '2026-04-24',
      total_price: '399.00',
      currency: 'NOK',
      items: [],
    }),
    getShoppingLists: jest.fn().mockResolvedValue([]),
    getDeliverySlots: jest.fn().mockResolvedValue([]),
  };
}

async function connectTestClient(client: Parameters<typeof createOdaMcpServer>[0]) {
  const server = createOdaMcpServer(client, {
    authStatus: {
      configured: false,
      authenticated: false,
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcpClient = new Client({
    name: 'test-client',
    version: '0.1.0',
  });

  await Promise.all([server.connect(serverTransport), mcpClient.connect(clientTransport)]);

  return {
    server,
    mcpClient,
  };
}

describe('createOdaMcpServer', () => {
  it('registers the expected read-only Oda tools', async () => {
    const odaClient = createMockOdaClient();
    const { server, mcpClient } = await connectTestClient(odaClient);

    try {
      const { tools } = await mcpClient.listTools();
      const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

      expect(tools.map((tool) => tool.name)).toEqual([...READ_ONLY_TOOL_NAMES]);
      expect(tools).toHaveLength(READ_ONLY_TOOL_NAMES.length);
      expect(tools).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: 'add_to_cart' })]));

      for (const tool of tools) {
        expect(tool.annotations?.readOnlyHint).toBe(true);
        expect(tool.annotations?.destructiveHint).toBe(false);
        expect(tool.annotations?.idempotentHint).toBe(true);
      }

      for (const toolName of ZERO_ARGUMENT_TOOL_NAMES) {
        expect(toolsByName.get(toolName)?.inputSchema).toEqual(
          expect.objectContaining(EMPTY_INPUT_SCHEMA_JSON),
        );
      }
    } finally {
      await Promise.all([mcpClient.close(), server.close()]);
    }
  });

  it('returns auth status and product image payloads as text results', async () => {
    const odaClient = createMockOdaClient();
    const { server, mcpClient } = await connectTestClient(odaClient);

    try {
      const authResult = await mcpClient.callTool({
        name: 'oda_auth_status',
        arguments: {},
      });
      const productImageResult = await mcpClient.callTool({
        name: 'oda_get_product_image',
        arguments: { productId: 123 },
      });

      expect(JSON.parse(getTextResult(authResult))).toEqual({
        configured: false,
        authenticated: false,
      });
      expect(odaClient.getProduct).toHaveBeenCalledWith(123);
      expect(JSON.parse(getTextResult(productImageResult))).toEqual({
        productId: 123,
        front_url: 'https://example.com/product/123',
        images: [
          {
            thumbnail: { url: 'https://example.com/images/123-thumb.jpg' },
            small_thumbnail: { url: 'https://example.com/images/123-small.jpg' },
            large_thumbnail: { url: 'https://example.com/images/123-large.jpg' },
          },
        ],
      });
    } finally {
      await Promise.all([mcpClient.close(), server.close()]);
    }
  });
});
