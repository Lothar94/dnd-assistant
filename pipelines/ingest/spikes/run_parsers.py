"""Run one parser over the sampled pages of every book (ADR 001).

Writes out/<parser>/<book>/pages/<NNNN>.md, figures.json and metrics.json.
Page numbers in outputs are 0-based indexes of the ORIGINAL pdf.

Usage: run_parsers.py {docling,marker,pymupdf4llm} <sample.json> <out_dir> [--book SUBSTR]
"""

import argparse
import json
import re
import tempfile
import time
from pathlib import Path

import pymupdf


def build_subset(pdf: str, pages: list[int], dest: Path) -> None:
    src = pymupdf.open(pdf)
    sub = pymupdf.open()
    for index in pages:
        sub.insert_pdf(src, from_page=index, to_page=index)
    sub.save(dest)


# Each adapter: (subset_pdf, pages, work_dir) -> (md_per_page, figures, load_s, parse_s)
# md_per_page: list aligned with pages; figures: [{page, bbox, caption}] (page = original index)


def run_pymupdf4llm(subset: Path, pages: list[int], work: Path):
    import pymupdf4llm

    start = time.perf_counter()
    chunks = pymupdf4llm.to_markdown(str(subset), page_chunks=True)
    elapsed = time.perf_counter() - start
    # pymupdf4llm emits no figure records; fall back to raw pymupdf image placement, no captions
    figures = []
    sub = pymupdf.open(subset)
    for position, page in enumerate(sub):
        for info in page.get_image_info():
            figures.append({"page": pages[position], "bbox": list(info["bbox"]), "caption": None})
    return [c["text"] for c in chunks], figures, 0.0, elapsed


def run_docling(subset: Path, pages: list[int], work: Path):
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption

    options = PdfPipelineOptions()
    options.generate_picture_images = False
    start = time.perf_counter()
    converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
    )
    converter.initialize_pipeline(InputFormat.PDF)
    load = time.perf_counter() - start
    start = time.perf_counter()
    doc = converter.convert(subset).document
    elapsed = time.perf_counter() - start
    markdown = [doc.export_to_markdown(page_no=n) for n in range(1, len(pages) + 1)]
    figures = []
    for picture in doc.pictures:
        caption = picture.caption_text(doc) or None
        for prov in picture.prov:
            box = prov.bbox.to_top_left_origin(doc.pages[prov.page_no].size.height)
            figures.append(
                {
                    "page": pages[prov.page_no - 1],
                    "bbox": [box.l, box.t, box.r, box.b],
                    "caption": caption,
                }
            )
    return markdown, figures, load, elapsed


def run_marker(subset: Path, pages: list[int], work: Path):
    from marker.converters.pdf import PdfConverter
    from marker.models import create_model_dict
    from marker.output import text_from_rendered

    start = time.perf_counter()
    models = create_model_dict()
    load = time.perf_counter() - start
    config = {"paginate_output": True, "output_format": "markdown"}
    converter = PdfConverter(artifact_dict=models, config=config)
    start = time.perf_counter()
    rendered = converter(str(subset))
    elapsed = time.perf_counter() - start
    text, _, _ = text_from_rendered(rendered)
    parts = re.split(r"\n*\{(\d+)\}-{20,}\n*", text)
    by_page = {int(parts[i]): parts[i + 1] for i in range(1, len(parts) - 1, 2)}
    markdown = [by_page.get(n, "") for n in range(len(pages))]
    figures = marker_figures(subset, pages, models)
    return markdown, figures, load, elapsed


def marker_figures(subset: Path, pages: list[int], models) -> list[dict]:
    from marker.converters.pdf import PdfConverter

    converter = PdfConverter(
        artifact_dict=models,
        config={"output_format": "json"},
        renderer="marker.renderers.json.JSONRenderer",
    )
    rendered = converter(str(subset))
    figures: list[dict] = []

    def walk(block, page_index: int) -> None:
        if block.block_type in ("Figure", "Picture"):
            figures.append({"page": pages[page_index], "bbox": list(block.bbox), "caption": None})
        for child in block.children or []:
            walk(child, page_index)

    for index, page in enumerate(rendered.children):
        walk(page, index)
    return figures


PARSERS = {"pymupdf4llm": run_pymupdf4llm, "docling": run_docling, "marker": run_marker}


def metrics(markdown: list[str], figures: list[dict], load: float, parse: float) -> dict:
    text = "\n".join(markdown)
    table_rows = [ln for ln in text.splitlines() if re.match(r"\s*\|.*\|\s*$", ln)]
    return {
        "pages": len(markdown),
        "load_s": round(load, 2),
        "parse_s": round(parse, 2),
        "s_per_page": round(parse / max(1, len(markdown)), 3),
        "chars": len(text),
        "headings": len(re.findall(r"^#{1,6} ", text, re.M)),
        "heading_levels": sorted({len(m) for m in re.findall(r"^(#{1,6}) ", text, re.M)}),
        "table_rows": len(table_rows),
        "figures": len(figures),
        "figures_with_caption": sum(1 for f in figures if f["caption"]),
        "empty_pages": sum(1 for m in markdown if not m.strip()),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("parser", choices=PARSERS)
    ap.add_argument("sample_json", type=Path)
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--book", default="")
    args = ap.parse_args()
    sample = json.loads(args.sample_json.read_text())
    for book, info in sample.items():
        if args.book not in book:
            continue
        pages = [int(p) for p in info["pages"]]
        target = args.out_dir / args.parser / book.replace(" ", "_").replace("'", "")
        (target / "pages").mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory() as tmp:
            subset = Path(tmp) / "subset.pdf"
            build_subset(info["pdf"], pages, subset)
            markdown, figures, load, parse = PARSERS[args.parser](subset, pages, Path(tmp))
        for index, md in zip(pages, markdown, strict=True):
            (target / "pages" / f"{index:04d}.md").write_text(md)
        (target / "figures.json").write_text(json.dumps(figures, indent=1))
        result = metrics(markdown, figures, load, parse)
        (target / "metrics.json").write_text(json.dumps(result, indent=1))
        print(args.parser, book, json.dumps(result))


if __name__ == "__main__":
    main()
