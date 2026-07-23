import React from 'react';
import { Quiz } from '../types';
import { Star, Play, Share2, Trash2, Tag, Sparkles } from 'lucide-react';
import { UserBadge } from './UserBadge';
import ParallaxTiltCard from './ParallaxTiltCard';

interface InteractiveQuizCardProps {
  quiz: Quiz;
  idx: number;
  isAr: boolean;
  t: any;
  currentUserEmail: string | null | undefined;
  currentUserId: string | null | undefined;
  onStartQuiz: (quizId: string) => void;
  onShareQuiz: (quizId: string, quizTitle: string, quizDescription?: string) => void;
  onEditQuiz?: (quiz: Quiz) => void;
  onViewProfile?: (creatorId: string) => void;
  creatorTier?: 'free' | 'premium' | 'enterprise';
  onDeleteClick?: (quizId: string) => void;
  view?: 'grid' | 'list';
}

export function InteractiveQuizCard({
  quiz,
  idx,
  isAr,
  t,
  currentUserEmail,
  currentUserId,
  onStartQuiz,
  onShareQuiz,
  onEditQuiz,
  onViewProfile,
  creatorTier = 'free',
  onDeleteClick,
  view = 'grid'
}: InteractiveQuizCardProps) {
  const isGuest = !currentUserId || currentUserId.startsWith('user-');
  const canEdit = !isGuest && (
    currentUserEmail === 'yo01009950871@gmail.com' || 
    currentUserEmail === 'adman777888999@gmail.com' || 
    quiz.creatorId === currentUserId
  );

  if (view === 'list') {
    return (
      <ParallaxTiltCard
        idx={idx}
        onClick={() => onStartQuiz(quiz.id)}
        className="glass-card hover:border-primary/45 dark:hover:border-primary/50 p-4 rounded-[20px] hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)] hover:scale-[1.015] duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative"
      >
        <div className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-r from-primary/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 pointer-events-none" />
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
          {/* Left section: Rating & Category Badge */}
          <div className="flex md:flex-col items-center md:items-start gap-1.5 shrink-0 min-w-[120px]">
            {quiz.ratingsCount > 0 ? (
              <div className="flex items-center gap-1 text-[11px] text-amber-500 bg-amber-500/5 dark:bg-amber-950/20 px-2 py-0.5 rounded-lg font-bold border border-amber-500/10">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>{quiz.avgRating} ({quiz.ratingsCount})</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md font-bold">{t?.unrated || (isAr ? 'لم يقيّم' : 'Unrated')}</span>
            )}
            {quiz.category && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-violet-500 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-lg">
                <Tag className="w-2.5 h-2.5" />
                {quiz.category}
              </span>
            )}
          </div>

          {/* Middle section: Title, description, creator name */}
          <div className="flex-1 space-y-1 text-right md:text-left" style={{ textAlign: isAr ? 'right' : 'left' }}>
            <h4 className="font-display font-black text-base text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors duration-200">
              {quiz.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal line-clamp-1">
              {quiz.description || (isAr ? 'لم يتم كتابة وصف.' : 'No description.')}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-bold justify-end md:justify-start">
              <span>{t?.byCreator || (isAr ? 'بواسطة' : 'by')}</span>
              <span 
                onClick={(e) => { e.stopPropagation(); onViewProfile && quiz.creatorId && onViewProfile(quiz.creatorId); }}
                className="font-black text-slate-500 dark:text-slate-350 hover:underline cursor-pointer"
              >
                {quiz.creatorName}
              </span>
              <UserBadge tier={creatorTier} size="sm" showTooltip={false} />
              <span>•</span>
              <span>{t?.playedTimes?.replace('{count}', String(quiz.totalPlays || 0)) || (isAr ? `لُعب ${quiz.totalPlays || 0} مرة` : `Played ${quiz.totalPlays || 0} times`)}</span>
            </div>
          </div>
        </div>

        {/* Right section: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 justify-end mt-2 md:mt-0">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShareQuiz(quiz.id, quiz.title, quiz.description);
              }}
              className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-700"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            {canEdit && (
              <>
                {onEditQuiz && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditQuiz(quiz);
                    }}
                    className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 hover:text-amber-700 transition-colors cursor-pointer border border-amber-200/40 dark:border-amber-800/30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                )}
                {onDeleteClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick(quiz.id);
                    }}
                    className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 hover:text-red-700 transition-colors cursor-pointer border border-red-200/40 dark:border-red-800/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartQuiz(quiz.id);
            }}
            className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-primary to-primary-hover rounded-xl shadow-md shadow-primary/10 hover:scale-103 transition-transform cursor-pointer"
          >
            <span>{t?.startPlayBtn || (isAr ? 'ابدأ اللعب' : 'Start Play')}</span>
            <Play className={`w-3 h-3 fill-white ${isAr ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </ParallaxTiltCard>
    );
  }

  return (
    <ParallaxTiltCard
      idx={idx}
      onClick={() => onStartQuiz(quiz.id)}
      className="glass-card hover:border-transparent p-[1px] rounded-[24px] hover:shadow-[0_30px_60px_-15px_rgba(99,102,241,0.3)] hover:scale-[1.035] dark:hover:shadow-[0_30px_60px_-15px_rgba(124,58,237,0.4)] duration-300 flex flex-col justify-between overflow-hidden group relative"
    >
      {/* Animated Gradient Border */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-violet-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[24px] pointer-events-none before:absolute before:inset-0 before:bg-[conic-gradient(from_0deg_at_50%_50%,#8b5cf6_0%,#3b82f6_33%,#10b981_66%,#8b5cf6_100%)] before:animate-[spin_4s_linear_infinite] before:opacity-0 group-hover:before:opacity-100 before:transition-opacity -z-20"></div>
      
      {/* Inner Card Content Wrapper */}
      <div className="bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-xl h-full w-full rounded-[23px] p-6 flex flex-col justify-between z-10 relative overflow-hidden transition-colors duration-300">
        
        {/* Ambient glowing background on hover inside */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 pointer-events-none" 
        />
        
        <div className="space-y-4" style={{ transform: 'translateZ(25px)', transformStyle: 'preserve-3d' }}>
        
        {/* Header: Title or Badge */}
        <div className="flex items-start justify-between gap-3 flex-row-reverse" dir="ltr" style={{ transform: 'translateZ(30px)' }}>
          <div className="flex items-center gap-1.5 flex-row-reverse flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              {quiz.questions.length} {t?.questionsCount || (isAr ? 'أسئلة' : 'Questions')}
            </span>
            {quiz.category && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-violet-500 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-950/40 px-2.5 py-1 rounded-lg border border-violet-500/10 dark:border-violet-900/40">
                <Tag className="w-3 h-3" />
                {quiz.category}
              </span>
            )}
          </div>
          
          {/* Rating Block */}
          {quiz.ratingsCount > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/5 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg font-bold border border-amber-500/10 dark:border-amber-500/5">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{quiz.avgRating} ({quiz.ratingsCount} {t?.ratingLabel || (isAr ? 'تقييم' : 'Ratings')})</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md font-bold">{t?.unrated || (isAr ? 'غير مقيّم' : 'Unrated')}</span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 block" style={{ textAlign: isAr ? 'right' : 'left', transform: 'translateZ(35px)' }}>
          <h4 className="font-display font-black text-lg text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors duration-200 leading-tight">
            {quiz.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
            {quiz.description || (isAr ? 'لم يتم كتابة وصف توضيحي تفصيلي لهذا الاختبار العام.' : 'No detailed description written for this public quiz.')}
          </p>

          {/* Elegant metadata line placed cleanly under description */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[10.5px] text-slate-450 dark:text-slate-500 font-bold" dir={isAr ? 'rtl' : 'ltr'}>
            <span>{t?.byCreator || (isAr ? 'بواسطة' : 'by')}</span>
            <span 
              onClick={(e) => { e.stopPropagation(); onViewProfile && quiz.creatorId && onViewProfile(quiz.creatorId); }}
              className="font-black text-slate-600 dark:text-slate-350 cursor-pointer hover:underline hover:text-primary transition-all"
            >
              {quiz.creatorName}
            </span>
            <UserBadge tier={creatorTier} size="sm" showTooltip={false} />
            <span className="text-slate-300 dark:text-slate-700 font-normal select-none">•</span>
            <span>{t?.playedTimes?.replace('{count}', String(quiz.totalPlays || 0)) || (isAr ? `لُعب ${quiz.totalPlays || 0} مرة` : `Played ${quiz.totalPlays || 0} times`)}</span>
          </div>
        </div>

      </div>

      {/* Clean, spacious action footer that NEVER overflows horizontally */}
      <div 
        className="border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 w-full"
        style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}
      >
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap" style={{ transform: 'translateZ(10px)' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShareQuiz(quiz.id, quiz.title, quiz.description);
            }}
            className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary hover:scale-105 hover:bg-slate-200 transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700"
            title={t?.shareTooltip || (isAr ? 'مشاركة' : 'Share')}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Admin/Creator Edit and Delete controls */}
          {canEdit && (
            <>
              {onEditQuiz && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditQuiz(quiz);
                  }}
                  className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all hover:scale-105 cursor-pointer border border-amber-200/40 dark:border-amber-800/30"
                  title={t?.editTooltip || (isAr ? 'تعديل' : 'Edit')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
              )}
              {onDeleteClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(quiz.id);
                  }}
                  className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 text-red-655 hover:text-red-750 dark:text-red-400 dark:hover:text-red-350 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-all hover:scale-105 cursor-pointer border border-red-200/40 dark:border-red-800/30"
                  title={t?.deleteTooltip || (isAr ? 'حذف' : 'Delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartQuiz(quiz.id);
          }}
          className="group/play flex items-center justify-center gap-1.5 px-5 h-10 rounded-xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary-hover hover:to-violet-400 text-white font-black text-xs transition-all hover:scale-105 duration-300 shadow-md shadow-primary/20 hover:shadow-primary/40 cursor-pointer active:scale-95 overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/play:translate-y-0 transition-transform duration-300" />
          <span className="relative z-10">{t?.startPlayBtn || (isAr ? 'ابدأ اللعب' : 'Start Play')}</span>
          <Play className={`relative z-10 w-3.5 h-3.5 fill-white ${isAr ? '' : 'rotate-180'} group-hover/play:scale-110 transition-transform`} />
        </button>
      </div>
      </div>
    </ParallaxTiltCard>
  );
}
