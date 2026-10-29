-- migrate:up
CREATE TABLE entities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type <> ''),
  name       text NOT NULL CHECK (name <> ''),
  aliases    text[] NOT NULL DEFAULT '{}',
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  chunk_id   uuid REFERENCES chunks (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entities_type_name_idx ON entities (type, lower(name));
CREATE INDEX entities_aliases_idx ON entities USING gin (aliases);
CREATE INDEX entities_chunk_idx ON entities (chunk_id);

CREATE TABLE entity_relations (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES entities (id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES entities (id) ON DELETE CASCADE,
  relation  text NOT NULL CHECK (relation <> ''),
  data      jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_id, target_id, relation),
  CHECK (source_id <> target_id)
);
CREATE INDEX entity_relations_target_idx ON entity_relations (target_id);

-- migrate:down
DROP TABLE IF EXISTS entity_relations;
DROP TABLE IF EXISTS entities;
