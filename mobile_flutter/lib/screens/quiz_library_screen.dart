import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
import '../models/profile_models.dart';
import '../widgets/quiz_card.dart';
import 'home_screen.dart';
import 'quiz_solve_screen.dart';

class QuizLibraryScreen extends StatefulWidget {
  const QuizLibraryScreen({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<QuizLibraryScreen> createState() => _QuizLibraryScreenState();
}

class _QuizLibraryScreenState extends State<QuizLibraryScreen> {
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
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _load,
        color: const Color(0xFFD8B4FE),
        backgroundColor: const Color(0xFF151B31),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 32),
          children: [
            Row(
              children: [
                const Expanded(child: Text('اختباراتي', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900))),
                IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh_rounded)),
              ],
            ),
            const SizedBox(height: 6),
            Text('كل الاختبارات التي أنشأتها محفوظة في حسابك القديم نفسه.', style: TextStyle(color: Colors.white.withValues(alpha: 0.62), height: 1.45)),
            const SizedBox(height: 18),
            if (_loading) const _LibraryLoading()
            else if (_error != null) _LibraryError(onRetry: _load)
            else if ((_profile?.createdQuizzes ?? const <QuizModel>[]).isEmpty)
              const _LibraryEmpty()
            else
              ..._profile!.createdQuizzes.map((quiz) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: QuizCard(
                      quiz: quiz,
                      onShowTakers: () => _showTakers(quiz),
                      onOpen: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => QuizSolveScreen(repository: widget.repository, quizId: quiz.id))),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}

class _LibraryLoading extends StatelessWidget {
  const _LibraryLoading();

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(vertical: 90),
        child: Center(child: CircularProgressIndicator()),
      );
}

class _LibraryEmpty extends StatelessWidget {
  const _LibraryEmpty();

  @override
  Widget build(BuildContext context) => Card(
        color: const Color(0xFF151B31),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(Icons.library_books_outlined, size: 48, color: Color(0xFFD8B4FE)),
              const SizedBox(height: 12),
              const Text('لسه مفيش اختبارات منشورة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text('استخدم تبويب إنشاء لعمل اختبار يدوي أو تبدأ تجهيز اختبار من ملف.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.62), height: 1.45)),
            ],
          ),
        ),
      );
}

class _LibraryError extends StatelessWidget {
  const _LibraryError({required this.onRetry});

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
              const Text('تعذر تحميل اختباراتك', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('إعادة المحاولة')),
            ],
          ),
        ),
      );
}
