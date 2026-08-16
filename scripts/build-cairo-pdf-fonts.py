from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.merge import Merger

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "node_modules" / "@fontsource" / "cairo" / "files"
OUTPUT = ROOT / "src" / "lib" / "pdfFonts"
OUTPUT.mkdir(parents=True, exist_ok=True)

for weight in (400, 700):
    temporary = []
    for subset in ("arabic", "latin", "latin-ext"):
        source = SOURCE / f"cairo-{subset}-{weight}-normal.woff"
        converted = OUTPUT / f".cairo-{subset}-{weight}.ttf"
        font = TTFont(source)
        font.flavor = None
        font.save(converted)
        temporary.append(str(converted))

    merged = Merger().merge(temporary)
    output = OUTPUT / f"cairo-{weight}.ttf"
    merged.save(output)
    print(f"created {output} ({output.stat().st_size} bytes)")
    for path in temporary:
        Path(path).unlink()
