import 'dart:async';

import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
import '../services/deep_link_service.dart';
import '../widgets/native_fx.dart';
import '../widgets/native_ui.dart';
import 'cosmo_screen.dart';
import 'whiteboard_screen.dart';
import 'home_screen.dart';
import 'profile_screen.dart';
import 'quiz_creator_screen.dart';
import 'quiz_library_screen.dart';
import 'quiz_solve_screen.dart';

class NativeAppShell extends StatefulWidget {
  const NativeAppShell({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<NativeAppShell> createState() => _NativeAppShellState();
}

class _NativeAppShellState extends State<NativeAppShell> {
  int _selectedIndex = 0;
  StreamSubscription<String>? _deepLinkSubscription;
  String? _lastHandledQuizId;

  @override
  void initState() {
    super.initState();
    _deepLinkSubscription = DeepLinkService.instance.links.listen(_handleDeepLink);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final pending = DeepLinkService.instance.takePendingLink();
      if (pending != null) _handleDeepLink(pending);
    });
  }

  @override
  void dispose() {
    _deepLinkSubscription?.cancel();
    super.dispose();
  }

  Future<void> _handleDeepLink(String rawLink) async {
    final quizId = quizIdFromLink(rawLink);
    if (quizId == null || quizId.isEmpty || quizId == _lastHandledQuizId || !mounted) return;
    _lastHandledQuizId = quizId;
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => QuizSolveScreen(repository: widget.repository, quizId: quizId)));
  }

  static const _titles = ['الرئيسية', 'اختباراتي', 'إنشاء اختبار', 'Cosmo', 'السبورة', 'حسابي'];

  List<Widget> get _pages => [
        HomeScreen(repository: widget.repository, showBottomNavigation: false),
        QuizLibraryScreen(repository: widget.repository),
        QuizCreatorScreen(repository: widget.repository),
        const CosmoScreen(),
        const WhiteboardScreen(),
        ProfileScreen(repository: widget.repository),
      ];

  void _select(int index) {
    if (!mounted) return;
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: NativeColors.background,
        body: NativeAuroraBackground(
          child: SafeArea(
            bottom: false,
            child: Column(
              children: [
                _NativeTopBar(title: _titles[_selectedIndex]),
                Expanded(child: IndexedStack(index: _selectedIndex, children: _pages)),
              ],
            ),
          ),
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: NativeTabBar(
            selectedIndex: _selectedIndex,
            onSelect: _select,
            tabs: const [
              NativeTabSpec(icon: Icons.home_outlined, selectedIcon: Icons.home_rounded, label: 'الرئيسية'),
              NativeTabSpec(icon: Icons.library_books_outlined, selectedIcon: Icons.library_books_rounded, label: 'اختباراتي'),
              NativeTabSpec(icon: Icons.add_box_outlined, selectedIcon: Icons.add_box_rounded, label: 'إنشاء'),
              NativeTabSpec(icon: Icons.auto_awesome_outlined, selectedIcon: Icons.auto_awesome_rounded, label: 'Cosmo'),
              NativeTabSpec(icon: Icons.draw_outlined, selectedIcon: Icons.draw_rounded, label: 'السبورة'),
              NativeTabSpec(icon: Icons.person_outline_rounded, selectedIcon: Icons.person_rounded, label: 'حسابي'),
            ],
          ),
        ),
      ),
    );
  }
}

class _NativeTopBar extends StatelessWidget {
  const _NativeTopBar({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 11),
      decoration: BoxDecoration(
        color: NativeColors.background.withValues(alpha: .82),
        border: const Border(bottom: BorderSide(color: NativeColors.border)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: NativeColors.surfaceRaised, borderRadius: BorderRadius.circular(13)),
            child: Image.asset('assets/quizspace-logo.webp', filterQuality: FilterQuality.high),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('QuizSpace', style: TextStyle(color: Colors.white.withValues(alpha: .58), fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              ],
            ),
          ),
          const NativeStatusPill(label: 'Native', icon: Icons.phone_android_rounded, color: NativeColors.primary),
        ],
      ),
    );
  }
}
