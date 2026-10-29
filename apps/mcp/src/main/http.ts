import { createServer } from 'node:http';
import { PORTS } from '@dnd/shared';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from '../server.js';

const port = Number(process.env.MCP_PORT ?? PORTS.mcp);
const host = process.env.MCP_HOST ?? '127.0.0.1';

// Stateless: one server + transport per request.
const http = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok","service":"mcp"}');
    return;
  }
  if (req.url !== '/mcp') {
    res.writeHead(404).end();
    return;
  }
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => void transport.close());
  await createMcpServer().connect(transport);
  await transport.handleRequest(req, res);
});

http.listen(port, host, () => console.log(`mcp listening on http://${host}:${port}/mcp`));
