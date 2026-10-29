-- migrate:up
CREATE TABLE documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  source_path text NOT NULL,
  sha256      text NOT NULL UNIQUE,
  page_count  integer CHECK (page_count > 0),
  language    text NOT NULL DEFAULT 'es',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  parent_id    uuid REFERENCES sections (id) ON DELETE CASCADE,
  level        smallint NOT NULL CHECK (level >= 1),
  title        text NOT NULL,
  heading_path text[] NOT NULL CHECK (cardinality(heading_path) >= 1),
  position     integer NOT NULL,
  page_start   integer CHECK (page_start > 0),
  page_end     integer,
  CHECK (page_end IS NULL OR (page_start IS NOT NULL AND page_end >= page_start))
);
CREATE INDEX sections_document_parent_idx ON sections (document_id, parent_id, position);
CREATE INDEX sections_parent_idx ON sections (parent_id);

-- migrate:down
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS documents;
