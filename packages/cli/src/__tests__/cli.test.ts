import { program } from '../cli';

describe('CLI program', () => {
  it('has the correct name', () => {
    expect(program.name()).toBe('oda');
  });

  it('has the correct version', () => {
    expect(program.version()).toBe('0.1.0');
  });

  it('registers expected subcommands', () => {
    const names = program.commands.map((c) => c.name());
    expect(names).toContain('search');
    expect(names).toContain('cart');
    expect(names).toContain('orders');
    expect(names).toContain('delivery-slots');
  });
});
