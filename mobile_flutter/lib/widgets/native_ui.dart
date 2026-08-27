import 'package:flutter/material.dart';

abstract final class NativeColors {
  static const background = Color(0xFF080D1C);
  static const surface = Color(0xFF121A31);
  static const surfaceRaised = Color(0xFF192342);
  static const primary = Color(0xFFA78BFA);
  static const primaryStrong = Color(0xFF7C3AED);
  static const cyan = Color(0xFF67E8F9);
  static const gold = Color(0xFFFBBF24);
  static const text = Color(0xFFF7F5FF);
  static const textMuted = Color(0xFFA7B0CC);
  static const border = Color(0x263B4668);
}

class NativeCard extends StatelessWidget {
  const NativeCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.gradient, this.onTap});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Gradient? gradient;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? NativeColors.surface : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: NativeColors.border),
        boxShadow: const [BoxShadow(color: Color(0x26000000), blurRadius: 18, offset: Offset(0, 8))],
      ),
      child: child,
    );
    if (onTap == null) return content;
    return Material(color: Colors.transparent, child: InkWell(borderRadius: BorderRadius.circular(22), onTap: onTap, child: content));
  }
}

class NativeSectionHeading extends StatelessWidget {
  const NativeSectionHeading({super.key, required this.title, required this.icon, this.actionLabel, this.onAction});

  final String title;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(color: NativeColors.primary.withValues(alpha: .14), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, size: 18, color: NativeColors.primary),
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900))),
        if (actionLabel != null && onAction != null)
          TextButton(onPressed: onAction, child: Text(actionLabel!, style: const TextStyle(color: NativeColors.primary, fontWeight: FontWeight.w700))),
      ],
    );
  }
}

class NativeQuickAction extends StatelessWidget {
  const NativeQuickAction({super.key, required this.icon, required this.label, required this.color, required this.onTap});

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          constraints: const BoxConstraints(minHeight: 92),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: NativeColors.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: NativeColors.border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, color: color, size: 25),
            const SizedBox(height: 9),
            Text(label, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5)),
          ]),
        ),
      ),
    );
  }
}

class NativeAvatar extends StatelessWidget {
  const NativeAvatar({super.key, this.photoUrl, this.radius = 24, this.icon = Icons.person_rounded});

  final String? photoUrl;
  final double radius;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final url = photoUrl?.trim() ?? '';
    return CircleAvatar(
      radius: radius,
      backgroundColor: NativeColors.primaryStrong.withValues(alpha: .28),
      backgroundImage: url.isEmpty ? null : NetworkImage(url),
      child: url.isEmpty ? Icon(icon, size: radius, color: const Color(0xFFE9D5FF)) : null,
    );
  }
}

class NativeStatusPill extends StatelessWidget {
  const NativeStatusPill({super.key, required this.label, required this.icon, this.color = NativeColors.cyan});

  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(30), border: Border.all(color: color.withValues(alpha: .25))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 15, color: color), const SizedBox(width: 6), Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w800))]),
    );
  }
}
