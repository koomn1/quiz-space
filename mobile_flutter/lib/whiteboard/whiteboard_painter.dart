// CustomPainter that renders a whiteboard step natively — the Flutter port of
// the web player's SVG board (WhiteboardPlayer.tsx). Same coordinates (1280x720),
// same colors, same progressive reveal, same explanation strip.
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:vector_graphics/vector_graphics.dart';

import 'whiteboard_icons.dart';
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
    required this.stickerPictures,
    required this.stickerVersion,
  });

  final WhiteboardLesson lesson;
  final LessonStep step;
  final List<LessonStep> carried;
  final double tInStepMs;
  final double durationMs;

  /// Preloaded sticker pictures by sticker name (null entry = unknown/failed, draw placeholder).
  final Map<String, PictureInfo?> stickerPictures;

  /// Bumped when [stickerPictures] gains entries so shouldRepaint notices.
  final int stickerVersion;

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
        _paintIcon(canvas, n, progress, rtl, stroke);
        break;
      case 'sticker':
        _paintSticker(canvas, n, progress, color, rtl);
        break;
    }
  }

  /// Web popTransform: a small overshoot bump in the last 20% of the draw.
  void _withPop(Canvas canvas, double progress, double cx, double cy, void Function() draw) {
    canvas.save();
    if (progress > 0.8 && progress < 1) {
      final s = 1 + 0.06 * math.sin(((progress - 0.8) / 0.2) * math.pi);
      canvas.translate(cx, cy);
      canvas.scale(s);
      canvas.translate(-cx, -cy);
    }
    draw();
    canvas.restore();
  }

  /// Icon nodes: the hand-drawn 200x200 stroke art from the web icon library,
  /// parts drawn one after another, labels pinned to named anchors.
  void _paintIcon(Canvas canvas, WhiteboardNode n, double progress, bool rtl, Paint stroke) {
    final def = kWhiteboardIcons[n.name];
    if (def == null) {
      _paintPlaceholderChip(canvas, n, progress, stroke.color, rtl);
      return;
    }
    final w = n.w ?? 200, h = n.h ?? 200;
    final sx = w / def.viewBox, sy = h / def.viewBox;
    final partStroke = Paint()
      ..color = stroke.color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5 / math.max(sx, sy)
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final count = def.parts.length;
    _withPop(canvas, progress, n.x + w / 2, n.y + h / 2, () {
      canvas.save();
      canvas.translate(n.x, n.y);
      canvas.scale(sx, sy);
      for (var i = 0; i < count; i++) {
        final pp = (progress * count - i).clamp(0.0, 1.0);
        if (pp <= 0) continue;
        final part = def.parts[i];
        switch (part.kind) {
          case 'path':
            if (part.d != null) canvas.drawPath(_partialPath(parseSvgPath(part.d!), pp), partStroke);
            break;
          case 'circle':
            final full = Path()..addOval(Rect.fromCircle(center: Offset(part.cx, part.cy), radius: part.r));
            canvas.drawPath(_partialPath(full, pp), partStroke);
            break;
          case 'ellipse':
            final full = Path()..addOval(Rect.fromCenter(center: Offset(part.cx, part.cy), width: part.rx * 2, height: part.ry * 2));
            if (part.rotate != 0) {
              canvas.save();
              canvas.translate(part.cx, part.cy);
              canvas.rotate(part.rotate * math.pi / 180);
              canvas.translate(-part.cx, -part.cy);
              canvas.drawPath(_partialPath(full, pp), partStroke);
              canvas.restore();
            } else {
              canvas.drawPath(_partialPath(full, pp), partStroke);
            }
            break;
          case 'line':
            canvas.drawLine(
              Offset(part.x1, part.y1),
              Offset(part.x1 + (part.x2 - part.x1) * pp, part.y1 + (part.y2 - part.y1) * pp),
              partStroke,
            );
            break;
        }
      }
      canvas.restore();
    });
    for (final label in n.labels ?? const <IconLabel>[]) {
      final a = def.anchors[label.anchor];
      if (a == null) continue;
      final ax = n.x + a.dx * sx, ay = n.y + a.dy * sy;
      var outX = a.dx == def.viewBox / 2 ? 0.0 : (a.dx > def.viewBox / 2 ? 1.0 : -1.0);
      if (outX == 0) outX = rtl ? -1.0 : 1.0;
      final outY = a.dy == def.viewBox / 2 ? -1.0 : (a.dy > def.viewBox / 2 ? 1.0 : -1.0);
      final lx = ax + outX * 20, ly = ay + outY * 20;
      final revealed = !label.teaser || progress >= 0.95;
      if (label.teaser && progress < 0.35) continue;
      if (revealed) {
        final sub = WhiteboardNode(id: '${n.id}-label', type: 'text', x: lx, y: ly, color: n.color, text: label.text, fontSize: 28, align: 'center');
        _paintText(canvas, sub, ((progress - 0.6) / 0.35).clamp(0.0, 1.0), rtl);
      } else {
        canvas.drawCircle(Offset(lx, ly - 10), 17, Paint()..color = stroke.color.withValues(alpha: 0.14));
        final tp = _textPainter('?', 30, stroke.color, 'center', rtl);
        tp.paint(canvas, Offset(lx - tp.width / 2, ly - tp.height * 0.8));
      }
    }
  }

  /// Sticker nodes: the same SVG sticker art as the web, popped in with easeOutBack.
  void _paintSticker(Canvas canvas, WhiteboardNode n, double progress, Color color, bool rtl) {
    final pic = stickerPictures[n.name];
    if (pic == null) {
      _paintPlaceholderChip(canvas, n, progress, color, rtl);
      return;
    }
    final w = n.w ?? 160, h = n.h ?? 160;
    final t = progress.clamp(0.0, 1.0);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    final ease = 1 + c3 * math.pow(t - 1, 3) + c1 * math.pow(t - 1, 2); // easeOutBack, same as web
    final s = math.max(0.001, ease);
    final cx0 = n.x + w / 2, cy0 = n.y + h / 2;
    canvas.save();
    canvas.saveLayer(
      Rect.fromLTWH(n.x - w, n.y - h, w * 3, h * 3),
      Paint()..color = Colors.white.withValues(alpha: math.min(1, t * 2)),
    );
    canvas.translate(cx0, cy0);
    canvas.scale(s);
    canvas.translate(-cx0, -cy0);
    canvas.translate(n.x, n.y);
    final ps = pic.size;
    canvas.scale(w / ps.width, h / ps.height);
    canvas.drawPicture(pic.picture);
    canvas.restore();
    canvas.restore();
  }

  void _paintPlaceholderChip(Canvas canvas, WhiteboardNode n, double progress, Color color, bool rtl) {
    final w = n.w ?? 120, h = n.h ?? 120;
    final rect = Rect.fromLTWH(n.x, n.y, w, h);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(16)),
      Paint()..color = color.withValues(alpha: 0.12 * progress),
    );
    final tp = _textPainter(n.name ?? '', 22, color, 'center', rtl);
    tp.paint(canvas, Offset(n.x + (w - tp.width) / 2, n.y + (h - tp.height) / 2));
  }


  @override
  bool shouldRepaint(WhiteboardPainter old) =>
      old.step != step ||
      old.tInStepMs != tInStepMs ||
      old.carried.length != carried.length ||
      old.stickerVersion != stickerVersion;
}
