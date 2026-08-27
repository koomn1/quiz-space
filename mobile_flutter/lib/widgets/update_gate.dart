import 'dart:async';

import 'package:flutter/material.dart';

import '../services/app_update_service.dart';
import '../services/background_download_service.dart';
import '../services/permissions_service.dart';

class UpdateGate extends StatefulWidget {
  const UpdateGate({super.key, required this.child});

  final Widget child;

  @override
  State<UpdateGate> createState() => _UpdateGateState();
}

class _UpdateGateState extends State<UpdateGate> with WidgetsBindingObserver {
  final _service = AppUpdateService();
  final _permissions = AppPermissionsService();
  AppUpdateInfo? _update;
  CachedUpdateDownload? _download;
  Timer? _downloadPoller;
  bool _checking = true;
  bool _busy = false;
  bool _installPermissionBlocked = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkForUpdate();
  }

  @override
  void dispose() {
    _downloadPoller?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkForUpdate();
    }
  }

  Future<void> _checkForUpdate() async {
    if (!mounted) return;
    setState(() {
      _checking = true;
      _error = null;
      _installPermissionBlocked = false;
    });
    try {
      final update = await _service.checkForUpdate();
      if (!mounted) return;
      if (update == null) {
        _downloadPoller?.cancel();
        setState(() {
          _update = null;
          _download = null;
        });
        return;
      }

      final cached = await _service.cachedDownload(update);
      if (!mounted) return;
      setState(() {
        _update = update;
        _download = cached;
      });
      _startDownloadPollingIfNeeded();
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر التحقق من التحديث الآن. تحقق من اتصال الإنترنت وحاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  void _startDownloadPollingIfNeeded() {
    _downloadPoller?.cancel();
    if (!(_download?.isActive ?? false)) return;
    _downloadPoller = Timer.periodic(const Duration(seconds: 2), (_) => _refreshDownloadStatus());
  }

  Future<void> _refreshDownloadStatus() async {
    final update = _update;
    if (update == null || !mounted) return;
    try {
      final state = await _service.refreshBackgroundDownload(update);
      if (!mounted) return;
      setState(() => _download = state);
      if (!(state?.isActive ?? false)) _downloadPoller?.cancel();
    } catch (_) {
      // DownloadManager remains the authority. A transient status read failure
      // must not cancel a download that is continuing outside Flutter.
    }
  }

  Future<void> _downloadOrInstall() async {
    final update = _update;
    if (update == null || _busy) return;
    if (_download?.isReady == true) {
      await _installCached(update);
    } else {
      await _startBackgroundDownload(update);
    }
  }

  Future<void> _startBackgroundDownload(AppUpdateInfo update) async {
    setState(() {
      _busy = true;
      _error = null;
      _installPermissionBlocked = false;
    });
    try {
      final state = await _service.startBackgroundDownload(update);
      if (!mounted) return;
      setState(() => _download = state);
      _startDownloadPollingIfNeeded();
    } on FormatException {
      if (mounted) setState(() => _error = 'رابط التحديث غير موثوق. حاول مرة أخرى من داخل التطبيق.');
    } on StateError {
      if (mounted) setState(() => _error = 'تعذر بدء التنزيل في الخلفية. حاول مرة أخرى.');
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر بدء تنزيل التحديث. تحقق من الإنترنت وحاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _installCached(AppUpdateInfo update) async {
    setState(() {
      _busy = true;
      _error = null;
      _installPermissionBlocked = false;
    });
    try {
      await _service.installCachedUpdate(update);
    } on StateError catch (error) {
      if (!mounted) return;
      final code = error.message;
      setState(() {
        _installPermissionBlocked = code == 'INSTALL_PERMISSION_REQUIRED';
        _error = switch (code) {
          'INSTALL_PERMISSION_REQUIRED' => 'السماح بالتثبيت مطلوب من إعدادات Android. فعّله ثم اضغط تثبيت مرة أخرى.',
          'UPDATE_DOWNLOAD_NOT_READY' => 'التحديث لسه بيتنزّل. اقفل التطبيق عادي، ولما تفتحه هتلاقيه جاهز أو اضغط تحديث الحالة.',
          _ => 'تعذر بدء تثبيت التحديث.',
        };
      });
    } on FormatException {
      if (mounted) setState(() => _error = 'فشل التحقق من ملف التحديث. بدأ تنزيله من جديد للحماية.');
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تثبيت التحديث الآن. حاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking && _update == null) {
      return Stack(children: [widget.child, const Positioned(top: 0, left: 0, right: 0, child: LinearProgressIndicator(minHeight: 2))]);
    }
    final update = _update;
    if (update == null) return widget.child;
    return _UpdateRequiredView(
      update: update,
      download: _download,
      busy: _busy,
      error: _error,
      installPermissionBlocked: _installPermissionBlocked,
      onDownloadOrInstall: _downloadOrInstall,
      onRetry: _checkForUpdate,
      onOpenInstallSettings: _permissions.openInstallSettings,
    );
  }
}

class _UpdateRequiredView extends StatelessWidget {
  const _UpdateRequiredView({
    required this.update,
    required this.download,
    required this.busy,
    required this.error,
    required this.installPermissionBlocked,
    required this.onDownloadOrInstall,
    required this.onRetry,
    required this.onOpenInstallSettings,
  });

  final AppUpdateInfo update;
  final CachedUpdateDownload? download;
  final bool busy;
  final String? error;
  final bool installPermissionBlocked;
  final VoidCallback onDownloadOrInstall;
  final VoidCallback onRetry;
  final VoidCallback onOpenInstallSettings;

  @override
  Widget build(BuildContext context) {
    final progress = download?.progress;
    final isReady = download?.isReady ?? false;
    final isActive = download?.isActive ?? false;
    final isFailed = download?.status == CachedUpdateDownloadStatus.failed;
    return Scaffold(
      backgroundColor: const Color(0xFF080D1D),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Card(
              color: const Color(0xFF151B31),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset('assets/quizspace-logo.webp', width: 86, height: 86),
                    const SizedBox(height: 18),
                    const Text('تحديث مهم متاح', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 10),
                    Text('لازم تحدّث QuizSpace قبل ما تكمل استخدام التطبيق.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.72), height: 1.5)),
                    const SizedBox(height: 16),
                    Text('الإصدار الجديد ${update.version}', style: const TextStyle(color: Color(0xFFD8B4FE), fontWeight: FontWeight.w800)),
                    if (update.notes.trim().isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(update.notes.trim(), maxLines: 5, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.58), height: 1.4)),
                    ],
                    if (error != null) ...[
                      const SizedBox(height: 18),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(13),
                        decoration: BoxDecoration(color: const Color(0xFF7F1D1D).withValues(alpha: 0.34), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFFCA5A5).withValues(alpha: 0.42))),
                        child: Text(error!, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFFECACA), height: 1.4)),
                      ),
                    ],
                    const SizedBox(height: 22),
                    if (isReady) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(13),
                        decoration: BoxDecoration(color: const Color(0xFF064E3B).withValues(alpha: 0.42), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF6EE7B7).withValues(alpha: 0.42))),
                        child: const Text('التحديث اتنزّل بالكامل وجاهز للتثبيت.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFFA7F3D0), fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: busy ? null : onDownloadOrInstall, icon: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Color(0xFF160B2B))) : const Icon(Icons.install_mobile_rounded), label: Text(busy ? 'جاري تجهيز التثبيت...' : 'تثبيت التحديث'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), backgroundColor: const Color(0xFFB88CFF), foregroundColor: const Color(0xFF160B2B), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))))),
                    ] else if (isActive) ...[
                      LinearProgressIndicator(value: progress, minHeight: 8, borderRadius: BorderRadius.circular(8), color: const Color(0xFFD8B4FE), backgroundColor: Colors.white12),
                      const SizedBox(height: 10),
                      Text(progress != null ? '${(progress * 100).round()}% — التحديث بيتنزّل في الخلفية' : 'التحديث بيتنزّل في الخلفية...', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.72))),
                      const SizedBox(height: 8),
                      Text('تقدر تقفل التطبيق عادي. Android هيكمل التنزيل، ولما ترجع هتلاقيه جاهز للتثبيت.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.52), height: 1.45, fontSize: 12)),
                    ] else ...[
                      SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: busy ? null : onDownloadOrInstall, icon: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Color(0xFF160B2B))) : const Icon(Icons.download_rounded), label: Text(busy ? 'جاري بدء التنزيل...' : isFailed ? 'إعادة تنزيل التحديث' : 'تحميل التحديث في الخلفية'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), backgroundColor: const Color(0xFFB88CFF), foregroundColor: const Color(0xFF160B2B), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))))),
                      if (installPermissionBlocked) ...[
                        const SizedBox(height: 10),
                        TextButton.icon(onPressed: onOpenInstallSettings, icon: const Icon(Icons.settings_rounded), label: const Text('فتح إعدادات التثبيت')),
                      ],
                      if (error != null) ...[
                        const SizedBox(height: 5),
                        TextButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
                      ],
                    ],
                    const SizedBox(height: 15),
                    Text('سيتم تثبيت النسخة فوق القديمة، وبيانات الحساب لا تُحذف.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.48), fontSize: 12, height: 1.4)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
