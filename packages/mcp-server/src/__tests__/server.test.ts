import { createOdaMcpServer } from '../server';
import { OdaClient } from '@oda-agent/core';

jest.mock('@oda-agent/core');

describe('createOdaMcpServer', () => {
  it('returns an McpServer instance', () => {
    const client = new OdaClient({
      credentials: { email: 'test@example.com', password: 'pass' },
    });
    const server = createOdaMcpServer(client);
    expect(server).toBeDefined();
  });
});
