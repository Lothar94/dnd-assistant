# ADR 001 — Parser de los manuales PDF

- Estado: propuesto (spike de 30 páginas por libro; ver «Limitaciones»)
- Contexto: `docs/architecture.md` §3 (ingesta)
- Reproducible con: `pipelines/ingest/spikes/` (ver su `README.md`)

## Contexto

Los tres PDFs (`Player's Handbook` 293 pp., `Monster Manual` 354 pp., `Dungeon Master's Guide`
320 pp.) son **escaneos** (creador `TOSHIBA e-STUDIO5540C`) con una capa de texto OCR de mala
calidad (`aberra tion`, `1;1atural armor`, `W isdom`). Hay páginas de ilustración sin texto.
La calidad del parsing limita la del RAG y de los registros tipados (monstruos, conjuros), así
que se compararon tres candidatos con las mismas páginas.

## Método

- `select_pages.py` elige 30 páginas por libro (90 en total) de forma determinista, por
  categoría: ilustración a página completa, bloque de estadísticas, conjuro, tabla, dos columnas
  y relleno. Resultado fijado en `sample.json`.
- `run_parsers.py` ejecuta cada parser sobre un PDF con solo esas páginas y guarda markdown por
  página, figuras (`page`, `bbox`, `caption`) y métricas.
- Versiones: Docling 2.142.1, marker-pdf 1.10.2 (surya 0.17.1), pymupdf4llm 2.0 (PyMuPDF 2.0).
  Máquina: 16 hilos, GPU RTX 5060 Laptop 8 GB, torch con CUDA disponible. No se fijó
  el dispositivo: Docling y marker usaron su selección automática; pymupdf4llm corre en CPU
  (con RapidOCR en algunas páginas).
- Una sola ejecución por combinación; los tiempos excluyen la carga de modelos.

## Resultados

| parser | libro | s/página | encabezados (niveles) | filas de tabla | figuras (con pie) | págs. vacías |
|---|---|---|---|---|---|---|
| pymupdf4llm | DMG | 0,26 | 133 (1–6) | 179 | 96 (0) ¹ | 0 |
| pymupdf4llm | MM | 0,51 | 95 (1–6) | 76 | 60 (0) ¹ | 3 |
| pymupdf4llm | PHB | 1,31 | 160 (1–6) | 176 | 60 (0) ¹ | 1 |
| Docling | DMG | 3,48 | 146 (solo 2) | 135 | 26 (1) | 0 |
| Docling | MM | 2,73 | 108 (solo 2) | 65 | 16 (0) | 0 |
| Docling | PHB | 3,36 | 158 (solo 2) | 174 | 14 (0) | 0 |
| marker 1.x | DMG | 1,17 | 148 (1–4) | 164 | 29 (0) | 0 |
| marker 1.x | MM | 2,47 | 99 (1–4) | 72 | 21 (0) | 0 |
| marker 1.x | PHB | 1,78 | 160 (1–4) | 175 | 15 (0) | 0 |

¹ pymupdf4llm 2.0 no emite registros de figura; se contaron las imágenes crudas de PyMuPDF
(incluye recortes/fragmentos, por eso son muy superiores) y sin pie.

Los recuentos de encabezados y filas miden volumen, no corrección. La valoración cualitativa
sale de leer las páginas de ejemplo.

| criterio | pymupdf4llm | Docling | marker 1.x |
|---|---|---|---|
| Texto (el escaneo trae OCR malo) | hereda la capa mala: `aberra tion`, `1;1atural` | texto más limpio (`30 ft.`, `natural armor` correctos); no se verificó si es OCR propio o capa de texto | hereda la capa mala |
| Orden de lectura | bloque de estadísticas antes que la narrativa en la página de monstruo (orden físico) | narrativa y luego estadísticas; una frase desplazada en DMG p.19 | como Docling |
| Jerarquía de encabezados | niveles 1–6 por tamaño de fuente, coherentes pero con ruido (`ACTIONS` como h6) | **todos `##`**: no hay jerarquía | niveles 1–4, inconsistentes (`CHUUL` h3, `OPTIONAL RULE` h1) |
| Bloque de monstruo | texto plano; atributos en una línea | **tabla markdown de atributos** (STR…CHA) | atributos en una línea |
| Tablas | rotas en 2 filas por celda partida | la tabla `d6` de DMG p.51 sale como lista | lista con prefijos; sin tabla real |
| Figuras con bbox | solo imágenes crudas, sin tipo | sí (bbox + página, pie si existe) | sí (bbox + página) |
| Pie de imagen | no | solo 1 en 56 figuras | ninguno |
| Nº de página impreso | no (se conserva solo el índice de página) | no | no |
| OCR en escaneo | RapidOCR parcial | sí (y falló en páginas de arte: `è 福` en MM p.231) | texto idéntico a la capa existente; marcó la figura |
| Tiempo/página | 0,26–1,31 | 2,7–3,5 | 1,2–2,5 |
| Operación | un `pip install` | modelos locales, sin servicios | la 2.x exige backend vLLM (docker + runtime nvidia) o `llama-server`; se usó la 1.x |
| Licencia (según upstream, sin verificar en el spike) | AGPL-3.0 / comercial | MIT | GPL-3.0 (+ pesos con restricción comercial) |

### Ejemplos de salida (Monster Manual, p. 40, Chuul)

pymupdf4llm — estadísticas primero, texto de la capa OCR:

```
#### **CHUUL**
_Large aberra tion, chaotic evil_
Armor Class 16 (1;1atural armor) Hit Points 93 (11d10 + 33) Speed 30ft., swim 30ft.
STR DEX CON INT WIS CHA 19 (+4) 10 (+0) 16 (+3) 5 (- 3) 11 (+0) 5 (- 3)
```

Docling — texto limpio y tabla de atributos:

```
## CHUUL
Large abérration, chaotic evil
Armor Class 16 (natural armor) Hit Points 93 (11d10 + 33) Speed 30 ft., swim 30 ft.
| STR     | DEX     | CON     | INT     | WIS     | CHA     |
| 19 (+4) | 10 (+0) | 16 (+3) | 5 (- 3) | 11 (+0) | 5 (- 3) |
```

marker 1.x — encabezado `###`, texto de la capa OCR mala, atributos en línea:

```
### **CHUUL**
Armor Class 16 (1;1atural armor) Hit Points 93 (11d10 + 33) Speed 30ft., swim 30ft.
STR 19 (+4) DEX 10 (+0) CON 16 (+3) INT 5 (- 3) WIS 11 (+0) CHA 5 (- 3)
```

Figura de Docling (`figures.json`): `{"page": 40, "bbox": [0.27, 1.75, 301.5, 452.4], "caption": null}`
(coordenadas en puntos, origen arriba a la izquierda; `page` = índice 0-based del PDF).

## Decisión

**Docling** como parser de ingesta, con dos correcciones obligatorias en nuestro pipeline:

1. **Jerarquía de encabezados**: Docling devuelve todo como `##`. Reconstruir los niveles
   con el tamaño de fuente (spans de PyMuPDF sobre el mismo PDF) o con el índice del libro;
   pymupdf4llm demostró que el tamaño de fuente separa bien los niveles.
2. **Páginas de arte y OCR**: forzar «sin texto» en páginas clasificadas como ilustración
   completa (cobertura de imagen alta y poco texto) para no ingerir basura OCR.

Motivos: es el único con texto limpio en los ejemplos revisados (Chuul, tabla d6) (determina la
precisión del lookup exacto de monstruos y conjuros), produce la tabla de atributos del bloque
de estadísticas, entrega figuras con bbox y página, funciona local sin servicios y tiene
licencia MIT.

Coste: 2,7–3,5 s/página, es decir 15–20 min por libro (≈ 1 h para los tres), aceptable para
una ingesta puntual que se cachea.

### Alternativas descartadas

- **pymupdf4llm**: el más rápido, pero hereda el OCR malo y no da figuras estructuradas; licencia
  AGPL. Útil como utilidad auxiliar (tamaños de fuente), no como parser principal.
- **marker**: calidad cercana a Docling en orden y encabezados, pero con texto de la capa mala,
  atributos sin tabla, jerarquía inconsistente, GPL y la 2.x con despliegue pesado.

## Limitaciones del spike (no resueltas)

- 30 páginas por libro, sin verdad terreno: la evaluación es cualitativa y de pocos ejemplos.
  Los recuentos de la tabla no miden corrección.
- La categoría «caja lateral» no se detectó automáticamente (0 páginas): quedaron cubiertas solo
  de forma incidental por las páginas de relleno. Pendiente revisión manual de cajas laterales.
- Los pies de imagen casi no existen en estos libros (1 de 56 figuras con Docling); no se
  comprobó que sea una limitación del parser y no de los libros. El requisito de «pie de imagen»
  de la arquitectura probablemente deba resolverse por proximidad al texto o con VLM.
- El número de página impreso no se conserva en ningún parser (se descarta la cabecera/pie).
  Se propone leerlo aparte con PyMuPDF (palabra numérica en la franja superior/inferior).
- Tiempos medidos una sola vez, con dispositivos distintos por parser; comparar velocidades con
  cautela. No se midió Docling solo en CPU.
- Tablas complejas (p. ej. la `d6` de DMG p.51) siguen sin salir bien en ningún parser.
- Calidad de Docling no uniforme: una frase desplazada en DMG p.19 y OCR basura en MM p.231.
