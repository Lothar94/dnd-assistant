import { describe, expect, it } from 'vitest';
import { healthResponseSchema, PORTS } from '../src/index.js';

describe('shared contracts', () => {
  it('accepts a valid health response', () => {
    expect(healthResponseSchema.parse({ status: 'ok', service: 'server' }).status).toBe('ok');
  });

  it('rejects an unknown status', () => {
    expect(healthResponseSchema.safeParse({ status: 'down', service: 'server' }).success).toBe(false);
  });

  it('does not use the ports reserved by other tools', () => {
    expect(Object.values(PORTS)).not.toContain(4100);
    expect(Object.values(PORTS)).not.toContain(5173);
  });
});
