import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
import '../models/profile_models.dart';
import 'quiz_solve_screen.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final _searchController = TextEditingController();
  List<QuizModel> _quizzes = const [];
  bool _loading = true;
  Object? _error;
  String _category = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final quizzes = await widget.repository.loadPublicQuizzes(search: _searchController.text, category: _category);
      if (mounted) setState(() => _quizzes = quizzes);
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('اكتشف'), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh_rounded))]),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
          children: [
            TextField(controller: _searchController, textInputAction: TextInputAction.search, onSubmitted: (_) => _load(), decoration: InputDecoration(hintText: 'ابحث باسم الاختبار', prefixIcon: const Icon(Icons.search_rounded), suffixIcon: IconButton(onPressed: _load, tooltip: 'بحث', icon: const Icon(Icons.arrow_back_rounded)))),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: [for (final item in const ['', 'عام', 'علوم', 'لغات', 'تاريخ']) ChoiceChip(label: Text(item.isEmpty ? 'الكل' : item), selected: _category == item, onSelected: (_) { setState(() => _category = item); _load(); })]),
            const SizedBox(height: 22),
            if (_loading)
              const Padding(padding: EdgeInsets.symmetric(vertical: 80), child: Center(child: CircularProgressIndicator()))
            else if (_error != null)
              _DiscoverError(onRetry: _load)
            else if (_quizzes.isEmpty)
              const _EmptyDiscover()
            else
              ..._quizzes.map((quiz) => _DiscoverCard(quiz: quiz, onOpen: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => QuizSolveScreen(repository: widget.repository, quizId: quiz.id))))),
          ],
        ),
      ),
    );
  }
}

class _DiscoverCard extends StatelessWidget {
  const _DiscoverCard({required this.quiz, required this.onOpen});

  final QuizModel quiz;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) => Card(
        color: const Color(0xFF151B31),
        margin: const EdgeInsets.only(bottom: 12),
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(width: 48, height: 48, decoration: BoxDecoration(color: const Color(0xFF4C1D95), borderRadius: BorderRadius.circular(15)), child: const Icon(Icons.auto_stories_rounded, color: Color(0xFFE9D5FF))),
                const SizedBox(width: 13),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(quiz.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)), const SizedBox(height: 5), Text('${quiz.category}  •  ${quiz.totalPlays} حل', style: TextStyle(color: Colors.white.withValues(alpha: 0.58), fontSize: 12)), if (quiz.creatorName.isNotEmpty) Text('بواسطة ${quiz.creatorName}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.48), fontSize: 12))])),
                const Icon(Icons.arrow_back_ios_new_rounded, size: 17, color: Colors.white54),
              ],
            ),
          ),
        ),
      );
}

class _EmptyDiscover extends StatelessWidget {
  const _EmptyDiscover();

  @override
  Widget build(BuildContext context) => Card(color: const Color(0xFF151B31), child: Padding(padding: const EdgeInsets.all(24), child: Column(children: [const Icon(Icons.search_off_rounded, size: 50, color: Colors.white38), const SizedBox(height: 12), const Text('مفيش اختبارات مطابقة'), const SizedBox(height: 5), Text('جرّب كلمة بحث مختلفة أو اختار تصنيف تاني.', style: TextStyle(color: Colors.white.withValues(alpha: 0.58)))])));
}

class _DiscoverError extends StatelessWidget {
  const _DiscoverError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Card(color: const Color(0xFF351A2A), child: Padding(padding: const EdgeInsets.all(18), child: Column(children: [const Text('تعذر تحميل الاختبارات العامة'), const SizedBox(height: 10), FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('إعادة المحاولة'))])));
}
