import { program } from '../cli';

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
    expect(program.version()).toBe('0.1.0');
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
    expect(findCommand(['slots', 'list'])).toBeDefined();
  });

  it('supports json output on read commands', () => {
    const commandPaths = [
      ['auth', 'status'],
      ['search'],
      ['cart', 'get'],
      ['orders', 'list'],
      ['lists', 'list'],
      ['slots', 'list'],
    ];

    for (const path of commandPaths) {
      const command = findCommand(path);
      expect(command).toBeDefined();
      expect(command?.options.some((option) => option.long === '--json')).toBe(true);
    }
  });
});
