/// CustomPainter that renders a whiteboard step natively — the Flutter port of
/// the web player's SVG board (WhiteboardPlayer.tsx). Same coordinates (1280x720),
/// same colors, same progressive reveal, same explanation strip.
import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'whiteboard_models.dart';

const Map<String, Color> kNodeColors = {
  'ink': Color(0xFF1E293B),
  'primary': Color(0xFF007472),
  'accent': Color(0xFFD9603B),
  'success': Color(0xFF059669),
  'danger': Color(0xFFE11D48),
  'muted': Color(0xFF64748B),
};

Color nodeColor(String name) => kNodeColors[name] ?? kNodeColors['ink']!;

/// Minimal SVG path parser (M L C Q Z only — the worker prompt restricts paths to these).
Path parseSvgPath(String d) {
  final path = Path();
  final tokens = RegExp(r'[MLCQZmlcqz]|-?\d*\.?\d+').allMatches(d).map((m) => m.group(0)!).toList();
  var i = 0;
  String cmd = '';
  double x = 0, y = 0, sx = 0, sy = 0;
  double num() => double.parse(tokens[i++]);
  while (i < tokens.length) {
    if (RegExp(r'^[A-Za-z]$').hasMatch(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case 'M':
        x = num(); y = num(); path.moveTo(x, y); sx = x; sy = y; cmd = 'L';
        break;
      case 'L':
        x = num(); y = num(); path.lineTo(x, y);
        break;
      case 'C':
        final x1 = num(), y1 = num(), x2 = num(), y2 = num();
        x = num(); y = num();
        path.cubicTo(x1, y1, x2, y2, x, y);
        break;
      case 'Q':
        final x1 = num(), y1 = num();
        x = num(); y = num();
        path.quadraticBezierTo(x1, y1, x, y);
        break;
      case 'Z':
        path.close(); x = sx; y = sy;
        break;
      default:
        i = tokens.length; // unknown command: stop rather than misparse
    }
  }
  return path;
}

class WhiteboardPainter extends CustomPainter {
  WhiteboardPainter({
    required this.lesson,
    required this.step,
    required this.carried,
    required this.tInStepMs,
    required this.durationMs,
    required this.showExplanation,
  });

  final WhiteboardLesson lesson;
  final LessonStep step;
  final List<LessonStep> carried;
  final double tInStepMs;
  final double durationMs;
  final bool showExplanation;

  bool get _rtl => (step.lang ?? lesson.lang) == 'ar';

  @override
  void paint(Canvas canvas, Size size) {
    final scale = math.min(size.width / lesson.canvasW, size.height / lesson.canvasH);
    final dx = (size.width - lesson.canvasW * scale) / 2;
    final dy = (size.height - lesson.canvasH * scale) / 2;
    canvas.save();
    canvas.translate(dx, dy);
    canvas.scale(scale);
    _paintGrid(canvas);
    for (final c in carried) {
      for (final n in c.nodes) {
        _paintNode(canvas, n, 1, (c.lang ?? lesson.lang) == 'ar');
      }
    }
    for (var i = 0; i < step.nodes.length; i++) {
      _paintNode(canvas, step.nodes[i], nodeProgress(step, i, tInStepMs, durationMs), _rtl);
    }
    if (showExplanation) _paintExplanation(canvas);
    canvas.restore();
  }

  void _paintGrid(Canvas canvas) {
    final paint = Paint()
      ..color = const Color(0xFFE7E5DF)
      ..strokeWidth = 1;
    for (var x = 0.0; x <= lesson.canvasW; x += 40) {
      canvas.drawLine(Offset(x, 0), Offset(x, lesson.canvasH), paint);
    }
    for (var y = 0.0; y <= lesson.canvasH; y += 40) {
      canvas.drawLine(Offset(0, y), Offset(lesson.canvasW, y), paint);
    }
  }

  TextPainter _textPainter(String text, double fontSize, Color color, String? align, bool rtl) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w700, color: color, height: 1.2)),
      textDirection: rtl ? TextDirection.rtl : TextDirection.ltr,
      maxLines: 1,
    )..layout();
    return tp;
  }

  void _paintText(Canvas canvas, WhiteboardNode n, double progress, bool rtl) {
    final size = n.fontSize ?? 32;
    final color = nodeColor(n.color);
    final text = n.text ?? '';
    if (text.isEmpty) return;
    final tp = _textPainter(text, size, color, n.align, rtl);
    final left = n.align == 'center'
        ? n.x - tp.width / 2
        : (n.align == 'start') == rtl
            ? n.x - tp.width
            : n.x;
    final revealRtl = rtl && RegExp(r'[\u0600-\u06FF]').hasMatch(text);
    final reveal = tp.width * progress;
    canvas.save();
    if (revealRtl) {
      canvas.clipRect(Rect.fromLTWH(left + tp.width - reveal - (progress >= 1 ? size : 0), n.y - size * 1.2, reveal + (progress >= 1 ? size : 0), size * 1.8));
    } else {
      canvas.clipRect(Rect.fromLTWH(left, n.y - size * 1.2, reveal + (progress >= 1 ? size : 0), size * 1.8));
    }
    tp.paint(canvas, Offset(left, n.y - tp.height * 0.8));
    canvas.restore();
  }

  Path _partialPath(Path full, double progress) {
    final out = Path();
    for (final metric in full.computeMetrics()) {
      out.addPath(metric.extractPath(0, metric.length * progress), Offset.zero);
    }
    return out;
  }

  void _paintNode(Canvas canvas, WhiteboardNode n, double progress, bool rtl) {
    if (progress <= 0) return;
    final color = nodeColor(n.color);
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    switch (n.type) {
      case 'text':
        _paintText(canvas, n, progress, rtl);
        break;
      case 'rectangle':
      case 'ellipse':
        final w = n.w ?? 0, h = n.h ?? 0;
        final rect = Rect.fromLTWH(n.x, n.y, w, h);
        final full = n.type == 'rectangle' ? (Path()..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(14)))) : (Path()..addOval(rect));
        canvas.drawPath(_partialPath(full, progress), stroke);
        if (progress >= 1) {
          canvas.drawPath(full, Paint()..color = color.withValues(alpha: 0.06));
        }
        if (n.text != null && progress > 0.4) {
          final sub = WhiteboardNode(id: n.id, type: 'text', x: n.x + w / 2, y: n.y + h / 2, color: n.color, text: n.text, fontSize: n.fontSize, align: 'center');
          _paintText(canvas, sub, (progress - 0.4) / 0.6, rtl);
        }
        break;
      case 'highlight':
        final w = (n.w ?? 0) * progress;
        final rect = Rect.fromLTWH(rtl ? n.x + (n.w ?? 0) - w : n.x, n.y, w, n.h ?? 0);
        canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(10)), Paint()..color = color.withValues(alpha: 0.28));
        break;
      case 'line':
      case 'arrow':
        final x2 = n.x + ((n.x2 ?? n.x) - n.x) * progress;
        final y2 = n.y + ((n.y2 ?? n.y) - n.y) * progress;
        canvas.drawLine(Offset(n.x, n.y), Offset(x2, y2), stroke);
        if (n.type == 'arrow' && progress > 0.2) {
          final angle = math.atan2(y2 - n.y, x2 - n.x);
          const len = 18.0;
          for (final a in [angle + 2.6, angle - 2.6]) {
            canvas.drawLine(Offset(x2, y2), Offset(x2 + len * math.cos(a), y2 + len * math.sin(a)), stroke);
          }
        }
        break;
      case 'curve':
        final full = Path()
          ..moveTo(n.x, n.y)
          ..quadraticBezierTo(n.cx ?? n.x, n.cy ?? n.y, n.x2 ?? n.x, n.y2 ?? n.y);
        canvas.drawPath(_partialPath(full, progress), stroke);
        break;
      case 'path':
        if (n.d != null) canvas.drawPath(_partialPath(parseSvgPath(n.d!), progress), stroke);
        break;
      case 'icon':
      case 'sticker':
        // v1: draw a labeled placeholder chip; full icon/sticker art is web-only for now.
        final w = n.w ?? 120, h = n.h ?? 120;
        final rect = Rect.fromLTWH(n.x, n.y, w, h);
        canvas.drawRRect(
          RRect.fromRectAndRadius(rect, const Radius.circular(16)),
          Paint()..color = color.withValues(alpha: 0.12 * progress),
        );
        final tp = _textPainter(n.name ?? '', 22, color, 'center', rtl);
        tp.paint(canvas, Offset(n.x + (w - tp.width) / 2, n.y + (h - tp.height) / 2));
        break;
    }
  }

  /// The explanation strip: same geometry as the web BoardExplanation (y 590, h 112).
  void _paintExplanation(Canvas canvas) {
    const x0 = 78.0, w = 1124.0, fs = 25.0, top = 590.0, lineH = 34.0;
    final narration = stripDiacritics(step.narration);
    final chars = (narration.length * (durationMs > 0 ? (tInStepMs / durationMs).clamp(0, 1) : 1)).floor();
    final visible = narration.substring(0, chars.clamp(0, narration.length));
    // Wrap by measuring, keep the last 3 lines.
    final words = visible.split(RegExp(r'\s+')).where((x) => x.isNotEmpty).toList();
    final lines = <String>[];
    var cur = '';
    double widthOf(String s) => _textPainter(s, fs, const Color(0xFF3F3F46), null, _rtl).width;
    for (final word in words) {
      final t = cur.isEmpty ? word : '$cur $word';
      if (cur.isNotEmpty && widthOf(t) > w) {
        lines.add(cur);
        cur = word;
      } else {
        cur = t;
      }
    }
    if (cur.isNotEmpty) lines.add(cur);
    final shown = lines.length > 3 ? lines.sublist(lines.length - 3) : lines;

    final bg = Paint()..color = const Color(0xFFFDFCF8).withValues(alpha: 0.94);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(64, top, 1152, 112), const Radius.circular(14)), bg);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(64, top, 1152, 112), const Radius.circular(14)),
      Paint()
        ..color = const Color(0xFFE7E5DF)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );
    double penX = _rtl ? x0 + w : x0;
    for (var i = 0; i < shown.length; i++) {
      final tp = _textPainter(shown[i], fs, const Color(0xFF3F3F46), null, _rtl);
      final tx = _rtl ? x0 + w - tp.width : x0;
      tp.paint(canvas, Offset(tx, top + 32 + i * lineH - tp.height / 2));
      penX = _rtl ? tx - 20 : tx + tp.width + 20;
    }
    final progress = durationMs > 0 ? tInStepMs / durationMs : 1;
    if (progress > 0 && progress < 1 && shown.isNotEmpty) {
      final penY = top + 32 + (shown.length - 1) * lineH + 8;
      canvas.drawCircle(Offset(penX, penY), 7, Paint()..color = const Color(0xFF3F3F46));
    }
  }

  @override
  bool shouldRepaint(WhiteboardPainter old) =>
      old.step != step || old.tInStepMs != tInStepMs || old.showExplanation != showExplanation || old.carried.length != carried.length;
}
