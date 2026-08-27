import 'package:flutter/services.dart';

import 'app_update_service.dart';

class CachedUpdateDownload {
  const CachedUpdateDownload({
    required this.version,
    required this.status,
    required this.received,
    required this.total,
    this.filePath,
    this.reason,
  });

  final String version;
  final CachedUpdateDownloadStatus status;
  final int received;
  final int total;
  final String? filePath;
  final int? reason;

  bool get isReady => status == CachedUpdateDownloadStatus.complete && filePath != null && filePath!.isNotEmpty;
  bool get isActive => status == CachedUpdateDownloadStatus.pending || status == CachedUpdateDownloadStatus.running || status == CachedUpdateDownloadStatus.paused;

  double? get progress => total > 0 ? (received / total).clamp(0, 1).toDouble() : null;

  factory CachedUpdateDownload.fromMap(Map<dynamic, dynamic> map) {
    final rawStatus = (map['status'] ?? 'unknown').toString();
    return CachedUpdateDownload(
      version: (map['version'] ?? '').toString(),
      status: CachedUpdateDownloadStatus.values.firstWhere(
        (value) => value.name == rawStatus,
        orElse: () => CachedUpdateDownloadStatus.unknown,
      ),
      received: _asInt(map['received']),
      total: _asInt(map['total']),
      filePath: (map['filePath'] ?? '').toString().trim().isEmpty ? null : (map['filePath'] ?? '').toString(),
      reason: map['reason'] is num ? (map['reason'] as num).toInt() : int.tryParse((map['reason'] ?? '').toString()),
    );
  }

  static int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}

enum CachedUpdateDownloadStatus { none, pending, running, paused, complete, failed, unknown }

class BackgroundUpdateDownloadService {
  static const _channel = MethodChannel('io.quizspace.mobile/update');

  Future<CachedUpdateDownload?> status(AppUpdateInfo update) async {
    final result = await _channel.invokeMethod<dynamic>('status', {'version': update.version});
    if (result is! Map) return null;
    final state = CachedUpdateDownload.fromMap(result);
    return state.version == update.version ? state : null;
  }

  Future<CachedUpdateDownload> enqueue(AppUpdateInfo update) async {
    final result = await _channel.invokeMethod<dynamic>('enqueue', {
      'version': update.version,
      'url': update.apkUrl,
      'fileName': 'quizspace-update-${update.version}.apk',
    });
    if (result is! Map) throw StateError('BACKGROUND_DOWNLOAD_UNAVAILABLE');
    return CachedUpdateDownload.fromMap(result);
  }

  Future<void> clear(AppUpdateInfo update) async {
    await _channel.invokeMethod<void>('clear', {'version': update.version});
  }
}
