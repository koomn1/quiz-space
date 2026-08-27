import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';
import '../models/profile_models.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  ProfileModel? _profile;
  bool _loading = true;
  Object? _error;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('تحليلاتي'), leading: IconButton(onPressed: () => Navigator.of(context).pop(), tooltip: 'رجوع', icon: const Icon(Icons.arrow_forward_rounded)), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh_rounded))]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: FilledButton.icon(onPressed: _load, icon: const Icon(Icons.refresh_rounded), label: const Text('إعادة المحاولة')))
              : _profile == null
                  ? const SizedBox.shrink()
                  : _AnalyticsBody(profile: _profile!),
    );
  }
}

class _AnalyticsBody extends StatelessWidget {
  const _AnalyticsBody({required this.profile});

  final ProfileModel profile;

  @override
  Widget build(BuildContext context) {
    final completions = profile.completions;
    final totalQuestions = completions.fold<int>(0, (sum, item) => sum + item.totalQuestions);
    final totalCorrect = completions.fold<int>(0, (sum, item) => sum + item.score);
    final overall = totalQuestions > 0 ? (totalCorrect / totalQuestions * 100).round() : 0;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        const Text('ملخص الأداء', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
        const SizedBox(height: 7),
        Text('قراءة مباشرة من محاولاتك المحفوظة في حساب QuizSpace.', style: TextStyle(color: Colors.white.withValues(alpha: 0.62))),
        const SizedBox(height: 18),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 1.55,
          children: [
            _Metric(label: 'الدقة الإجمالية', value: '$overall%', icon: Icons.track_changes_rounded),
            _Metric(label: 'عدد المحاولات', value: '${completions.length}', icon: Icons.assignment_turned_in_outlined),
            _Metric(label: 'إجابات صحيحة', value: '$totalCorrect', icon: Icons.check_circle_outline_rounded),
            _Metric(label: 'أسئلة تمت رؤيتها', value: '$totalQuestions', icon: Icons.quiz_outlined),
          ],
        ),
        const SizedBox(height: 24),
        const Text('آخر المحاولات', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
        const SizedBox(height: 10),
        if (completions.isEmpty)
          Card(color: const Color(0xFF151B31), child: Padding(padding: const EdgeInsets.all(20), child: Text('لسه مفيش محاولات محفوظة. ابدأ بحل اختبار من تبويب اختباراتي.', style: TextStyle(color: Colors.white.withValues(alpha: 0.65), height: 1.45))))
        else
          ...completions.take(30).map((item) => _CompletionTile(item: item)),
      ],
    );
  }
}

class _CompletionTile extends StatelessWidget {
  const _CompletionTile({required this.item});

  final CompletionModel item;

  @override
  Widget build(BuildContext context) {
    final percentage = item.totalQuestions > 0 ? (item.score / item.totalQuestions * 100).round() : 0;
    return Card(
      color: const Color(0xFF151B31),
      margin: const EdgeInsets.only(bottom: 9),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: percentage >= 80 ? const Color(0xFF14532D) : const Color(0xFF422006), child: Icon(percentage >= 80 ? Icons.check_rounded : Icons.trending_up_rounded, color: percentage >= 80 ? const Color(0xFF86EFAC) : const Color(0xFFFDE68A))),
        title: Text('${item.score} / ${item.totalQuestions}', style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(item.createdAt == null ? 'محاولة محفوظة' : _dateLabel(item.createdAt!), style: TextStyle(color: Colors.white.withValues(alpha: 0.58))),
        trailing: Text('$percentage%', style: TextStyle(fontWeight: FontWeight.w900, color: percentage >= 80 ? const Color(0xFF86EFAC) : const Color(0xFFFDE68A))),
      ),
    );
  }

  String _dateLabel(DateTime date) => '${date.day}/${date.month}/${date.year}';
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white.withValues(alpha: 0.08))), child: Row(children: [Icon(icon, size: 20, color: const Color(0xFFD8B4FE)), const SizedBox(width: 9), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17)), Text(label, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.55), fontSize: 11))]))]));
}
