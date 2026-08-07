import re, requests

js = open('/tmp/deploy.js').read()
chunks = sorted(set(re.findall(r'/assets/([A-Za-z0-9-]+\.js)', js)))
print(len(chunks), "chunks")
for c in chunks[:60]:
    url = f"https://koomn1.github.io/quiz-space/assets/{c}"
    body = requests.get(url).text
    avatars = sorted(set(re.findall(r'avatars/[a-z0-9.-]+\.(png|svg)', body)))
    if avatars:
        print(c, '=>', avatars)
    # also check for avatar display logic
    if 'object-cover' in body and 'userPhoto' in body:
        print(c, '=> [has avatar display logic]')
