import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
import '../widgets/native_ui.dart';
import 'cosmo_screen.dart';
import 'home_screen.dart';
import 'profile_screen.dart';
import 'quiz_creator_screen.dart';
import 'quiz_library_screen.dart';

class NativeAppShell extends StatefulWidget {
  const NativeAppShell({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<NativeAppShell> createState() => _NativeAppShellState();
}

class _NativeAppShellState extends State<NativeAppShell> {
  int _selectedIndex = 0;

  static const _titles = ['الرئيسية', 'اختباراتي', 'إنشاء اختبار', 'Cosmo', 'حسابي'];

  List<Widget> get _pages => [
        HomeScreen(repository: widget.repository, showBottomNavigation: false),
        QuizLibraryScreen(repository: widget.repository),
        QuizCreatorScreen(repository: widget.repository),
        const CosmoScreen(),
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
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              _NativeTopBar(title: _titles[_selectedIndex]),
              Expanded(child: IndexedStack(index: _selectedIndex, children: _pages)),
            ],
          ),
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: _select,
            height: 74,
            backgroundColor: NativeColors.surface,
            indicatorColor: NativeColors.primary.withValues(alpha: .2),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: const [
              NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'الرئيسية'),
              NavigationDestination(icon: Icon(Icons.library_books_outlined), selectedIcon: Icon(Icons.library_books_rounded), label: 'اختباراتي'),
              NavigationDestination(icon: Icon(Icons.add_box_outlined), selectedIcon: Icon(Icons.add_box_rounded), label: 'إنشاء'),
              NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome_rounded), label: 'Cosmo'),
              NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded), label: 'حسابي'),
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
      decoration: const BoxDecoration(
        color: NativeColors.background,
        border: Border(bottom: BorderSide(color: NativeColors.border)),
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
