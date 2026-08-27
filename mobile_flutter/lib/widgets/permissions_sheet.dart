import 'package:flutter/material.dart';

import '../services/native_permissions.dart';
import '../services/permissions_service.dart';

class PermissionsSheet extends StatefulWidget {
  const PermissionsSheet({super.key});

  @override
  State<PermissionsSheet> createState() => _PermissionsSheetState();
}

class _PermissionsSheetState extends State<PermissionsSheet> {
  final _service = AppPermissionsService();
  NativePermissionType? _loading;
  final _statuses = <NativePermissionType, bool>{};

  @override
  void initState() {
    super.initState();
    _refreshStatuses();
  }

  Future<void> _refreshStatuses() async {
    for (final permission in NativePermissionType.values) {
      try {
        final granted = await _service.isGranted(permission);
        if (mounted) setState(() => _statuses[permission] = granted);
      } catch (_) {
        // Unsupported platform permissions remain unknown.
      }
    }
  }

  Future<void> _request(NativePermissionType permission, Future<bool> Function() action) async {
    setState(() => _loading = permission);
    try {
      final granted = await action();
      if (mounted) setState(() => _statuses[permission] = granted);
    } finally {
      if (mounted) setState(() => _loading = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(5)))),
            const SizedBox(height: 18),
            const Text('صلاحيات التطبيق', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 7),
            Text('نطلب كل صلاحية وقت احتياج الميزة فقط، ولا نستخدم تخزين الهاتف بالكامل.', style: TextStyle(color: Colors.white.withValues(alpha: 0.62), height: 1.4)),
            const SizedBox(height: 16),
            _PermissionRow(icon: Icons.notifications_outlined, title: 'الإشعارات', subtitle: 'لتنبيهات التحديث والأحداث المهمة', granted: _statuses[NativePermissionType.notifications], loading: _loading == NativePermissionType.notifications, onPressed: () => _request(NativePermissionType.notifications, () => _service.requestNotificationsOnce())),
            _PermissionRow(icon: Icons.photo_camera_outlined, title: 'الكاميرا', subtitle: 'لما تستخدم تصوير أو رفع صورة', granted: _statuses[NativePermissionType.camera], loading: _loading == NativePermissionType.camera, onPressed: () => _request(NativePermissionType.camera, _service.requestCamera)),
            _PermissionRow(icon: Icons.photo_library_outlined, title: 'الصور', subtitle: 'لاختيار صورة من معرض الهاتف', granted: _statuses[NativePermissionType.photos], loading: _loading == NativePermissionType.photos, onPressed: () => _request(NativePermissionType.photos, _service.requestPhotos)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(14)),
              child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(Icons.folder_outlined, color: Color(0xFFD8B4FE)), SizedBox(width: 10), Expanded(child: Text('الملفات: سيتم استخدام منتقي ملفات Android عند إضافة ملف، لذلك لا نطلب صلاحية قراءة كل الملفات.', style: TextStyle(color: Colors.white70, height: 1.4)))]),
            ),
          ],
        ),
      ),
    );
  }
}

class _PermissionRow extends StatelessWidget {
  const _PermissionRow({required this.icon, required this.title, required this.subtitle, required this.granted, required this.loading, required this.onPressed});

  final IconData icon;
  final String title;
  final String subtitle;
  final bool? granted;
  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final allowed = granted == true;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(vertical: 3),
      leading: CircleAvatar(backgroundColor: const Color(0xFF7C3AED).withValues(alpha: 0.2), child: Icon(icon, color: const Color(0xFFD8B4FE))),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(allowed ? 'مسموح' : subtitle, style: TextStyle(color: allowed ? const Color(0xFF86EFAC) : Colors.white54, fontSize: 12)),
      trailing: loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)) : OutlinedButton(onPressed: onPressed, child: Text(allowed ? 'تم' : 'السماح')),
    );
  }
}
