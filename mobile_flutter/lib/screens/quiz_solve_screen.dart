import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
import '../models/quiz_models.dart';

class QuizSolveScreen extends StatefulWidget {
  const QuizSolveScreen({super.key, required this.repository, required this.quizId});

  final QuizSpaceRepository repository;
  final String quizId;

  @override
  State<QuizSolveScreen> createState() => _QuizSolveScreenState();
}

class _QuizSolveScreenState extends State<QuizSolveScreen> {
  final _pageController = PageController();
  QuizDetailModel? _quiz;
  List<String?> _answers = const [];
  Object? _error;
  bool _loading = true;
  bool _submitting = false;
  int _page = 0;
  Map<String, dynamic>? _result;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final quiz = await widget.repository.loadQuizDetails(widget.quizId);
      if (!mounted) return;
      setState(() {
        _quiz = quiz;
        _answers = List<String?>.filled(quiz.questions.length, null);
        _loading = false;
      });
    } catch (error) {
      if (mounted) setState(() { _error = error; _loading = false; });
    }
  }

  void _selectAnswer(String answer) {
    setState(() => _answers[_page] = answer);
  }

  Future<void> _next() async {
    final quiz = _quiz;
    if (quiz == null || _answers[_page] == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('اختار إجابة الأول عشان تكمل.')));
      return;
    }
    if (_page < quiz.questions.length - 1) {
      await _pageController.nextPage(duration: const Duration(milliseconds: 220), curve: Curves.easeOutCubic);
      return;
    }
    await _submit();
  }

  Future<void> _previous() async {
    if (_page == 0) return;
    await _pageController.previousPage(duration: const Duration(milliseconds: 220), curve: Curves.easeOutCubic);
  }

  Future<void> _submit() async {
    final quiz = _quiz;
    if (quiz == null) return;
    setState(() => _submitting = true);
    try {
      final result = await widget.repository.submitQuizAttempt(quizId: quiz.id, answers: _answers);
      if (mounted) setState(() { _result = result; _submitting = false; });
    } catch (error) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error is MobileSessionException ? error.message : 'تعذر حفظ المحاولة. حاول مرة أخرى.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const _SolveLoading();
    if (_error != null || _quiz == null) return _SolveError(onRetry: () { setState(() { _loading = true; _error = null; }); _load(); });
    if (_result != null) return _ResultView(quiz: _quiz!, result: _result!, onDone: () => Navigator.of(context).pop());

    final quiz = _quiz!;
    if (quiz.questions.isEmpty) return const Scaffold(body: Center(child: Text('الاختبار لا يحتوي أسئلة صالحة.')));
    final question = quiz.questions[_page];

    return Scaffold(
      appBar: AppBar(
        title: Text(quiz.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        leading: IconButton(onPressed: () => Navigator.of(context).pop(), tooltip: 'رجوع', icon: const Icon(Icons.arrow_forward_rounded)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: Column(
                children: [
                  Row(children: [Text('السؤال ${_page + 1} من ${quiz.questions.length}', style: const TextStyle(fontWeight: FontWeight.w800)), const Spacer(), Text('${((_page + 1) / quiz.questions.length * 100).round()}%', style: TextStyle(color: Colors.white.withValues(alpha: 0.6)))]),
                  const SizedBox(height: 9),
                  ClipRRect(borderRadius: BorderRadius.circular(8), child: LinearProgressIndicator(value: (_page + 1) / quiz.questions.length, minHeight: 8)),
                ],
              ),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                child: SingleChildScrollView(
                  key: ValueKey(_page),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                  child: _QuestionView(question: question, selected: _answers[_page], onSelect: _selectAnswer),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
              decoration: BoxDecoration(color: const Color(0xFF10162A), border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
              child: Row(
                children: [
                  OutlinedButton.icon(onPressed: _page == 0 || _submitting ? null : _previous, icon: const Icon(Icons.arrow_back_rounded), label: const Text('السابق'), style: OutlinedButton.styleFrom(minimumSize: const Size(112, 48))),
                  const Spacer(),
                  FilledButton.icon(onPressed: _submitting ? null : _next, icon: _submitting ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(_page == quiz.questions.length - 1 ? Icons.check_rounded : Icons.arrow_forward_rounded), label: Text(_submitting ? 'بيتحفظ...' : _page == quiz.questions.length - 1 ? 'إنهاء وحفظ' : 'التالي'), style: FilledButton.styleFrom(minimumSize: const Size(138, 48))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuestionView extends StatelessWidget {
  const _QuestionView({required this.question, required this.selected, required this.onSelect});

  final QuizQuestionModel question;
  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          color: const Color(0xFF21164A),
          child: Padding(padding: const EdgeInsets.all(20), child: Text(question.text, style: const TextStyle(fontSize: 21, height: 1.45, fontWeight: FontWeight.w800))),
        ),
        const SizedBox(height: 18),
        const Text('اختار إجابة واحدة', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        ...question.options.asMap().entries.map((entry) {
          final option = entry.value;
          final isSelected = option == selected;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Material(
              color: isSelected ? const Color(0xFF4C1D95) : const Color(0xFF151B31),
              borderRadius: BorderRadius.circular(16),
              child: InkWell(
                onTap: () => onSelect(option),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 56),
                  padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: isSelected ? const Color(0xFFD8B4FE) : Colors.white.withValues(alpha: 0.1), width: isSelected ? 1.5 : 1)),
                  child: Row(children: [Icon(isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded, color: isSelected ? const Color(0xFFE9D5FF) : Colors.white54), const SizedBox(width: 12), Expanded(child: Text(option, style: const TextStyle(fontSize: 16, height: 1.35)))]),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _ResultView extends StatelessWidget {
  const _ResultView({required this.quiz, required this.result, required this.onDone});

  final QuizDetailModel quiz;
  final Map<String, dynamic> result;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final score = int.tryParse('${result['score'] ?? 0}') ?? 0;
    final total = int.tryParse('${result['total_questions'] ?? quiz.questions.length}') ?? quiz.questions.length;
    final percentage = total > 0 ? (score / total * 100).round() : 0;
    return Scaffold(
      appBar: AppBar(title: const Text('النتيجة')),
      body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.verified_rounded, size: 76, color: Color(0xFF86EFAC)), const SizedBox(height: 16), const Text('خلصت الاختبار', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)), const SizedBox(height: 10), Text('$score / $total', style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w900, color: Color(0xFFD8B4FE))), Text('الدقة $percentage%', style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 17)), const SizedBox(height: 24), FilledButton(onPressed: onDone, style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)), child: const Text('رجوع للاختبارات'))]))),
    );
  }
}

class _SolveLoading extends StatelessWidget {
  const _SolveLoading();

  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: CircularProgressIndicator()));
}

class _SolveError extends StatelessWidget {
  const _SolveError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 54, color: Colors.white38),
              const SizedBox(height: 12),
              const Text('تعذر فتح الاختبار', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('إعادة المحاولة')),
            ],
          ),
        ),
      ),
    );
  }
}
