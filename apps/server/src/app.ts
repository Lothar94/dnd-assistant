import cors from '@fastify/cors';
import type { HealthResponse } from '@dnd/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config.js';

export async function buildApp(config: Pick<Config, 'WEB_ORIGIN'>): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: config.WEB_ORIGIN });
  app.get('/health', async (): Promise<HealthResponse> => ({ status: 'ok', service: 'server' }));
  return app;
}
