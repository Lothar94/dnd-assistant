import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ScratchDb } from './scratch-db.js';

const SCHEMA_TABLES = [
  'chunks',
  'conversations',
  'documents',
  'entities',
  'entity_relations',
  'figures',
  'messages',
  'sections',
];
const APP_TABLES = ['schema_migrations', ...SCHEMA_TABLES].sort();

async function columnType(db: ScratchDb, table: string, column: string): Promise<string> {
  const { rows } = await db.client.query<{ t: string }>(
    `SELECT format_type(atttypid, atttypmod) AS t FROM pg_attribute
      WHERE attrelid = $1::regclass AND attname = $2`,
    [table, column],
  );
  return rows[0]!.t;
}

async function explain(db: ScratchDb, sql: string, params: unknown[] = []): Promise<string> {
  await db.client.query('SET enable_seqscan = off');
  const { rows } = await db.client.query<Record<string, string>>(`EXPLAIN ${sql}`, params);
  return rows.map((r) => r['QUERY PLAN']).join('\n');
}

describe('migrations up/down', () => {
  let db: ScratchDb;
  beforeAll(async () => {
    db = await ScratchDb.create();
  });
  afterAll(async () => {
    await db.drop();
  });

  it('up creates every table and is idempotent', async () => {
    db.dbmate('up');
    expect(await db.tables()).toEqual(APP_TABLES);
    expect(() => db.dbmate('up')).not.toThrow();
    expect(await db.tables()).toEqual(APP_TABLES);
  });

  it('down reverts everything and up can be re-applied', async () => {
    db.dbmate('rollback-all');
    expect(await db.tables()).toEqual(['schema_migrations']);
    const { rows } = await db.client.query(`SELECT 1 FROM pg_proc WHERE proname = 'dnd_embedding_dim'`);
    expect(rows).toHaveLength(0);
    db.dbmate('up');
    expect(await db.tables()).toEqual(APP_TABLES);
  });

  it('a single down only reverts the latest migration', async () => {
    db.dbmate('down');
    expect(await db.tables()).toEqual(APP_TABLES.filter((t) => t !== 'conversations' && t !== 'messages'));
    db.dbmate('up');
  });
});

describe('embedding dimension', () => {
  it('defaults to 1024', async () => {
    const db = await ScratchDb.create();
    try {
      db.dbmate('up');
      expect(await columnType(db, 'chunks', 'embedding')).toBe('halfvec(1024)');
      expect(await columnType(db, 'figures', 'embedding')).toBe('halfvec(1024)');
      expect(await columnType(db, 'figures', 'description_embedding')).toBe('halfvec(1024)');
    } finally {
      await db.drop();
    }
  });

  it('is parametrizable through dnd.embedding_dim', async () => {
    const db = await ScratchDb.create();
    try {
      db.dbmate('up', 768);
      expect(await columnType(db, 'chunks', 'embedding')).toBe('halfvec(768)');
      expect(await columnType(db, 'figures', 'embedding')).toBe('halfvec(768)');
    } finally {
      await db.drop();
    }
  });

  it('rejects dimensions outside the HNSW halfvec limit', async () => {
    const db = await ScratchDb.create();
    try {
      expect(() => db.dbmate('up', 5000)).toThrow();
      expect(await db.tables()).not.toContain('chunks');
    } finally {
      await db.drop();
    }
  });
});

describe('indexes and constraints', () => {
  const DIM = 8;
  let db: ScratchDb;
  let documentId: string;

  const vector = (x: number) => `[${[x, ...Array<number>(DIM - 1).fill(0.1)].join(',')}]`;

  beforeAll(async () => {
    db = await ScratchDb.create();
    db.dbmate('up', DIM);
    const doc = await db.client.query<{ id: string }>(
      `INSERT INTO documents (slug, title, source_path, sha256)
       VALUES ('dmg', 'Guía del Dungeon Master', 'data/raw/dmg.pdf', 'abc') RETURNING id`,
    );
    documentId = doc.rows[0]!.id;
    const contents = [
      'Los dragones rojos escupen fuego',
      'El conjuro bola de fuego causa daño',
      'Las pociones curan heridas',
    ];
    for (const [i, content] of contents.entries()) {
      await db.client.query(
        `INSERT INTO chunks (document_id, position, page, content, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
        [documentId, i, i + 1, content, vector(i)],
      );
    }
    await db.client.query('ANALYZE chunks');
  });
  afterAll(async () => {
    await db.drop();
  });

  it('uses the HNSW index for cosine nearest-neighbour search', async () => {
    const plan = await explain(db, `SELECT id FROM chunks ORDER BY embedding <=> $1::halfvec LIMIT 2`, [
      vector(1),
    ]);
    expect(plan).toContain('Index Scan using chunks_embedding_hnsw');
  });

  it('uses the BM25 index for full-text search', async () => {
    const plan = await explain(
      db,
      `SELECT id, pdb.score(id) FROM chunks WHERE content ||| $1 ORDER BY pdb.score(id) DESC LIMIT 5`,
      ['dragon'],
    );
    expect(plan).toContain('ParadeDB');
    expect(plan).toContain('Index: chunks_bm25');
  });

  it('BM25 matches Spanish stems and ignores accents', async () => {
    const { rows } = await db.client.query<{ content: string }>(
      `SELECT content FROM chunks WHERE content ||| $1`,
      ['dragón'],
    );
    expect(rows.map((r) => r.content)).toEqual(['Los dragones rojos escupen fuego']);
    const stemmed = await db.client.query(`SELECT 1 FROM chunks WHERE content ||| $1`, ['conjuros']);
    expect(stemmed.rowCount).toBe(1);
  });

  it('rejects embeddings with the wrong dimension', async () => {
    await expect(
      db.client.query(
        `INSERT INTO chunks (document_id, position, page, content, embedding)
         VALUES ($1, 9, 1, 'x', '[1,2,3]')`,
        [documentId],
      ),
    ).rejects.toThrow(/dimensions/);
  });

  it('rejects non-array citations and unknown roles', async () => {
    const { rows } = await db.client.query<{ id: string }>(
      `INSERT INTO conversations (title) VALUES ('t') RETURNING id`,
    );
    const conversationId = rows[0]!.id;
    await expect(
      db.client.query(
        `INSERT INTO messages (conversation_id, role, content, citations)
         VALUES ($1, 'user', 'hola', '{}')`,
        [conversationId],
      ),
    ).rejects.toThrow(/citations/);
    await expect(
      db.client.query(`INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'bot', 'hola')`, [
        conversationId,
      ]),
    ).rejects.toThrow(/role/);
  });

  it('cascades document deletion and nulls chunk parents', async () => {
    const parent = await db.client.query<{ id: string }>(
      `INSERT INTO chunks (document_id, position, page, content) VALUES ($1, 20, 1, 'p') RETURNING id`,
      [documentId],
    );
    await db.client.query(
      `INSERT INTO chunks (document_id, parent_id, position, page, content) VALUES ($1, $2, 21, 1, 'c')`,
      [documentId, parent.rows[0]!.id],
    );
    await db.client.query(`DELETE FROM chunks WHERE id = $1`, [parent.rows[0]!.id]);
    const orphan = await db.client.query(`SELECT 1 FROM chunks WHERE content = 'c' AND parent_id IS NULL`);
    expect(orphan.rowCount).toBe(1);

    await db.client.query(`DELETE FROM documents WHERE id = $1`, [documentId]);
    const left = await db.client.query(`SELECT 1 FROM chunks`);
    expect(left.rowCount).toBe(0);
  });

  it('forbids self-relations and bad bounding boxes', async () => {
    const e = await db.client.query<{ id: string }>(
      `INSERT INTO entities (type, name) VALUES ('monster', 'Dragón Rojo') RETURNING id`,
    );
    const id = e.rows[0]!.id;
    await expect(
      db.client.query(`INSERT INTO entity_relations (source_id, target_id, relation) VALUES ($1, $1, 'x')`, [
        id,
      ]),
    ).rejects.toThrow(/check/);
    const doc = await db.client.query<{ id: string }>(
      `INSERT INTO documents (slug, title, source_path, sha256) VALUES ('mm', 'MM', 'p', 'def') RETURNING id`,
    );
    await expect(
      db.client.query(
        `INSERT INTO figures (document_id, path, page, bbox) VALUES ($1, 'a.png', 1, '{1,2,3}')`,
        [doc.rows[0]!.id],
      ),
    ).rejects.toThrow(/bbox/);
  });

  it('rejects empty or inverted bounding boxes and malformed section ranges', async () => {
    const doc = await db.client.query<{ id: string }>(
      `INSERT INTO documents (slug, title, source_path, sha256) VALUES ('x', 'X', 'p', 'ghi') RETURNING id`,
    );
    const documentId = doc.rows[0]!.id;
    for (const bbox of ['{}', '{4,3,2,1}']) {
      await expect(
        db.client.query(`INSERT INTO figures (document_id, path, page, bbox) VALUES ($1, $2, 1, $3)`, [
          documentId,
          `f-${bbox}.png`,
          bbox,
        ]),
      ).rejects.toThrow(/bbox/);
    }
    const section = (path: string, pageStart: number | null, pageEnd: number | null) =>
      db.client.query(
        `INSERT INTO sections (document_id, level, title, heading_path, position, page_start, page_end)
         VALUES ($1, 1, 't', $2, 0, $3, $4)`,
        [documentId, path, pageStart, pageEnd],
      );
    await expect(section('{}', 1, 2)).rejects.toThrow(/heading_path/);
    await expect(section('{a}', null, 2)).rejects.toThrow(/sections_check/);
    await expect(section('{a}', 3, 2)).rejects.toThrow(/sections_check/);
    await expect(section('{a}', 1, 2)).resolves.toBeDefined();
  });
});
