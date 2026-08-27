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
  });

  final String version;
  final String tagName;
  final String apkUrl;
  final String checksumUrl;
  final String releaseUrl;
  final String notes;

  factory AppUpdateInfo.fromGithubRelease(Map<String, dynamic> json) {
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
    final version = parseVersionFromTag(tagName);
    final apkUrl = assetUrl('quizspace-mobile.apk');
    final checksumUrl = assetUrl('quizspace-mobile.apk.sha256');
    if (version == null || apkUrl == null || checksumUrl == null) {
      throw const FormatException('Invalid QuizSpace release metadata');
    }

    return AppUpdateInfo(
      version: version,
      tagName: tagName,
      apkUrl: apkUrl,
      checksumUrl: checksumUrl,
      releaseUrl: json['html_url'] as String? ?? '',
      notes: json['body'] as String? ?? '',
    );
  }

  static String? parseVersionFromTag(String tag) {
    final match = RegExp(r'^mobile-v(\d+\.\d+\.\d+)$').firstMatch(tag.trim());
    return match?.group(1);
  }
}

class AppUpdateService {
  static const latestReleaseUrl = 'https://api.github.com/repos/koomn1/quiz-space/releases/latest';

  final _background = BackgroundUpdateDownloadService();

  Future<String> currentVersion() async {
    final packageInfo = await PackageInfo.fromPlatform();
    return packageInfo.version;
  }

  Future<AppUpdateInfo?> checkForUpdate() async {
    if (!Platform.isAndroid) return null;
    final current = await currentVersion();
    final json = await _getJson(latestReleaseUrl);
    if (json == null || json['draft'] == true || json['prerelease'] == true) return null;

    try {
      final release = AppUpdateInfo.fromGithubRelease(json);
      if (compareVersions(release.version, current) <= 0) return null;
      return release;
    } on FormatException {
      return null;
    }
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

  Future<Map<String, dynamic>?> _getJson(String url) async {
    final httpClient = HttpClient()..userAgent = 'QuizSpace-Mobile-Updater';
    try {
      final request = await httpClient.getUrl(Uri.parse(url));
      request.headers.set(HttpHeaders.acceptHeader, 'application/vnd.github+json');
      request.headers.set('X-GitHub-Api-Version', '2022-11-28');
      final response = await request.close();
      if (response.statusCode != HttpStatus.ok) return null;
      final body = await response.transform(utf8.decoder).join();
      final decoded = jsonDecode(body);
      return decoded is Map<String, dynamic> ? decoded : null;
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
