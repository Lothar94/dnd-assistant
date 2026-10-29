-- migrate:up
CREATE TABLE figures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  section_id  uuid REFERENCES sections (id) ON DELETE SET NULL,
  entity_id   uuid REFERENCES entities (id) ON DELETE SET NULL,
  path        text NOT NULL UNIQUE,
  page        integer NOT NULL CHECK (page > 0),
  bbox        real[] CHECK (cardinality(bbox) = 4 AND bbox[1] < bbox[3] AND bbox[2] < bbox[4]),
  caption     text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- embedding: imagen; description_embedding: texto de la descripción (mismo espacio multimodal).
DO $$
BEGIN
  EXECUTE format('ALTER TABLE figures ADD COLUMN embedding halfvec(%s)', dnd_embedding_dim());
  EXECUTE format('ALTER TABLE figures ADD COLUMN description_embedding halfvec(%s)', dnd_embedding_dim());
END
$$;

CREATE INDEX figures_document_page_idx ON figures (document_id, page);
CREATE INDEX figures_section_idx ON figures (section_id);
CREATE INDEX figures_entity_idx ON figures (entity_id);
CREATE INDEX figures_embedding_hnsw ON figures USING hnsw (embedding halfvec_cosine_ops);
CREATE INDEX figures_description_embedding_hnsw
  ON figures USING hnsw (description_embedding halfvec_cosine_ops);

-- migrate:down
DROP TABLE IF EXISTS figures;
