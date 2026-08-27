import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../services/app_update_service.dart';

class UpdateGate extends StatefulWidget {
  const UpdateGate({super.key, required this.child});

  final Widget child;

  @override
  State<UpdateGate> createState() => _UpdateGateState();
}

class _UpdateGateState extends State<UpdateGate> with WidgetsBindingObserver {
  final _service = AppUpdateService();
  AppUpdateInfo? _update;
  bool _checking = true;
  bool _downloading = false;
  bool _installPermissionBlocked = false;
  int _received = 0;
  int _total = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkForUpdate();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_downloading) {
      _checkForUpdate();
    }
  }

  Future<void> _checkForUpdate() async {
    if (!mounted) {
      return;
    }
    setState(() {
      _checking = true;
      _error = null;
      _installPermissionBlocked = false;
    });
    try {
      final update = await _service.checkForUpdate();
      if (mounted) {
        setState(() => _update = update);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'تعذر التحقق من التحديث الآن. تحقق من اتصال الإنترنت وحاول مرة أخرى.');
      }
    } finally {
      if (mounted) {
        setState(() => _checking = false);
      }
    }
  }

  Future<void> _downloadAndInstall() async {
    final update = _update;
    if (update == null || _downloading) return;
    setState(() {
      _downloading = true;
      _error = null;
      _received = 0;
      _total = 0;
      _installPermissionBlocked = false;
    });
    try {
      await _service.downloadAndInstall(
        update,
        onProgress: (received, total) {
          if (mounted) {
            setState(() {
              _received = received;
              _total = total;
            });
          }
        },
      );
    } on StateError catch (error) {
      if (mounted) {
        setState(() {
          _installPermissionBlocked = error.message == 'INSTALL_PERMISSION_REQUIRED';
          _error = _installPermissionBlocked
              ? 'السماح بالتثبيت مطلوب من إعدادات Android. فعّله ثم اضغط تحديث مرة أخرى.'
              : 'تعذر بدء تثبيت التحديث.';
        });
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذر تنزيل التحديث أو التحقق منه. حاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _downloading = false);
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
      downloading: _downloading,
      received: _received,
      total: _total,
      error: _error,
      installPermissionBlocked: _installPermissionBlocked,
      onUpdate: _downloadAndInstall,
      onRetry: _checkForUpdate,
    );
  }
}

class _UpdateRequiredView extends StatelessWidget {
  const _UpdateRequiredView({
    required this.update,
    required this.downloading,
    required this.received,
    required this.total,
    required this.error,
    required this.installPermissionBlocked,
    required this.onUpdate,
    required this.onRetry,
  });

  final AppUpdateInfo update;
  final bool downloading;
  final int received;
  final int total;
  final String? error;
  final bool installPermissionBlocked;
  final VoidCallback onUpdate;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final progress = total > 0 ? received / total : null;
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
                    if (downloading) ...[
                      LinearProgressIndicator(value: progress, minHeight: 8, borderRadius: BorderRadius.circular(8), color: const Color(0xFFD8B4FE), backgroundColor: Colors.white12),
                      const SizedBox(height: 10),
                      Text(total > 0 ? '${(progress! * 100).round()}% — جاري تنزيل التحديث' : 'جاري تنزيل التحديث...', style: TextStyle(color: Colors.white.withValues(alpha: 0.68))),
                    ] else ...[
                      SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: onUpdate, icon: const Icon(Icons.download_rounded), label: const Text('تحميل وتثبيت التحديث'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), backgroundColor: const Color(0xFFB88CFF), foregroundColor: const Color(0xFF160B2B), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))))),
                      if (installPermissionBlocked) ...[
                        const SizedBox(height: 10),
                        TextButton.icon(onPressed: openAppSettings, icon: const Icon(Icons.settings_rounded), label: const Text('فتح إعدادات التطبيق')),
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
