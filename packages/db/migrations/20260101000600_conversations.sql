-- migrate:up
CREATE TABLE conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text,
  model      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  seq             bigint GENERATED ALWAYS AS IDENTITY,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content         text NOT NULL,
  citations       jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(citations) = 'array'),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_seq_idx ON messages (conversation_id, seq);

-- migrate:down
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
