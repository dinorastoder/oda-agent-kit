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
      label: null,
      display_price: null,
      subtotal_price: '0.00',
      summary_lines: [],
      fee_lines: [],
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

      expect(tools.map((tool) => tool.name).sort()).toEqual([...READ_ONLY_TOOL_NAMES].sort());
      expect(tools).toHaveLength(READ_ONLY_TOOL_NAMES.length);
      expect(tools).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: 'add_to_cart' })]));

      for (const tool of tools) {
        expect(tool.annotations?.readOnlyHint).toBe(true);
        expect(tool.annotations?.destructiveHint).toBe(false);
        expect(tool.annotations?.idempotentHint).toBe(true);
      }

      for (const toolName of ZERO_ARGUMENT_TOOL_NAMES) {
        expect(toolsByName.get(toolName)?.inputSchema).toEqual(EMPTY_INPUT_SCHEMA_JSON);
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

  it('returns enriched cart pricing breakdowns for oda_get_cart', async () => {
    const odaClient = createMockOdaClient();
    odaClient.getCart = jest.fn().mockResolvedValue({
      id: 1,
      items: [
        {
          id: 10,
          quantity: 1,
          line_price: '30.00',
          original_line_price: '51.90',
          unit_price: '51.90',
          label: 'Member discount',
          product: {
            id: 42,
            full_name: 'Organic Avocados 2 pcs',
            brand: 'Oda',
            name: 'Organic Avocados',
            front_url: 'https://example.com/product/42',
            gross_price: '51.90',
            gross_unit_price: '51.90',
            unit_price_quantity_abbreviation: 'pk',
            unit_price_quantity_name: 'pack',
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
        },
      ],
      label: '1 vare',
      display_price: '51.90',
      subtotal_price: '30.00',
      summary_lines: [
        { label: '1 vare', price: '51.90', kind: 'item', details: null },
        { label: 'Du sparer', price: '-21.90', kind: 'discount', details: null },
        { label: 'Delsum', price: '30.00', kind: 'subtotal', details: null },
        { label: 'Tillegg for mindre bestilling', price: '199.00', kind: 'fee', details: 'Under threshold fee' },
        { label: 'Leveringsemballasje', price: '11.70', kind: 'fee', details: 'Packaging fee' },
        { label: 'Total inkl. MVA', price: '240.70', kind: 'total', details: null },
      ],
      fee_lines: [
        { label: 'Tillegg for mindre bestilling', price: '199.00', kind: 'fee', details: 'Under threshold fee' },
        { label: 'Leveringsemballasje', price: '11.70', kind: 'fee', details: 'Packaging fee' },
      ],
      total_price: '240.70',
      currency: 'NOK',
      item_count: 1,
    });
    const { server, mcpClient } = await connectTestClient(odaClient);

    try {
      const cartResult = await mcpClient.callTool({
        name: 'oda_get_cart',
        arguments: {},
      });

      expect(JSON.parse(getTextResult(cartResult))).toEqual({
        id: 1,
        items: [
          expect.objectContaining({
            id: 10,
            line_price: '30.00',
            original_line_price: '51.90',
            unit_price: '51.90',
            label: 'Member discount',
          }),
        ],
        label: '1 vare',
        display_price: '51.90',
        subtotal_price: '30.00',
        summary_lines: [
          { label: '1 vare', price: '51.90', kind: 'item', details: null },
          { label: 'Du sparer', price: '-21.90', kind: 'discount', details: null },
          { label: 'Delsum', price: '30.00', kind: 'subtotal', details: null },
          { label: 'Tillegg for mindre bestilling', price: '199.00', kind: 'fee', details: 'Under threshold fee' },
          { label: 'Leveringsemballasje', price: '11.70', kind: 'fee', details: 'Packaging fee' },
          { label: 'Total inkl. MVA', price: '240.70', kind: 'total', details: null },
        ],
        fee_lines: [
          { label: 'Tillegg for mindre bestilling', price: '199.00', kind: 'fee', details: 'Under threshold fee' },
          { label: 'Leveringsemballasje', price: '11.70', kind: 'fee', details: 'Packaging fee' },
        ],
        total_price: '240.70',
        currency: 'NOK',
        item_count: 1,
      });
    } finally {
      await Promise.all([mcpClient.close(), server.close()]);
    }
  });
});
