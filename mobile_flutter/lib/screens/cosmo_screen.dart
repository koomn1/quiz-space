import 'package:flutter/material.dart';

import '../services/mobile_ai_service.dart';

class _ChatMessage {
  const _ChatMessage({required this.text, required this.fromUser});

  final String text;
  final bool fromUser;
}

class CosmoScreen extends StatefulWidget {
  const CosmoScreen({super.key});

  @override
  State<CosmoScreen> createState() => _CosmoScreenState();
}

class _CosmoScreenState extends State<CosmoScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  final _ai = MobileAiService();
  final List<_ChatMessage> _messages = const [
    _ChatMessage(fromUser: false, text: 'أهلًا بيك! أنا Cosmo. اسألني في سؤال دراسي أو اطلب شرحًا خطوة بخطوة.'),
  ].toList(growable: true);
  bool _sending = false;

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final prompt = _inputController.text.trim();
    if (prompt.isEmpty || _sending) return;
    _inputController.clear();
    setState(() { _messages.add(_ChatMessage(fromUser: true, text: prompt)); _sending = true; });
    _scrollToEnd();
    try {
      final history = _messages.take(20).map((message) => {'role': message.fromUser ? 'user' : 'model', 'text': message.text}).toList(growable: false);
      final answer = await _ai.ask(prompt, history: history);
      if (mounted) setState(() => _messages.add(_ChatMessage(fromUser: false, text: answer)));
    } catch (error) {
      if (mounted) setState(() => _messages.add(_ChatMessage(fromUser: false, text: error.toString().replaceFirst('تعذر تشغيل Cosmo الآن. حاول مرة أخرى.', 'Cosmo مش متاح حاليًا.'))));
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToEnd();
      }
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 220), curve: Curves.easeOutCubic);
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 14),
            child: Row(
              children: [
                Container(width: 48, height: 48, decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF2563EB)]), borderRadius: BorderRadius.circular(16)), child: const Icon(Icons.auto_awesome_rounded, color: Colors.white)),
                const SizedBox(width: 12),
                const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Cosmo', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900)), Text('مساعدك التعليمي', style: TextStyle(color: Color(0xFFB8C2E0)))])),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              itemCount: _messages.length + (_sending ? 1 : 0),
              itemBuilder: (context, index) {
                if (_sending && index == _messages.length) return const _TypingBubble();
                final message = _messages[index];
                return _MessageBubble(message: message);
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
            decoration: BoxDecoration(color: const Color(0xFF10162A), border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(child: TextField(controller: _inputController, minLines: 1, maxLines: 4, textInputAction: TextInputAction.newline, decoration: const InputDecoration(hintText: 'اكتب سؤالك لـCosmo...', prefixIcon: Icon(Icons.chat_bubble_outline_rounded)))),
                const SizedBox(width: 8),
                IconButton.filled(onPressed: _sending ? null : _send, tooltip: 'إرسال', icon: _sending ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send_rounded)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final _ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final color = message.fromUser ? const Color(0xFF4C1D95) : const Color(0xFF151B31);
    return Align(
      alignment: message.fromUser ? AlignmentDirectional.centerStart : AlignmentDirectional.centerEnd,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.86),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withValues(alpha: 0.09))),
        child: Text(message.text, style: const TextStyle(fontSize: 15, height: 1.5)),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) => const Align(alignment: AlignmentDirectional.centerEnd, child: Padding(padding: EdgeInsets.only(bottom: 12), child: SizedBox(width: 52, child: Card(child: Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))))));
}
