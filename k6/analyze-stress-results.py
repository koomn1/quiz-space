import json
from collections import defaultdict, Counter
from datetime import datetime, timezone
from pathlib import Path

path = Path('/tmp/quizspace-k6-stress-results.json')
points = []
for line in path.read_text().splitlines():
    try:
        row = json.loads(line)
    except json.JSONDecodeError:
        continue
    if row.get('metric') != 'http_req_duration' or row.get('type') != 'Point':
        continue
    data = row.get('data', {})
    tags = data.get('tags', {})
    try:
        timestamp = datetime.fromisoformat(data['time'].replace('Z', '+00:00'))
        value = float(data['value'])
    except (KeyError, TypeError, ValueError):
        continue
    points.append((timestamp, value, tags.get('status', '0'), tags.get('page', 'unknown')))

if not points:
    raise SystemExit('No http_req_duration points found')

start = min(item[0] for item in points)
end = max(item[0] for item in points)
print(f'start={start.isoformat()} end={end.isoformat()} duration_seconds={(end-start).total_seconds():.1f}')
print(f'total_requests={len(points)}')

stage_defs = [
    (0, 20, 50, 'ramp to 50'),
    (20, 50, 50, 'hold 50'),
    (50, 70, 100, 'ramp to 100'),
    (70, 100, 100, 'hold 100'),
    (100, 120, 200, 'ramp to 200'),
    (120, 150, 200, 'hold 200'),
    (150, 170, 400, 'ramp to 400'),
    (170, 200, 400, 'hold 400'),
    (200, 220, 800, 'ramp to 800'),
]

for low, high, vus, label in stage_defs:
    values = [value for timestamp, value, status, page in points if low <= (timestamp-start).total_seconds() < high]
    if not values:
        continue
    values_sorted = sorted(values)
    p95 = values_sorted[min(len(values_sorted)-1, int(len(values_sorted)*0.95))]
    failures = sum(1 for timestamp, value, status, page in points if low <= (timestamp-start).total_seconds() < high and status != '200')
    print(f'stage="{label}" window={low}-{high}s target_vus={vus} requests={len(values)} errors={failures} error_rate={failures/len(values):.4f} avg_ms={sum(values)/len(values):.2f} p95_ms={p95:.2f} max_ms={max(values):.2f}')

by_page = defaultdict(lambda: [0, 0, []])
for timestamp, value, status, page in points:
    row = by_page[page]
    row[0] += 1
    row[1] += status != '200'
    row[2].append(value)
status_counts = Counter(status for timestamp, value, status, page in points)
print('status_counts:')
for status, count in sorted(status_counts.items()):
    print(f'status={status} count={count}')
print('by_page:')
for page, (count, errors, values) in sorted(by_page.items(), key=lambda item: (-item[1][1], item[0])):
    values.sort()
    p95 = values[min(len(values)-1, int(len(values)*0.95))]
    print(f'page={page} requests={count} errors={errors} error_rate={errors/count:.4f} p95_ms={p95:.2f}')
