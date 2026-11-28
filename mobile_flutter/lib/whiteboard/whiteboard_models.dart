/// Whiteboard lesson models — native port of the web lesson schema
/// (src/lib/whiteboard/lessonSchema.ts). Keep field names identical to the
/// worker's JSON so the same lessons render on web and native.
class IconLabel {
  const IconLabel({required this.anchor, required this.text, this.teaser = false});
  final String anchor;
  final String text;
  final bool teaser;
}

class WhiteboardNode {
  WhiteboardNode({
    required this.id,
    required this.type,
    required this.x,
    required this.y,
    required this.color,
    this.w,
    this.h,
    this.x2,
    this.y2,
    this.cx,
    this.cy,
    this.d,
    this.name,
    this.text,
    this.fontSize,
    this.align,
    this.labels,
  });

  final String id;
  final String type; // text|rectangle|ellipse|line|arrow|highlight|path|curve|icon|sticker
  final double x;
  final double y;
  final String color; // ink|primary|accent|success|danger|muted
  final double? w;
  final double? h;
  final double? x2;
  final double? y2;
  final double? cx;
  final double? cy;
  final String? d;
  final String? name;
  final String? text;
  final double? fontSize;
  final String? align;
  final List<IconLabel>? labels;

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'x': x,
        'y': y,
        'color': color,
        if (w != null) 'w': w,
        if (h != null) 'h': h,
        if (x2 != null) 'x2': x2,
        if (y2 != null) 'y2': y2,
        if (cx != null) 'cx': cx,
        if (cy != null) 'cy': cy,
        if (d != null) 'd': d,
        if (name != null) 'name': name,
        if (text != null) 'text': text,
        if (fontSize != null) 'fontSize': fontSize,
        if (align != null) 'align': align,
        if (labels != null && labels!.isNotEmpty)
          'labels': labels!.map((l) => {'anchor': l.anchor, 'text': l.text, if (l.teaser) 'teaser': true}).toList(),
      };

  static double _num(dynamic v, [double fallback = 0]) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? fallback;

  factory WhiteboardNode.fromJson(Map<String, dynamic> j) => WhiteboardNode(
        id: '${j['id'] ?? ''}',
        type: '${j['type'] ?? 'text'}',
        x: _num(j['x']),
        y: _num(j['y']),
        color: '${j['color'] ?? 'ink'}',
        w: j['w'] == null ? null : _num(j['w']),
        h: j['h'] == null ? null : _num(j['h']),
        x2: j['x2'] == null ? null : _num(j['x2']),
        y2: j['y2'] == null ? null : _num(j['y2']),
        cx: j['cx'] == null ? null : _num(j['cx']),
        cy: j['cy'] == null ? null : _num(j['cy']),
        d: j['d'] as String?,
        name: j['name'] as String?,
        text: j['text'] as String?,
        fontSize: j['fontSize'] == null ? null : _num(j['fontSize']),
        align: j['align'] as String?,
        labels: ((j['labels'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map((l) => IconLabel(anchor: '${l['anchor'] ?? ''}', text: '${l['text'] ?? ''}', teaser: l['teaser'] == true))
            .toList(),
      );
}

class LessonStep {
  LessonStep({required this.id, required this.narration, required this.nodes, this.title, this.lang, this.continues});
  final String id;
  final String narration;
  final List<WhiteboardNode> nodes;
  final String? title;
  final String? lang;
  final bool? continues;

  Map<String, dynamic> toJson() => {
        'id': id,
        'narration': narration,
        'nodes': nodes.map((n) => n.toJson()).toList(),
        if (title != null) 'title': title,
        if (lang != null) 'lang': lang,
        if (continues != null) 'continues': continues,
      };

  factory LessonStep.fromJson(Map<String, dynamic> j) => LessonStep(
        id: '${j['id'] ?? ''}',
        narration: '${j['narration'] ?? ''}',
        nodes: ((j['nodes'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(WhiteboardNode.fromJson)
            .toList(),
        title: j['title'] as String?,
        lang: j['lang'] as String?,
        continues: j['continues'] as bool?,
      );
}

class WhiteboardLesson {
  WhiteboardLesson({required this.id, required this.title, required this.lang, required this.canvasW, required this.canvasH, required this.steps, this.createdAt});
  final String id;
  final String title;
  final String lang;
  final double canvasW;
  final double canvasH;
  final List<LessonStep> steps;
  final String? createdAt;

  bool get isArabic => lang == 'ar';

  Map<String, dynamic> toJson() => {
        'schema_version': 1,
        'id': id,
        'title': title,
        'lang': lang,
        'canvas': {'width': canvasW, 'height': canvasH},
        'steps': steps.map((s) => s.toJson()).toList(),
        'metadata': {'source': 'ai', 'status': 'reviewed', if (createdAt != null) 'createdAt': createdAt},
      };

  factory WhiteboardLesson.fromJson(Map<String, dynamic> j) {
    final canvas = (j['canvas'] as Map<String, dynamic>?) ?? const {};
    final metadata = (j['metadata'] as Map<String, dynamic>?) ?? const {};
    return WhiteboardLesson(
      id: '${j['id'] ?? ''}',
      title: '${j['title'] ?? ''}',
      lang: '${j['lang'] ?? 'ar'}',
      canvasW: WhiteboardNode._num(canvas['width'], 1280),
      canvasH: WhiteboardNode._num(canvas['height'], 720),
      steps: ((j['steps'] as List?) ?? const []).whereType<Map<String, dynamic>>().map(LessonStep.fromJson).toList(),
      createdAt: metadata['createdAt'] as String?,
    );
  }
}

/// Strip Arabic diacritics for on-board display (they belong to the voice track only).
String stripDiacritics(String text) =>
    text.replaceAll(RegExp('[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED]'), '');

/// Step timing — mirrors src/lib/whiteboard/timeline.ts.
double stepDurationMs(LessonStep step, double rate) {
  final words = step.narration.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
  final narrationMs = words * 420 / (rate < 0.5 ? 0.5 : rate);
  final drawMs = 600.0 + step.nodes.length * 650;
  final d = narrationMs > drawMs ? narrationMs : drawMs;
  return d < 2500 ? 2500.0 : d;
}

/// Nodes draw one after another across the first ~80% of the step.
double nodeProgress(LessonStep step, int nodeIndex, double tInStepMs, double durationMs) {
  final n = step.nodes.length;
  if (n == 0) return 0;
  final window = durationMs * 0.8;
  final slot = window / n;
  final start = slot * nodeIndex;
  var drawMs = slot * 1.1;
  if (drawMs < 500) drawMs = 500;
  if (drawMs > 1600) drawMs = 1600;
  final p = (tInStepMs - start) / drawMs;
  return p < 0 ? 0 : (p > 1 ? 1 : p);
}
