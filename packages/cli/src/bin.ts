#!/usr/bin/env node
import { program } from './cli.js';

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
