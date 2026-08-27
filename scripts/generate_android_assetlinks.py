import base64
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

PACKAGE_NAME = 'com.quizspace.badawy'
keystore_b64 = os.environ.get('ANDROID_KEYSTORE_BASE64', '').strip()
keystore_password = os.environ.get('ANDROID_KEYSTORE_PASSWORD', '')
key_alias = os.environ.get('ANDROID_KEY_ALIAS', '').strip()

if not keystore_b64 or not keystore_password or not key_alias:
    raise SystemExit('Android signing secrets are required to generate assetlinks.json')

try:
    keystore_bytes = base64.b64decode(keystore_b64, validate=True)
except Exception as error:
    raise SystemExit('Android keystore secret is not valid base64') from error

with tempfile.NamedTemporaryFile(prefix='quizspace-keystore-', suffix='.jks', delete=True) as keystore:
    keystore.write(keystore_bytes)
    keystore.flush()
    command = [
        'keytool', '-list', '-v', '-keystore', keystore.name,
        '-storepass', keystore_password, '-alias', key_alias,
    ]
    completed = subprocess.run(command, check=False, capture_output=True, text=True)
    if completed.returncode != 0:
        raise SystemExit('Unable to inspect the Android signing certificate')
    match = re.search(r'SHA256:\s*([0-9A-Fa-f:]{95})', completed.stdout)
    if match is None:
        raise SystemExit('Android signing certificate SHA-256 fingerprint was not found')
    fingerprint = match.group(1).upper()

output = Path(os.environ.get('ASSETLINKS_OUTPUT', 'public/.well-known/assetlinks.json'))
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(
    json.dumps([
        {
            'relation': ['delegate_permission/common.handle_all_urls'],
            'target': {
                'namespace': 'android_app',
                'package_name': PACKAGE_NAME,
                'sha256_cert_fingerprints': [fingerprint],
            },
        },
    ], indent=2) + '\n',
    encoding='utf-8',
)
print('Generated Android App Links verification file for com.quizspace.badawy')
