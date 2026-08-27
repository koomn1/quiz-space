import React from 'react';
import { Flame, Gauge, GraduationCap, Sparkles, Trophy, type LucideIcon } from 'lucide-react';

export interface ProfileQuickBadgeRailProps {
  isAr: boolean;
  streak: number;
  quizzesTaken: number;
  accuracy: number;
  quizzesCreated: number;
  isPremium: boolean;
}

type QuickBadge = {
  icon: LucideIcon;
  labelAr: string;
  labelEn: string;
  active: boolean;
  tone: string;
};

export function ProfileQuickBadgeRail({
  isAr,
  streak,
  quizzesTaken,
  accuracy,
  quizzesCreated,
  isPremium,
}: ProfileQuickBadgeRailProps) {
  const badges: QuickBadge[] = [
    { icon: Flame, labelAr: 'سلسلة تعلّم نشطة', labelEn: 'Active learning streak', active: streak >= 3, tone: 'text-orange-300 bg-orange-400/15 border-orange-300/30 shadow-orange-500/20' },
    { icon: Trophy, labelAr: 'محترف الاختبارات', labelEn: 'Quiz specialist', active: quizzesTaken >= 5, tone: 'text-amber-200 bg-amber-400/15 border-amber-300/30 shadow-amber-500/20' },
    { icon: Gauge, labelAr: 'دقة مميزة', labelEn: 'High accuracy', active: accuracy >= 80, tone: 'text-cyan-200 bg-cyan-400/15 border-cyan-300/30 shadow-cyan-500/20' },
    { icon: GraduationCap, labelAr: 'صانع معرفة', labelEn: 'Knowledge creator', active: quizzesCreated >= 3, tone: 'text-violet-200 bg-violet-400/15 border-violet-300/30 shadow-violet-500/20' },
    { icon: Sparkles, labelAr: 'عضو بريميوم', labelEn: 'Premium member', active: isPremium, tone: 'text-fuchsia-200 bg-fuchsia-400/15 border-fuchsia-300/30 shadow-fuchsia-500/20' },
  ];

  return (
    <div
      className="inline-flex max-w-full items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-1.5 shadow-lg backdrop-blur-md"
      role="list"
      aria-label={isAr ? 'شارات الملف المختصرة' : 'Profile quick badges'}
    >
      {badges.map(({ icon: Icon, labelAr, labelEn, active, tone }, index) => (
        <span
          key={labelEn}
          role="listitem"
          title={isAr ? labelAr : labelEn}
          aria-label={`${isAr ? labelAr : labelEn}${active ? '' : isAr ? ' — غير مفعلة بعد' : ' — not unlocked yet'}`}
          className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105 motion-safe:active:scale-95 ${active ? `${tone} shadow-md` : 'border-white/10 bg-white/5 text-slate-500 opacity-55'}`}
          style={{ animationDelay: `${index * 55}ms` }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          {active && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" aria-hidden="true" />}
        </span>
      ))}
    </div>
  );
}
