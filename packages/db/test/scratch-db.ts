import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const DEFAULT_URL = 'postgres://dnd:dnd@127.0.0.1:5433/dnd?sslmode=disable';
const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));

function urlForDatabase(name: string): string {
  const url = new URL(process.env.DATABASE_URL ?? DEFAULT_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

/** Throwaway database so migration tests never touch the developer's data. */
export class ScratchDb {
  private constructor(
    readonly name: string,
    readonly url: string,
    readonly client: pg.Client,
  ) {}

  static async create(): Promise<ScratchDb> {
    const name = `dnd_test_${randomBytes(4).toString('hex')}`;
    const admin = new pg.Client({ connectionString: urlForDatabase('postgres') });
    await admin.connect();
    try {
      await admin.query(`CREATE DATABASE ${name}`);
    } finally {
      await admin.end();
    }
    const url = urlForDatabase(name);
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    return new ScratchDb(name, url, client);
  }

  /** Runs dbmate; `embeddingDim` is forwarded as the dnd.embedding_dim setting. */
  dbmate(command: 'up' | 'down' | 'rollback-all', embeddingDim?: number): void {
    const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: this.url };
    if (embeddingDim !== undefined) env.PGOPTIONS = `-c dnd.embedding_dim=${embeddingDim}`;
    const run = (cmd: string) =>
      execFileSync('pnpm', ['exec', 'dbmate', '--migrations-dir', './migrations', '--no-dump-schema', cmd], {
        cwd: PACKAGE_DIR,
        env,
        stdio: 'pipe',
      });
    if (command === 'rollback-all') {
      const count = Number(execFileSync('sh', ['-c', 'ls migrations/*.sql | wc -l'], { cwd: PACKAGE_DIR }));
      for (let i = 0; i < count; i++) run('down');
    } else {
      run(command);
    }
  }

  async tables(): Promise<string[]> {
    const { rows } = await this.client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys' ORDER BY 1`,
    );
    return rows.map((r) => r.tablename);
  }

  async drop(): Promise<void> {
    await this.client.end();
    const admin = new pg.Client({ connectionString: urlForDatabase('postgres') });
    await admin.connect();
    try {
      await admin.query(`DROP DATABASE IF EXISTS ${this.name} WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  }
}
