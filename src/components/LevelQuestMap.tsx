import React, { useState } from 'react';
import { getUserLevelInfo, getDivisionForLevel } from '../lib/levelingSystem';
import TitleAvatarBadge, { TitleAvatarIcon } from './TitleAvatarBadge';
import {
  Sparkles,
  Lock,
  CheckCircle2,
  Trophy,
  Compass,
  Star,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  Info,
} from 'lucide-react';

interface LevelQuestMapProps {
  userXp: number;
  lang?: 'ar' | 'en';
}

interface MapMilestone {
  level: number;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  xPercent: number; // Position percentage horizontally (0-100)
  yPercent: number; // Position percentage vertically (0-100)
  icon: 'compass' | 'book' | 'shield' | 'sparkles' | 'feather' | 'crown' | 'sword' | 'gem' | 'flame' | 'star';
  rewardType: string;
}

const MILESTONES: MapMilestone[] = [
  {
    level: 1,
    titleAr: 'شاطئ المستكشف',
    titleEn: 'Novice Beach',
    descAr: 'نقطة الانطلاق • فتح جميع اختبارات المنصة العامة',
    descEn: 'Starting Point • Full access to public quizzes',
    xPercent: 18,
    yPercent: 82,
    icon: 'compass',
    rewardType: 'بداية الرحلة',
  },
  {
    level: 10,
    titleAr: 'واحة المعرفة',
    titleEn: 'Scholar Oasis',
    descAr: 'إطار المستكشف البرونزي + رتبة باحث نشط',
    descEn: 'Bronze Explorer Frame + Active Scholar Rank',
    xPercent: 28,
    yPercent: 68,
    icon: 'book',
    rewardType: 'إطار برونزي',
  },
  {
    level: 20,
    titleAr: 'مكتبة الأكاديمية العتيقة',
    titleEn: 'Ancient Library',
    descAr: 'إطار الفضة المشعة + رتبة بطل التحديات',
    descEn: 'Radiant Silver Frame + Challenger Rank',
    xPercent: 42,
    yPercent: 72,
    icon: 'shield',
    rewardType: 'إطار فضي',
  },
  {
    level: 35,
    titleAr: 'وادي البلورات الكونية',
    titleEn: 'Cosmic Crystal Vale',
    descAr: 'هالة البروفايل الياقوتية المتوهجة',
    descEn: 'Glowing Ruby Profile Aura',
    xPercent: 54,
    yPercent: 56,
    icon: 'sparkles',
    rewardType: 'هالة نيون',
  },
  {
    level: 50,
    titleAr: 'معبد الفلسفة الإمبراطوري',
    titleEn: 'Golden Philosophy Citadel',
    descAr: 'إطار الذهب النقي الإمبراطوري + لقب فيلسوف الاختبارات',
    descEn: 'Pure Imperial Gold Frame + Philosopher Title',
    xPercent: 48,
    yPercent: 42,
    icon: 'feather',
    rewardType: 'إطار ذهبي نقي',
  },
  {
    level: 65,
    titleAr: 'أكاديمية السادة العظمى',
    titleEn: 'Grand Master Spire',
    descAr: 'منحة 1,000 عملة ذهبية + إطار التاج الملكي',
    descEn: '1,000 Gold Coins + Royal Crown Frame',
    xPercent: 68,
    yPercent: 40,
    icon: 'crown',
    rewardType: '1000 عملة + تاج',
  },
  {
    level: 75,
    titleAr: 'مرصد الحكمة السماوي',
    titleEn: 'Astral Wisdom Observatory',
    descAr: 'ميزة الفصول الدراسية الخاصة + وسام الحكمة الخالدة',
    descEn: 'Private Classroom Rooms + Wisdom Seal',
    xPercent: 62,
    yPercent: 26,
    icon: 'gem',
    rewardType: 'قاعات دراسية',
  },
  {
    level: 90,
    titleAr: 'بوابة النيبولا الكونية',
    titleEn: 'Nebula Stargate',
    descAr: 'إطار النيبولا النجمية المتحرك + لقب حاكم المجرة',
    descEn: 'Animated Nebula Starburst Frame + Overlord Rank',
    xPercent: 78,
    yPercent: 22,
    icon: 'flame',
    rewardType: 'إطار نيبولا متحرك',
  },
  {
    level: 100,
    titleAr: 'قمة أسطورة الفضاء الأعظم (MAX)',
    titleEn: 'Summit of the Grandmaster (MAX)',
    descAr: 'الإطار الألماسي الخارق + لقب أسطورة الفضاء الأعظم + ميدالية الخلود الأكاديمي',
    descEn: 'Celestial Diamond Frame + Grandmaster Title + Immortality Medal',
    xPercent: 86,
    yPercent: 12,
    icon: 'star',
    rewardType: 'التاج الماسي الأبدي',
  },
];

export default function LevelQuestMap({ userXp, lang = 'ar' }: LevelQuestMapProps) {
  const isAr = lang === 'ar';
  const levelInfo = getUserLevelInfo(userXp);
  const userLevel = levelInfo.level;

  const [selectedMilestone, setSelectedMilestone] = useState<MapMilestone>(() => {
    // Default to the milestone closest to user's current level
    const current = MILESTONES.slice().reverse().find((m) => userLevel >= m.level);
    return current || MILESTONES[0];
  });

  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 1.75));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.85));
  const handleResetZoom = () => setZoomLevel(1);

  const mapImageUrl = `${import.meta.env.BASE_URL}images/quizspace_world_progression_map.jpg`;

  return (
    <div className="flex flex-col gap-4 w-full" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Map Bar: Current Progress and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 text-white rounded-2xl p-3 sm:p-4 border border-[#2AC3BB]/30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007472] to-[#2AC3BB] flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0">
            Lv.{userLevel}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">
                {levelInfo.division.titleAr}
              </span>
              <span className="text-xs font-bold text-[#EE8361] bg-[#EE8361]/15 px-2 py-0.5 rounded-full border border-[#EE8361]/30">
                {userLevel >= 100 ? (isAr ? 'الحد الأقصى 🏆' : 'MAX LEVEL') : `${levelInfo.progressPercent}%`}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {userXp.toLocaleString()} XP • {isAr ? 'اضغط على المحطات لعرض مكافآتها' : 'Click nodes to inspect unlocks'}
            </p>
          </div>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title={isAr ? 'تكبير' : 'Zoom in'}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title={isAr ? 'تصغير' : 'Zoom out'}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title={isAr ? 'إعادة ضبط' : 'Reset view'}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Interactive Map Visual Viewport */}
      <div className="relative w-full rounded-3xl overflow-hidden border-2 border-[#2AC3BB]/30 bg-slate-950 shadow-2xl min-h-[420px] sm:min-h-[520px]">
        {/* Zoomable Container */}
        <div
          className="relative w-full h-full min-h-[420px] sm:min-h-[520px] transition-transform duration-300 ease-out origin-center select-none"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Base Illustrated Map Artwork */}
          <img
            src={mapImageUrl}
            alt="QuizSpace Cosmic World Map"
            className="w-full h-full object-cover min-h-[420px] sm:min-h-[520px]"
            loading="eager"
          />

          {/* Vignette & Gradient Overlays */}
          <div className="pointer-events-none absolute inset-0 bg-radial from-transparent via-transparent to-slate-950/60" />

          {/* Interactive Milestone Waypoint Pins on the Map */}
          {MILESTONES.map((milestone) => {
            const isUnlocked = userLevel >= milestone.level;
            const isSelected = selectedMilestone.level === milestone.level;
            const isCurrentNode =
              userLevel >= milestone.level &&
              (milestone.level === 100 || userLevel < (MILESTONES.find((m) => m.level > milestone.level)?.level || 101));

            return (
              <div
                key={milestone.level}
                onClick={() => setSelectedMilestone(milestone)}
                style={{
                  left: `${milestone.xPercent}%`,
                  top: `${milestone.yPercent}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
              >
                {/* Pulsing Radar Aura for Current or Selected Node */}
                {(isCurrentNode || isSelected) && (
                  <span className="absolute -inset-2.5 rounded-full bg-[#2AC3BB] opacity-75 animate-ping" />
                )}

                {/* Node Button / Marker */}
                <div
                  className={`relative flex items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-xl ${
                    isSelected
                      ? 'h-11 w-11 sm:h-12 sm:w-12 border-amber-400 bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 scale-110 ring-4 ring-amber-400/40'
                      : isCurrentNode
                      ? 'h-10 w-10 sm:h-11 sm:w-11 border-[#EE8361] bg-gradient-to-tr from-[#007472] to-[#EE8361] text-white ring-4 ring-[#EE8361]/40'
                      : isUnlocked
                      ? 'h-9 w-9 sm:h-10 sm:w-10 border-[#2AC3BB] bg-gradient-to-tr from-[#007472] to-[#2AC3BB] text-white hover:scale-110'
                      : 'h-8 w-8 sm:h-9 sm:w-9 border-slate-700 bg-slate-900/90 text-slate-500 opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  {milestone.level === 100 ? (
                    <Star className="h-5 w-5 fill-current animate-spin-slow" />
                  ) : isUnlocked ? (
                    <span className="font-mono font-black text-xs leading-none">
                      {milestone.level}
                    </span>
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}

                  {/* Level Pill Label Below Marker */}
                  <span
                    className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.2 rounded-full text-xs font-mono font-black shadow-md ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border border-white'
                        : isUnlocked
                        ? 'bg-[#007472] text-[#FCF6EE] border border-[#2AC3BB]/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-700'
                    }`}
                  >
                    Lv.{milestone.level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Bottom Card: Selected Milestone Inspection */}
        <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-30 bg-slate-900/90 dark:bg-[#072424]/95 backdrop-blur-md rounded-2xl border border-[#2AC3BB]/30 p-3 sm:p-4 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-md ${
                userLevel >= selectedMilestone.level
                  ? 'bg-gradient-to-br from-[#007472] via-[#2AC3BB] to-[#EE8361] text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {selectedMilestone.level === 100 ? '👑' : `Lv.${selectedMilestone.level}`}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-white">
                  {isAr ? selectedMilestone.titleAr : selectedMilestone.titleEn}
                </h4>
                <span className="text-xs font-bold px-2 py-0.2 rounded-md bg-[#2AC3BB]/20 text-[#2AC3BB] border border-[#2AC3BB]/30">
                  {selectedMilestone.rewardType}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
                {isAr ? selectedMilestone.descAr : selectedMilestone.descEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            {userLevel >= selectedMilestone.level ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 px-3 py-1.5 text-xs font-black border border-emerald-500/40">
                <CheckCircle2 className="h-4 w-4" />
                <span>{isAr ? 'مكتمل ومفتوح' : 'Unlocked'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 text-slate-300 px-3 py-1.5 text-xs font-black border border-slate-700">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {isAr ? `يتطلب ليفل ${selectedMilestone.level}` : `Requires Lv.${selectedMilestone.level}`}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
