# Spike: parsing de manuales PDF (ADR 001)

Código desechable, aislado de `dnd-ingest`. Los PDFs viven en `data/raw/` (no se commitean).

```sh
cd pipelines/ingest/spikes
uv sync --no-install-project                                              # docling, pymupdf4llm
UV_PROJECT_ENVIRONMENT=.venv-marker uv sync --no-install-project --no-default-groups --group marker
.venv/bin/python -I select_pages.py ../../../data/raw sample.json         # ~4 min, determinista
.venv/bin/python -I run_parsers.py pymupdf4llm sample.json out
.venv/bin/python -I run_parsers.py docling sample.json out
.venv-marker/bin/python -I run_parsers.py marker sample.json out          # marker 1.x (ver ADR)
.venv/bin/python -I summarize.py sample.json out                          # tabla comparativa
```

Salida en `out/<parser>/<libro>/{pages/NNNN.md,figures.json,metrics.json}` (ignorada por git).
El número de página de los ficheros es el índice 0-based del PDF original.
`sample.json` fija las páginas evaluadas para poder repetir la comparación.
Ejecutar los scripts desde `pipelines/ingest/spikes` (rutas relativas a `data/raw`).
