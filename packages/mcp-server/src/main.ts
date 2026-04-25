#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OdaClient } from '@oda-agent/core';
import { createOdaMcpServer } from './server.js';

export async function startServer(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const email = env['ODA_EMAIL'];
  const password = env['ODA_PASSWORD'];

  if ((email && !password) || (!email && password)) {
    throw new Error('ODA_EMAIL and ODA_PASSWORD must either both be set or both be omitted.');
  }

  const credentials = email && password ? { email, password } : undefined;
  const client = new OdaClient({
    credentials,
    baseUrl: env['ODA_API_BASE_URL'],
  });

  let authenticated = false;
  if (credentials) {
    await client.login();
    authenticated = true;
  } else {
    console.error('Starting MCP server without Oda credentials (unauthenticated mode).');
  }

  const server = createOdaMcpServer(client, {
    authStatus: {
      configured: Boolean(credentials),
      authenticated,
    },
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export async function runCli(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  try {
    await startServer(env);
  } catch (err: unknown) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

if (require.main === module) {
  void import('dotenv/config')
    .then(() => runCli())
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
