import os, glob

SRC = '/home/ubuntu/quiz-space/src'

# The naive EN replacement 'Spark' -> 'Cosmo AI' broke:
#  - lucide 'Sparkles' icon import -> 'Cosmo AIles' (appears in imports + className usage)
#  - any word containing 'spark' case-insensitively
FIXES = [
    ('Cosmo AIles', 'Sparkles'),
    ('Cosmo AIs', 'Sparks'),
    ('Cosmo AIing', 'Sparking'),
    ('Cosmo AIly', 'Sparkly'),
    ('Cosmo AIed', 'Sparked'),
]

for path in glob.glob(SRC + '/**/*', recursive=True):
    if not path.endswith(('.ts', '.tsx')):
        continue
    with open(path, encoding='utf-8') as f:
        content = f.read()
    orig = content
    for old, new in FIXES:
        content = content.replace(old, new)
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('fixed', path, '(', [o for o, _ in FIXES if o in orig], ')')
print('done')
