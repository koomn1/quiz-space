// Generated from src/lib/whiteboard/icons.ts - do not edit by hand. Same 200x200 stroke art.
import 'dart:ui';

class IconPart {
  const IconPart(this.kind, {this.d, this.cx = 0, this.cy = 0, this.r = 0, this.rx = 0, this.ry = 0, this.rotate = 0, this.x1 = 0, this.y1 = 0, this.x2 = 0, this.y2 = 0});
  final String kind; // path|circle|ellipse|line
  final String? d;
  final double cx, cy, r, rx, ry, rotate, x1, y1, x2, y2;
}

class WhiteboardIconDef {
  const WhiteboardIconDef({required this.viewBox, required this.parts, required this.anchors});
  final double viewBox;
  final List<IconPart> parts;
  final Map<String, Offset> anchors;
}

const Map<String, WhiteboardIconDef> kWhiteboardIcons = {
  'heart': WhiteboardIconDef(viewBox: 200, parts: [
    IconPart('path', d: 'path'),
  ], anchors: {
    'top': Offset(100, 26),
    'bottom': Offset(100, 178),
    'left': Offset(28, 75),
  }),
  'cell': WhiteboardIconDef(viewBox: 200, parts: [
    IconPart('ellipse', cx: 100, cy: 100, rx: 86, ry: 68),
    IconPart('circle', cx: 100, cy: 100, r: 26),
    IconPart('circle', cx: 100, cy: 100, r: 10),
    IconPart('ellipse', cx: 52, cy: 66, rx: 14, ry: 8, rotate: -30),
    IconPart('ellipse', cx: 150, cy: 140, rx: 14, ry: 8, rotate: -25),
    IconPart('ellipse', cx: 152, cy: 62, rx: 9, ry: 9),
    IconPart('ellipse', cx: 48, cy: 138, rx: 9, ry: 9),
  ], anchors: {
    'membrane': Offset(186, 100),
    'nucleus': Offset(100, 100),
  }),
  'atom': WhiteboardIconDef(viewBox: 200, parts: [
    IconPart('circle', cx: 100, cy: 100, r: 14),
    IconPart('ellipse', cx: 100, cy: 100, rx: 84, ry: 32),
    IconPart('ellipse', cx: 100, cy: 100, rx: 84, ry: 32, rotate: 60),
    IconPart('ellipse', cx: 100, cy: 100, rx: 84, ry: 32, rotate: -60),
    IconPart('circle', cx: 184, cy: 100, r: 6),
    IconPart('circle', cx: 58, cy: 173, r: 6),
    IconPart('circle', cx: 58, cy: 27, r: 6),
  ], anchors: {
    'nucleus': Offset(100, 100),
    'electron': Offset(184, 92),
  }),
  'plant': WhiteboardIconDef(viewBox: 200, parts: [
    IconPart('line', x1: 100, y1: 180, x2: 100, y2: 60),
    IconPart('path', d: 'path'),
    IconPart('path', d: 'path'),
    IconPart('circle', cx: 100, cy: 44, r: 16),
    IconPart('path', d: 'path'),
    IconPart('line', x1: 60, y1: 180, x2: 140, y2: 180),
  ], anchors: {
    'flower': Offset(100, 24),
    'leaf': Offset(152, 66),
    'stem': Offset(108, 120),
  }),
  'earth': WhiteboardIconDef(viewBox: 200, parts: [
    IconPart('circle', cx: 100, cy: 100, r: 82),
    IconPart('path', d: 'path'),
    IconPart('path', d: 'path'),
    IconPart('ellipse', cx: 100, cy: 100, rx: 82, ry: 26),
    IconPart('path', d: 'path'),
    IconPart('path', d: 'path'),
  ], anchors: {
    'pole': Offset(100, 14),
    'equator': Offset(178, 118),
    'continent': Offset(64, 60),
  }),
  'brain': WhiteboardIconDef(viewBox: 200, parts: [
    IconPart('path', d: 'path'),
    IconPart('path', d: 'path'),
    IconPart('path', d: 'path'),
    IconPart('path', d: 'path'),
    IconPart('path', d: 'path'),
    IconPart('path', d: 'path'),
  ], anchors: {
    'left': Offset(30, 100),
    'right': Offset(170, 100),
    'fissure': Offset(100, 96),
  }),
};
