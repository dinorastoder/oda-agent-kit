import 'dotenv/config';
import { Command } from 'commander';
import { OdaClient } from '@oda-agent/core';
import type { OdaDeliverySlot } from '@oda-agent/core';

function createClient(): OdaClient {
  const email = process.env['ODA_EMAIL'];
  const password = process.env['ODA_PASSWORD'];
  if (!email || !password) {
    console.error('Error: ODA_EMAIL and ODA_PASSWORD environment variables must be set.');
    process.exit(1);
  }
  return new OdaClient({
    credentials: { email, password },
    baseUrl: process.env['ODA_API_BASE_URL'],
  });
}

const program = new Command();

program
  .name('oda')
  .description('CLI for the Oda grocery API')
  .version('0.1.0');

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------
program
  .command('search <query>')
  .description('Search for products')
  .option('--json', 'Output raw JSON')
  .action(async (query: string, opts: { json?: boolean }) => {
    const client = createClient();
    await client.login();
    const results = await client.searchProducts(query);
    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
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
  .command('show')
  .description('Show the current cart')
  .option('--json', 'Output raw JSON')
  .action(async (opts: { json?: boolean }) => {
    const client = createClient();
    await client.login();
    const c = await client.getCart();
    if (opts.json) {
      console.log(JSON.stringify(c, null, 2));
    } else {
      console.log(`Cart total: ${c.total_price} ${c.currency} (${c.item_count} items)`);
      for (const item of c.items) {
        console.log(`  ${item.quantity}x ${item.product.full_name} — ${item.line_price}`);
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
program
  .command('orders')
  .description('List past orders')
  .option('--page <n>', 'Page number', '1')
  .option('--json', 'Output raw JSON')
  .action(async (opts: { page?: string; json?: boolean }) => {
    const client = createClient();
    await client.login();
    const page = parseInt(opts.page ?? '1', 10);
    const orders = await client.getOrders(page);
    if (opts.json) {
      console.log(JSON.stringify(orders, null, 2));
    } else {
      console.log(`Showing page ${page} of ${Math.ceil(orders.count / 20)} (${orders.count} total)`);
      for (const o of orders.results) {
        console.log(`  [${o.id}] ${o.delivery_date} — ${o.total_price} ${o.currency} (${o.status})`);
      }
    }
  });

// ---------------------------------------------------------------------------
// delivery-slots
// ---------------------------------------------------------------------------
program
  .command('delivery-slots')
  .description('List available delivery slots')
  .option('--json', 'Output raw JSON')
  .action(async (opts: { json?: boolean }) => {
    const client = createClient();
    await client.login();
    const slots = await client.getDeliverySlots();
    if (opts.json) {
      console.log(JSON.stringify(slots, null, 2));
    } else {
      const available = slots.filter((s: OdaDeliverySlot) => s.is_available);
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
