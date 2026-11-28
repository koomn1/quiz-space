// Native whiteboard lesson screen: generate a lesson from a topic and watch it
// drawn step by step with the explanation typed on the board. The Flutter port
// of the web whiteboard player (no webview).
import 'dart:async';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../whiteboard/whiteboard_models.dart';
import '../whiteboard/whiteboard_stickers.dart';
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

  // Sticker art preloaded for the current lesson (name -> picture, null = unavailable).
  final Map<String, PictureInfo?> _stickerPics = {};
  int _stickerVersion = 0;

  // Pan/zoom on the board + mid-lesson questions.
  final TransformationController _boardZoom = TransformationController();
  final TextEditingController _askCtrl = TextEditingController();
  bool _asking = false;
  String? _askError;

  /// Load the sticker SVGs the lesson uses, once each, then repaint.
  Future<void> _preloadStickers(WhiteboardLesson lesson) async {
    for (final s in lesson.steps) {
      for (final n in s.nodes) {
        if (n.type != 'sticker' || n.name == null || _stickerPics.containsKey(n.name)) continue;
        final file = kStickerFiles[n.name];
        if (file == null) {
          _stickerPics[n.name!] = null;
          continue;
        }
        try {
          final info = await vg.loadPicture(SvgAssetLoader('assets/whiteboard/stickers/$file'), null);
          _stickerPics[n.name!] = info;
        } catch (_) {
          _stickerPics[n.name!] = null;
        }
      }
    }
    if (mounted) setState(() => _stickerVersion++);
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _player.dispose();
    _topicCtrl.dispose();
    _askCtrl.dispose();
    _boardZoom.dispose();
    super.dispose();
  }

  LessonStep get _step => _lesson!.steps[_stepIndex];
  double get _duration {
    final estimate = stepDurationMs(_step, 1);
    final audio = _audioMs[_stepIndex];
    return audio != null && audio > estimate ? audio : estimate;
  }

  /// Per-step clip cache: the next step's audio is fetched while the current one
  /// plays, so the voice starts with the step instead of seconds into it.
  final Map<int, Future<List<int>?>> _ttsCache = {};

  Future<List<int>?> _stepClip(int index) {
    final lesson = _lesson;
    if (lesson == null || index < 0 || index >= lesson.steps.length) return Future.value(null);
    final cached = _ttsCache[index];
    if (cached != null) return cached;
    final step = lesson.steps[index];
    final lang = step.lang ?? lesson.lang;
    if (lang != 'ar') return Future.value(null); // native v1 speaks Arabic narration only
    final text = step.narration;
    if (_ttsCharsUsed + text.length > _ttsCharBudget) return Future.value(null);
    _ttsCharsUsed += text.length;
    final future = WhiteboardService.fetchTts(text, voice: index.isEven ? 'boy' : 'girl');
    _ttsCache[index] = future;
    return future;
  }

  /// Fetch and play the teacher clip for the step; extends the step so speech is never cut.
  Future<void> _speakStep(int index) async {
    if (_lesson == null) return;
    final token = ++_ttsToken;
    final bytes = await _stepClip(index);
    // Warm the next step's clip while this one plays.
    unawaited(_stepClip(index + 1));
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
        _ttsCache.clear();
        _stickerPics.clear();
      });
      _preloadStickers(lesson);
      unawaited(_stepClip(0));
      unawaited(_stepClip(1));
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

  /// Send the learner's question to the worker; insert the returned branch step
  /// right after the current one and show it, like the web player.
  Future<void> _ask([String? preset]) async {
    final lesson = _lesson;
    final question = (preset ?? _askCtrl.text).trim();
    if (lesson == null || question.length < 2 || _asking) return;
    setState(() {
      _asking = true;
      _askError = null;
    });
    try {
      final branch = await WhiteboardService.askFollowup(
        question: question,
        lang: _step.lang ?? lesson.lang,
        lessonTitle: lesson.title,
        step: _step,
      );
      if (!mounted) return;
      _ticker?.cancel();
      _ttsToken++;
      _player.stop();
      setState(() {
        lesson.steps.insert(_stepIndex + 1, branch);
        _askCtrl.clear();
        _stepIndex += 1;
        _tInStep = 0;
        _playing = false;
      });
      _preloadStickers(lesson);
      // Warm the inserted branch step (now current) and the one after it.
      unawaited(_stepClip(_stepIndex));
      unawaited(_stepClip(_stepIndex + 1));
    } catch (e) {
      if (!mounted) return;
      setState(() => _askError = e.toString().replaceFirst('HttpException: ', ''));
    } finally {
      if (mounted) setState(() => _asking = false);
    }
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
                  child: GestureDetector(
                    onDoubleTap: () => setState(() => _boardZoom.value = Matrix4.identity()),
                    child: InteractiveViewer(
                      transformationController: _boardZoom,
                      minScale: 1,
                      maxScale: 4,
                      child: CustomPaint(
                        painter: WhiteboardPainter(
                      lesson: lesson,
                      step: _step,
                      carried: _carried,
                      tInStepMs: _tInStep,
                      durationMs: _duration,
                      showExplanation: _showNotes,
                          stickerPictures: _stickerPics,
                          stickerVersion: _stickerVersion,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              const Text('اسحب بإصبعين للتكبير، وانقر مرتين للعودة.', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: Colors.grey)),
              const SizedBox(height: 6),
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
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _askCtrl,
                      decoration: const InputDecoration(
                        hintText: 'عندك سؤال؟ اكتبه والمعلّم يجاوب على نفس السبورة',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onSubmitted: (_) => _ask(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: _asking ? null : () => _ask(),
                    icon: _asking
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.send_rounded),
                    label: Text(_asking ? 'يفكر…' : 'اسأل'),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  for (final chip in const ['أعد الشرح ببساطة', 'مثال آخر', 'لخصها'])
                    ActionChip(label: Text(chip, style: const TextStyle(fontSize: 12)), onPressed: _asking ? null : () => _ask(chip)),
                ],
              ),
              if (_askError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(_askError!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                ),
              const SizedBox(height: 4),
              Text(
                'الخطوة ${_stepIndex + 1} / ${lesson.steps.length} — الصوت بمعلّم Munsit عند توفر الرصيد.',
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
