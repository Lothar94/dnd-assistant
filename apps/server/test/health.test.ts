import { healthResponseSchema } from '@dnd/shared';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = await buildApp({ WEB_ORIGIN: 'http://localhost:5180' });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(healthResponseSchema.parse(res.json()).service).toBe('server');
  });

  it('returns 404 for unknown routes', async () => {
    const app = await buildApp({ WEB_ORIGIN: 'http://localhost:5180' });
    expect((await app.inject({ method: 'GET', url: '/nope' })).statusCode).toBe(404);
  });
});

describe('loadConfig', () => {
  it('defaults to port 4200', () => {
    expect(loadConfig({}).SERVER_PORT).toBe(4200);
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ SERVER_PORT: 'abc' })).toThrow();
  });
});
