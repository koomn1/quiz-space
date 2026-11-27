#!/usr/bin/env python3
"""Build the whiteboard sticker library from OpenMoji (CC BY-SA 4.0).

Selects ~500 school-relevant pictograms, downloads their color SVGs into
public/whiteboard/stickers/, and writes catalog.json (name, file, EN gloss,
topics, tags) plus ATTRIBUTION.md. Re-runnable and deterministic.
"""
import json, re, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / 'public' / 'whiteboard' / 'stickers'
RAW = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg'

data = json.load(open('/tmp/openmoji.json'))
data = [e for e in data if not e.get('skintone_base_hexcode') and e['group'] != 'component']

# subgroup -> (topic, cap). Caps chosen to land ~500 items across school topics.
RULES = {
  'animal-mammal': ('حيوانات', 40), 'animal-bird': ('حيوانات', 14), 'animal-marine': ('حيوانات', 14),
  'animal-bug': ('طبيعة', 10), 'animal-reptile': ('حيوانات', 6), 'animal-amphibian': ('حيوانات', 2),
  'plant-flower': ('طبيعة', 10), 'plant-other': ('طبيعة', 14),
  'food-fruit': ('طعام', 16), 'food-vegetable': ('طعام', 14), 'food-prepared': ('طعام', 14),
  'food-asian': ('طعام', 6), 'food-sweet': ('طعام', 8), 'drink': ('طعام', 8), 'dishware': ('طعام', 4),
  'place-map': ('جغرافيا', 7), 'place-geographic': ('جغرافيا', 10), 'place-building': ('مبانٍ', 20),
  'place-other': ('مبانٍ', 8), 'transport-ground': ('مواصلات', 22), 'transport-water': ('مواصلات', 8),
  'transport-air': ('مواصلات', 10), 'sky-weather': ('طقس', 48), 'time': ('وقت', 12),
  'event': ('مناسبات', 10), 'award-medal': ('رياضة', 6), 'sport': ('رياضة', 24),
  'game': ('ألعاب', 16), 'arts-crafts': ('فنون', 7),
  'computer': ('تقنية', 12), 'phone': ('تقنية', 4), 'light-video': ('تقنية', 10), 'sound': ('موسيقى', 5),
  'music': ('موسيقى', 8), 'musical-instrument': ('موسيقى', 10),
  'book-paper': ('مدرسة', 14), 'writing': ('مدرسة', 8), 'office': ('مدرسة', 14), 'money': ('مال', 6),
  'tool': ('أدوات', 16), 'science': ('علوم', 7), 'medical': ('جسم وصحة', 7), 'household': ('منزل', 8),
  'face-smiling': ('مشاعر', 10), 'face-affection': ('مشاعر', 5), 'face-neutral-skeptical': ('مشاعر', 6),
  'face-concerned': ('مشاعر', 8), 'face-negative': ('مشاعر', 5), 'face-unwell': ('مشاعر', 4),
  'heart': ('مشاعر', 8), 'emotion': ('مشاعر', 8),
  'math': ('رياضيات', 6), 'warning': ('رموز', 10), 'arrow': ('رموز', 14), 'geometric': ('رموز', 16),
  'av-symbol': ('رموز', 10), 'punctuation': ('رموز', 4),
  'body-parts': ('جسم وصحة', 12), 'person-symbol': ('رموز', 8),
}
EXTRAS = {'climate-environment': 'بيئة', 'healthcare': 'جسم وصحة', 'technology': 'تقنية', 'gardening': 'طبيعة'}
EXTRAS_CAP = 60

SPACE_WORDS = re.compile(r'moon|star|planet|rocket|satellite|comet|milky|telescope|astronaut|sun with|eclipse', re.I)

def slug(s):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return re.sub(r'-{2,}', '-', s)

picked = {}
for e in sorted(data, key=lambda x: str(x['order']).zfill(8)):
    g, sg = e['group'], e['subgroups']
    topic = None
    if g == 'extras-openmoji' and sg in EXTRAS:
        topic = EXTRAS[sg]
        cap_key = 'extras:' + sg
        cap = EXTRAS_CAP // len(EXTRAS)
    elif sg in RULES:
        topic, cap = RULES[sg]
        cap_key = sg
    else:
        continue
    if sum(1 for p in picked.values() if p[1] == cap_key) >= cap:
        continue
    name = slug(e['annotation'])
    if not name or name in picked:
        name = f"{name}-{e['hexcode'].lower()}"
    topics = {topic}
    hay = f"{e['annotation']} {e.get('tags','')} {e.get('openmoji_tags','')}"
    if SPACE_WORDS.search(hay): topics.add('فضاء')
    if sg == 'sky-weather' and SPACE_WORDS.search(hay): topics.discard('طقس')
    picked[name] = (e, cap_key, sorted(topics))

print(f'selected {len(picked)} stickers')
OUT.mkdir(parents=True, exist_ok=True)

catalog = []
to_fetch = []
for name, (e, _ck, topics) in picked.items():
    fn = f"{e['hexcode']}.svg"
    dest = OUT / fn
    if not dest.exists():
        to_fetch.append((e['hexcode'], dest))
    tags = sorted(set(re.split(r'[,;]', (e.get('tags') or '') + ',' + (e.get('openmoji_tags') or ''))) - {''})
    catalog.append({'name': name, 'file': fn, 'en': e['annotation'], 'topics': topics, 'tags': tags[:8]})

if to_fetch:
    lst = '\n'.join(f'{RAW}/{h}.svg {d}' for h, d in to_fetch)
    subprocess.run(['xargs', '-P', '8', '-n', '2', 'sh', '-c', 'curl -sfL -m 30 "$0" -o "$1"'],
                   input=lst, text=True, check=True)
missing = [c['file'] for c in catalog if not (OUT / c['file']).exists()]
if missing:
    print('MISSING:', missing[:10]); sys.exit(1)

catalog.sort(key=lambda c: (c['topics'][0], c['name']))
json.dump(catalog, open(OUT / 'catalog.json', 'w'), ensure_ascii=False, indent=1)
print(f'wrote {len(catalog)} entries, {sum((OUT/c["file"]).stat().st_size for c in catalog)//1024} KiB total')
