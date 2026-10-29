# D&D Assistant — Arquitectura propuesta (PoC)

Asistente web que responde preguntas sobre D&D usando un RAG sobre tres manuales
(Manual del Jugador, Guía del Máster, Manual de Monstruos), con soporte para devolver
imágenes, y un servidor MCP para que distintos modelos de IA usen el RAG.

Principio rector: **la precisión de la recuperación manda**. Toda decisión de RAG se
valida contra un conjunto de evaluación (golden set) antes de adoptarse.

## 1. Vista general

```
                ┌───────────────────────── offline (Python) ─────────────────────────┐
 PDFs ──► parse (Docling) ──► normalizar ──► entidades estructuradas ──► chunking ──►  │
          figuras+bbox          secciones     (monstruos, conjuros,       jerárquico   │
                                              objetos, estados...)        + contexto   │
          captions VLM ──► embeddings (texto + imagen) ──► carga en Postgres          │
                └────────────────────────────────────────────────────────────────────┘
                                              │
                                    PostgreSQL + pgvector + BM25
                                              │
 ┌──────── online (TypeScript) ──────────────┴──────────────────────────────────────┐
 │ packages/rag : análisis de query → router → híbrido (BM25+denso, RRF) → rerank   │
 │                → evaluador CRAG → reescritura/reintento o abstención → contexto  │
 │ apps/mcp     : servidor MCP (tools/resources) sobre packages/rag                 │
 │ apps/server  : API Fastify, orquestador de chat (LLM multi-proveedor + cliente   │
 │                MCP), streaming SSE, conversaciones, servir imágenes              │
 │ apps/web     : React + Vite: chat, citas a página, galería de imágenes           │
 └──────────────────────────────────────────────────────────────────────────────────┘
 Clientes MCP externos (Claude Desktop/Code, etc.) también pueden conectar a apps/mcp.
```

## 2. Estructura del monorepo (mismo patrón que task_app)

```
apps/web            React 19 + Vite + Tailwind + TanStack Query
apps/server         Fastify 5 + zod: chat API, orquestador LLM, cliente MCP
apps/mcp            Servidor MCP (Streamable HTTP + stdio)
packages/shared     Contratos zod/TS: API de chat, citas, figuras, schemas de tools
packages/rag        Núcleo de recuperación (TS): búsqueda híbrida, rerank, CRAG, lookups
packages/db         Migraciones SQL (agnósticas de lenguaje, p. ej. dbmate) + tipos
pipelines/ingest    Python (uv): parsing, entidades, chunking, captions, embeddings, carga
pipelines/eval      Python (uv): golden set, métricas de recuperación y respuesta
infra/              docker-compose: Postgres (pgvector + pg_search), servicios de modelos
data/raw            PDFs (gitignored, NUNCA se commitean)
data/assets         Imágenes extraídas (gitignored)
```

Frontera de lenguajes: **Python = offline** (ingesta y evaluación, donde están las mejores
herramientas de parsing/eval); **TypeScript = online** (runtime, consistente con task_app).
El contrato entre ambos es el **esquema de base de datos** (packages/db).

Puertos (no usar 4100/5173): server 4200, mcp 4300, web 5180, Postgres 5433.

## 3. Ingesta (calidad de los datos = calidad del RAG)

1. **Parsing con layout**: Docling (alternativas a comparar en spike: marker, PyMuPDF4LLM).
   Requisitos: dos columnas, tablas, bloques de estadísticas, cajas laterales, jerarquía de
   encabezados, número de página, figuras con bbox y pie de imagen.
2. **Entidades estructuradas**: los bloques de monstruo, conjuros, objetos mágicos, estados,
   rasgos de clase se extraen a registros JSON tipados (nombre, alias, CR, tipo, nivel, escuela,
   clases...). Permiten **lookup exacto** (`get_monster("contemplador")`) en vez de búsqueda
   difusa: la mayor ganancia de precisión en este dominio.
3. **Chunking jerárquico** (parent/child): hijos pequeños (~200-400 tokens) para recuperar,
   padre = sección completa para dar contexto. Una entidad = un chunk atómico (no se parte
   un bloque de estadísticas).
4. **Contextual retrieval**: cada chunk se indexa con prefijo de contexto (libro > capítulo >
   sección + resumen breve generado por LLM).
5. **Alias y glosario ES/EN** (Beholder ↔ Contemplador, Hit Points ↔ Puntos de golpe) para
   expansión de consulta.
6. **Figuras**: imagen extraída a `data/assets`, asociada a su página/sección/entidad
   (p. ej. ilustración ↔ monstruo por proximidad), descripción generada por VLM en español,
   embedding de imagen y embedding de la descripción.

## 4. Recuperación (packages/rag)

1. **Análisis de la consulta**: detección de entidades (vía tabla de alias), clasificación
   (regla / entidad / comparación / imagen), filtros (libro, capítulo, tipo).
2. **Router**: entidad conocida → lookup estructurado + chunks relacionados; resto → híbrido.
3. **Híbrido**: BM25 (stemming español, unaccent) + denso (pgvector HNSW) → fusión RRF.
4. **Rerank** con cross-encoder multilingüe (candidatos: bge-reranker-v2-m3 local, Cohere
   Rerank 3.5, Voyage rerank-2.5).
5. **CRAG**: el evaluador (score del reranker + LLM ligero como juez) clasifica el contexto en
   correcto / ambiguo / incorrecto. Ambiguo → reescritura multi-query y reintento; incorrecto
   tras reintento → **abstención explícita** ("no aparece en los manuales"). Sin búsqueda web:
   solo fuentes canónicas.
6. **Expansión de padres** y deduplicación; se devuelven chunks + figuras asociadas + citas
   (libro, página, sección).

El CRAG vive en el servidor (packages/rag), no en el cliente LLM, para que la calidad de
recuperación no dependa del modelo que lo use.

### Grafo de conocimiento

GraphRAG completo (extracción con LLM + comunidades) es caro y está pensado para preguntas
de resumen global; aquí aporta poco al inicio. Se propone un **grafo ligero determinista**
construido desde las entidades (monstruo → conjuros que lanza, conjuro → estados que impone,
clase → rasgos, regla → referencias cruzadas "ver página X"), guardado en Postgres
(`entity_relations`, CTE recursivas). Se usa para expansión multi-salto. Se escala a
GraphRAG solo si la evaluación muestra fallos multi-salto.

## 5. Multimodal (imágenes)

Estrategia doble, decidida por benchmark en spike:

- **Texto ↔ imagen** con un modelo de embeddings multimodal multilingüe en un único espacio.
  Candidatos: Cohere embed-v4 (API), Voyage multimodal-3.5 (API), jina-embeddings-v4 (pesos
  abiertos, GPU). Opcional: ColQwen/ColPali (late interaction sobre páginas) si el parsing
  de páginas complejas resulta insuficiente.
- **Descripción VLM** de cada figura indexada como texto (robusta y barata en recuperación).
- **Asociación estructural**: la figura viaja con su entidad/sección, así "¿cómo es un
  contemplador?" devuelve su ilustración aunque la búsqueda haya sido textual.

Todos los modelos detrás de interfaces (`EmbeddingProvider`, `Reranker`, `LlmProvider`)
para poder cambiarlos sin tocar el pipeline.

## 6. Base de datos

**PostgreSQL 17 + pgvector (HNSW, halfvec) + pg_search (ParadeDB, BM25)**.

- Corpus pequeño (~1.000 páginas → ~10-30k chunks): pgvector sobra en rendimiento.
- Una sola base para vectores, BM25, entidades relacionales, grafo ligero, conversaciones.
- Filtros por metadatos con SQL, transacciones, migraciones simples.
- Plan B: Qdrant si el spike elige late-interaction (multivector) o si el BM25 de Postgres
  no alcanza la calidad requerida.
- Imágenes en sistema de ficheros (`data/assets`), servidas por apps/server; ruta en BD.

Tablas principales: `documents`, `sections` (árbol), `chunks` (texto, contexto, tsvector/bm25,
embedding, parent_id, page), `entities` (tipo, nombre, alias[], datos jsonb, chunk_id),
`entity_relations`, `figures` (ruta, página, bbox, caption, descripción, embedding,
entity_id/section_id), `conversations`, `messages` (con citas).

## 7. MCP

Servidor `apps/mcp` (SDK oficial TS, Streamable HTTP + stdio):

- Tools: `search_rules(query, book?, k?)`, `get_entity(type, name)`, `get_monster`,
  `get_spell`, `get_related(entity, relation?)`, `search_images(query)`, `get_page(book, page)`.
- Resources: páginas/secciones citables (`dnd://book/page`), figuras (`dnd://figure/{id}`).
- Prompts: "responde-con-citas".
  Salidas siempre con citas estructuradas y URLs de figuras.

El chat de la web usa un orquestador en `apps/server` que actúa como **cliente MCP** con un
`LlmProvider` intercambiable (p. ej. Vercel AI SDK: Anthropic, OpenAI, Gemini, Ollama local).
El usuario elige modelo en la UI.

## 8. Evaluación (desde el día 1)

- Golden set ~150-200 preguntas (reglas, entidades, comparaciones, multi-salto, imágenes,
  preguntas fuera de corpus) con páginas/entidades esperadas.
- Métricas de recuperación: recall@k, MRR, nDCG; de respuesta: fidelidad, exactitud de citas,
  tasa de abstención correcta.
- Script `make eval` con informe comparativo; ninguna mejora de RAG se acepta sin delta medido.

## 9. Riesgos

- **Copyright**: manuales con derechos. Uso local en PoC, PDFs y assets fuera de git.
  Fixtures de CI con el SRD 5.2 (CC-BY-4.0).
- Calidad de PDFs (escaneados → OCR), maquetación a dos columnas y bloques de estadísticas.
- Coste/latencia de captions VLM y contextual retrieval en ingesta (una sola vez, cacheable).
- Dependencia de proveedores API vs. GPU local para modelos abiertos.
