// Native whiteboard lesson screen: generate a lesson from a topic and watch it
// drawn step by step with the explanation typed on the board. The Flutter port
// of the web whiteboard player (no webview).
import 'dart:async';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';

import '../whiteboard/whiteboard_models.dart';
import '../whiteboard/whiteboard_painter.dart';
import '../whiteboard/whiteboard_service.dart';

class WhiteboardScreen extends StatefulWidget {
  const WhiteboardScreen({super.key});

  @override
  State<WhiteboardScreen> createState() => _WhiteboardScreenState();
}

class _WhiteboardScreenState extends State<WhiteboardScreen> {
  final _topicCtrl = TextEditingController();
  WhiteboardLesson? _lesson;
  bool _generating = false;
  String? _error;

  int _stepIndex = 0;
  bool _playing = false;
  double _tInStep = 0; // ms into the current step
  bool _showNotes = true;
  Timer? _ticker;
  DateTime _tickStarted = DateTime.now();

  // Teacher voice (Munsit via the worker); silent reading when unavailable.
  final AudioPlayer _player = AudioPlayer();
  final Map<int, double> _audioMs = {};
  int _ttsCharsUsed = 0;
  static const _ttsCharBudget = 2000;
  int _ttsToken = 0;

  @override
  void dispose() {
    _ticker?.cancel();
    _player.dispose();
    _topicCtrl.dispose();
    super.dispose();
  }

  LessonStep get _step => _lesson!.steps[_stepIndex];
  double get _duration {
    final estimate = stepDurationMs(_step, 1);
    final audio = _audioMs[_stepIndex];
    return audio != null && audio > estimate ? audio : estimate;
  }

  /// Fetch and play the teacher clip for the step; extends the step so speech is never cut.
  Future<void> _speakStep(int index) async {
    final lesson = _lesson;
    if (lesson == null) return;
    final step = lesson.steps[index];
    final lang = step.lang ?? lesson.lang;
    if (lang != 'ar') return; // native v1 speaks Arabic narration only
    final text = step.narration;
    if (_ttsCharsUsed + text.length > _ttsCharBudget) return;
    _ttsCharsUsed += text.length;
    final token = ++_ttsToken;
    final bytes = await WhiteboardService.fetchTts(text, voice: index.isEven ? 'boy' : 'girl');
    if (!mounted || bytes == null || token != _ttsToken) return;
    try {
      await _player.stop();
      await _player.setSource(BytesSource(Uint8List.fromList(bytes)));
      final d = await _player.getDuration();
      if (d != null && mounted) setState(() => _audioMs[index] = d.inMilliseconds.toDouble());
      if (mounted && _playing && token == _ttsToken) await _player.resume();
    } catch (_) {
      // Silent board reading remains the fallback.
    }
  }

  List<LessonStep> get _carried {
    final out = <LessonStep>[];
    for (var i = _stepIndex; i > 0 && (_lesson!.steps[i].continues ?? false); i--) {
      out.insert(0, _lesson!.steps[i - 1]);
    }
    return out;
  }

  Future<void> _generate() async {
    final topic = _topicCtrl.text.trim();
    if (topic.length < 3 || _generating) return;
    setState(() {
      _generating = true;
      _error = null;
    });
    try {
      final lesson = await WhiteboardService.generateLesson(topic);
      if (!mounted) return;
      setState(() {
        _lesson = lesson;
        _stepIndex = 0;
        _tInStep = 0;
        _playing = false;
        _audioMs.clear();
        _ttsCharsUsed = 0;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('HttpException: ', ''));
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  void _setPlaying(bool play) {
    _ticker?.cancel();
    if (!play) {
      _ttsToken++;
      _player.pause();
    }
    if (play) {
      _speakStep(_stepIndex);
      _tickStarted = DateTime.now();
      _ticker = Timer.periodic(const Duration(milliseconds: 50), (_) {
        final elapsed = DateTime.now().difference(_tickStarted).inMilliseconds.toDouble();
        setState(() {
          _tInStep += elapsed;
          _tickStarted = DateTime.now();
          if (_tInStep >= _duration) {
            if (_stepIndex < _lesson!.steps.length - 1) {
              _stepIndex += 1;
              _tInStep = 0;
              _speakStep(_stepIndex);
            } else {
              _tInStep = _duration;
              _setPlaying(false);
            }
          }
        });
      });
    }
    setState(() => _playing = play);
  }

  void _goTo(int index) {
    if (_lesson == null) return;
    _ticker?.cancel();
    _ttsToken++;
    _player.stop();
    setState(() {
      _stepIndex = index.clamp(0, _lesson!.steps.length - 1);
      _tInStep = _duration; // paused steps render fully drawn, like the web player
      _playing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final lesson = _lesson;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _topicCtrl,
                    decoration: const InputDecoration(
                      hintText: 'اكتب موضوع الدرس (مثال: جمع الكسور)',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onSubmitted: (_) => _generate(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: _generating ? null : _generate,
                  icon: _generating
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.auto_awesome),
                  label: Text(_generating ? 'يولّد…' : 'ولّد'),
                ),
              ],
            ),
            if (_generating)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('التوليد يستغرق دقيقة إلى دقيقتين…', style: TextStyle(fontSize: 12, color: Colors.grey)),
              ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
              ),
            if (lesson != null) ...[
              const SizedBox(height: 12),
              Text(
                '${_stepIndex + 1}. ${_step.title ?? lesson.title}',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF0D9488)),
              ),
              const SizedBox(height: 8),
              AspectRatio(
                aspectRatio: lesson.canvasW / lesson.canvasH,
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDFCF8),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: CustomPaint(
                    painter: WhiteboardPainter(
                      lesson: lesson,
                      step: _step,
                      carried: _carried,
                      tInStepMs: _tInStep,
                      durationMs: _duration,
                      showExplanation: _showNotes,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    onPressed: _stepIndex > 0 ? () => _goTo(_stepIndex - 1) : null,
                    icon: const Icon(Icons.skip_next_rounded),
                    tooltip: 'السابقة',
                  ),
                  FilledButton.icon(
                    onPressed: () => _setPlaying(!_playing),
                    icon: Icon(_playing ? Icons.pause : Icons.play_arrow),
                    label: Text(_playing ? 'إيقاف' : 'تشغيل'),
                  ),
                  IconButton(
                    onPressed: _stepIndex < lesson.steps.length - 1 ? () => _goTo(_stepIndex + 1) : null,
                    icon: const Icon(Icons.skip_previous_rounded),
                    tooltip: 'التالية',
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => setState(() => _showNotes = !_showNotes),
                    icon: Icon(_showNotes ? Icons.edit_note : Icons.edit_off_outlined),
                    tooltip: 'اكتب الشرح على السبورة',
                    color: _showNotes ? const Color(0xFF007472) : null,
                  ),
                ],
              ),
              Slider(
                value: _stepIndex.toDouble(),
                min: 0,
                max: (lesson.steps.length - 1).toDouble(),
                divisions: lesson.steps.length > 1 ? lesson.steps.length - 1 : 1,
                onChanged: (v) => _goTo(v.round()),
              ),
              Text(
                'الخطوة ${_stepIndex + 1} / ${lesson.steps.length} — الصوت بمعلّم Munsit عند توفر الرصيد؛ الأسئلة الذكية على السبورة تصل في النسخة التالية.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
