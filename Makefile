.DEFAULT_GOAL := help
.PHONY: help install dev test lint typecheck check db-up db-down db-migrate db-rollback ingest eval

COMPOSE := docker compose -f infra/docker-compose.yml --env-file .env
PY_PROJECTS := pipelines/ingest pipelines/eval

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

.env:
	cp .env.example .env

install: .env ## Instala dependencias (pnpm + uv)
	pnpm install
	@for p in $(PY_PROJECTS); do (cd $$p && uv sync) || exit 1; done

dev: ## Arranca server (4200), mcp (4300) y web (5180)
	pnpm dev

test: ## Tests TS (vitest) y Python (pytest)
	pnpm test
	@for p in $(PY_PROJECTS); do (cd $$p && uv run pytest -q) || exit 1; done

lint: ## ESLint + ruff
	pnpm lint
	@for p in $(PY_PROJECTS); do (cd $$p && uv run ruff check . && uv run ruff format --check .) || exit 1; done

typecheck: ## tsc en todos los paquetes
	pnpm typecheck

check: lint typecheck test ## Lint, tipos y tests

db-up: .env ## Levanta Postgres (5433) y espera a que esté sano
	$(COMPOSE) up -d --wait

db-down: ## Para Postgres
	$(COMPOSE) down

db-migrate: .env ## Aplica las migraciones SQL
	set -a; . ./.env; set +a; pnpm --filter @dnd/db migrate

ingest: ## Ejecuta el pipeline de ingesta
	cd pipelines/ingest && uv run python -m dnd_ingest

eval: ## Ejecuta el pipeline de evaluación
	cd pipelines/eval && uv run python -m dnd_eval

db-rollback: .env ## Deshace la última migración
	set -a; . ./.env; set +a; pnpm --filter @dnd/db rollback
