from pathlib import Path
import re
import sys

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('android/app/src/main/AndroidManifest.xml')
text = path.read_text(encoding='utf-8')

application_start = text.find('<application')
application_end = text.find('>', application_start)
if application_start == -1 or application_end == -1:
    raise SystemExit('The application entry was not found in AndroidManifest.xml')
application_tag = text[application_start:application_end + 1]
application_tag = re.sub(r'android:label="[^"]*"', 'android:label="QuizSpace"', application_tag, count=1)
text = text[:application_start] + application_tag + text[application_end + 1:]

permissions = (
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.CAMERA',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.REQUEST_INSTALL_PACKAGES',
)
for permission in permissions:
    declaration = f'    <uses-permission android:name="{permission}" />\n'
    if permission not in text:
        application_marker = '<application'
        marker_index = text.find(application_marker)
        if marker_index == -1:
            raise SystemExit('The application entry was not found in AndroidManifest.xml')
        text = text[:marker_index] + declaration + text[marker_index:]

# Keep Android App Links limited to quiz-sharing routes. The website host must not
# capture OAuth callbacks or ordinary website navigation.
text = re.sub(
    r'(<data\s+android:scheme="https"\s+android:host="quiz-space-app\.pages\.dev")(?!\s+android:pathPrefix)(\s*/>)',
    r'\1 android:pathPrefix="/share/quiz"\2',
    text,
)
text = re.sub(
    r'(<data\s+android:scheme="https"\s+android:host="quiz-space-share\.pages\.dev")(?!\s+android:pathPrefix)(\s*/>)',
    r'\1 android:pathPrefix="/share/quiz"\2',
    text,
)

if 'android:host="quiz-space-app.pages.dev"' not in text:
    activity_marker = '<activity'
    activity_index = text.find(activity_marker)
    if activity_index == -1:
        raise SystemExit('The main activity entry was not found in AndroidManifest.xml')
    activity_end = text.find('>', activity_index)
    if activity_end == -1:
        raise SystemExit('The main activity opening tag is malformed')
    activity_opening = text[activity_index:activity_end + 1]
    if 'android:launchMode=' not in activity_opening:
        activity_opening = activity_opening[:-1] + ' android:launchMode="singleTop">'
        text = text[:activity_index] + activity_opening + text[activity_end + 1:]
        activity_end = activity_index + len(activity_opening) - 1
    intent_filter = '''
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="https"
                    android:host="quiz-space-app.pages.dev"
                    android:pathPrefix="/share/quiz" />
            </intent-filter>'''
    text = text[:activity_end + 1] + intent_filter + text[activity_end + 1:]

if 'android:host="quiz-space-share.pages.dev"' not in text:
    activity_marker = '<activity'
    activity_index = text.find(activity_marker)
    if activity_index == -1:
        raise SystemExit('The main activity entry was not found in AndroidManifest.xml')
    activity_end = text.find('>', activity_index)
    if activity_end == -1:
        raise SystemExit('The main activity opening tag is malformed')
    intent_filter = '''
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="https"
                    android:host="quiz-space-share.pages.dev"
                    android:pathPrefix="/share/quiz" />
            </intent-filter>'''
    text = text[:activity_end + 1] + intent_filter + text[activity_end + 1:]

if 'android:scheme="io.quizspace.mobile"' not in text:
    activity_marker = '<activity'
    activity_index = text.find(activity_marker)
    if activity_index == -1:
        raise SystemExit('The main activity entry was not found in AndroidManifest.xml')
    activity_end = text.find('>', activity_index)
    if activity_end == -1:
        raise SystemExit('The main activity opening tag is malformed')
    intent_filter = '''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="io.quizspace.mobile"
                    android:host="login-callback" />
            </intent-filter>'''
    text = text[:activity_end + 1] + intent_filter + text[activity_end + 1:]

path.write_text(text, encoding='utf-8')
print(f'Configured Android permissions and deep link in {path}')
