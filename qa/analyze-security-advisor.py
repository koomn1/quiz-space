import json
from collections import Counter
from pathlib import Path

path = Path('/home/ubuntu/.mcp/tool-results/2026-08-24_07-49-04.794507362_supabase_get_advisors_41bd0d50.json')
data = json.loads(path.read_text())
lints = data.get('result', {}).get('lints', [])
print(f'total_lints={len(lints)}')
print('levels=' + ','.join(f'{key}:{value}' for key, value in sorted(Counter(item.get('level', 'UNKNOWN') for item in lints).items())))
print('names=' + ','.join(f'{key}:{value}' for key, value in sorted(Counter(item.get('name', 'UNKNOWN') for item in lints).items())))
for item in lints:
    if item.get('level') in {'ERROR', 'WARN'}:
        print(f"{item.get('level')}|{item.get('name')}|{item.get('detail')}|{item.get('remediation')}")
