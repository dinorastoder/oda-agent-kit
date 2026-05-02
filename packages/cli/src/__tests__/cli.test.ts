import { formatCartOutput, program } from '../cli';
import { version } from '../version';

function findCommand(path: string[]) {
  let current = program;

  for (const name of path) {
    const next = current.commands.find((command) => command.name() === name);
    if (!next) {
      return undefined;
    }
    current = next;
  }

  return current;
}

describe('CLI program', () => {
  it('has the correct name', () => {
    expect(program.name()).toBe('oda');
  });

  it('has the correct version', () => {
    expect(program.version()).toBe(version);
  });

  it('registers expected subcommands', () => {
    const names = program.commands.map((c) => c.name());
    expect(names).toContain('auth');
    expect(names).toContain('search');
    expect(names).toContain('cart');
    expect(names).toContain('orders');
    expect(names).toContain('lists');
    expect(names).toContain('slots');
  });

  it('registers the requested nested commands', () => {
    expect(findCommand(['auth', 'status'])).toBeDefined();
    expect(findCommand(['cart', 'get'])).toBeDefined();
    expect(findCommand(['orders', 'list'])).toBeDefined();
    expect(findCommand(['lists', 'list'])).toBeDefined();
    expect(findCommand(['lists', 'get'])).toBeDefined();
    expect(findCommand(['slots', 'list'])).toBeDefined();
  });

  it('supports json output on read commands', () => {
    const commandPaths = [
      ['auth', 'status'],
      ['search'],
      ['cart', 'get'],
      ['orders', 'list'],
      ['lists', 'list'],
      ['lists', 'get'],
      ['slots', 'list'],
    ];

    for (const path of commandPaths) {
      const command = findCommand(path);
      expect(command).toBeDefined();
      expect(command?.options.some((option) => option.long === '--json')).toBe(true);
    }
  });

  it('formats cart output with subtotal fee lines and total', () => {
    expect(
      formatCartOutput({
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
              front_url: '/products/42',
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
              availability: { is_available: true, description: null },
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
          { label: 'Tillegg for mindre bestilling', price: '199.00', kind: 'fee', details: null },
          { label: 'Leveringsemballasje', price: '11.70', kind: 'fee', details: null },
          { label: 'Total inkl. MVA', price: '240.70', kind: 'total', details: null },
        ],
        fee_lines: [
          { label: 'Tillegg for mindre bestilling', price: '199.00', kind: 'fee', details: null },
          { label: 'Leveringsemballasje', price: '11.70', kind: 'fee', details: null },
        ],
        total_price: '240.70',
        currency: 'NOK',
        item_count: 1,
      }),
    ).toEqual([
      'Cart (1 items)',
      '  1x Organic Avocados 2 pcs — 30.00 NOK (was 51.90 NOK) [Member discount]',
      '  1 vare — 51.90 NOK',
      '  Du sparer — -21.90 NOK',
      'Subtotal: 30.00 NOK',
      '  Tillegg for mindre bestilling — 199.00 NOK',
      '  Leveringsemballasje — 11.70 NOK',
      'Total: 240.70 NOK',
    ]);
  });
});
