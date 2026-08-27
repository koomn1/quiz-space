import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';

class QuizCreatorScreen extends StatefulWidget {
  const QuizCreatorScreen({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<QuizCreatorScreen> createState() => _QuizCreatorScreenState();
}

class _QuestionEditorState {
  _QuestionEditorState()
      : question = TextEditingController(),
        options = List.generate(4, (_) => TextEditingController());

  final TextEditingController question;
  final List<TextEditingController> options;
  int correctIndex = 0;

  Map<String, dynamic> toMap() => {
        'question': question.text.trim(),
        'options': options.map((controller) => controller.text.trim()).toList(growable: false),
        'correctAnswer': options[correctIndex].text.trim(),
      };

  void dispose() {
    question.dispose();
    for (final controller in options) {
      controller.dispose();
    }
  }
}

class _QuizCreatorScreenState extends State<QuizCreatorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _categoryController = TextEditingController(text: 'عام');
  final List<_QuestionEditorState> _questions = [_QuestionEditorState()];
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _categoryController.dispose();
    for (final question in _questions) {
      question.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    for (final question in _questions) {
      if (question.question.text.trim().isEmpty || question.options.take(2).any((item) => item.text.trim().isEmpty)) {
        setState(() => _error = 'اكتب نص كل سؤال وأول اختيارين على الأقل.');
        return;
      }
    }
    setState(() { _saving = true; _error = null; });
    try {
      final quiz = await widget.repository.createQuiz(
        title: _titleController.text,
        description: _descriptionController.text,
        category: _categoryController.text,
        questions: _questions.map((item) => item.toMap()).toList(growable: false),
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('اتحفظ الاختبار'),
          content: Text('تم نشر «${quiz.title}» في حسابك. تقدر تراجعه من تبويب اختباراتي.'),
          actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('تمام'))],
        ),
      );
      _resetForm();
    } catch (error) {
      if (mounted) setState(() => _error = error is MobileSessionException ? error.message : 'تعذر حفظ الاختبار. حاول مرة أخرى.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _resetForm() {
    _titleController.clear();
    _descriptionController.clear();
    _categoryController.text = 'عام';
    for (final question in _questions) {
      question.dispose();
    }
    setState(() {
      _questions
        ..clear()
        ..add(_QuestionEditorState());
      _error = null;
    });
  }

  void _addQuestion() {
    if (_questions.length >= 200) return;
    setState(() => _questions.add(_QuestionEditorState()));
  }

  void _removeQuestion(int index) {
    if (_questions.length == 1) return;
    final item = _questions.removeAt(index);
    item.dispose();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 32),
          children: [
            const Text('إنشاء اختبار', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            const SizedBox(height: 7),
            Text('اكتب اختبارك مباشرة داخل التطبيق. الحفظ يتم على الخادم بعد التحقق من حسابك.', style: TextStyle(color: Colors.white.withValues(alpha: 0.62), height: 1.45)),
            const SizedBox(height: 18),
            TextFormField(controller: _titleController, textInputAction: TextInputAction.next, maxLength: 160, decoration: const InputDecoration(labelText: 'اسم الاختبار', prefixIcon: Icon(Icons.title_rounded)), validator: (value) => (value ?? '').trim().length < 2 ? 'اكتب اسمًا واضحًا للاختبار.' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _descriptionController, maxLines: 3, maxLength: 4000, decoration: const InputDecoration(labelText: 'الوصف (اختياري)', prefixIcon: Icon(Icons.notes_rounded)),),
            const SizedBox(height: 12),
            TextFormField(controller: _categoryController, maxLength: 80, decoration: const InputDecoration(labelText: 'التصنيف', prefixIcon: Icon(Icons.category_outlined))),
            const SizedBox(height: 22),
            Row(children: [const Expanded(child: Text('الأسئلة', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900))), Text('${_questions.length}/200', style: TextStyle(color: Colors.white.withValues(alpha: 0.6)))]),
            const SizedBox(height: 10),
            ...List.generate(_questions.length, (index) => Padding(padding: const EdgeInsets.only(bottom: 12), child: _QuestionCard(index: index, state: _questions[index], canRemove: _questions.length > 1, onRemove: () => _removeQuestion(index)))),
            OutlinedButton.icon(onPressed: _addQuestion, icon: const Icon(Icons.add_rounded), label: const Text('إضافة سؤال'), style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)))),
            if (_error != null) ...[const SizedBox(height: 14), Text(_error!, style: const TextStyle(color: Color(0xFFFCA5A5), height: 1.4))],
            const SizedBox(height: 18),
            FilledButton.icon(onPressed: _saving ? null : _save, icon: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.publish_rounded), label: Text(_saving ? 'بيتم الحفظ...' : 'حفظ ونشر الاختبار'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)))),
          ],
        ),
      ),
    );
  }
}

class _QuestionCard extends StatefulWidget {
  const _QuestionCard({required this.index, required this.state, required this.canRemove, required this.onRemove});

  final int index;
  final _QuestionEditorState state;
  final bool canRemove;
  final VoidCallback onRemove;

  @override
  State<_QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends State<_QuestionCard> {
  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    return Card(
      color: const Color(0xFF151B31),
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [Expanded(child: Text('السؤال ${widget.index + 1}', style: const TextStyle(fontWeight: FontWeight.w900))), if (widget.canRemove) IconButton(onPressed: widget.onRemove, tooltip: 'حذف السؤال', icon: const Icon(Icons.delete_outline_rounded))]),
            const SizedBox(height: 8),
            TextField(controller: state.question, maxLines: 3, decoration: const InputDecoration(labelText: 'نص السؤال', prefixIcon: Icon(Icons.help_outline_rounded))),
            const SizedBox(height: 12),
            ...List.generate(state.options.length, (index) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Radio<int>(value: index, groupValue: state.correctIndex, onChanged: (value) => setState(() => state.correctIndex = value ?? 0)),
                      Expanded(child: TextField(controller: state.options[index], decoration: InputDecoration(labelText: 'الاختيار ${index + 1}', prefixIcon: const Icon(Icons.radio_button_unchecked_rounded)))),
                    ],
                  ),
                )),
            Text('اختار الدائرة بجانب الإجابة الصحيحة.', style: TextStyle(color: Colors.white.withValues(alpha: 0.52), fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
