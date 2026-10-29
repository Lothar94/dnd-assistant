# D&D Assistant

RAG sobre manuales de D&D con chat web y servidor MCP. Arquitectura: [docs/architecture.md](docs/architecture.md).

## Requisitos

Node ≥ 22, pnpm, uv, Docker (con Compose).

## Arranque

```sh
make install   # pnpm + uv, crea .env desde .env.example
make db-up     # Postgres 17 + pgvector + pg_search en :5433
make db-migrate
make dev       # server :4200, mcp :4300, web :5180
```

| Servicio | Puerto | Comprobación                             |
| -------- | ------ | ---------------------------------------- |
| web      | 5180   | http://localhost:5180                    |
| server   | 4200   | `GET /health`                            |
| mcp      | 4300   | `POST /mcp` (tool `ping`), `GET /health` |
| postgres | 5433   | `make db-up`                             |

Los puertos 4100 y 5173 están reservados por otras herramientas.

## Comandos

`make help` lista todo: `test`, `lint`, `typecheck`, `check`, `db-down`, `db-rollback`, `ingest`, `eval`.

## Estructura

`apps/{web,server,mcp}`, `packages/{shared,rag,db}` (TypeScript, pnpm workspaces);
`pipelines/{ingest,eval}` (Python, uv); `infra/` (docker-compose); `data/raw` y `data/assets` están
fuera de git (PDFs e imágenes).

Migraciones: `packages/db/migrations` (dbmate; `pnpm --filter @dnd/db rollback` para deshacer).
