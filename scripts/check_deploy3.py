import re, urllib.request

BASE = "https://quiz-space-app.pages.dev/assets/"
idx = urllib.request.urlopen("https://quiz-space-app.pages.dev/").read().decode()

# find main entry js referenced by modulepreload or script tag
m = re.search(r'assets/([A-Za-z0-9-]+)\.js', idx)
main_js = urllib.request.urlopen(BASE + m.group(1) + ".js").read().decode()

chunks = re.findall(r'"\.?/?([A-Za-z0-9-]+)\.js"', main_js)
chunks = sorted(set(c for c in chunks if c != m.group(1)))
print("chunks:", chunks)

markers = {
    "fullscreen (fixed inset-0)": "inset-0",
    "usePalette / darkMode": "f7f7f8",
    "error retry banner": "retry",
    "cosmo avatar (assistant img)": None,
}
for c in chunks:
    try:
        src = urllib.request.urlopen(BASE + c + ".js").read().decode()
    except Exception as e:
        print(c, "ERR", e); continue
    hits = []
    if "inset-0" in src: hits.append("fullscreen")
    if "f7f7f8" in src: hits.append("light-theme")
    if "retryLast" in src: hits.append("retry-banner")
    if "fixed inset-0 w-full flex overflow-hidden" in src or ("inset-0" in src and "max-w-3xl" in src): hits.append("ai-chat")
    if hits: print(c, "->", ",".join(hits))
    if "gpt-oss" in src: print(c, "-> CONTAINS MODEL: gpt-oss")
    if "qwen3" in src: print(c, "-> CONTAINS MODEL: qwen3")
