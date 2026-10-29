import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'dnd-assistant', version: '0.1.0' });
  server.registerTool('ping', { description: 'Health check: replies with "pong".' }, async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }));
  return server;
}
