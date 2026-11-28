import 'package:flutter_test/flutter_test.dart';

import 'package:quizspace_mobile/services/app_update_service.dart';
import 'package:quizspace_mobile/services/background_download_service.dart';

void main() {
  group('AppUpdateInfo (native channel)', () {
    test('accepts a complete native-uat release', () {
      final update = AppUpdateInfo.fromNativeRelease({
        'tag_name': 'native-uat-146',
        'html_url': 'https://github.com/koomn1/quiz-space/releases/tag/native-uat-146',
        'body': 'سبورة نيتف.',
        'assets': [
          {'name': 'quizspace-native-uat-146.apk', 'browser_download_url': 'https://example.com/native.apk'},
          {'name': 'quizspace-native-uat-146.apk.sha256', 'browser_download_url': 'https://example.com/native.sha256'},
        ],
      });

      expect(update.version, '146');
      expect(update.buildNumber, 146);
      expect(update.apkUrl, 'https://example.com/native.apk');
      expect(update.checksumUrl, 'https://example.com/native.sha256');
    });

    test('rejects wrapper releases so the wrapper channel is never offered to the native app', () {
      expect(
        () => AppUpdateInfo.fromNativeRelease({
          'tag_name': 'mobile-v3.1.535',
          'assets': [
            {'name': 'quizspace-mobile.apk', 'browser_download_url': 'https://example.com/wrapper.apk'},
            {'name': 'quizspace-mobile.apk.sha256', 'browser_download_url': 'https://example.com/wrapper.sha256'},
          ],
        }),
        throwsFormatException,
      );
    });

    test('rejects a native release with missing APK or checksum', () {
      expect(
        () => AppUpdateInfo.fromNativeRelease({'tag_name': 'native-uat-146', 'assets': []}),
        throwsFormatException,
      );
    });

    test('parses run numbers only from native-uat tags', () {
      expect(AppUpdateInfo.parseRunFromTag('native-uat-146'), 146);
      expect(AppUpdateInfo.parseRunFromTag('mobile-v3.1.535'), isNull);
      expect(AppUpdateInfo.parseRunFromTag('native-uat-x'), isNull);
      expect(AppUpdateInfo.parseRunFromTag('native-uat-146-extra'), isNull);
    });
  });

  group('compareVersions', () {
    test('compares semantic versions numerically', () {
      expect(compareVersions('1.10.0', '1.9.9'), greaterThan(0));
      expect(compareVersions('1.2.0', '1.2.0'), 0);
      expect(compareVersions('1.1.9', '1.2.0'), lessThan(0));
    });
  });

  group('CachedUpdateDownload', () {
    test('restores an active background download and progress', () {
      final state = CachedUpdateDownload.fromMap({
        'version': '1.2.3',
        'status': 'running',
        'received': 25,
        'total': 100,
      });

      expect(state.isActive, isTrue);
      expect(state.isReady, isFalse);
      expect(state.progress, 0.25);
    });

    test('marks a completed download with a path ready for install', () {
      final state = CachedUpdateDownload.fromMap({
        'version': '1.2.3',
        'status': 'complete',
        'received': 100,
        'total': 100,
        'filePath': '/data/user/0/com.quizspace.badawy/files/quizspace-update.apk',
      });

      expect(state.isActive, isFalse);
      expect(state.isReady, isTrue);
      expect(state.progress, 1.0);
    });
  });
}
