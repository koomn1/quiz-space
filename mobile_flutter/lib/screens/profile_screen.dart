import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
import '../models/profile_models.dart';
import '../widgets/permissions_sheet.dart';
import '../widgets/profile_badge_rail.dart';
import '../widgets/native_ui.dart';
import 'admin_overview_screen.dart';
import 'analytics_screen.dart';
import 'discover_screen.dart';
import 'settings_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  ProfileModel? _profile;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() { _loading = true; _error = null; });
    try {
      final profile = await widget.repository.loadOwnProfile();
      if (mounted) setState(() => _profile = profile);
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signOut() async {
    await widget.repository.signOut();
  }

  Future<void> _editProfile(ProfileModel profile) async {
    final name = TextEditingController(text: profile.name);
    final bio = TextEditingController(text: profile.bio);
    final location = TextEditingController(text: profile.location);
    var saving = false;
    try {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('تعديل البروفايل'),
            content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: name, maxLength: 160, decoration: const InputDecoration(labelText: 'الاسم')), const SizedBox(height: 10), TextField(controller: bio, maxLines: 3, maxLength: 2000, decoration: const InputDecoration(labelText: 'النبذة')), const SizedBox(height: 10), TextField(controller: location, maxLength: 160, decoration: const InputDecoration(labelText: 'الموقع'))])),
            actions: [
              TextButton(onPressed: saving ? null : () => Navigator.of(dialogContext).pop(), child: const Text('إلغاء')),
              FilledButton(
                onPressed: saving ? null : () async {
                  if (name.text.trim().isEmpty) return;
                  setDialogState(() => saving = true);
                  try {
                    await widget.repository.updateOwnProfile(name: name.text, bio: bio.text, location: location.text);
                    if (dialogContext.mounted) Navigator.of(dialogContext).pop();
                    await _load();
                  } catch (error) {
                    if (dialogContext.mounted) ScaffoldMessenger.of(dialogContext).showSnackBar(SnackBar(content: Text(error is MobileSessionException ? error.message : 'تعذر حفظ البروفايل.')));
                    if (dialogContext.mounted) setDialogState(() => saving = false);
                  }
                },
                child: Text(saving ? 'بيتحفظ...' : 'حفظ'),
              ),
            ],
          ),
        ),
      );
    } finally {
      name.dispose();
      bio.dispose();
      location.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
        onRefresh: _load,
        color: const Color(0xFFD8B4FE),
        backgroundColor: const Color(0xFF151B31),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 32),
          children: [
            Row(
              children: [
                const Expanded(child: Text('حسابي', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),),
                IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh_rounded)),
              ],
            ),
            const SizedBox(height: 16),
            if (_loading)
              const Padding(padding: EdgeInsets.symmetric(vertical: 90), child: Center(child: CircularProgressIndicator()))
            else if (_error != null)
              _ErrorCard(onRetry: _load)
            else if (_profile != null)
              _ProfileContent(profile: _profile!, repository: widget.repository, onSignOut: _signOut, onEdit: () => _editProfile(_profile!))
          ],
        ),
    );
  }
}

class _ProfileContent extends StatelessWidget {
  const _ProfileContent({required this.profile, required this.repository, required this.onSignOut, required this.onEdit});

  final ProfileModel profile;
  final QuizSpaceRepository repository;
  final Future<void> Function() onSignOut;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        NativeCard(
          padding: const EdgeInsets.all(18),
          gradient: const LinearGradient(colors: [Color(0xFF242B58), Color(0xFF111A31)], begin: Alignment.topRight, end: Alignment.bottomLeft),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              NativeAvatar(photoUrl: profile.photoUrl, radius: 34),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(profile.name.isEmpty ? 'عضو QuizSpace' : profile.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                if (profile.customId.isNotEmpty) Text('@${profile.customId}', style: TextStyle(color: Colors.white.withValues(alpha: .58))),
                if (profile.location.isNotEmpty) ...[const SizedBox(height: 5), Row(children: [Icon(Icons.location_on_outlined, size: 15, color: Colors.white.withValues(alpha: .55)), const SizedBox(width: 4), Expanded(child: Text(profile.location, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: .62), fontSize: 12)))])],
              ])),
              IconButton(onPressed: onEdit, tooltip: 'تعديل البروفايل', icon: const Icon(Icons.edit_rounded)),
            ]),
            if (profile.bio.isNotEmpty) ...[const SizedBox(height: 14), Text(profile.bio, maxLines: 3, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: .7), height: 1.4))],
            const SizedBox(height: 14),
            NativeStatusPill(label: profile.isFounder ? 'مؤسس QuizSpace' : profile.isPremium ? 'عضو Premium' : 'عضو في مساحة التعلّم', icon: profile.isFounder || profile.isPremium ? Icons.workspace_premium_rounded : Icons.school_outlined, color: profile.isFounder || profile.isPremium ? NativeColors.gold : NativeColors.cyan),
          ]),
        ),
        const SizedBox(height: 16),
        ProfileBadgeRail(profile: profile),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 1.65,
          children: [
            _Stat(label: 'الدقة', value: profile.completions.isEmpty ? '—' : '${profile.accuracy}%', icon: Icons.speed_rounded),
            _Stat(label: 'الخبرة', value: profile.xp > 0 ? '${profile.xp} XP' : '—', icon: Icons.auto_awesome_rounded),
            _Stat(label: 'اختبارات منشورة', value: '${profile.createdQuizzes.length}', icon: Icons.library_books_rounded),
            _Stat(label: 'الحلول', value: '${profile.quizzesTaken}', icon: Icons.task_alt_rounded),
          ],
        ),
        if (profile.isAdmin) ...[
          const SizedBox(height: 22),
          FilledButton.icon(onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => AdminOverviewScreen(repository: repository))), icon: const Icon(Icons.admin_panel_settings_outlined), label: const Text('لوحة السوبر أدمن'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)))),
        ],
        const SizedBox(height: 22),
        OutlinedButton.icon(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => DiscoverScreen(repository: repository))),
          icon: const Icon(Icons.explore_outlined),
          label: const Text('اكتشف اختبارات عامة'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => AnalyticsScreen(repository: repository))),
          icon: const Icon(Icons.insights_outlined),
          label: const Text('تحليلاتي'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => SettingsScreen(repository: repository))),
          icon: const Icon(Icons.settings_outlined),
          label: const Text('الإعدادات'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () => showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            backgroundColor: const Color(0xFF151B31),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
            builder: (_) => const PermissionsSheet(),
          ),
          icon: const Icon(Icons.shield_outlined),
          label: const Text('إدارة الصلاحيات'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: onSignOut,
          icon: const Icon(Icons.logout_rounded),
          label: const Text('تسجيل الخروج'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white.withValues(alpha: 0.08))),
        child: Row(
          children: [
            Icon(icon, size: 20, color: const Color(0xFFD8B4FE)),
            const SizedBox(width: 9),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)), Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.55), fontSize: 11))])),
          ],
        ),
      );
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Card(
        color: const Color(0xFF311827),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Icon(Icons.cloud_off_rounded, size: 42, color: Color(0xFFFCA5A5)),
              const SizedBox(height: 10),
              const Text('تعذر تحميل الحساب', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('إعادة المحاولة')),
            ],
          ),
        ),
      );
}
