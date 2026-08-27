import 'dart:convert';
import 'dart:io';

import 'package:apk_sideload/install_apk.dart';
import 'package:crypto/crypto.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

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

  Future<void> downloadAndInstall(
    AppUpdateInfo update, {
    required void Function(int received, int total) onProgress,
  }) async {
    final directory = await getTemporaryDirectory();
    final apkFile = File('${directory.path}/quizspace-update-${update.version}.apk');
    if (await apkFile.exists()) await apkFile.delete();

    final httpClient = HttpClient()..userAgent = 'QuizSpace-Mobile-Updater';
    final permissions = AppPermissionsService();
    try {
      final request = await httpClient.getUrl(Uri.parse(update.apkUrl));
      request.headers.set(HttpHeaders.acceptHeader, 'application/octet-stream');
      final response = await request.close();
      if (response.statusCode != HttpStatus.ok) {
        throw HttpException('APK download failed', uri: Uri.parse(update.apkUrl));
      }

      final total = response.contentLength;
      var received = 0;
      final sink = apkFile.openWrite();
      await for (final chunk in response) {
        sink.add(chunk);
        received += chunk.length;
        onProgress(received, total);
      }
      await sink.close();

      final checksumResponse = await httpClient.getUrl(Uri.parse(update.checksumUrl));
      final checksumResult = await checksumResponse.close();
      if (checksumResult.statusCode != HttpStatus.ok) {
        throw const FormatException('Checksum download failed');
      }
      final checksumText = await checksumResult.transform(utf8.decoder).join();
      final expected = RegExp(r'\b[a-fA-F0-9]{64}\b').firstMatch(checksumText)?.group(0)?.toLowerCase();
      if (expected == null) throw const FormatException('Checksum format is invalid');

      final actual = sha256.convert(await apkFile.readAsBytes()).toString().toLowerCase();
      if (actual != expected) {
        try {
          await apkFile.delete();
        } catch (_) {
          // Ignore cleanup failures after a checksum mismatch.
        }
        throw const FormatException('APK checksum mismatch');
      }

      if (!Platform.isAndroid) return;
      final installPermission = await permissions.requestInstallPackages();
      if (!installPermission.isGranted) {
        throw StateError('INSTALL_PERMISSION_REQUIRED');
      }
      await InstallApk().installApk(apkFile.path);
    } finally {
      httpClient.close(force: true);
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
