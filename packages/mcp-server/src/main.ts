#!/usr/bin/env node
import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OdaClient } from '@oda-agent/core';
import { createOdaMcpServer } from './server.js';

async function main(): Promise<void> {
  const email = process.env['ODA_EMAIL'];
  const password = process.env['ODA_PASSWORD'];
  if (!email || !password) {
    console.error('Error: ODA_EMAIL and ODA_PASSWORD environment variables must be set.');
    process.exit(1);
  }

  const client = new OdaClient({
    credentials: { email, password },
    baseUrl: process.env['ODA_API_BASE_URL'],
  });
  await client.login();

  const server = createOdaMcpServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
