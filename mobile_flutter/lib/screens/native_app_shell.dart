import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
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
        body: IndexedStack(index: _selectedIndex, children: _pages),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: _select,
          height: 72,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'الرئيسية',
            ),
            NavigationDestination(
              icon: Icon(Icons.library_books_outlined),
              selectedIcon: Icon(Icons.library_books_rounded),
              label: 'اختباراتي',
            ),
            NavigationDestination(
              icon: Icon(Icons.add_box_outlined),
              selectedIcon: Icon(Icons.add_box_rounded),
              label: 'إنشاء',
            ),
            NavigationDestination(
              icon: Icon(Icons.auto_awesome_outlined),
              selectedIcon: Icon(Icons.auto_awesome_rounded),
              label: 'Cosmo',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'حسابي',
            ),
          ],
        ),
      ),
    );
  }
}
