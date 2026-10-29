-- migrate:up
-- Embedding dimension is fixed at migration time (spike de embeddings pendiente).
-- Set it with: PGOPTIONS="-c dnd.embedding_dim=768" (make db-migrate reads EMBEDDING_DIM).
CREATE FUNCTION dnd_embedding_dim() RETURNS integer
LANGUAGE plpgsql STABLE AS $$
DECLARE
  dim integer := COALESCE(NULLIF(current_setting('dnd.embedding_dim', true), ''), '1024')::integer;
BEGIN
  IF dim NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'dnd.embedding_dim must be between 1 and 4000 (halfvec HNSW limit), got %', dim;
  END IF;
  RETURN dim;
END
$$;

-- migrate:down
DROP FUNCTION IF EXISTS dnd_embedding_dim();
