# Graph Report - dnd-assistant  (2026-10-29)

## Corpus Check
- 51 files · ~8,925 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 176 nodes · 190 edges · 28 communities (24 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d207e79`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `D&D Assistant — Arquitectura propuesta (PoC)` - 10 edges
2. `ScratchDb` - 7 edges
3. `ADR 001 — Parser de los manuales PDF` - 7 edges
4. `createMcpServer()` - 5 edges
5. `classify()` - 5 edges
6. `score()` - 5 edges
7. `D&D Assistant` - 5 edges
8. `select()` - 4 edges
9. `citation_accuracy()` - 4 edges
10. `parse()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `connectedClient()` --calls--> `createMcpServer()`  [EXTRACTED]
  apps/mcp/test/ping.test.ts → apps/mcp/src/server.ts
- `test_recall_mrr_ndcg()` --calls--> `recall_at_k()`  [INFERRED]
  pipelines/eval/tests/test_eval.py → pipelines/eval/src/dnd_eval/metrics.py
- `test_recall_mrr_ndcg()` --calls--> `mrr()`  [INFERRED]
  pipelines/eval/tests/test_eval.py → pipelines/eval/src/dnd_eval/metrics.py
- `test_recall_mrr_ndcg()` --calls--> `ndcg_at_k()`  [INFERRED]
  pipelines/eval/tests/test_eval.py → pipelines/eval/src/dnd_eval/metrics.py
- `test_citation_accuracy()` --calls--> `citation_accuracy()`  [INFERRED]
  pipelines/eval/tests/test_eval.py → pipelines/eval/src/dnd_eval/metrics.py

## Communities (28 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (10): APP_TABLES, contents, doc, e, parent, { rows }, SCHEMA_TABLES, PACKAGE_DIR (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (16): BBox, bboxSchema, ChunkRow, Citation, citationSchema, citationsSchema, ConversationRow, DocumentRow (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (11): citation_accuracy(), faithfulness(), mrr(), ndcg_at_k(), Retrieval and answer metrics. Pure functions, no I/O., Fraction of cited sources that are expected. No citations -> 0.0., Supported claims / total claims (judge supplies counts)., recall_at_k() (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (13): 1. Vista general, 2. Estructura del monorepo (mismo patrón que task_app), 3. Ingesta (calidad de los datos = calidad del RAG), 4. Recuperación (packages/rag), 5. Multimodal (imágenes), 6. Base de datos, 7. MCP, 8. Evaluación (desde el día 1) (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (11): ADR 001 — Parser de los manuales PDF, Alternativas descartadas, code:block1 (#### **CHUUL**), code:block2 (## CHUUL), code:block3 (### **CHUUL**), Contexto, Decisión, Ejemplos de salida (Monster Manual, p. 40, Chuul) (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.42
Nodes (5): config, buildApp(), Config, envSchema, loadConfig()

### Community 6 - "Community 6"
Cohesion: 0.31
Nodes (6): build_subset(), main(), marker_figures(), metrics(), Run one parser over the sampled pages of every book (ADR 001).  Writes out/<pars, run_marker()

### Community 7 - "Community 7"
Cohesion: 0.39
Nodes (8): classify(), has_sidebar(), image_coverage(), is_two_column(), main(), Pick ~30 representative pages per book (deterministic) and write sample.json.  C, select(), spread()

### Community 8 - "Community 8"
Cohesion: 0.28
Nodes (6): main(), Entry point: `uv run python -m dnd_eval [--subset srd] [--compare A.json B.json], aggregate(), compare(), Aggregate per-question results and compare two runs., save()

### Community 9 - "Community 9"
Cohesion: 0.39
Nodes (4): http, port, createMcpServer(), connectedClient()

### Community 11 - "Community 11"
Cohesion: 0.43
Nodes (5): load(), parse(), Question, Golden set loading and validation (JSONL, one question per line)., validate()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (6): Arranque, code:sh (make install   # pnpm + uv, crea .env desde .env.example), Comandos, D&D Assistant, Estructura, Requisitos

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (3): HealthResponse, healthResponseSchema, PORTS

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (4): folio(), folio_retention(), main(), Aggregate out/<parser>/<book>/metrics.json into the ADR comparison table.  Also

## Knowledge Gaps
- **61 isolated node(s):** `SCHEMA_TABLES`, `APP_TABLES`, `doc`, `contents`, `{ rows }` (+56 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `score()` connect `Community 2` to `Community 8`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `SCHEMA_TABLES`, `APP_TABLES`, `doc` to the rest of the system?**
  _61 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._