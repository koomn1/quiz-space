import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
import '../models/profile_models.dart';
import '../services/permissions_service.dart';
import '../widgets/permissions_sheet.dart';
import '../widgets/profile_badge_rail.dart';
import '../widgets/quiz_card.dart';
import '../widgets/native_ui.dart';
import 'analytics_screen.dart';
import 'discover_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.repository, this.showBottomNavigation = true});

  final QuizSpaceRepository repository;
  final bool showBottomNavigation;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  ProfileModel? _profile;
  Object? _error;
  bool _loading = true;
  int _selectedIndex = 0;
  final _permissions = AppPermissionsService();

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _requestNotifications();
  }

  Future<void> _requestNotifications() async {
    try {
      await _permissions.requestNotificationsOnce();
    } catch (_) {
      // A denied notification permission must not block the app.
    }
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profile = await widget.repository.loadOwnProfile();
      if (mounted) setState(() => _profile = profile);
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showTakers(QuizModel quiz) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: const Color(0xFF151B31),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => QuizTakersSheet(repository: widget.repository, quiz: quiz),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: _loading
            ? const _LoadingView()
            : _error != null
                ? _ErrorView(error: _error, onRetry: _loadProfile)
                : widget.showBottomNavigation
                    ? IndexedStack(index: _selectedIndex, children: [_HomeTab(profile: _profile!, repository: widget.repository, onShowTakers: _showTakers, onRefresh: _loadProfile), _ProfileTab(profile: _profile!, onSignOut: widget.repository.signOut, onRefresh: _loadProfile)])
                    : _HomeTab(profile: _profile!, repository: widget.repository, onShowTakers: _showTakers, onRefresh: _loadProfile),
      ),
      bottomNavigationBar: widget.showBottomNavigation
          ? NavigationBar(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (value) => setState(() => _selectedIndex = value),
              backgroundColor: const Color(0xFF10162A),
              indicatorColor: const Color(0xFF7C3AED).withValues(alpha: 0.28),
              destinations: const [
                NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'الرئيسية'),
                NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded), label: 'البروفايل'),
              ],
            )
          : null,
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab({required this.profile, required this.repository, required this.onShowTakers, required this.onRefresh});

  final ProfileModel profile;
  final QuizSpaceRepository repository;
  final ValueChanged<QuizModel> onShowTakers;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: const Color(0xFFD8B4FE),
      backgroundColor: const Color(0xFF151B31),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
        children: [
          NativeCard(
            padding: const EdgeInsets.all(16),
            gradient: const LinearGradient(colors: [Color(0xFF1D2750), Color(0xFF111A31)], begin: Alignment.topRight, end: Alignment.bottomLeft),
            child: Row(
              children: [
                NativeAvatar(photoUrl: profile.photoUrl, radius: 27),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('أهلًا ${profile.name.isEmpty ? 'بك' : profile.name}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 5),
                    Text('جاهز تكمل رحلتك؟', style: TextStyle(color: Colors.white.withValues(alpha: .66), fontSize: 13)),
                  ]),
                ),
                IconButton(onPressed: onRefresh, tooltip: 'تحديث البيانات', icon: const Icon(Icons.refresh_rounded)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Align(alignment: AlignmentDirectional.centerStart, child: NativeStatusPill(label: profile.isFounder ? 'حساب مؤسس' : profile.isPremium ? 'خطة Premium' : 'الخطة المجانية', icon: profile.isPremium || profile.isFounder ? Icons.workspace_premium_rounded : Icons.school_outlined, color: profile.isPremium || profile.isFounder ? NativeColors.gold : NativeColors.cyan)),
          const SizedBox(height: 18),
          _HeroCard(profile: profile),
          const SizedBox(height: 24),
          const NativeSectionHeading(title: 'ابدأ بسرعة', icon: Icons.bolt_rounded),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: NativeQuickAction(icon: Icons.explore_outlined, label: 'اكتشف اختبارات', color: NativeColors.cyan, onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => DiscoverScreen(repository: repository))))),
            const SizedBox(width: 10),
            Expanded(child: NativeQuickAction(icon: Icons.insights_outlined, label: 'تحليلاتي', color: NativeColors.primary, onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => AnalyticsScreen(repository: repository))))),
          ]),
          const SizedBox(height: 24),
          const NativeSectionHeading(title: 'اختباراتك المنشورة', icon: Icons.library_books_outlined),
          const SizedBox(height: 10),
          if (profile.createdQuizzes.isEmpty)
            const _EmptyCard(text: 'لا توجد اختبارات منشورة في هذا الحساب بعد.')
          else
            ...profile.createdQuizzes.map((quiz) => Padding(padding: const EdgeInsets.only(bottom: 12), child: QuizCard(quiz: quiz, onShowTakers: () => onShowTakers(quiz)))),
        ],
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.profile, required this.onSignOut, required this.onRefresh});

  final ProfileModel profile;
  final Future<void> Function() onSignOut;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: const Color(0xFFD8B4FE),
      backgroundColor: const Color(0xFF151B31),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 22, 20, 30),
        children: [
          Row(children: [const Expanded(child: Text('البروفايل', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900))), IconButton(onPressed: onRefresh, tooltip: 'تحديث', icon: const Icon(Icons.refresh_rounded))]),
          const SizedBox(height: 16),
          _ProfileIdentity(profile: profile),
          const SizedBox(height: 18),
          ProfileBadgeRail(profile: profile),
          const SizedBox(height: 18),
          _StatsGrid(profile: profile),
          const SizedBox(height: 24),
          OutlinedButton.icon(onPressed: () => showModalBottomSheet<void>(context: context, isScrollControlled: true, useSafeArea: true, backgroundColor: const Color(0xFF151B31), shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))), builder: (_) => const PermissionsSheet()), icon: const Icon(Icons.shield_outlined), label: const Text('إدارة الصلاحيات'), style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)))),
          const SizedBox(height: 10),
          OutlinedButton.icon(onPressed: onSignOut, icon: const Icon(Icons.logout_rounded), label: const Text('تسجيل الخروج'), style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)))),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.profile});

  final ProfileModel profile;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF21164A), Color(0xFF111A39)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.24)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('مساحتك التعليمية', style: TextStyle(color: Color(0xFFD8B4FE), fontWeight: FontWeight.w700)),
        const SizedBox(height: 7),
        const Text('تابع اختباراتك واعرف من شارك فيها بسرعة.', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900, height: 1.2)),
        const SizedBox(height: 18),
        Row(children: [
          Expanded(child: _Metric(label: 'اختبارات منشورة', value: '${profile.createdQuizzes.length}', icon: Icons.publish_rounded)),
          const SizedBox(width: 10),
          Expanded(child: _Metric(label: 'اختبارات محلولة', value: '${profile.quizzesTaken}', icon: Icons.check_circle_outline_rounded)),
        ]),
      ]),
    );
  }
}

class _ProfileIdentity extends StatelessWidget {
  const _ProfileIdentity({required this.profile});

  final ProfileModel profile;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF151B31),
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22), side: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(children: [
          CircleAvatar(radius: 32, backgroundColor: const Color(0xFF7C3AED).withValues(alpha: 0.3), backgroundImage: profile.photoUrl.isEmpty ? null : NetworkImage(profile.photoUrl), child: profile.photoUrl.isEmpty ? const Icon(Icons.person_rounded, size: 32, color: Color(0xFFE9D5FF)) : null),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(profile.name.isEmpty ? 'عضو QuizSpace' : profile.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900)), if (profile.customId.isNotEmpty) Text('@${profile.customId}', style: TextStyle(color: Colors.white.withValues(alpha: 0.55))), if (profile.isFounder || profile.isPremium) ...[const SizedBox(height: 5), Text(profile.isFounder ? 'مؤسس' : 'عضو بريميوم', style: const TextStyle(color: Color(0xFFD8B4FE), fontWeight: FontWeight.w700))]])),
        ]),
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.profile});

  final ProfileModel profile;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.7,
      children: [
        _Metric(label: 'الدقة', value: profile.completions.isEmpty ? '—' : '${profile.accuracy}%', icon: Icons.speed_rounded),
        _Metric(label: 'الخبرة', value: profile.xp > 0 ? '${profile.xp} XP' : '—', icon: Icons.auto_awesome_rounded),
        _Metric(label: 'اختبارات منشورة', value: '${profile.createdQuizzes.length}', icon: Icons.library_books_rounded),
        _Metric(label: 'الحلول', value: '${profile.quizzesTaken}', icon: Icons.task_alt_rounded),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white.withValues(alpha: 0.08))),
      child: Row(children: [Icon(icon, size: 20, color: const Color(0xFFD8B4FE)), const SizedBox(width: 9), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)), Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.55), fontSize: 11))]))]),
    );
  }
}

class QuizTakersSheet extends StatelessWidget {
  const QuizTakersSheet({super.key, required this.repository, required this.quiz});

  final QuizSpaceRepository repository;
  final QuizModel quiz;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.82,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(5)))),
          const SizedBox(height: 18),
          Text('الأعضاء الذين حلوا الاختبار', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text(quiz.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
          const SizedBox(height: 18),
          Expanded(
            child: FutureBuilder<List<TakerModel>>(
              future: repository.loadQuizTakers(quiz.id),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                if (snapshot.hasError) return const _EmptyState(icon: Icons.cloud_off_rounded, text: 'تعذر تحميل القائمة الآن. حاول مرة أخرى.');
                final takers = snapshot.data ?? const <TakerModel>[];
                if (takers.isEmpty) return const _EmptyState(icon: Icons.groups_outlined, text: 'لم يحل أحد هذا الاختبار حتى الآن.');
                return ListView.separated(
                  itemCount: takers.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 9),
                  itemBuilder: (context, index) => _TakerTile(taker: takers[index]),
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}

class _TakerTile extends StatelessWidget {
  const _TakerTile({required this.taker});

  final TakerModel taker;

  @override
  Widget build(BuildContext context) {
    final percentage = taker.totalQuestions > 0 ? ((taker.score / taker.totalQuestions) * 100).round() : 0;
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withValues(alpha: 0.08))),
      child: Row(children: [CircleAvatar(radius: 21, backgroundColor: const Color(0xFF7C3AED).withValues(alpha: 0.25), child: const Icon(Icons.person_outline_rounded, color: Color(0xFFE9D5FF))), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(taker.name.isEmpty ? 'عضو بدون اسم' : taker.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)), Text('${taker.attemptsCount} محاولة', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12))])), Text('$percentage%', style: TextStyle(color: percentage >= 80 ? const Color(0xFF86EFAC) : const Color(0xFFFDE68A), fontSize: 18, fontWeight: FontWeight.w900))]),
    );
  }
}


class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Card(color: Colors.white.withValues(alpha: 0.05), child: Padding(padding: const EdgeInsets.all(18), child: Text(text, style: TextStyle(color: Colors.white.withValues(alpha: 0.65), height: 1.4))));
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 48, color: Colors.white38), const SizedBox(height: 12), Text(text, textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.62), height: 1.4))]));
}

class _LoadingView extends StatelessWidget {
  const _LoadingView();
  @override
  Widget build(BuildContext context) => const Center(child: CircularProgressIndicator());
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error, required this.onRetry});

  final Object? error;
  final Future<void> Function() onRetry;

  String get message {
    if (error is MobileSessionException) return (error as MobileSessionException).message;
    return 'تعذر تحميل بيانات حسابك الآن. تحقق من الإنترنت وحاول مرة أخرى.';
  }

  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.cloud_off_rounded, size: 52, color: Colors.white38), const SizedBox(height: 14), const Text('الصفحة الرئيسية موجودة، لكن البيانات لم تكتمل.', textAlign: TextAlign.center, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)), const SizedBox(height: 10), Text(message, textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.62), height: 1.45)), const SizedBox(height: 16), FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('إعادة المحاولة'))])));
}
