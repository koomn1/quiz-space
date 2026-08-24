import re, urllib.request, json, sys

# Fetch worker source from GitHub main to verify the deployed model strings
url = "https://raw.githubusercontent.com/koomn1/quiz-space/main/worker/src/index.ts"
src = urllib.request.urlopen(url).read().decode()
for m in ["gpt-oss-20b", "qwen3-235b-a22b", "nemotron-3-super-120b"]:
    print(m, "->", src.count(m))

# Check worker runtime response: probe the deployed AI worker for CORS/options
worker_url = None
main = urllib.request.urlopen("https://quiz-space-app.pages.dev/").read().decode()
m2 = re.search(r'(https://[^"\'\s]+(?:ai|worker)[^"\'\s]*)', main)
print("worker url hint:", m2.group(1) if m2 else None)
