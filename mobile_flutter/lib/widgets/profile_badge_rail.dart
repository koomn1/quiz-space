import 'package:flutter/material.dart';

import '../models/profile_models.dart';

class ProfileBadgeRail extends StatelessWidget {
  const ProfileBadgeRail({super.key, required this.profile});

  final ProfileModel profile;

  @override
  Widget build(BuildContext context) {
    final badges = <_BadgeData>[
      _BadgeData(Icons.local_fire_department_rounded, profile.completions.length >= 3, 'سلسلة تعلّم نشطة'),
      _BadgeData(Icons.emoji_events_rounded, profile.quizzesTaken >= 5, 'محترف الاختبارات'),
      _BadgeData(Icons.speed_rounded, profile.accuracy >= 80, 'دقة مميزة'),
      _BadgeData(Icons.school_rounded, profile.createdQuizzes.length >= 3, 'صانع معرفة'),
      _BadgeData(Icons.auto_awesome_rounded, profile.isPremium, 'عضو بريميوم'),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1020).withValues(alpha: 0.68),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var index = 0; index < badges.length; index++) ...[
            if (index > 0) const SizedBox(width: 6),
            Semantics(
              label: badges[index].active ? badges[index].label : '${badges[index].label} — غير مفعلة بعد',
              child: Tooltip(
                message: badges[index].label,
                child: _BadgeIcon(data: badges[index]),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BadgeData {
  const _BadgeData(this.icon, this.active, this.label);

  final IconData icon;
  final bool active;
  final String label;
}

class _BadgeIcon extends StatelessWidget {
  const _BadgeIcon({required this.data});

  final _BadgeData data;

  @override
  Widget build(BuildContext context) {
    final color = data.active ? const Color(0xFFE9D5FF) : Colors.white38;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: data.active ? const Color(0xFF7C3AED).withValues(alpha: 0.28) : Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: data.active ? const Color(0xFFC084FC).withValues(alpha: 0.42) : Colors.white.withValues(alpha: 0.12)),
        boxShadow: data.active ? [BoxShadow(color: const Color(0xFFA855F7).withValues(alpha: 0.2), blurRadius: 12)] : null,
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(data.icon, size: 18, color: color),
          if (data.active)
            Positioned(right: 3, top: 3, child: Container(width: 5, height: 5, decoration: const BoxDecoration(color: Color(0xFFD8B4FE), shape: BoxShape.circle))),
        ],
      ),
    );
  }
}
