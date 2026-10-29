import { z } from 'zod';

export const PORTS = { server: 4200, mcp: 4300, web: 5180, postgres: 5433 } as const;

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
