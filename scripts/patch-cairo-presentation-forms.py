"""Add missing Arabic presentation-form cmap entries (U+FE70-FEFC) to the Cairo subsets.

jsPDF's Arabic plugin shapes text into presentation-form code points, but the
Cairo subsets only kept some of them, so letters such as أ ل ة ق ن silently
disappeared from exported PDFs. This maps each missing presentation form to the
glyph HarfBuzz picks for that letter in the same joining context.

Usage: pip install fonttools uharfbuzz
       python scripts/patch-cairo-presentation-forms.py
       python scripts/embed-pdf-fonts.py
"""
import unicodedata
from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont

FONT_DIR = Path(__file__).resolve().parents[1] / "src" / "lib" / "pdfFonts"
ZWJ = "‍"
CONTEXT = {
    "<isolated>": lambda b: b,
    "<final>": lambda b: ZWJ + b,
    "<initial>": lambda b: b + ZWJ,
    "<medial>": lambda b: ZWJ + b + ZWJ,
}


def patch(path: Path) -> int:
    face = hb.Face(hb.Blob.from_file_path(str(path)))
    font = hb.Font(face)
    tt = TTFont(path)
    order = tt.getGlyphOrder()
    cmap = tt.getBestCmap()
    additions = {}
    for cp in list(range(0xFE70, 0xFEFD)) + list(range(0xFB50, 0xFC00)):
        if cp in cmap:
            continue
        decomposition = unicodedata.decomposition(chr(cp))
        if not decomposition.startswith("<"):
            continue
        tag, *codes = decomposition.split()
        make = CONTEXT.get(tag)
        if not make:
            continue
        base = "".join(chr(int(code, 16)) for code in codes)
        buf = hb.Buffer()
        buf.add_str(make(base))
        buf.direction, buf.script, buf.language = "rtl", "Arab", "ar"
        hb.shape(font, buf, {})
        glyphs = [order[i.codepoint] for i in buf.glyph_infos
                  if order[i.codepoint] not in (".notdef", "uni200D")]
        if len(glyphs) == 1:
            additions[cp] = glyphs[0]
    for table in tt["cmap"].tables:
        if table.isUnicode():
            table.cmap.update({cp: g for cp, g in additions.items() if cp not in table.cmap})
    tt.save(path)
    return len(additions)


for weight in (400, 700):
    target = FONT_DIR / f"cairo-{weight}.ttf"
    print(f"{target.name}: +{patch(target)} presentation forms")

for weight in (400, 700):
    cmap = TTFont(FONT_DIR / f"cairo-{weight}.ttf").getBestCmap()
    missing = [hex(c) for c in (0xFE83, 0xFEDD, 0xFE93, 0xFED5, 0xFEE5) if c not in cmap]
    assert not missing, f"cairo-{weight}.ttf still missing {missing}"
