import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { createMcpServer } from '../src/server.js';

async function connectedClient(): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer().connect(serverSide);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientSide);
  return client;
}

describe('mcp server', () => {
  it('lists the ping tool', async () => {
    const { tools } = await (await connectedClient()).listTools();
    expect(tools.map((t) => t.name)).toEqual(['ping']);
  });

  it('ping replies pong', async () => {
    const result = await (await connectedClient()).callTool({ name: 'ping', arguments: {} });
    expect(result.content).toEqual([{ type: 'text', text: 'pong' }]);
  });
});
