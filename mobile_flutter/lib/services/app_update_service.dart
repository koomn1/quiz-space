import 'dart:convert';
import 'dart:io';

import 'package:apk_sideload/install_apk.dart';
import 'package:crypto/crypto.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'background_download_service.dart';
import 'permissions_service.dart';

class AppUpdateInfo {
  const AppUpdateInfo({
    required this.version,
    required this.tagName,
    required this.apkUrl,
    required this.checksumUrl,
    required this.releaseUrl,
    required this.notes,
    required this.buildNumber,
  });

  final String version;
  final String tagName;
  final String apkUrl;
  final String checksumUrl;
  final String releaseUrl;
  final String notes;

  /// Native CI run number this release was built from; the APK's Android
  /// versionCode is 3000000 + run (see mobile-native-ci.yml), so installs
  /// compare channels without any wrapper version ever matching.
  final int buildNumber;

  /// The native app updates ONLY from native releases: tags native-uat-RUN
  /// carrying quizspace-native-uat-RUN.apk + its .sha256. Wrapper releases
  /// (mobile-vX.Y.Z on /releases/latest) are a different channel and are
  /// never considered here.
  factory AppUpdateInfo.fromNativeRelease(Map<String, dynamic> json) {
    final assets = (json['assets'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);
    String? assetUrl(String name) {
      for (final asset in assets) {
        if (asset['name'] == name && asset['browser_download_url'] is String) {
          return asset['browser_download_url'] as String;
        }
      }
      return null;
    }

    final tagName = json['tag_name'] as String? ?? '';
    final run = parseRunFromTag(tagName);
    final apkUrl = run == null ? null : assetUrl('quizspace-native-uat-$run.apk');
    final checksumUrl = run == null ? null : assetUrl('quizspace-native-uat-$run.apk.sha256');
    if (run == null || apkUrl == null || checksumUrl == null) {
      throw const FormatException('Invalid native release metadata');
    }

    return AppUpdateInfo(
      version: '$run',
      tagName: tagName,
      apkUrl: apkUrl,
      checksumUrl: checksumUrl,
      releaseUrl: json['html_url'] as String? ?? '',
      notes: json['body'] as String? ?? '',
      buildNumber: run,
    );
  }

  static int? parseRunFromTag(String tag) {
    final match = RegExp(r'^native-uat-(\d+)$').firstMatch(tag.trim());
    return match == null ? null : int.tryParse(match.group(1)!);
  }
}

class AppUpdateService {
  // Native channel: list releases and pick the newest native-uat-<run> one.
  // The wrapper channel (/releases/latest, mobile-vX.Y.Z) is never consulted,
  // and /releases/latest never serves native builds because they are
  // pre-releases, so the two channels stay independent in both directions.
  static const releasesListUrl = 'https://api.github.com/repos/koomn1/quiz-space/releases?per_page=30';

  final _background = BackgroundUpdateDownloadService();

  /// Run number baked into the installed APK's Android versionCode
  /// (3000000 + CI run number; see mobile-native-ci.yml). 0 for dev builds.
  Future<int> currentNativeRun() async {
    final packageInfo = await PackageInfo.fromPlatform();
    final code = int.tryParse(packageInfo.buildNumber) ?? 0;
    final run = code - 3000000;
    return run > 0 ? run : 0;
  }

  Future<AppUpdateInfo?> checkForUpdate() async {
    if (!Platform.isAndroid) return null;
    final current = await currentNativeRun();
    final releases = await _getJsonList(releasesListUrl);
    if (releases == null) return null;

    AppUpdateInfo? best;
    for (final entry in releases) {
      if (entry is! Map<String, dynamic>) continue;
      if (entry['draft'] == true) continue;
      final AppUpdateInfo? candidate = () {
        try {
          return AppUpdateInfo.fromNativeRelease(entry);
        } on FormatException {
          return null;
        }
      }();
      if (candidate == null) continue;
      if (best == null || candidate.buildNumber > best.buildNumber) best = candidate;
    }
    if (best == null) return null;
    if (current > 0 && best.buildNumber <= current) return null;
    return best;
  }

  Future<CachedUpdateDownload?> cachedDownload(AppUpdateInfo update) {
    return _background.status(update);
  }

  /// Queues an app-specific Android DownloadManager job. The job survives
  /// Flutter process death and is resumed/reported when the app opens again.
  Future<CachedUpdateDownload> startBackgroundDownload(AppUpdateInfo update) async {
    _validateDownloadUrl(update.apkUrl);
    return _background.enqueue(update);
  }

  Future<CachedUpdateDownload?> refreshBackgroundDownload(AppUpdateInfo update) {
    return _background.status(update);
  }

  /// Verifies the cached APK before opening Android's installer. Downloading
  /// and installing are deliberately separate user actions.
  Future<void> installCachedUpdate(AppUpdateInfo update) async {
    final cached = await _background.status(update);
    if (cached == null || !cached.isReady || cached.filePath == null) {
      throw StateError('UPDATE_DOWNLOAD_NOT_READY');
    }

    final apkFile = File(cached.filePath!);
    if (!await apkFile.exists()) {
      await _background.clear(update);
      throw StateError('UPDATE_DOWNLOAD_NOT_READY');
    }

    final expected = await _fetchExpectedChecksum(update.checksumUrl);
    final actual = (await sha256.bind(apkFile.openRead()).last).toString().toLowerCase();
    if (actual != expected) {
      await _background.clear(update);
      throw const FormatException('APK checksum mismatch');
    }

    final permissions = AppPermissionsService();
    if (!await permissions.requestInstallPackages()) {
      throw StateError('INSTALL_PERMISSION_REQUIRED');
    }
    await InstallApk().installApk(apkFile.path);
  }

  /// Kept for callers from older builds. New UI uses the two-step background
  /// API so closing the app never cancels the download.
  Future<void> downloadAndInstall(
    AppUpdateInfo update, {
    required void Function(int received, int total) onProgress,
  }) async {
    final state = await startBackgroundDownload(update);
    onProgress(state.received, state.total);
    if (!state.isReady) throw StateError('DOWNLOAD_STARTED_IN_BACKGROUND');
    await installCachedUpdate(update);
  }

  Future<String> _fetchExpectedChecksum(String url) async {
    final httpClient = HttpClient()..userAgent = 'QuizSpace-Mobile-Updater';
    try {
      final request = await httpClient.getUrl(Uri.parse(url));
      request.headers.set(HttpHeaders.acceptHeader, 'text/plain');
      final response = await request.close();
      if (response.statusCode != HttpStatus.ok) {
        throw const FormatException('Checksum download failed');
      }
      final checksumText = await response.transform(utf8.decoder).join();
      final expected = RegExp(r'\b[a-fA-F0-9]{64}\b').firstMatch(checksumText)?.group(0)?.toLowerCase();
      if (expected == null) throw const FormatException('Checksum format is invalid');
      return expected;
    } finally {
      httpClient.close(force: true);
    }
  }

  void _validateDownloadUrl(String rawUrl) {
    final uri = Uri.tryParse(rawUrl);
    final host = uri?.host.toLowerCase() ?? '';
    final allowedHost = host == 'github.com' || host.endsWith('.github.com') || host.endsWith('.githubusercontent.com');
    if (uri == null || uri.scheme != 'https' || !allowedHost) {
      throw const FormatException('Update URL is not trusted');
    }
  }

  Future<List<dynamic>?> _getJsonList(String url) async {
    final httpClient = HttpClient()..userAgent = 'QuizSpace-Mobile-Updater';
    try {
      final request = await httpClient.getUrl(Uri.parse(url));
      request.headers.set(HttpHeaders.acceptHeader, 'application/vnd.github+json');
      request.headers.set('X-GitHub-Api-Version', '2022-11-28');
      final response = await request.close();
      if (response.statusCode != HttpStatus.ok) return null;
      final body = await response.transform(utf8.decoder).join();
      final decoded = jsonDecode(body);
      return decoded is List<dynamic> ? decoded : null;
    } finally {
      httpClient.close(force: true);
    }
  }
}

int compareVersions(String left, String right) {
  final a = left.split('.').map((part) => int.tryParse(part) ?? 0).toList();
  final b = right.split('.').map((part) => int.tryParse(part) ?? 0).toList();
  for (var index = 0; index < 3; index++) {
    final comparison = (a.length > index ? a[index] : 0).compareTo(b.length > index ? b[index] : 0);
    if (comparison != 0) return comparison;
  }
  return 0;
}
