import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/quizspace_repository.dart';
import '../widgets/permissions_sheet.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notifications = true;
  bool _weeklySummary = false;
  String _version = 'جارٍ القراءة...';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final info = await PackageInfo.fromPlatform();
    if (!mounted) return;
    setState(() {
      _notifications = prefs.getBool('native_notifications_enabled') ?? true;
      _weeklySummary = prefs.getBool('native_weekly_summary_enabled') ?? false;
      _version = '${info.version} (${info.buildNumber})';
    });
  }

  Future<void> _setPreference(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('الإعدادات'), leading: IconButton(onPressed: () => Navigator.of(context).pop(), tooltip: 'رجوع', icon: const Icon(Icons.arrow_forward_rounded))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
        children: [
          const _SettingsHeader(title: 'التنبيهات', icon: Icons.notifications_none_rounded),
          Card(
            color: const Color(0xFF151B31),
            child: Column(
              children: [
                SwitchListTile.adaptive(value: _notifications, onChanged: (value) { setState(() => _notifications = value); _setPreference('native_notifications_enabled', value); }, title: const Text('تنبيهات QuizSpace'), subtitle: const Text('تفعيل أو إيقاف التنبيهات من داخل التطبيق'), secondary: const Icon(Icons.notifications_active_outlined)),
                const Divider(height: 1),
                SwitchListTile.adaptive(value: _weeklySummary, onChanged: _notifications ? (value) { setState(() => _weeklySummary = value); _setPreference('native_weekly_summary_enabled', value); } : null, title: const Text('ملخص أسبوعي'), subtitle: const Text('تذكير اختياري بنشاطك التعليمي'), secondary: const Icon(Icons.insights_outlined)),
              ],
            ),
          ),
          const SizedBox(height: 22),
          const _SettingsHeader(title: 'الخصوصية والصلاحيات', icon: Icons.shield_outlined),
          Card(
            color: const Color(0xFF151B31),
            child: ListTile(
              minVerticalPadding: 14,
              leading: const Icon(Icons.admin_panel_settings_outlined),
              title: const Text('إدارة صلاحيات الهاتف'),
              subtitle: const Text('نطلب كل صلاحية وقت الحاجة فقط.'),
              trailing: const Icon(Icons.chevron_left_rounded),
              onTap: () => showModalBottomSheet<void>(context: context, isScrollControlled: true, useSafeArea: true, backgroundColor: const Color(0xFF151B31), shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))), builder: (_) => const PermissionsSheet()),
            ),
          ),
          const SizedBox(height: 22),
          const _SettingsHeader(title: 'عن التطبيق', icon: Icons.info_outline_rounded),
          Card(
            color: const Color(0xFF151B31),
            child: ListTile(leading: Image.asset('assets/quizspace-icon.png', width: 40, height: 40), title: const Text('QuizSpace Native'), subtitle: Text('الإصدار $_version\nتطبيق Android أصلي بواجهات Flutter.'), isThreeLine: true),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(onPressed: widget.repository.signOut, icon: const Icon(Icons.logout_rounded), label: const Text('تسجيل الخروج'), style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)))),
        ],
      ),
    );
  }
}

class _SettingsHeader extends StatelessWidget {
  const _SettingsHeader({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 9), child: Row(children: [Icon(icon, color: const Color(0xFFD8B4FE), size: 21), const SizedBox(width: 8), Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900))]));
}
