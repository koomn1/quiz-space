import 'package:flutter/material.dart';

import '../data/quizspace_repository.dart';

class AdminOverviewScreen extends StatefulWidget {
  const AdminOverviewScreen({super.key, required this.repository});

  final QuizSpaceRepository repository;

  @override
  State<AdminOverviewScreen> createState() => _AdminOverviewScreenState();
}

class _AdminOverviewScreenState extends State<AdminOverviewScreen> {
  AdminOverview? _overview;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final overview = await widget.repository.loadAdminOverview();
      if (mounted) setState(() => _overview = overview);
    } catch (error) {
      if (mounted) setState(() => _error = error is MobileSessionException ? error.message : 'تعذر تحميل لوحة الإدارة.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('لوحة السوبر أدمن'), leading: IconButton(onPressed: () => Navigator.of(context).pop(), tooltip: 'رجوع', icon: const Icon(Icons.arrow_forward_rounded)), actions: [IconButton(onPressed: _load, tooltip: 'تحديث', icon: const Icon(Icons.refresh_rounded))]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.lock_outline_rounded, size: 54, color: Colors.white38), const SizedBox(height: 12), Text(_error!, textAlign: TextAlign.center), const SizedBox(height: 16), FilledButton.icon(onPressed: _load, icon: const Icon(Icons.refresh_rounded), label: const Text('إعادة المحاولة'))])))
              : _overview == null
                  ? const SizedBox.shrink()
                  : ListView(padding: const EdgeInsets.fromLTRB(20, 18, 20, 32), children: [const Text('مؤشرات المنصة', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)), const SizedBox(height: 7), Text('البيانات للعرض فقط حاليًا، وكل صلاحية إدارية يتم تأكيدها على الخادم.', style: TextStyle(color: Colors.white.withValues(alpha: 0.6), height: 1.4)), const SizedBox(height: 20), _AdminMetric(label: 'المستخدمون', value: _overview!.users, icon: Icons.people_alt_outlined), _AdminMetric(label: 'الاختبارات', value: _overview!.quizzes, icon: Icons.library_books_outlined), _AdminMetric(label: 'المحاولات المحفوظة', value: _overview!.completions, icon: Icons.task_alt_rounded), const SizedBox(height: 22), Card(color: const Color(0xFF21164A), child: Padding(padding: const EdgeInsets.all(18), child: Row(children: [const Icon(Icons.construction_outlined, color: Color(0xFFE9D5FF)), const SizedBox(width: 12), Expanded(child: Text('إدارة المتجر والمكافآت والمستخدمين هتتضاف كعمليات Native منفصلة بعد تثبيت عقود الصلاحيات الخاصة بكل عملية.', style: TextStyle(color: Colors.white.withValues(alpha: 0.78), height: 1.45)))])))])
    );
  }
}

class _AdminMetric extends StatelessWidget {
  const _AdminMetric({required this.label, required this.value, required this.icon});

  final String label;
  final int value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Card(color: const Color(0xFF151B31), margin: const EdgeInsets.only(bottom: 10), child: ListTile(minVerticalPadding: 14, leading: CircleAvatar(backgroundColor: const Color(0xFF4C1D95), child: Icon(icon, color: const Color(0xFFE9D5FF))), title: Text(label), trailing: Text('$value', style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900))));
}
