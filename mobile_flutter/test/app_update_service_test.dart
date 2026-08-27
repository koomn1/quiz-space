import 'package:flutter_test/flutter_test.dart';

import 'package:quizspace_mobile/services/app_update_service.dart';

void main() {
  group('AppUpdateInfo', () {
    test('accepts a complete stable GitHub release', () {
      final update = AppUpdateInfo.fromGithubRelease({
        'tag_name': 'mobile-v1.2.3',
        'html_url': 'https://github.com/koomn1/quiz-space/releases/tag/mobile-v1.2.3',
        'body': 'تحسينات وصلاحيات.',
        'assets': [
          {'name': 'quizspace-mobile.apk', 'browser_download_url': 'https://example.com/app.apk'},
          {'name': 'quizspace-mobile.apk.sha256', 'browser_download_url': 'https://example.com/app.sha256'},
        ],
      });

      expect(update.version, '1.2.3');
      expect(update.apkUrl, 'https://example.com/app.apk');
      expect(update.checksumUrl, 'https://example.com/app.sha256');
    });

    test('rejects a release with missing APK or checksum', () {
      expect(
        () => AppUpdateInfo.fromGithubRelease({'tag_name': 'mobile-v1.2.3', 'assets': []}),
        throwsFormatException,
      );
    });

    test('only accepts the mobile semantic version tag format', () {
      expect(AppUpdateInfo.parseVersionFromTag('mobile-v2.0.0'), '2.0.0');
      expect(AppUpdateInfo.parseVersionFromTag('v2.0.0'), isNull);
      expect(AppUpdateInfo.parseVersionFromTag('mobile-v2.0'), isNull);
    });
  });

  group('compareVersions', () {
    test('compares semantic versions numerically', () {
      expect(compareVersions('1.10.0', '1.9.9'), greaterThan(0));
      expect(compareVersions('1.2.0', '1.2.0'), 0);
      expect(compareVersions('1.1.9', '1.2.0'), lessThan(0));
    });
  });
}
