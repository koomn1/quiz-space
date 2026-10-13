import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getApiUrl } from '../lib/origin';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { NeumorphismToggle } from './NeumorphismToggle';
import { LiquidGlassSwitch } from './LiquidGlassSwitch';
import Security from '../pages/settings/Security';
import Notifications from '../pages/settings/Notifications';
import { 
  Compass, Layers, Users, Bookmark, Trophy, Award, Sparkles, Search, MessageSquare, 
  Send, ThumbsUp, Trash2, PlusCircle, CheckCircle, Flame, Clock, Heart, Shield, Settings, Pencil,
  Volume2, VolumeX, Eye, BookOpen, Star, HelpCircle, User, Zap, Info, X
} from 'lucide-react';
import { Quiz, QuizCompletion } from '../types';
import { translations } from '../lib/i18n';
import { THEME_PRESETS } from '../lib/themePresets';
import { 
  getCommunityPosts, 
  createCommunityPost, 
  likeCommunityPost, 
  deleteCommunityPost,
  togglePostReaction,
  getReactionsForPosts,
  ReactionType,
  getNotifications, 
  getRecentCompletions,
  getUserProfileStats,
  saveUserProfile,
  getBookmarkedQuizIds,
  addBookmark,
  removeBookmark,
  updateBadgeAndNameColor,
  COSMO_ADMIN_UID,
  updateCommunityPost
} from '../lib/db';
import { PremiumNameTag, NAME_COLOR_PRESETS, availableBadgeTiers, availableNameColors, BADGE_LABELS, BadgeTier, NameColorKey } from './PremiumNameTag';
import { TelegramBadge } from './ProfileStatsView';
import ThreeDIcon from './ThreeDIcon';
import ParallaxTiltCard from './ParallaxTiltCard';
import { UserBadge } from './UserBadge';
import { playChimeSound } from '../lib/chime';
import { useTheme } from '../context/ThemeContext';
import { InteractiveQuizCard } from './InteractiveQuizCard';

export { playChimeSound } from '../lib/chime';

interface ExtraFeaturesProps {
  quizzes: Quiz[];
  onStartQuiz: (id: string) => void;
  lang: 'ar' | 'en';
  userId: string;
  userName: string;
  colorTheme: string;
  setColorTheme: (theme: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  completions: QuizCompletion[];
}

interface CommunityPost {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string | null;
  likes: number;
  likedBy: string[];
  reactions?: Partial<Record<ReactionType, number>>;
  myReaction?: ReactionType | null;
  authorBadgeSymbol?: string;
  authorBadgeColor?: string;
  authorBadgeTier?: BadgeTier;
  authorNameColor?: NameColorKey;
  viewsCount?: number;
  viewers?: any[];
}

// ----------------------------------------------------
// EXPLORE SECTION
// ----------------------------------------------------
export function ExploreSection({ quizzes, onStartQuiz, lang, onViewProfile }: { quizzes: Quiz[], onStartQuiz: (id: string) => void, lang: 'ar' | 'en', onViewProfile?: (creatorId: string) => void }) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const isAr = lang === 'ar';

  const tags = isAr 
    ? ['الذكاء الاصطناعي', 'تطوير الويب', 'الفيزياء', 'التاريخ', 'برمجة'] 
    : ['AI', 'Web Dev', 'Physics', 'History', 'Programming'];

  const filtered = quizzes.filter(q => {
    const isPublic = !q.distributionRouting || q.distributionRouting === 'public';
    if (!isPublic) return false;
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) || 
                          (q.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || 
                       q.title.toLowerCase().includes(selectedTag.toLowerCase()) || 
                       (q.description || '').toLowerCase().includes(selectedTag.toLowerCase());
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-8 animate-fade-in" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary dark:text-primary-light">🧭</span>
            <span>{isAr ? 'استكشف الاختبارات الكوكبية' : 'Explore Scientific Galaxies'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            {isAr ? 'تصفح وقارن واكتشف اختبارات عامة منتقاة بعناية لزيادة خبرتك المعرفية وتحدي أصدقائك.' : 'Browse, play & share public challenges curated by educators worldwide.'}
          </p>
        </div>
        
        <div className="relative w-full md:w-88">
          <input 
            type="text" 
            placeholder={isAr ? 'ابحث باسم الاختبار أو مجاله...' : 'Search quizzes by title or topic...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl py-3 px-4 pr-11 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
          />
          <Search className="w-4.5 h-4.5 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute top-3 left-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Tags Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button 
          onClick={() => setSelectedTag(null)}
          className={`uipro-pill-badge py-2 px-4 text-xs font-black transition-all cursor-pointer ${
            !selectedTag 
              ? 'bg-primary text-white shadow-md shadow-primary/25 scale-103' 
              : 'bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/40 hover:text-primary'
          }`}
        >
          {isAr ? '🌐 الكل' : 'All'}
        </button>
        {tags.map(tag => (
          <button 
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`uipro-pill-badge py-2 px-4 text-xs font-black transition-all cursor-pointer ${
              selectedTag === tag 
                ? 'bg-primary text-white shadow-md shadow-primary/25 scale-103' 
                : 'bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/40 hover:text-primary'
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((quiz, idx) => (
          <InteractiveQuizCard
            key={quiz.id}
            quiz={quiz}
            idx={idx}
            isAr={isAr}
            t={translations[lang]}
            currentUserEmail={undefined}
            currentUserId={undefined}
            onStartQuiz={onStartQuiz}
            onShareQuiz={(id, title, desc) => {
              if (navigator.share) {
                navigator.share({ title, text: desc, url: window.location.href });
              }
            }}
            onViewProfile={onViewProfile}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3 max-w-md mx-auto w-full p-8">
            <span className="text-4xl block">🔍</span>
            <h4 className="font-display font-black text-sm text-slate-800 dark:text-slate-200">
              {isAr ? 'لم نجد أي اختبار يطابق هذا البحث' : 'No matching quizzes found'}
            </h4>
            <p className="text-xs text-slate-400">
              {isAr ? 'جرّب البحث بكلمات أخرى أو اختر وسمًا مختلفًا من الأعلى.' : 'Try different search keywords or select a different tag.'}
            </p>
            <button type="button" onClick={() => { setSearch(''); setSelectedTag(null); }} className="uipro-btn-tactile text-xs font-black text-primary hover:underline">
              {isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// CATEGORIES SECTION
// ----------------------------------------------------
export function CategoriesSection({ quizzes, onStartQuiz, lang, onViewProfile }: { quizzes: Quiz[], onStartQuiz: (id: string) => void, lang: 'ar' | 'en', onViewProfile?: (creatorId: string) => void }) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const isAr = lang === 'ar';
  const publicQuizzes = quizzes.filter(q => !q.distributionRouting || q.distributionRouting === 'public');

  const categories = [
    { id: 'ai', titleAr: 'الذكاء الاصطناعي', titleEn: 'AI & Data Science', iconName: 'support', color: 'from-purple-500 to-indigo-600', keywords: ['ai', 'intelligence', 'artificial', 'openrouter', 'gpt', 'ذكاء'] },
    { id: 'web', titleAr: 'تطوير الويب وبرمجة المواقع', titleEn: 'Web Development', iconName: 'explore', color: 'from-blue-500 to-cyan-500', keywords: ['web', 'html', 'css', 'javascript', 'ويب', 'برمجة'] },
    { id: 'physics', titleAr: 'الفيزياء وعالم الفلك', titleEn: 'Physics & Astronomy', iconName: 'fire', color: 'from-rose-500 to-amber-500', keywords: ['physics', 'space', 'astrophysics', 'فيزياء', 'فلك', 'أكاديمي'] },
    { id: 'history', titleAr: 'التاريخ والثقافة العامة', titleEn: 'History & Culture', iconName: 'leaderboard', color: 'from-amber-500 to-orange-600', keywords: ['history', 'dates', 'culture', 'تاريخ', 'ثقافة'] },
    { id: 'general', titleAr: 'أسئلة عامة ومتنوعة', titleEn: 'General Trivia', iconName: 'info', color: 'from-teal-500 to-emerald-600', keywords: [] }
  ];

  const getFilteredQuizzes = (catId: string) => {
    const catObj = categories.find(c => c.id === catId);
    if (!catObj) return publicQuizzes;
    if (catId === 'general') {
      return publicQuizzes.filter(q => {
        const titleStr = q.title.toLowerCase() + ' ' + (q.description || '').toLowerCase();
        return !categories.slice(0, 4).some(c => c.keywords.some(kw => titleStr.includes(kw)));
      });
    }
    return publicQuizzes.filter(q => {
      const titleStr = q.title.toLowerCase() + ' ' + (q.description || '').toLowerCase();
      return catObj.keywords.some(kw => titleStr.includes(kw));
    });
  };

  const activeCategoryQuizzes = selectedCat ? getFilteredQuizzes(selectedCat) : publicQuizzes;
  const activeCategoryObj = categories.find(c => c.id === selectedCat);

  return (
    <div className="space-y-8 animate-fade-in" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div>
        <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-primary/10 text-primary dark:text-primary-light">🗂️</span>
          <span>{isAr ? 'الفئات والمسارات الأكاديمية' : 'Academic Classifications'}</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
          {isAr ? 'تصفح مسارات علمية حية ومنتقاة بعناية لزيادة تحصيلك المعرفي والتفوق الأكاديمي.' : 'Browse selective knowledge paths targeted to maximize scientific achievements.'}
        </p>
      </div>

      {/* Categories Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {categories.map((cat, idx) => {
          const matchedCount = getFilteredQuizzes(cat.id).length;
          const isSelected = selectedCat === cat.id;

          return (
            <ParallaxTiltCard key={cat.id} 
              idx={idx}
              onClick={() => { playChimeSound('click'); setSelectedCat(isSelected ? null : cat.id); }}
              className={`uipro-clay-card relative overflow-hidden p-5 rounded-[26px] cursor-pointer border transition-all ${
                isSelected 
                  ? 'bg-gradient-to-br from-primary/15 via-violet-500/10 to-indigo-600/10 border-primary shadow-xl ring-2 ring-primary/40' 
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-primary/40'
              }`}
            >
              <div className="space-y-3.5">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white font-bold shadow-md shadow-primary/20`}>
                  <ThreeDIcon name={cat.iconName} className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <h3 className={`font-display font-black text-sm leading-tight ${isSelected ? 'text-primary dark:text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {isAr ? cat.titleAr : cat.titleEn}
                  </h3>
                  <span className="uipro-pill-badge bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px]">
                    {matchedCount} {isAr ? 'اختبار' : 'quizzes'}
                  </span>
                </div>
              </div>
            </ParallaxTiltCard>
          );
        })}
      </div>

      {/* Category Quizzes Details */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <h3 className="font-display font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <span>💎</span>
            <span>{isAr ? 'الاختبارات المتوفرة:' : 'Quizzes in this track:'}</span>
            {activeCategoryObj && (
              <span className="uipro-pill-badge bg-primary/15 text-primary dark:text-primary-light border border-primary/25">
                {isAr ? activeCategoryObj.titleAr : activeCategoryObj.titleEn}
              </span>
            )}
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {activeCategoryQuizzes.length} {isAr ? 'اختبار متاح' : 'quizzes available'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCategoryQuizzes.map((quiz, idx) => (
            <InteractiveQuizCard
              key={quiz.id}
              quiz={quiz}
              idx={idx}
              isAr={isAr}
              t={translations[lang]}
              currentUserEmail={undefined}
              currentUserId={undefined}
              onStartQuiz={onStartQuiz}
              onShareQuiz={(id, title, desc) => {
                if (navigator.share) {
                  navigator.share({ title, text: desc, url: window.location.href });
                }
              }}
              onViewProfile={onViewProfile}
            />
          ))}
          {activeCategoryQuizzes.length === 0 && (
            <p className="text-xs text-slate-400 col-span-full py-12 select-none bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center font-bold">
              {isAr ? 'لا توجد اختبارات مضافة في هذه الفئة حالياً. كن أول من ينشئ اختباراً فيها!' : 'No quizzes in this category found yet. Create one now!'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// COMMUNITY / DISCUSSION SECTION
// ----------------------------------------------------
function CommunityPostCard({
  post,
  userId,
  userName,
  userEmail,
  isAdmin,
  isAr,
  handleReact,
  onDelete,
  onEdit,
  canEdit,
  canDelete,
  onOpenInsights,
  onViewRecorded
}: {
  post: CommunityPost;
  userId: string;
  userName: string;
  userEmail?: string;
  isAdmin: boolean;
  isAr: boolean;
  handleReact: (postId: string, reaction: ReactionType, e: React.MouseEvent) => void;
  onDelete: (postId: string) => void;
  onEdit: (postId: string, text: string) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
  onOpenInsights?: (post: CommunityPost) => void;
  onViewRecorded?: (postId: string, viewsCount: number) => void;
}) {
  const hasTriggeredView = React.useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(post.text);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!post.id || hasTriggeredView.current) return;
    hasTriggeredView.current = true;

    const recordView = async () => {
      try {
        const activeUserId = userId || 'user-guest';
        const activeUserName = userName || (isAr ? 'زائر متميز' : 'Guest Scholar');
        const { data: postData, error: readError } = await supabase
          .from('community_posts')
          .select('views_count, viewers')
          .eq('id', post.id)
          .single();
        if (readError) throw readError;
        if (postData) {
          const existingViewers = Array.isArray(postData.viewers) ? postData.viewers : [];
          const alreadyRecorded = existingViewers.some((viewer: any) => viewer?.userId === activeUserId);
          if (alreadyRecorded) {
            onViewRecorded?.(post.id, Number(postData.views_count || 0));
            return;
          }
          const viewer = { userId: activeUserId, userName: activeUserName, createdAt: new Date().toISOString() };
          const nextViewers = [...existingViewers, viewer];
          const newViews = Number(postData.views_count || 0) + 1;
          const { error: updateError } = await supabase
            .from('community_posts')
            .update({ views_count: newViews, viewers: nextViewers })
            .eq('id', post.id);
          if (updateError) throw updateError;
          onViewRecorded?.(post.id, newViews);
        }
      } catch (err) {
        console.warn('Failed to record post view:', err);
      }
    };
    recordView();
  }, [post.id, userId, userName, isAr]);

  return (
    <div 
      className="uipro-clay-card p-6 rounded-[28px] space-y-4 text-right relative overflow-hidden"
    >
      <div className="flex items-center justify-between text-right" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase sm:text-xs">
            {post.authorName ? post.authorName.substring(0, 1) : '👤'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-row-reverse justify-end">
              <PremiumNameTag
                name={post.authorName}
                isPremium={true}
                nameColor={post.authorNameColor}
                badgeTier={post.authorBadgeTier}
                badgeSize="sm"
                className="text-xs font-black text-slate-800 dark:text-white"
              />
            </div>
            <p className="text-[9px] text-slate-500 font-bold mt-0.5">
              {new Date(post.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1">
            {canEdit && !isEditing && (
              <button type="button" onClick={() => { setDraftText(post.text); setIsEditing(true); }}
                className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
                title={isAr ? 'تعديل خلال دقيقتين' : 'Edit within two minutes'} aria-label={isAr ? 'تعديل المنشور' : 'Edit post'}>
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={() => onDelete(post.id)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
                title={isAr ? 'حذف' : 'Delete'} aria-label={isAr ? 'حذف المنشور' : 'Delete post'}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={3} maxLength={5000} autoFocus
            className="w-full rounded-2xl border border-primary/40 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            dir={isAr ? 'rtl' : 'ltr'} aria-label={isAr ? 'نص المنشور' : 'Post text'} />
          <div className="flex items-center justify-end gap-2" dir={isAr ? 'rtl' : 'ltr'}>
            <button type="button" onClick={() => setIsEditing(false)} className="min-h-10 rounded-xl px-3 text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="button" disabled={!draftText.trim() || isSaving} onClick={async () => {
              if (!draftText.trim() || isSaving) return;
              setIsSaving(true);
              try { await onEdit(post.id, draftText.trim()); setIsEditing(false); } finally { setIsSaving(false); }
            }} className="min-h-10 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 text-[11px] font-bold text-white hover:bg-primary-hover disabled:opacity-50 cursor-pointer">
              <CheckCircle className="w-3.5 h-3.5" />
              {isSaving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديل' : 'Save edit')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed text-right font-semibold" style={{ textAlign: isAr ? 'right' : 'left' }}>
          {post.text}
          {post.updatedAt && <span className="block mt-1 text-[10px] font-medium text-slate-400">{isAr ? 'تم التعديل' : 'Edited'}</span>}
        </p>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800/50 pt-2 flex w-full min-w-0 flex-wrap items-center justify-start gap-2" dir={isAr ? 'rtl' : 'ltr'}>
        <ReactionButton post={post} isAr={isAr} onReact={(reaction, e) => handleReact(post.id, reaction, e)} />

        {isAdmin && (
          <button 
            onClick={() => onOpenInsights && onOpenInsights(post)}
            className="flex items-center gap-1.5 text-[10.5px] font-medium py-1 px-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-hover hover:border-primary/20 cursor-pointer"
            title={isAr ? 'عرض المشاهدات' : 'View counts'}
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>{post.viewsCount || 0}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// REACTION PICKER — six reaction types instead of a single like.
// Hover (desktop) or long-press (mobile) reveals the picker; a quick tap
// toggles the user's current reaction (or defaults to 'like').
// ----------------------------------------------------
const REACTION_META: Record<ReactionType, { emoji: string; labelAr: string; labelEn: string; activeClasses: string }> = {
  like:  { emoji: '👍', labelAr: 'إعجاب',       labelEn: 'Like',  activeClasses: 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-500 dark:text-blue-400' },
  love:  { emoji: '❤️', labelAr: 'حب',          labelEn: 'Love',  activeClasses: 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-500 dark:text-rose-400' },
  laugh: { emoji: '😂', labelAr: 'ضحك',         labelEn: 'Haha',  activeClasses: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-500 dark:text-amber-400' },
  wow:   { emoji: '😮', labelAr: 'إعجاب شديد',   labelEn: 'Wow',   activeClasses: 'bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-500/30 text-purple-500 dark:text-purple-400' },
  sad:   { emoji: '😢', labelAr: 'حزن',          labelEn: 'Sad',   activeClasses: 'bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30 text-sky-500 dark:text-sky-400' },
  fire:  { emoji: '🔥', labelAr: 'نار',          labelEn: 'Fire',  activeClasses: 'bg-orange-50 dark:bg-orange-500/15 border-orange-200 dark:border-orange-500/30 text-orange-500 dark:text-orange-400' },
};
const REACTION_ORDER: ReactionType[] = ['like', 'love', 'laugh', 'wow', 'sad', 'fire'];

function ReactionButton({ post, isAr, onReact }: {
  post: CommunityPost;
  isAr: boolean;
  onReact: (reaction: ReactionType, e: React.MouseEvent) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (showPicker && pickerRef.current) {
      gsap.fromTo(pickerRef.current.children,
        { scale: 0, y: 8, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.25, stagger: 0.03, ease: 'back.out(2.5)' }
      );
    }
  }, [showPicker]);

  const counts = post.reactions || {};
  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0) || post.likes || 0;
  const topReactions = REACTION_ORDER.filter(r => (counts[r] || 0) > 0)
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
    .slice(0, 3);
  const myReaction = post.myReaction;
  const buttonMeta = myReaction ? REACTION_META[myReaction] : null;

  const startLongPress = () => {
    longPressTimer.current = window.setTimeout(() => setShowPicker(true), 400);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowPicker(true)}
      onMouseLeave={() => setShowPicker(false)}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
    >
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full mb-2 flex max-w-[min(90vw,260px)] flex-wrap items-center justify-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 py-1.5 shadow-xl z-20"
          style={{ [isAr ? 'right' : 'left']: 0 }}
          onMouseLeave={() => setShowPicker(false)}
        >
          {REACTION_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              title={isAr ? REACTION_META[r].labelAr : REACTION_META[r].labelEn}
              onClick={(e) => { onReact(r, e); setShowPicker(false); }}
              className="text-xl leading-none p-1 rounded-full hover:scale-125 hover:-translate-y-1 transition-transform cursor-pointer"
            >
              {REACTION_META[r].emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => onReact(myReaction || 'like', e)}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[10.5px] font-semibold transition-all cursor-pointer ${
            buttonMeta
              ? buttonMeta.activeClasses
              : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:border-primary/40'
          }`}
          title={isAr ? 'إضافة إعجاب' : 'Add like'}
        >
          <span className="text-sm leading-none">{buttonMeta?.emoji || '👍'}</span>
          <span>{isAr ? 'تفاعل' : 'React'}</span>
          <span className="min-w-4 text-center">{total}</span>
        </button>
        {REACTION_ORDER.map((r) => {
          const count = counts[r] || 0;
          const meta = REACTION_META[r];
          const isActive = myReaction === r;
          return (
            <button
              key={r}
              type="button"
              onClick={(e) => onReact(r, e)}
              title={isAr ? meta.labelAr : meta.labelEn}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                isActive
                  ? meta.activeClasses
                  : 'bg-slate-50/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-sm leading-none">{meta.emoji}</span>
              <span className="tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CommunitySection({ lang, userId, userName, userEmail, userRole, isGuest = false, isAdmin: isAdminProp }: { lang: 'ar' | 'en', userId: string, userName: string, userEmail?: string, userRole?: string, isGuest?: boolean, isAdmin?: boolean }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const postsRef = useRef<CommunityPost[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ badgeTier?: BadgeTier; nameColor?: NameColorKey } | null>(null);
  const isAr = lang === 'ar';

  const [selectedPostForInsights, setSelectedPostForInsights] = useState<CommunityPost | null>(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const loadRequestRef = useRef(0);
  const pendingReactionIds = useRef<Set<string>>(new Set());

  const handleOpenInsights = (post: CommunityPost) => {
    const isAdmin = isAdminProp === true;
    if (!isAdmin) {
      alert(isAr ? 'عذراً، هذه الإحصائيات التفصيلية للمشاهدات متاحة فقط للمشرف الإداري.' : 'Sorry, detailed viewer insights are only available to admins.');
      return;
    }
    setSelectedPostForInsights(post);
    setIsInsightsOpen(true);
  };

  const [activeSubTab, setActiveSubTab] = useState<'discussions' | 'solvers'>('discussions');
  const [recentSolvers, setRecentSolvers] = useState<QuizCompletion[]>([]);
  const [loadingSolvers, setLoadingSolvers] = useState(false);

  useEffect(() => {
    if (activeSubTab !== 'solvers') return;
    async function loadSolvers() {
      setLoadingSolvers(true);
      try {
        const data = await getRecentCompletions(40);
        setRecentSolvers(data || []);
      } catch (err) {
        console.warn('Failed to load recent solvers in community:', err);
      } finally {
        setLoadingSolvers(false);
      }
    }
    loadSolvers();
  }, [activeSubTab]);

  // Load current user profile for badges attachment
  useEffect(() => {
    if (!userId) return;
    async function fetchUserBadge() {
      try {
        const stats = await getUserProfileStats(userId);
        if (stats) {
          setCurrentUserProfile({
            badgeTier: stats.badgeTier || 'none',
            nameColor: stats.nameColor || 'default'
          });
        }
      } catch (e) {
        console.warn('Failed to load user badges for posts:', e);
      }
    }
    fetchUserBadge();
  }, [userId]);

  // Retrieve community posts
  useEffect(() => {
    async function loadPosts() {
      const requestId = ++loadRequestRef.current;
      try {
        const fetched = await getCommunityPosts();
        const ids = (fetched || []).map((p: any) => p.id);
        const reactionsMap = await getReactionsForPosts(ids, userId);
        if (requestId !== loadRequestRef.current) return;
        const merged = (fetched || []).map((p: any) => {
          const local = postsRef.current.find(existing => existing.id === p.id);
          // Never let a polling response that started before a click overwrite
          // the optimistic/server-confirmed reaction currently on screen.
          return pendingReactionIds.current.has(p.id) && local
            ? local
            : {
                ...p,
                reactions: reactionsMap[p.id]?.counts || {},
                myReaction: reactionsMap[p.id]?.myReaction || null,
              };
        });
        setPosts(merged);
        postsRef.current = merged;
      } catch (error) {
        if (requestId === loadRequestRef.current) console.error('Failed to load community posts:', error);
      }
    }
    loadPosts();

    // Set polling interval for live update experience
    const interval = setInterval(loadPosts, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const handlePublish = async () => {
    if (!inputText.trim() || isPublishing) return;
    if (isGuest) {
      alert(isAr ? 'سجل الدخول للاستمرار.' : 'Sign in to continue.');
      return;
    }
    setIsPublishing(true);
    playChimeSound('click');

    const authName = userName || (isAr ? 'طالب متميز' : 'Star Scholar');
    const bTier = currentUserProfile?.badgeTier || 'none';
    const bColor = currentUserProfile?.nameColor || 'default';

    try {
      const created = await createCommunityPost(
        inputText.trim(),
        userId || 'guest',
        authName,
        undefined,
        undefined,
        bTier,
        bColor
      );

      if (created) {
        setPosts(prev => [created, ...prev]);
        setInputText('');
      }


    } catch (e) {
      console.error('Failed to write community post:', e);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReact = async (postId: string, reaction: ReactionType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      alert(isAr ? 'سجل الدخول للاستمرار.' : 'Sign in to continue.');
      return;
    }
    playChimeSound('click');

    const targetPost = postsRef.current.find(p => p.id === postId) || posts.find(p => p.id === postId);
    if (!targetPost) return;
    pendingReactionIds.current.add(postId);

    const prevReaction = targetPost.myReaction || null;
    const prevCounts = { ...(targetPost.reactions || {}) };
    const nextCounts = { ...prevCounts };
    let nextMyReaction: ReactionType | null = reaction;

    // Optimistic local update, mirroring the exact toggle/replace logic the
    // toggle_post_reaction() RPC performs server-side.
    if (prevReaction === reaction) {
      nextCounts[reaction] = Math.max(0, (nextCounts[reaction] || 1) - 1);
      nextMyReaction = null;
    } else {
      if (prevReaction) {
        nextCounts[prevReaction] = Math.max(0, (nextCounts[prevReaction] || 1) - 1);
      }
      nextCounts[reaction] = (nextCounts[reaction] || 0) + 1;
    }

    const nextTotal = Object.values(nextCounts).reduce((sum, n) => sum + (n || 0), 0);

    setPosts(prev => {
      const next = prev.map(p => p.id === postId
        ? { ...p, reactions: nextCounts, myReaction: nextMyReaction, likes: nextTotal }
        : p
      );
      postsRef.current = next;
      return next;
    });

    try {
      const result = await togglePostReaction(postId, reaction);
      setPosts(prev => {
        const next = prev.map(p => {
          if (p.id === postId) {
            const total = Object.values(result.counts).reduce((sum, n) => sum + (n || 0), 0);
            return { ...p, reactions: result.counts, myReaction: result.myReaction, likes: total };
          }
          return p;
        });
        postsRef.current = next;
        return next;
      });
      pendingReactionIds.current.delete(postId);
    } catch (err) {
      console.warn('Reaction update on server failed:', err);
      // Roll back the optimistic update on failure.
      setPosts(prev => {
        const next = prev.map(p => {
          if (p.id === postId) {
            const total = Object.values(prevCounts).reduce((sum, n) => sum + (n || 0), 0);
            return { ...p, reactions: prevCounts, myReaction: prevReaction, likes: total };
          }
          return p;
        });
        postsRef.current = next;
        return next;
      });
      pendingReactionIds.current.delete(postId);
    }
  };

  return (
    <div className="space-y-6" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white">{isAr ? '💬 مجتمع الفضاء الأكاديمي' : 'Academic Community Hub'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isAr ? 'تواصل وتفاعل مع المعلمين والطلاب وتعرف على المتفوقين وحلول الاختبارات لحظياً.' : 'Connect & interact with students and educators, view recent quiz solvers and high scores live.'}</p>
        </div>

        {/* Sub-Tabs switcher */}
        <div className="inline-flex p-1.5 rounded-2xl uipro-glass-panel bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shrink-0 self-start sm:self-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('discussions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'discussions'
                ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isAr ? 'النقاشات والمنشورات' : 'Discussions'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('solvers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'solvers'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>{isAr ? 'سجل المتفوقين والحلول 🏆' : 'Live Solvers 🏆'}</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'solvers' ? (
        <div className="space-y-4">
          <div className="uipro-clay-card bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-primary/10 border border-amber-500/20 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">
                  {isAr ? 'لوحة المتفوقين وأحدث المحاولات المكتملة' : 'Live Solvers & Hall of Fame'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'يتم تحديث هذه القائمة فوراً عند انتهاء أي طالب أو زائر من حل اختبار على المنصة.' : 'Real-time record of all participants who completed quizzes on Quiz Space.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                setLoadingSolvers(true);
                try {
                  const data = await getRecentCompletions(40);
                  setRecentSolvers(data || []);
                } finally {
                  setLoadingSolvers(false);
                }
              }}
              className="uipro-pill-badge text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 cursor-pointer shrink-0"
            >
              {isAr ? 'تحديث 🔄' : 'Refresh 🔄'}
            </button>
          </div>

          {loadingSolvers ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <div className="inline-block animate-spin text-amber-500"><Trophy className="w-6 h-6" /></div>
              <p className="text-xs font-bold">{isAr ? 'جاري تحميل سجل المتفوقين...' : 'Loading solvers...'}</p>
            </div>
          ) : recentSolvers.length === 0 ? (
            <div className="uipro-clay-card rounded-3xl p-10 text-center space-y-3">
              <Trophy className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'لا توجد محاولات مكتملة مسجلة بعد' : 'No recorded completions yet'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isAr ? 'كن الأول في حل أي اختبار وستظهر نتيجتك فوراً في هذه اللوحة أمام كل رواد المجتمع!' : 'Be the first to solve a quiz and your score will appear here for all community members!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentSolvers.map((solver, index) => {
                const isPerfect = solver.totalQuestions > 0 && solver.score === solver.totalQuestions;
                const percentage = solver.totalQuestions > 0 ? Math.round((solver.score / solver.totalQuestions) * 100) : 0;
                return (
                  <div
                    key={solver.id || `${solver.takerId}-${index}`}
                    className="uipro-clay-card p-4 rounded-2xl flex items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        index === 0
                          ? 'bg-amber-400 text-white shadow-md'
                          : index === 1
                          ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {index < 3 ? '👑' : `#${index + 1}`}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-black text-xs text-slate-800 dark:text-slate-100 truncate">
                            {solver.takerName || (isAr ? 'طالب متميز' : 'Student')}
                          </p>
                          {isPerfect && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 font-black">
                              {isAr ? 'علامة كاملة 🌟' : 'Perfect 🌟'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={solver.quizTitle}>
                          {isAr ? 'حل: ' : 'Solved: '}<span className="font-bold text-slate-700 dark:text-slate-300">{solver.quizTitle || (isAr ? 'اختبار' : 'Quiz')}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {solver.createdAt ? new Date(solver.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                        isPerfect
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : percentage >= 70
                          ? 'bg-primary/15 text-primary'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {solver.score} / {solver.totalQuestions} ({percentage}%)
                      </span>
                      {solver.quizId && (
                        <a
                          href={`#/quiz/${solver.quizId}`}
                          className="text-[11px] font-bold text-primary hover:underline"
                        >
                          {isAr ? 'خوض الاختبار ⚡' : 'Try Quiz ⚡'}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Publish Feed Form */}
          {userId && (
            <div className="uipro-clay-card p-5 space-y-4 rounded-3xl relative overflow-hidden">
              <textarea 
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isAr ? 'شارك رأيك في الموقع، أسئلتك، أو تجربتك هنا...' : 'Share your opinion about the site, questions or experience...'}
                className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right resize-none font-medium"
                style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                  <span>💡</span>
                  <span>{isAr ? 'منشورك سيظهر لجميع أعضاء مجتمع الفضاء الأكاديمي.' : 'Your post will be visible to all academic community members.'}</span>
                </p>
                <button 
                  onClick={handlePublish}
                  disabled={!inputText.trim() || isPublishing}
                  className="uipro-btn-tactile px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isAr ? 'نشر الآن 🚀' : 'Post Now 🚀'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Discussion List */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    {isAr ? 'لا توجد منشورات حتى الآن' : 'No posts yet'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {isAr 
                      ? 'المجتمع فارغ حالياً من المنشورات الاصطناعية! شارك أفكارك، تجاربك، أو استفساراتك لتكون أول من يكتب هنا 💬✨' 
                      : 'The community has no artificial posts! Be the first to share your thoughts, questions, or quiz scores live 💬✨'}
                  </p>
                </div>
              </div>
            ) : (
              posts.filter(post => String(post.text || '').trim()).map(post => {
                const isAdmin = isAdminProp === true;
                const isSuperAdmin = userId === COSMO_ADMIN_UID;
                const isOwner = post.authorId === userId;
                const withinEditWindow = Date.now() - new Date(post.createdAt).getTime() <= 2 * 60 * 1000;
                const canModerate = isAdmin || isSuperAdmin;
                return (
                  <CommunityPostCard
                    key={post.id}
                    post={post}
                    userId={userId}
                    userName={userName}
                    userEmail={userEmail}
                    isAdmin={canModerate}
                    isAr={isAr}
                    handleReact={handleReact}
                    canEdit={canModerate || (isOwner && withinEditWindow)}
                    canDelete={canModerate || (isOwner && withinEditWindow)}
                    onEdit={async (postId, text) => {
                      try {
                        const updated = await updateCommunityPost(postId, text);
                        setPosts(prev => {
                          const next = prev.map(item => item.id === postId ? { ...item, ...updated } : item);
                          postsRef.current = next;
                          return next;
                        });
                      } catch (err) {
                        console.error('Failed to edit community post:', err);
                        alert(isAr ? 'تعذر تعديل المنشور. ربما انتهت نافذة الدقيقتين.' : 'The post could not be edited. The two-minute window may have expired.');
                        throw err;
                      }
                    }}
                    onDelete={async (postId) => {
                      if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المنشور؟' : 'Are you sure you want to delete this post?')) {
                        try {
                          await deleteCommunityPost(postId);
                          setPosts(prev => {
                            const next = prev.filter(p => p.id !== postId);
                            postsRef.current = next;
                            return next;
                          });
                        } catch (err) {
                          console.error('Failed to delete post on server:', err);
                          alert(isAr ? 'تعذر حذف المنشور. تحقق من الصلاحية أو نافذة الدقيقتين.' : 'The post could not be deleted. Check your permission or the two-minute window.');
                        }
                      }
                    }}
                    onOpenInsights={handleOpenInsights}
                    onViewRecorded={(postId, viewsCount) => {
                      setPosts(prev => prev.map(item => item.id === postId ? { ...item, viewsCount } : item));
                      setSelectedPostForInsights(prev => prev?.id === postId ? { ...prev, viewsCount } : prev);
                    }}
                  />
                );
              })
            )}
          </div>
        </>
      )}

      {/* Viewer Insights Modal */}
      
        {isInsightsOpen && selectedPostForInsights && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
            <div
              
              
              
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#b175ff] animate-pulse" />
                  <h3 className="font-display font-black text-sm text-slate-800 dark:text-white">
                    {isAr ? 'تفاصيل وإحصائيات المشاهدات 👁️' : 'Detailed Message Viewers 👁️'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsInsightsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 max-h-[350px] overflow-y-auto space-y-3.5" dir={isAr ? 'rtl' : 'ltr'}>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-extrabold tracking-wide uppercase">
                  {isAr ? `إجمالي المشاهدات الفريدة: ${selectedPostForInsights.viewsCount || 0}` : `Total Unique Viewers: ${selectedPostForInsights.viewsCount || 0}`}
                </p>

                {(!selectedPostForInsights.viewers || selectedPostForInsights.viewers.length === 0) ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-slate-950/20 rounded-2xl">
                    {isAr ? 'لا توجد مشاهدات مسجلة لهذا المنشور بعد.' : 'No recorded views for this post yet.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedPostForInsights.viewers.map((viewer: any, idx: number) => {
                      const timeStr = new Date(viewer.createdAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                      const dateStr = new Date(viewer.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
                      return (
                        <div 
                           key={viewer.userId || idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white border-2 border-[#b175ff]/30 shadow-xs">
                              {viewer.userName ? viewer.userName.substring(0, 1) : '👤'}
                            </div>
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                              {viewer.userName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-semibold">
                            {dateStr} - {timeStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsInsightsOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      
    </div>
  );
}

// ----------------------------------------------------
// BOOKMARKS SECTION
// ----------------------------------------------------
export function BookmarksSection({ quizzes, onStartQuiz, lang, onViewProfile, userId }: { quizzes: Quiz[], onStartQuiz: (id: string) => void, lang: 'ar' | 'en', onViewProfile?: (creatorId: string) => void, userId: string }) {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const isAr = lang === 'ar';

  useEffect(() => {
    if (!userId) { setBookmarkedIds([]); return; }
    getBookmarkedQuizIds(userId).then(setBookmarkedIds).catch(() => setBookmarkedIds([]));
  }, [userId]);

  const toggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playChimeSound('click');
    if (!userId) return;
    const isBookmarked = bookmarkedIds.includes(id);
    const updated = isBookmarked ? bookmarkedIds.filter(bId => bId !== id) : [...bookmarkedIds, id];
    setBookmarkedIds(updated); // optimistic
    try {
      if (isBookmarked) {
        await removeBookmark(userId, id);
      } else {
        await addBookmark(userId, id);
      }
    } catch (err) {
      console.error('Failed to sync bookmark:', err);
      setBookmarkedIds(bookmarkedIds); // revert on failure
    }
  };

  const savedQuizzes = quizzes.filter(q => bookmarkedIds.includes(q.id));

  return (
    <div className="space-y-6" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white flex items-center gap-2">
            <span>🔖</span>
            <span>{isAr ? 'مسابقاتك المفضلة والمحفوظة' : 'My Pinned Bookmarks'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? 'سرعة الوصول للاختبارات التي تود تكرار حلها ومراجعة أسئلتها الصعبة.' : 'Fast-track your access to planetary examinations you wish to repeat or memorize.'}
          </p>
        </div>
        {savedQuizzes.length > 0 && (
          <div className="uipro-pill-badge bg-primary/10 text-primary border-primary/20 text-xs px-3.5 py-1.5 self-start sm:self-auto font-black">
            <span>⭐ {savedQuizzes.length} {isAr ? 'اختبار محفوظ' : 'Saved Quizzes'}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedQuizzes.map(quiz => (
          <InteractiveQuizCard
            key={quiz.id}
            quiz={quiz}
            lang={lang}
            onStartQuiz={onStartQuiz}
            onViewProfile={onViewProfile}
            currentUserId={userId}
          />
        ))}

        {savedQuizzes.length === 0 && (
          <div className="col-span-full py-16 uipro-clay-card border-dashed border-2 border-slate-200 dark:border-slate-800 rounded-[32px] text-center space-y-4 max-w-lg mx-auto w-full p-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shadow-inner">
              <Bookmark className="w-8 h-8" />
            </div>
            <h4 className="font-display font-black text-base text-slate-800 dark:text-white">
              {isAr ? 'قائمتك المفضلة خالية تماماً' : 'No Bookmarked Quizzes'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              {isAr 
                ? 'اضغط على زر الإشارة المرجعية أو النجمة ببطاقة أي اختبار في صفحة الاستكشاف أو الرئيسية لحفظه هنا والرجوع إليه لاحقاً.'
                : 'Click the star or bookmark icon on any quiz card across explore or catalogue to pin it here for quick access anytime.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// ACHIEVEMENTS / REWARDS SECTION
// ----------------------------------------------------
export function AchievementsSection({ lang, completions, quizzes, userId, isPremium }: { lang: 'ar' | 'en', completions: QuizCompletion[], quizzes: Quiz[], userId: string, isPremium: boolean }) {
  const isAr = lang === 'ar';
  const hasPrem = isPremium;

  // Compute Achievements stats
  const totalSolved = completions.length;
  const totalCreations = quizzes.filter(q => q.creatorId === userId).length;
  const maxScore = completions.length > 0 ? Math.max(...completions.map(c => c.score)) : 0;
  const maxStreak = Math.min(totalSolved * 3, 100); // simulation or calculation

  const achievementsList = [
    {
      id: 'ac1',
      titleAr: 'أول الغيث 💧',
      titleEn: 'First Cosmo AI 💧',
      descAr: 'قم بإنهاء وحل مسابقة واحدة بالكامل لتسجيل علامتك بقاعدة البيانات.',
      descEn: 'Solve and fully submit your first interactive exam score globally.',
      unlocked: totalSolved >= 1,
      rewardText: '50 XP',
      icon: '🎯'
    },
    {
      id: 'ac2',
      titleAr: 'الدرجة الكاملة 🏆',
      titleEn: 'Master of Truth 🏆',
      descAr: 'سجل درجة كاملة بنسبة ١٠٠٪ في أي اختبار تفاعلي متاح بالكتالوج.',
      descEn: 'Score a perfect 100% correct answer strike on any active quiz.',
      unlocked: maxScore >= 100,
      rewardText: '150 XP',
      icon: '👑'
    },
    {
      id: 'ac3',
      titleAr: 'المهندس الـصانع 🛠️',
      titleEn: 'Grand Architect 🛠️',
      descAr: 'قم بتصميم وإنتاج أول اختبار تفاعلي مخصص يدوياً أو بالذكاء الاصطناعي.',
      descEn: 'Create & publish at least one public high-fidelity quiz.',
      unlocked: totalCreations >= 1,
      rewardText: '100 XP',
      icon: '🧠'
    },
    {
      id: 'ac4',
      titleAr: 'كاسر حواجز الوقت ⚡',
      titleEn: 'Superluminal Solver ⚡',
      descAr: 'حل أي اختبار وحافظ على هدوء الشفق في وقت قياسي جداً للسرعة.',
      descEn: 'Complete any selected exam within the optimal speed records.',
      unlocked: totalSolved >= 3,
      rewardText: '80 XP',
      icon: '⚡'
    },
    {
      id: 'ac5',
      titleAr: 'التاج الذهبي المعتمد 👑',
      titleEn: 'Imperial Crown Member 👑',
      descAr: 'ترقية وتفعيل حسابك للباقة الذهبية للوصول لإنشاء غير محدود للطلاب.',
      descEn: 'Unlock full-spectrum educator superpowers by activating your VIP token.',
      unlocked: hasPrem,
      rewardText: '250 XP',
      icon: '👑'
    }
  ];

  const [celebrationMedal, setCelebrationMedal] = useState<any | null>(null);

  // Stagger animation definitions
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.96 },
    show: { 
      y: 0, 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", stiffness: 120, damping: 15 }
    }
  };

  const triggerCelebration = (item: any) => {
    setCelebrationMedal(item);
    playChimeSound('completion');
  };

  return (
    <div className="space-y-6" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white flex items-center gap-2">
            <span>🏆</span>
            <span>{isAr ? 'شارات التوثيق المستحقة' : 'My Accomplishments & Trophies'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? 'احصد نقاط المعرفة (XP) وافتح بطاقات الإنجاز لتتوج بلقب بروفيسور الفضاء.' : 'Compile academic XP points, unlock custom status cards & raise your rank to space professor.'}
          </p>
        </div>

        {/* Interactive Simulation Trigger */}
        <button
          onClick={() => triggerCelebration(achievementsList[Math.floor(Math.random() * achievementsList.length)])}
          className="uipro-btn-tactile inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAr ? 'محاكاة الفوز بشارة جديدة' : 'Simulate Badge Unlock!'}</span>
        </button>
      </div>

      {/* Interactive Suggestion Ticker */}
      <div className="uipro-glass-panel bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-lg animate-bounce">⚡</span>
          <span className="text-slate-700 dark:text-slate-300 font-extrabold leading-relaxed">
            {isAr ? 'تم دمج حركات غامرة مستقلة! اضغط على أي بطاقة شارة بالأسفل لتجربة لوحة الاحتفال ثلاثية الأبعاد.' : 'Immersive motion integrated! Click any badge below to launch details and celebratory playback.'}
          </span>
        </div>
      </div>

      {/* Visual Stats Row with Scale-in Animations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'إجمالي النقاط المكتسبة' : 'Total Knowledge XP', val: `${achievementsList.filter(a => a.unlocked).reduce((sum, a) => sum + parseInt(a.rewardText), 0) + (totalSolved * 10)} XP`, color: 'text-amber-500 dark:text-amber-400', icon: Sparkles },
          { label: isAr ? 'أعلى علامة مسجلة' : 'Max Score Level', val: `${maxScore}%`, color: 'text-indigo-500 dark:text-indigo-400', icon: Trophy },
          { label: isAr ? 'سرعة الحل المعتمدة' : 'Performance Speed', val: `${maxStreak}%`, color: 'text-emerald-500 dark:text-emerald-400', icon: Zap },
          { label: isAr ? 'الشارات المفتوحة' : 'Platinum Trophies', val: `${achievementsList.filter(a => a.unlocked).length} / ${achievementsList.length}`, color: 'text-purple-500 dark:text-purple-400', icon: Award }
        ].map((stat, sIdx) => {
          const StatIcon = stat.icon;
          return (
            <div
              key={sIdx}
              className="uipro-clay-card p-4.5 rounded-2xl text-right relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">{stat.label}</span>
                <div className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${stat.color}`}>
                  <StatIcon className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className={`text-xl font-black ${stat.color} block font-display tracking-tight`}>{stat.val}</span>
            </div>
          );
        })}
      </div>

      {/* Achievements Cards list with Stagger Revealing */}
      <div className="space-y-4">
        {achievementsList.map(item => (
          <div 
            key={item.id}
            onClick={() => triggerCelebration(item)}
            className={`uipro-clay-card p-5 rounded-3xl border text-right transition-all flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer relative overflow-hidden group ${
              item.unlocked 
                ? 'bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-500/30 shadow-md' 
                : 'bg-slate-100/60 dark:bg-[#11131c]/40 border-slate-200 dark:border-slate-900/80 grayscale opacity-60'
            }`}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Ambient hover glow ring */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex items-center gap-4 text-right z-10">
              <div className="text-3xl p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm flex items-center justify-center w-14 h-14">
                {item.icon}
              </div>
              <div className="space-y-1 block" style={{ textAlign: isAr ? 'right' : 'left' }}>
                <h4 className="font-display font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <span>{isAr ? item.titleAr : item.titleEn}</span>
                  {item.unlocked ? (
                    <span className="text-[10px] uipro-gold-shimmer bg-indigo-500 text-white font-bold px-2.5 py-0.5 rounded-full select-none shadow-xs">
                      🎉 {isAr ? 'تم الفتح' : 'Unlocked'}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-0.5 rounded-full select-none">
                      🔒 {isAr ? 'مقفل' : 'Locked'}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm font-semibold leading-relaxed">
                  {isAr ? item.descAr : item.descEn}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 z-10">
              <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl border ${
                item.unlocked
                  ? 'uipro-gold-shimmer bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                ★ {item.rewardText}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Holographic Fullscreen Medal Unlocked Celebration Modal */}
      {celebrationMedal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[140px] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          </div>

          <div
            className="w-full max-w-md uipro-clay-card bg-white dark:bg-slate-900 border-2 border-amber-500/50 rounded-[36px] p-8 text-center relative overflow-hidden shadow-2xl"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full opacity-20 blur-3xl" />

            <div className="space-y-6 relative z-10">
              <div 
                className="w-32 h-32 mx-auto bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-300 rounded-full flex items-center justify-center text-6xl shadow-2xl shadow-amber-500/30 border-4 border-yellow-200 ring-8 ring-amber-500/20 animate-bounce"
              >
                <span className="drop-shadow-md select-none">{celebrationMedal.icon}</span>
              </div>

              <div className="space-y-1.5">
                <span className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[10px] text-amber-600 dark:text-amber-300 font-extrabold uppercase tracking-widest">
                  🏆 {isAr ? 'تم فتح شارة توثيق جديدة!' : 'New Badge Unlocked!'}
                </span>
                <h3 className="font-display font-black text-2xl text-slate-800 dark:text-white tracking-tight leading-snug">
                  {isAr ? celebrationMedal.titleAr : celebrationMedal.titleEn}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 font-semibold px-4 leading-relaxed">
                  {isAr ? celebrationMedal.descAr : celebrationMedal.descEn}
                </p>
              </div>

              <div className="uipro-glass-panel bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-6 max-w-xs mx-auto flex items-center justify-between text-right">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">{isAr ? 'الجائزة المضافة:' : 'Reward Added:'}</span>
                <span className="text-base font-black text-amber-500 dark:text-amber-400 font-mono tracking-tight">+{celebrationMedal.rewardText}</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setCelebrationMedal(null);
                    playChimeSound('click');
                  }}
                  className="uipro-btn-tactile w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-xl shadow-amber-500/25 leading-none focus:outline-none"
                >
                  {isAr ? 'أغلق وتابع تجميع المعرفة 🚀' : 'Collect & Continue Journey 🚀'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// SETTINGS TAB FUNCTION
// ----------------------------------------------------
export function SettingsSection({
  lang,
  userName,
  onUpdateName,
  colorTheme,
  setColorTheme,
  darkMode,
  setDarkMode,
  isPremium,
  currentUserId,
  currentUserEmail,
  userPlanName = 'Free'
}: {
  lang: 'ar' | 'en';
  userName: string;
  onUpdateName: (name: string) => void;
  colorTheme: string;
  setColorTheme: (theme: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isPremium: boolean;
  currentUserId?: string;
  currentUserEmail?: string | null;
  userPlanName?: 'Free' | 'Silver' | 'Gold' | 'Diamond';
}) {
  const isAr = lang === 'ar';
  const { themePreference, setThemePreference } = useTheme();
  
  // Tab control state (1: البيانات الأساسية, 2: إدارة الأمان, 3: تخصيص الواجهة, 4: الإشعارات)
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);

  // Profile fields state
  const [nameInput, setNameInput] = useState(userName);
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Sound effects toggle
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem('quiz_sound_effects_muted') === 'true');

  // Loading & Feedback states
  const [isSavingBasic, setIsSavingBasic] = useState(false);
  const [saveBasicFeedback, setSaveBasicFeedback] = useState<string | null>(null);

  // Google Drive states
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [gdriveAccount, setGdriveAccount] = useState<string | null>(() => {
    if (!currentUserId) return null;
    try {
      return localStorage.getItem(`gdrive_account_${currentUserId}`);
    } catch (_) { return null; }
  });

  // Specialized custom branding elements (Premium badge)
  const [badgeTier, setBadgeTier] = useState<BadgeTier>('none');
  const [nameColor, setNameColor] = useState<NameColorKey>('default');
  const [isSavingBadge, setIsSavingBadge] = useState(false);
  const [badgeSaveError, setBadgeSaveError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.fromTo(containerRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
  }, { scope: containerRef });
  
  useGSAP(() => {
    gsap.fromTo(".settings-tab-content", { opacity: 0, scale: 0.98, y: 15 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "back.out(1.2)", clearProps: "all" });
  }, { scope: containerRef, dependencies: [activeTab] });


  // Load existing profile details on mount
  useEffect(() => {
    if (currentUserId) {
      getUserProfileStats(currentUserId).then(stats => {
        if (stats) {
          if (stats.customId) setUsernameInput(stats.customId);
          if (stats.bio) setBioInput(stats.bio);
          if (stats.badgeTier) setBadgeTier(stats.badgeTier);
          if (stats.nameColor) setNameColor(stats.nameColor);
          if (stats.phone) setPhoneInput(stats.phone);
        }
      });
    }
  }, [currentUserId]);

  const handleConnectDrive = async () => {
    setIsDriveLoading(true);
    try {
      const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
      if (!clientId) throw new Error('Google OAuth client ID not configured (VITE_GOOGLE_OAUTH_CLIENT_ID).');

      // @ts-ignore - loaded via the Google Identity Services <script> tag in index.html
      const google = window.google;
      if (!google?.accounts?.oauth2) {
        throw new Error(isAr ? 'تعذر تحميل خدمة جوجل، برجاء إعادة تحميل الصفحة.' : 'Google Identity Services failed to load.');
      }

      const token: string = await new Promise((resolve, reject) => {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
          prompt: 'consent',
          callback: (resp: any) => {
            if (resp.error) reject(new Error(resp.error));
            else resolve(resp.access_token);
          },
        });
        tokenClient.requestAccessToken();
      });

      setDriveToken(token);
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || 'Google Account';
      setGdriveAccount(email);

      if (currentUserId) {
        localStorage.setItem(`gdrive_linked_${currentUserId}`, 'true');
        localStorage.setItem(`gdrive_account_${currentUserId}`, email);
      }
      alert(isAr ? 'تم ربط حساب Google Drive بنجاح!' : 'Google Drive linked successfully!');
    } catch (err: any) {
      console.error('Error linking Google Drive:', err);
      if (err.message?.includes('popup_closed') || err.message?.includes('access_denied')) {
        alert(
          isAr
            ? '💡 يبدو أن نافذة تسجيل الدخول قد أُغلقت أو تم حظرها من قِبل المتصفح. نظرًا لأنك في وضع المعاينة (iframe)، يرجى فتح التطبيق في علامة تبويب جديدة بالضغط على زر "فتح في علامة تبويب جديدة" أعلى اليمين والمحاولة من هناك لتجنب قيود الأمان.'
            : '💡 The sign-in popup was closed or blocked. Because you are inside the development preview iframe, please open the app in a new tab using the top-right button, then authorize Google Drive from there.'
        );
      } else {
        alert(isAr ? 'فشلت عملية الربط مع Google Drive.' : 'Failed to authorize Google Drive.');
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleDisconnectDrive = () => {
    setDriveToken(null);
    setGdriveAccount(null);
    if (currentUserId) {
      localStorage.removeItem(`gdrive_linked_${currentUserId}`);
      localStorage.removeItem(`gdrive_account_${currentUserId}`);
      localStorage.removeItem(`gdrive_folder_id_${currentUserId}`);
    }
  };

  const themes = THEME_PRESETS.map((theme) => ({
    id: theme.id,
    name: theme.id === 'indigo' ? (isAr ? 'داكن (بنفسجي فضائي)' : 'Space Purple')
      : theme.id === 'light' ? (isAr ? 'فاتح (أبيض رصين)' : 'Minimalist Light')
      : theme.id === 'sky' ? (isAr ? 'أزرق محيطي' : 'Ocean Blue')
          : theme.id === 'blue' ? (isAr ? 'أزرق هادئ' : 'Calm Blue')
            : theme.id === 'deep-night' ? (isAr ? 'ليلي عميق جدًا' : 'Deep Night')
          : theme.id === 'emerald' ? (isAr ? 'داكن (أخضر زمردي)' : 'Emerald Green')
            : theme.id === 'sunset' ? (isAr ? 'داكن (برتقالي الشمس)' : 'Sunset Orange')
              : theme.id === 'pastelp' ? (isAr ? 'فاتح (وردي باستيل)' : 'Pastel Pink')
                : (isAr ? 'ذهبي العسل' : 'Golden Honey'),
    color: theme.swatch,
  }));

  const handleMuteToggle = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    localStorage.setItem('quiz_sound_effects_muted', String(next));
    playChimeSound('click');
  };

  const handleSaveBasicDetails = async () => {
    if (!nameInput.trim()) {
      setSaveBasicFeedback(isAr ? 'الرجاء إدخال الاسم المعروض.' : 'Please enter display name.');
      return;
    }
    setIsSavingBasic(true);
    setSaveBasicFeedback(null);
    try {
      if (currentUserId) {
        // Save via DB helper
        await saveUserProfile(
          currentUserId,
          nameInput.trim(),
          undefined,
          currentUserEmail || undefined,
          bioInput.trim(),
          undefined, // location
          undefined, // badgeSymbol (deprecated - use updateBadgeAndNameColor)
          undefined, // badgeColor (deprecated - use updateBadgeAndNameColor)
          usernameInput.trim(),
          undefined, // planId
          undefined, // isPremium
          undefined, // planName
          undefined, // isLifetime
          undefined, // isFounder
          undefined, // isSuspended
          undefined, // categoryId
          undefined, // renewalDate
          phoneInput.trim()
        );
      }
      onUpdateName(nameInput.trim());
      setSaveBasicFeedback('success');
      playChimeSound('correct');
      setTimeout(() => setSaveBasicFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveBasicFeedback(isAr ? 'فشل حفظ التعديلات.' : 'Failed to save details.');
    } finally {
      setIsSavingBasic(false);
    }
  };

  const handleSaveSpecializedBranding = async () => {
    if (!currentUserId) return;
    if (!isPremium) {
      setBadgeSaveError(isAr ? 'هذه الميزة متاحة للمشتركين فقط.' : 'This feature is only available to premium subscribers.');
      return;
    }
    setIsSavingBadge(true);
    setBadgeSaveError('');
    try {
      await updateBadgeAndNameColor(currentUserId, badgeTier, nameColor);
      alert(isAr ? 'تم حفظ تفضيلات الشعار والتخصيص بنجاح!' : 'Branding customization saved successfully!');
    } catch (err: any) {
      console.error(err);
      setBadgeSaveError(err?.message || (isAr ? 'فشل حفظ التخصيص.' : 'Failed to save customization.'));
    } finally {
      setIsSavingBadge(false);
    }
  };

  const tabsConfig = [
    { id: 1 as const, label: isAr ? 'البيانات الأساسية' : 'Basic Details', icon: '📝' },
    { id: 2 as const, label: isAr ? 'إدارة الأمان' : 'Security', icon: '🔒' },
    { id: 3 as const, label: isAr ? 'تخصيص الواجهة' : 'Interface', icon: '🎨' },
    { id: 4 as const, label: isAr ? 'الإشعارات' : 'Notifications', icon: '🔔' }
  ];

  return (
    <div ref={containerRef} className="max-w-5xl mx-auto flex flex-col gap-6 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
      
      {/* Dynamic Tab Selector header with Layout Animation */}
      <div className="flex flex-wrap items-center justify-center p-1.5 bg-slate-900/60 dark:bg-[#130b2b]/40 backdrop-blur-md rounded-2xl border border-slate-200/10 gap-1 select-none">
        {tabsConfig.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { playChimeSound('click'); setActiveTab(tab.id); }}
              className={`relative px-6 py-3 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isActive && (
                <div
                  
                  className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/25"
                  
                />
              )}
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main viewport with transition effect */}
      <div className="bg-white/95 dark:bg-[#0e0a1f]/80 backdrop-blur-2xl border border-slate-200 dark:border-[#3d1d6d]/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden min-h-[450px]">
        
        {/* TAB 1: البيانات الأساسية */}
        {activeTab === 1 && (
          <div
            
            
            
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-xl">📝</span>
                <span>{isAr ? 'البيانات الأساسية للملف الشخصي' : 'Basic Profile Information'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'قم بتحديث معلوماتك العامة لتسهيل تواصلك مع الطلاب والمعلمين الآخرين' : 'Keep your identity updated to stay synchronized with classes and teachers'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 block">
                  {isAr ? 'الاسم الكامل:' : 'Full Name / Display Name:'}
                </label>
                <input 
                  type="text" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition-all"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                  placeholder={isAr ? 'أدخل اسمك المعروض' : 'Enter your name'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 block">
                  {isAr ? 'اسم المستخدم (معرّف فريد):' : 'Username / Unique ID:'}
                </label>
                <input 
                  type="text" 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition-all"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                  placeholder={isAr ? 'مثال: ahmed_teacher' : 'e.g. ahmed_teacher'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 block">
                  {isAr ? 'رقم الهاتف المتنقل:' : 'Phone Number:'}
                </label>
                <input 
                  type="tel" 
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition-all font-mono"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                  placeholder="+966 50 000 0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 block">
                  {isAr ? 'البريد الإلكتروني (غير قابل للتعديل):' : 'Email Address (Read-only):'}
                </label>
                <input 
                  type="email" 
                  value={currentUserEmail || ''}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-950/40 opacity-60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 block">
                  {isAr ? 'نبذة تعريفية (Bio):' : 'Biography:'}
                </label>
                <textarea 
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition-all resize-none"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                  placeholder={isAr ? 'اكتب نبذة قصيرة عن تخصصك أو اهتماماتك...' : 'Tell us about your background or subjects you teach...'}
                />
              </div>
            </div>

            {saveBasicFeedback === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                <CheckCircle className="w-4 h-4 shrink-0 animate-bounce" />
                <span>{isAr ? 'تم حفظ البيانات بنجاح!' : 'Profile details saved successfully!'}</span>
              </div>
            )}

            {saveBasicFeedback && saveBasicFeedback !== 'success' && (
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <span className="shrink-0">⚠️</span>
                <span>{saveBasicFeedback}</span>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSaveBasicDetails}
                disabled={isSavingBasic}
                className="px-8 py-3 bg-gradient-to-r from-violet-600 to-primary hover:from-violet-700 hover:to-primary/90 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-primary/20 hover:-translate-y-0.5"
              >
                {isSavingBasic ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات الأساسية ✨' : 'Save Profile Details ✨')}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: إدارة الأمان */}
        {activeTab === 2 && (
          <div
            
            
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-xl">🔒</span>
                <span>{isAr ? 'إدارة الأمان والجلسات' : 'Security Settings & Active Sessions'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'إدارة حماية الحساب، وتغيير كلمات المرور، وإنهاء الجلسات المفتوحة على الأجهزة الأخرى' : 'Protect your account, change password, and manage active system log sessions'}
              </p>
            </div>

            {/* Seamless injection of the Security subsystem */}
            <div className="pt-2">
              <Security lang={lang} />
            </div>
          </div>
        )}

        {/* TAB 3: تخصيص الواجهة */}
        {activeTab === 3 && (
          <div
            
            
            className="space-y-8"
          >
            {/* Theme & Prefs block */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-xl">🎨</span>
                  <span>{isAr ? 'تخصيص المظهر وتفضيلات النظام' : 'Visual Customization & System Preferences'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr ? 'اختر السمة اللونية وقم بتهيئة إعدادات الصوت والواجهات الفاخرة' : 'Choose colors, adjust sound effects, and personalize branding options'}
                </p>
              </div>

              {/* Theme color cards */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-600 dark:text-slate-300 block">
                  {isAr ? 'السمة اللونية للنظام (بريميوم):' : 'System Color Theme (Premium):'}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {themes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { if(isPremium) { playChimeSound('click'); setColorTheme(t.id); } }}
                      className={`relative flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        colorTheme === t.id 
                          ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(155,81,224,0.3)] ring-2 ring-primary/30' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {!isPremium && t.id !== 'indigo' && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1.5px] rounded-2xl z-10 flex items-center justify-center">
                          <span className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[9px] px-2 py-0.5 rounded shadow-sm font-black uppercase">Premium</span>
                        </div>
                      )}
                      <div className={`h-10 w-full rounded-xl bg-gradient-to-r ${t.color}`} />
                      <span className="text-[11px] font-black text-slate-200 text-center">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Switches list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-white">{isAr ? 'الوضع الداكن الفاخر' : 'Luxury Dark Mode'}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{isAr ? 'تبديل واجهات النظام الكاملة للوضع الداكن' : 'Toggle application-wide dark aesthetic'}</p>
                  </div>
                  <div className="shrink-0">
                    <NeumorphismToggle checked={darkMode} onChange={setDarkMode} size="sm" />
                  </div>
                </div>
                <div className="md:col-span-2 rounded-2xl bg-slate-950/40 border border-slate-800 p-4">
                  <h4 className="text-xs font-bold text-white">{isAr ? 'تفضيل الثيم' : 'Theme preference'}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 mb-3">{isAr ? 'اختَر الوضع الفاتح أو الداكن أو اتبع إعداد الجهاز تلقائيًا.' : 'Choose light, dark, or follow the device automatically.'}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['light', 'dark', 'system'] as const).map((preference) => (
                      <button key={preference} type="button" onClick={() => setThemePreference(preference)} className={`min-h-10 rounded-xl border text-[11px] font-black transition ${themePreference === preference ? 'border-primary bg-primary/15 text-primary' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                        {preference === 'light' ? (isAr ? 'فاتح' : 'Light') : preference === 'dark' ? (isAr ? 'داكن' : 'Dark') : (isAr ? 'حسب الجهاز' : 'System')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-white">{isAr ? 'المؤثرات الصوتية التفاعلية' : 'Interactive UI Sound Effects'}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{isAr ? 'تشغيل المؤثرات والتعزيزات الصوتية الجذابة' : 'Enjoy interactive UI chime sounds'}</p>
                  </div>
                  <div className="shrink-0">
                    <LiquidGlassSwitch 
                      checked={!soundMuted} 
                      onChange={handleMuteToggle} 
                      size="sm" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Specialized Branding Features */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-md inline-block">
                  {isAr ? 'خصائص الشعار والوسام المخصص' : 'Specialized Branding Options'}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr ? 'شارة توثيق واسم ملون - متاحة للمشتركين فقط. الأشكال المتاحة تعتمد على باقتك.' : 'Verified badge and colored name - premium subscribers only. Available options depend on your plan.'}
                </p>
              </div>

              {!isPremium ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 font-bold">
                  {isAr ? '🔒 اشترك في إحدى الباقات المدفوعة عشان تقدر تفعّل شارة التوثيق واسم ملون.' : '🔒 Subscribe to a paid plan to unlock a verified badge and colored name.'}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">{isAr ? 'شكل شارة التوثيق:' : 'Verified Badge Style:'}</label>
                      <select
                        value={badgeTier}
                        onChange={(e) => setBadgeTier(e.target.value as BadgeTier)}
                        className="w-full bg-slate-950 border border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-2 text-xs text-white outline-none"
                      >
                        {availableBadgeTiers(userPlanName).map(tier => (
                          <option key={tier} value={tier}>{isAr ? BADGE_LABELS[tier].labelAr : BADGE_LABELS[tier].labelEn}</option>
                        ))}
                      </select>
                      {badgeTier !== 'none' && (
                        <div className="flex items-center gap-2 pt-1">
                          <PremiumNameTag name={nameInput || userName} isPremium={true} badgeTier={badgeTier} nameColor={nameColor} badgeSize="md" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">{isAr ? 'لون الاسم:' : 'Name Color:'}</label>
                      <div className="flex flex-wrap gap-2">
                        {availableNameColors(userPlanName).map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNameColor(color)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${nameColor === color ? 'border-primary ring-1 ring-primary' : 'border-slate-700'} bg-slate-950`}
                            style={NAME_COLOR_PRESETS[color].style}
                          >
                            {isAr ? NAME_COLOR_PRESETS[color].labelAr : NAME_COLOR_PRESETS[color].labelEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {badgeSaveError && (
                    <p className="text-[11px] text-red-400 font-bold">{badgeSaveError}</p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveSpecializedBranding}
                      disabled={isSavingBadge}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black rounded-xl cursor-pointer shadow disabled:opacity-50"
                    >
                      {isSavingBadge ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ خصائص الشعار' : 'Save Distinction Branding')}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Google Drive connected accounts connection */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'الحسابات السحابية المرتبطة' : 'Linked Cloud Accounts'}</h4>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr ? 'اربط حساب Google Drive لرفع مخرجات الاختبارات وملفات المراجعة مباشرة لسحابتك' : 'Authorize Google Drive integration to sync materials and student notes instantly'}
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow">
                    <svg viewBox="0 0 1000 1000" className="w-6 h-6">
                      <path d="M333.333 0L500 288.675L166.667 866.025L0 577.35Z" fill="#0F9D58" />
                      <path d="M166.667 866.025L833.333 866.025L666.667 577.35L333.333 577.35Z" fill="#4285F4" />
                      <path d="M666.667 0L1000 577.35L833.333 866.025L500 288.675Z" fill="#FFBA00" />
                    </svg>
                  </div>
                  <div className="text-right sm:text-left" style={{ textAlign: isAr ? 'right' : 'left' }}>
                    <h5 className="font-bold text-white text-xs">Google Drive</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {gdriveAccount || (isAr ? 'لم يتم ربط حساب سحابي بعد' : 'Not authorized yet')}
                    </p>
                  </div>
                </div>

                {!gdriveAccount ? (
                  <button 
                    onClick={handleConnectDrive} 
                    disabled={isDriveLoading}
                    className="px-4 py-2 rounded-lg text-white font-bold text-[11px] bg-blue-600 hover:bg-blue-700 w-full sm:w-auto shadow"
                  >
                    {isDriveLoading ? (isAr ? 'جاري الاتصال...' : 'Connecting...') : (isAr ? 'ربط الحساب' : 'Link Google Account')}
                  </button>
                ) : (
                  <button 
                    onClick={handleDisconnectDrive} 
                    className="px-4 py-2 rounded-lg text-slate-300 bg-slate-900 border border-slate-800 font-bold text-[11px] hover:bg-slate-800 w-full sm:w-auto"
                  >
                    {isAr ? 'إلغاء الربط' : 'Unlink Account'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: الإشعارات */}
        {activeTab === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <span>{isAr ? 'تفضيلات الإشعارات' : 'Notification Preferences'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'اختر التنبيهات التي تود استقبالها ثم احفظ تفضيلاتك.' : 'Choose the alerts you want to receive, then save your preferences.'}
              </p>
            </div>
            <Notifications lang={lang} />
          </div>
        )}

      </div>
    </div>
  );
}

// ----------------------------------------------------
// LEADERBOARD SECTION
// ----------------------------------------------------
export function LeaderboardSection({ lang, quizzes }: { lang: 'ar' | 'en', quizzes: Quiz[] }) {
  const [boardItems, setBoardItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAr = lang === 'ar';

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const completionsList = await getRecentCompletions(15);
        if (completionsList && completionsList.length > 0) {
          const processedList = completionsList.map(c => ({
            userName: c.takerName || (isAr ? 'طالب متميز' : 'Anonymous Student'),
            quizTitle: c.quizTitle || (isAr ? 'اختبار مجهول' : 'Quiz'),
            score: c.score,
            elapsedSeconds: 0
          }));
          setBoardItems(processedList);
        } else {
          setBoardItems([]);
        }
      } catch (e) {
        setBoardItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [quizzes]);

  // Extract top 3 for the visual podium
  const podiumWinners = boardItems.slice(0, 3);
  const listItems = boardItems.slice(3);

  // Map indices for visually organizing podium as: [2nd, 1st, 3rd]
  const renderPodiumOrder = () => {
    const arranged: any[] = [];
    if (podiumWinners[1]) arranged.push({ ...podiumWinners[1], rank: 2 }); // 2nd Place on Left
    if (podiumWinners[0]) arranged.push({ ...podiumWinners[0], rank: 1 }); // 1st Place in Center
    if (podiumWinners[2]) arranged.push({ ...podiumWinners[2], rank: 3 }); // 3rd Place on Right
    return arranged;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return {
      bgColor: 'bg-gradient-to-b from-amber-400/20 via-yellow-400/10 to-amber-500/5',
      borderColor: 'border-amber-400 dark:border-amber-400/80',
      textColor: 'text-amber-500 dark:text-amber-400',
      badge: '👑',
      badgeBg: 'bg-amber-400 text-amber-950',
      height: 'h-48 sm:h-56',
      shimmer: 'uipro-gold-shimmer'
    };
    if (rank === 2) return {
      bgColor: 'bg-gradient-to-b from-slate-200/40 via-slate-100/20 to-slate-200/5 dark:from-slate-700/20 dark:to-transparent',
      borderColor: 'border-slate-300 dark:border-slate-600',
      textColor: 'text-slate-500 dark:text-slate-300',
      badge: '🥈',
      badgeBg: 'bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-white',
      height: 'h-40 sm:h-46',
      shimmer: 'uipro-silver-shimmer'
    };
    return {
      bgColor: 'bg-gradient-to-b from-orange-400/20 via-orange-300/10 to-orange-500/5',
      borderColor: 'border-orange-400/60 dark:border-orange-500/50',
      textColor: 'text-orange-500 dark:text-orange-400',
      badge: '🥉',
      badgeBg: 'bg-orange-400 text-orange-950',
      height: 'h-36 sm:h-40',
      shimmer: 'uipro-bronze-shimmer'
    };
  };

  return (
    <div className="space-y-8 animate-fade-in" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div>
        <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-500">🏆</span>
          <span>{isAr ? 'لوحة الشرف ومنصة التتويج' : 'Laureate Podium & Leaderboard'}</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
          {isAr ? 'منصة فخرية لتتويج أسرع عقول المنصة وأدقهم نتائج في حل التحديات العلمية.' : 'Honoring elite scholars with high-precision quiz scores.'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Top 3 Visual Podium Display */}
          {podiumWinners.length > 0 && (
            <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 pt-8 pb-4 select-none">
              {renderPodiumOrder().map((winner, index) => {
                const style = getRankStyle(winner.rank);
                return (
                  <div
                    key={winner.userId || index}
                    className={`w-full sm:w-60 rounded-[32px] border-2 ${style.borderColor} ${style.bgColor} p-6 flex flex-col justify-end items-center relative space-y-4 shadow-xl shrink-0 uipro-clay-card`}
                    style={{ minHeight: winner.rank === 1 ? '260px' : winner.rank === 2 ? '230px' : '210px' }}
                  >
                    {/* Background badge identifier */}
                    <div className="absolute top-4 right-4 text-3xl select-none">
                      {style.badge}
                    </div>

                    <div className="flex flex-col items-center text-center space-y-2.5 w-full">
                      <div className="relative">
                        <div className={`w-16 h-16 rounded-full bg-slate-900 border-2 ${winner.rank === 1 ? 'border-yellow-400 ring-4 ring-yellow-400/20' : winner.rank === 2 ? 'border-slate-300' : 'border-orange-400'} flex items-center justify-center text-white font-extrabold text-base shadow-lg`}>
                          {winner.userName ? winner.userName.substring(0, 1) : '👤'}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-md ${style.badgeBg}`}>
                          #{winner.rank}
                        </span>
                      </div>

                      <div className="space-y-1 w-full">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5 truncate">
                          {winner.userName || (isAr ? 'طالب متميز' : 'Scholar')}
                          <UserBadge tier={winner.userTier || 'free'} showLabel={false} />
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-[160px] mx-auto">{winner.quizTitle}</p>
                      </div>
                    </div>

                    <div className="w-full bg-white/80 dark:bg-slate-950/70 py-3 px-4 rounded-2xl text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
                      <span className={`text-base font-black font-mono block leading-none ${style.textColor}`}>{winner.score}%</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">{winner.elapsedSeconds || 45} {isAr ? 'ثانية حل ⏱' : 'sec solve ⏱'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leaderboard Table/List representing rankings 4+ */}
          <div className="uipro-clay-card rounded-[32px] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-right" dir={isAr ? 'rtl' : 'ltr'}>
              <h3 className="font-display font-black text-sm text-slate-800 dark:text-slate-200">{isAr ? 'قائمة الصدارة العامة:' : 'Complete Global Scoreboard:'}</h3>
              <span className="uipro-pill-badge bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{isAr ? 'تحديث حي ومباشر' : 'Live Sync'}</span>
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {listItems.map((item, idx) => {
                const displayRank = idx + 4;
                return (
                  <div 
                    key={idx}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    dir={isAr ? 'rtl' : 'ltr'}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-xs font-black w-7 text-center select-none text-slate-400 block font-mono">
                        #{displayRank}
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-violet-500/15 border border-primary/20 flex items-center justify-center text-xs text-primary dark:text-primary-light font-extrabold shadow-xs">
                        {item.userName ? item.userName.substring(0,1) : '👤'}
                      </div>
                      <div className="space-y-0.5 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          {item.userName || (isAr ? 'طالب متميز' : 'Elite Student')}
                          <UserBadge tier={item.userTier || 'free'} showLabel={false} />
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-xs">{isAr ? 'حلّ باقتدار:' : 'Solved:'} {item.quizTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-left" style={{ textAlign: isAr ? 'left' : 'right' }}>
                      <div className="text-right">
                        <span className="text-xs font-black text-primary font-mono block">{item.score}%</span>
                        <span className="text-[10px] text-slate-400 font-bold block">{item.elapsedSeconds || 50} {isAr ? 'ثانية ⏱' : 'sec ⏱'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {boardItems.length === 0 && (
                <div className="p-16 text-center text-xs text-slate-400 select-none space-y-2">
                  <span className="text-3xl block">🏆</span>
                  <span>{isAr ? 'لا توجد نتائج مسجلة في لوحة الشرف اليوم بعد.' : 'No entries on the podium today yet.'}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
