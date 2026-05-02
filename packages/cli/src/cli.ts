import 'dotenv/config';
import { Command } from 'commander';
import { OdaClient } from '@oda-agent/core';
import type { OdaCart, OdaDeliverySlot } from '@oda-agent/core';
import { version } from './version.js';

type JsonOption = {
  json?: boolean;
};

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function formatCartOutput(cart: OdaCart): string[] {
  const lines = [`Cart (${cart.item_count} items)`];

  if (cart.items.length === 0) {
    lines.push('  No visible items in cart.');
  } else {
    for (const item of cart.items) {
      const originalLinePrice = item.original_line_price ? ` (was ${item.original_line_price} ${cart.currency})` : '';
      const label = item.label ? ` [${item.label}]` : '';
      lines.push(`  ${item.quantity}x ${item.product.full_name} — ${item.line_price} ${cart.currency}${originalLinePrice}${label}`);
    }
  }

  for (const summaryLine of cart.summary_lines) {
    if (summaryLine.kind === 'item' || summaryLine.kind === 'discount') {
      lines.push(`  ${summaryLine.label} — ${summaryLine.price} ${cart.currency}`);
    }
  }

  lines.push(`Subtotal: ${cart.subtotal_price} ${cart.currency}`);

  for (const feeLine of cart.fee_lines) {
    lines.push(`  ${feeLine.label} — ${feeLine.price} ${cart.currency}`);
  }

  lines.push(`Total: ${cart.total_price} ${cart.currency}`);

  return lines;
}

function hasCredentials(): boolean {
  return Boolean(process.env['ODA_EMAIL'] && process.env['ODA_PASSWORD']);
}

function createClient(): OdaClient {
  if (!hasCredentials()) {
    console.error('Error: ODA_EMAIL and ODA_PASSWORD environment variables must be set.');
    process.exit(1);
  }

  const email = process.env['ODA_EMAIL'] as string;
  const password = process.env['ODA_PASSWORD'] as string;

  return new OdaClient({
    credentials: { email, password },
    baseUrl: process.env['ODA_API_BASE_URL'],
  });
}

const program = new Command();

program
  .name('oda')
  .description('CLI for the Oda grocery API')
  .version(version);

const auth = program.command('auth').description('Authentication helpers');

auth
  .command('status')
  .description('Show whether CLI authentication is configured')
  .option('--json', 'Output raw JSON')
  .action((opts: JsonOption) => {
    const status = {
      configured: hasCredentials(),
      baseUrl: process.env['ODA_API_BASE_URL'] ?? null,
    };

    if (opts.json) {
      printJson(status);
      return;
    }

    console.log(
      status.configured
        ? 'Credentials are configured via environment variables.'
        : 'Credentials are not configured. Set ODA_EMAIL and ODA_PASSWORD.',
    );

    if (status.baseUrl) {
      console.log(`Using API base URL override: ${status.baseUrl}`);
    }
  });

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------
program
  .command('search <query>')
  .description('Search for products')
  .option('--json', 'Output raw JSON')
  .action(async (query: string, opts: JsonOption) => {
    const client = createClient();
    await client.login();
    const results = await client.searchProducts(query);
    if (opts.json) {
      printJson(results);
    } else {
      if (results.results.length === 0) {
        console.log('No products found.');
      } else {
        for (const p of results.results) {
          console.log(`[${p.id}] ${p.full_name} — ${p.gross_price} ${p.currency}`);
        }
      }
    }
  });

// ---------------------------------------------------------------------------
// cart
// ---------------------------------------------------------------------------
const cart = program.command('cart').description('Cart management');

cart
  .command('get')
  .alias('show')
  .description('Get the current cart')
  .option('--json', 'Output raw JSON')
  .action(async (opts: JsonOption) => {
    const client = createClient();
    await client.login();
    const c = await client.getCart();
    if (opts.json) {
      printJson(c);
    } else {
      for (const line of formatCartOutput(c)) {
        console.log(line);
      }
    }
  });

cart
  .command('add <productId> <quantity>')
  .description('Add a product to the cart')
  .action(async (productId: string, quantity: string) => {
    const client = createClient();
    await client.login();
    const item = await client.addToCart(parseInt(productId, 10), parseInt(quantity, 10));
    console.log(`Added ${item.quantity}x ${item.product.full_name} to cart.`);
  });

cart
  .command('clear')
  .description('Clear the cart')
  .action(async () => {
    const client = createClient();
    await client.login();
    await client.clearCart();
    console.log('Cart cleared.');
  });

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------
const orders = program.command('orders').description('Order history');

orders
  .command('list')
  .description('List past orders')
  .option('--page <n>', 'Page number', '1')
  .option('--json', 'Output raw JSON')
  .action(async (opts: { page?: string } & JsonOption) => {
    const client = createClient();
    await client.login();
    const page = parseInt(opts.page ?? '1', 10);
    const orders = await client.getOrders(page);
    if (opts.json) {
      printJson(orders);
    } else {
      console.log(`Showing page ${page} of ${Math.ceil(orders.count / 20)} (${orders.count} total)`);
      for (const o of orders.results) {
        console.log(`  [${o.id}] ${o.delivery_date} — ${o.total_price} ${o.currency} (${o.status})`);
      }
    }
  });

// ---------------------------------------------------------------------------
// lists
// ---------------------------------------------------------------------------
const lists = program.command('lists').description('Saved shopping lists');

lists
  .command('list')
  .description('List saved shopping list summaries')
  .option('--json', 'Output raw JSON')
  .action(async (opts: JsonOption) => {
    const client = createClient();
    await client.login();
    // Use the lightweight summary endpoint — avoids N+1 detail fetches just for item counts.
    const summaries = await client.getProductLists();
    if (opts.json) {
      printJson(summaries);
      return;
    }

    if (summaries.length === 0) {
      console.log('No shopping lists found.');
      return;
    }

    for (const list of summaries) {
      console.log(`[${list.id}] ${list.name} (${list.number_of_items} items)`);
    }
  });

lists
  .command('get <listId>')
  .description('Show full details of a shopping list')
  .option('--json', 'Output raw JSON')
  .action(async (listId: string, opts: JsonOption) => {
    const client = createClient();
    await client.login();
    const detail = await client.getProductList(parseInt(listId, 10));
    if (opts.json) {
      printJson(detail);
      return;
    }

    console.log(`[${detail.id}] ${detail.name} (${detail.items.length} items)`);
    for (const item of detail.items) {
      console.log(`  ${item.quantity}x ${item.product.full_name} — ${item.product.gross_price} ${item.product.currency}`);
    }
  });

// ---------------------------------------------------------------------------
// slots
// ---------------------------------------------------------------------------
const slots = program.command('slots').alias('delivery-slots').description('Delivery slot helpers');

slots
  .command('list')
  .description('List available delivery slots')
  .option('--json', 'Output raw JSON')
  .action(async (opts: JsonOption) => {
    const client = createClient();
    await client.login();
    const deliverySlots = await client.getDeliverySlots();
    if (opts.json) {
      printJson(deliverySlots);
    } else {
      const available = deliverySlots.filter((s: OdaDeliverySlot) => s.is_available);
      if (available.length === 0) {
        console.log('No available delivery slots.');
      } else {
        for (const s of available) {
          console.log(`  [${s.id}] ${s.start} → ${s.end} — ${s.price} ${s.currency}`);
        }
      }
    }
  });

export { program };
