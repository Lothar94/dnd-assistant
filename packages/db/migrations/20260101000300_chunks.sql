-- migrate:up
CREATE TABLE chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  section_id  uuid REFERENCES sections (id) ON DELETE SET NULL,
  parent_id   uuid REFERENCES chunks (id) ON DELETE SET NULL,
  position    integer NOT NULL,
  page        integer NOT NULL CHECK (page > 0),
  content     text NOT NULL,
  context     text,
  token_count integer CHECK (token_count >= 0),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  EXECUTE format('ALTER TABLE chunks ADD COLUMN embedding halfvec(%s)', dnd_embedding_dim());
END
$$;

CREATE INDEX chunks_document_page_idx ON chunks (document_id, page);
CREATE INDEX chunks_section_idx ON chunks (section_id);
CREATE INDEX chunks_parent_idx ON chunks (parent_id);
CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding halfvec_cosine_ops);
-- BM25: stemming español + plegado de acentos (ascii_folding) sobre texto y contexto.
CREATE INDEX chunks_bm25 ON chunks USING bm25 (
  id,
  (content::pdb.simple('stemmer=spanish', 'ascii_folding=true')),
  (context::pdb.simple('stemmer=spanish', 'ascii_folding=true'))
);

-- migrate:down
DROP TABLE IF EXISTS chunks;
