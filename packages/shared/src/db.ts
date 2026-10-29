import { z } from 'zod';

/** Row types mirror packages/db/migrations; keep both in sync. Timestamps are ISO strings over the wire. */

export const messageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);
export type MessageRole = z.infer<typeof messageRoleSchema>;

/** Shape of each element of `messages.citations` (jsonb array). */
export const citationSchema = z.object({
  documentId: z.uuid(),
  page: z.number().int().positive(),
  chunkId: z.uuid().optional(),
  figureId: z.uuid().optional(),
  quote: z.string().optional(),
});
export type Citation = z.infer<typeof citationSchema>;

export const citationsSchema = z.array(citationSchema);

/** [x0, y0, x1, y1] in page coordinates. */
export const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type BBox = z.infer<typeof bboxSchema>;

export type Embedding = number[];

export interface DocumentRow {
  id: string;
  slug: string;
  title: string;
  source_path: string;
  sha256: string;
  page_count: number | null;
  language: string;
  created_at: string;
}

export interface SectionRow {
  id: string;
  document_id: string;
  parent_id: string | null;
  level: number;
  title: string;
  heading_path: string[];
  position: number;
  page_start: number | null;
  page_end: number | null;
}

export interface ChunkRow {
  id: string;
  document_id: string;
  section_id: string | null;
  parent_id: string | null;
  position: number;
  page: number;
  content: string;
  context: string | null;
  token_count: number | null;
  metadata: Record<string, unknown>;
  embedding: Embedding | null;
  created_at: string;
}

export interface EntityRow {
  id: string;
  type: string;
  name: string;
  aliases: string[];
  data: Record<string, unknown>;
  chunk_id: string | null;
  created_at: string;
}

export interface EntityRelationRow {
  id: string;
  source_id: string;
  target_id: string;
  relation: string;
  data: Record<string, unknown>;
}

export interface FigureRow {
  id: string;
  document_id: string;
  section_id: string | null;
  entity_id: string | null;
  path: string;
  page: number;
  bbox: BBox | null;
  caption: string | null;
  description: string | null;
  embedding: Embedding | null;
  description_embedding: Embedding | null;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  title: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  seq: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  created_at: string;
}
