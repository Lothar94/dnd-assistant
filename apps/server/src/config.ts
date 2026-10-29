import { PORTS } from '@dnd/shared';
import { z } from 'zod';

const envSchema = z.object({
  SERVER_PORT: z.coerce.number().int().positive().default(PORTS.server),
  SERVER_HOST: z.string().default('127.0.0.1'),
  WEB_ORIGIN: z.string().default(`http://localhost:${PORTS.web}`),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return envSchema.parse(env);
}
