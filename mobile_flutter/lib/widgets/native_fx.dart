import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'native_ui.dart';

/// Animated gradient backdrop ported from the web's `aurora-borealis` /
/// `cosmic-shift` keyframes (src/index.css). One shared controller per app
/// shell, painted in a single [RepaintBoundary] so it stays cheap.
class NativeAuroraBackground extends StatefulWidget {
  const NativeAuroraBackground({super.key, required this.child, this.intensity = 1.0});

  final Widget child;

  /// 0 keeps only the flat background color; 1 is the full aurora.
  final double intensity;

  @override
  State<NativeAuroraBackground> createState() => _NativeAuroraBackgroundState();
}

class _NativeAuroraBackgroundState extends State<NativeAuroraBackground> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 16))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: NativeColors.background,
      child: RepaintBoundary(
        child: CustomPaint(
          painter: _AuroraPainter(animation: _controller, intensity: widget.intensity),
          child: widget.child,
        ),
      ),
    );
  }
}

class _AuroraPainter extends CustomPainter {
  _AuroraPainter({required this.animation, required this.intensity}) : super(repaint: animation);

  final Animation<double> animation;
  final double intensity;

  static const _indigo = Color(0xFF1E1B4B);
  static const _violet = Color(0xFF7C3AED);
  static const _cyan = Color(0xFF0891B2);

  @override
  void paint(Canvas canvas, Size size) {
    if (intensity <= 0 || size.isEmpty) return;
    final t = animation.value * 2 * math.pi;
    _blob(canvas, size, _violet, 0.16 * intensity, 0.5 + 0.28 * math.sin(t), 0.22 + 0.10 * math.cos(t * 0.8), 0.62);
    _blob(canvas, size, _cyan, 0.13 * intensity, 0.24 + 0.16 * math.cos(t * 0.7 + 1.4), 0.86 + 0.10 * math.sin(t * 0.9 + 0.6), 0.55);
    _blob(canvas, size, _indigo, 0.30 * intensity, 0.82 + 0.14 * math.sin(t * 0.6 + 2.2), 0.62 + 0.16 * math.cos(t * 0.5), 0.78);
  }

  void _blob(Canvas canvas, Size size, Color color, double alpha, double fx, double fy, double radiusFactor) {
    final center = Offset(size.width * fx, size.height * fy);
    final radius = size.shortestSide * radiusFactor;
    final paint = Paint()
      ..shader = RadialGradient(colors: [color.withValues(alpha: alpha), color.withValues(alpha: 0)]).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(_AuroraPainter oldDelegate) => oldDelegate.intensity != intensity;
}

/// Press-scale feedback used by tappable cards and buttons, matching the
/// springy press feel of the web buttons.
class NativePressable extends StatefulWidget {
  const NativePressable({super.key, required this.child, this.onTap, this.scale = 0.965, this.borderRadius = 22});

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final double borderRadius;

  @override
  State<NativePressable> createState() => _NativePressableState();
}

class _NativePressableState extends State<NativePressable> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (value == _pressed || !mounted) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onTap,
      onTapDown: widget.onTap == null ? null : (_) => _setPressed(true),
      onTapUp: widget.onTap == null ? null : (_) => _setPressed(false),
      onTapCancel: widget.onTap == null ? null : () => _setPressed(false),
      child: AnimatedScale(
        scale: _pressed ? widget.scale : 1,
        duration: const Duration(milliseconds: 130),
        curve: Curves.easeOutCubic,
        child: widget.child,
      ),
    );
  }
}

/// Fade + rise entrance, a port of the web's `fade-in` keyframe
/// (opacity 0 -> 1, translateY 10px -> 0) with a small stagger per [index].
class NativeEntrance extends StatefulWidget {
  const NativeEntrance({super.key, required this.child, this.index = 0, this.duration = const Duration(milliseconds: 620)});

  final Widget child;
  final int index;
  final Duration duration;

  @override
  State<NativeEntrance> createState() => _NativeEntranceState();
}

class _NativeEntranceState extends State<NativeEntrance> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;
  late final Animation<Offset> _offset;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    final start = (widget.index * 0.09).clamp(0.0, 0.55);
    final curve = CurvedAnimation(parent: _controller, curve: Interval(start, 1, curve: Curves.easeOutCubic));
    _opacity = curve;
    _offset = Tween<Offset>(begin: const Offset(0, 0.045), end: Offset.zero).animate(curve);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(opacity: _opacity, child: SlideTransition(position: _offset, child: widget.child));
  }
}

/// Sweeping shine, a port of the web's `sync-shimmer` / `gold-shine`
/// keyframes. Wraps [child] and slides a translucent gradient band over it.
class NativeShimmer extends StatefulWidget {
  const NativeShimmer({super.key, required this.child, this.period = const Duration(milliseconds: 1500)});

  final Widget child;
  final Duration period;

  @override
  State<NativeShimmer> createState() => _NativeShimmerState();
}

class _NativeShimmerState extends State<NativeShimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.period)..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      child: widget.child,
      builder: (context, child) {
        final slide = _controller.value * 2 - 1; // -1 -> 1
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment(slide - 1, 0),
              end: Alignment(slide + 1, 0),
              colors: [Colors.white.withValues(alpha: 0), Colors.white.withValues(alpha: 0.10), Colors.white.withValues(alpha: 0)],
            ).createShader(bounds);
          },
          child: child,
        );
      },
    );
  }
}

/// Rounded placeholder block used by [NativeSkeleton].
class NativeSkeletonBlock extends StatelessWidget {
  const NativeSkeletonBlock({super.key, this.width, this.height = 14, this.radius = 10});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(color: NativeColors.surfaceRaised.withValues(alpha: 0.85), borderRadius: BorderRadius.circular(radius)),
    );
  }
}

/// Shimmering card-shaped loading placeholder that replaces plain spinners
/// in content areas.
class NativeSkeleton extends StatelessWidget {
  const NativeSkeleton({super.key, this.cards = 3});

  final int cards;

  @override
  Widget build(BuildContext context) {
    return NativeShimmer(
      child: Column(
        children: [
          for (var i = 0; i < cards; i++)
            Padding(
              padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: NativeColors.surface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: NativeColors.border),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    NativeSkeletonBlock(width: 150, height: 16),
                    SizedBox(height: 12),
                    NativeSkeletonBlock(height: 12),
                    SizedBox(height: 8),
                    NativeSkeletonBlock(width: 220, height: 12),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Three bouncing dots, a port of the web's `bounce-subtle` keyframe, for
/// compact inline loading (buttons, chat pending, generation states).
class NativeLoadingDots extends StatefulWidget {
  const NativeLoadingDots({super.key, this.color = NativeColors.primary, this.size = 7});

  final Color color;
  final double size;

  @override
  State<NativeLoadingDots> createState() => _NativeLoadingDotsState();
}

class _NativeLoadingDotsState extends State<NativeLoadingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++)
              Padding(
                padding: EdgeInsets.symmetric(horizontal: widget.size * 0.32),
                child: Transform.translate(
                  offset: Offset(0, -widget.size * 0.55 * math.sin((_controller.value * 2 * math.pi) + i * 0.9).abs()),
                  child: Container(
                    width: widget.size,
                    height: widget.size,
                    decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Primary call-to-action with the web's violet-to-cyan aurora gradient, a
/// slow `cosmic-shift` style sweep, and press-scale feedback.
class NativeGradientButton extends StatefulWidget {
  const NativeGradientButton({super.key, required this.label, required this.onPressed, this.icon, this.expand = true, this.enabled = true});

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expand;
  final bool enabled;

  @override
  State<NativeGradientButton> createState() => _NativeGradientButtonState();
}

class _NativeGradientButtonState extends State<NativeGradientButton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 7))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.enabled && widget.onPressed != null;
    final button = NativePressable(
      onTap: active ? widget.onPressed : null,
      borderRadius: 18,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final slide = math.sin(_controller.value * 2 * math.pi) * 0.35;
          return Container(
            width: widget.expand ? double.infinity : null,
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 15),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment(-1 + slide, -0.4),
                end: Alignment(1 + slide, 0.4),
                colors: active
                    ? const [NativeColors.primaryStrong, NativeColors.primary, NativeColors.cyan]
                    : [NativeColors.surfaceRaised, NativeColors.surfaceRaised, NativeColors.surfaceRaised],
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: active ? [BoxShadow(color: NativeColors.primaryStrong.withValues(alpha: 0.35), blurRadius: 18, offset: const Offset(0, 8))] : null,
            ),
            child: child,
          );
        },
        child: Row(
          mainAxisSize: widget.expand ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (widget.icon != null) ...[
              Icon(widget.icon, size: 19, color: active ? Colors.white : NativeColors.textMuted),
              const SizedBox(width: 9),
            ],
            Flexible(
              child: Text(
                widget.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: active ? Colors.white : NativeColors.textMuted, fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ),
          ],
        ),
      ),
    );
    return button;
  }
}

/// Bottom tab bar with a sliding pill indicator and animated icon color,
/// replacing the default [NavigationBar] for a livelier feel.
class NativeTabBar extends StatelessWidget {
  const NativeTabBar({super.key, required this.tabs, required this.selectedIndex, required this.onSelect});

  final List<NativeTabSpec> tabs;
  final int selectedIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 74,
      decoration: const BoxDecoration(
        color: NativeColors.surface,
        border: Border(top: BorderSide(color: NativeColors.border)),
      ),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++)
            Expanded(
              child: _NativeTabItem(spec: tabs[i], selected: i == selectedIndex, onTap: () => onSelect(i)),
            ),
        ],
      ),
    );
  }
}

class NativeTabSpec {
  const NativeTabSpec({required this.icon, required this.selectedIcon, required this.label});

  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

class _NativeTabItem extends StatelessWidget {
  const _NativeTabItem({required this.spec, required this.selected, required this.onTap});

  final NativeTabSpec spec;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? NativeColors.primary : NativeColors.textMuted;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
            decoration: BoxDecoration(
              color: selected ? NativeColors.primary.withValues(alpha: 0.20) : Colors.transparent,
              borderRadius: BorderRadius.circular(20),
            ),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              child: Icon(selected ? spec.selectedIcon : spec.icon, key: ValueKey(selected), color: color, size: 23),
            ),
          ),
          const SizedBox(height: 3),
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 180),
            style: TextStyle(fontSize: 11, fontWeight: selected ? FontWeight.w800 : FontWeight.w600, color: color),
            child: Text(spec.label, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}
