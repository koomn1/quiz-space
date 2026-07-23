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
  Send, ThumbsUp, Trash2, PlusCircle, CheckCircle, Flame, Clock, Heart, Shield, Settings,
  Volume2, VolumeX, Eye, BookOpen, Star, HelpCircle, User, Zap, Info, X
} from 'lucide-react';
import { Quiz, QuizCompletion } from '../types';
import { translations } from '../lib/i18n';
import { 
  getCommunityPosts, 
  createCommunityPost, 
  likeCommunityPost, 
  deleteCommunityPost,
  getNotifications, 
  createNotification, 
  getRecentCompletions,
  getUserProfileStats,
  saveUserProfile
} from '../lib/db';
import { TelegramBadge } from './ProfileStatsView';
import ThreeDIcon from './ThreeDIcon';
import ParallaxTiltCard from './ParallaxTiltCard';
import { UserBadge } from './UserBadge';

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
  likes: number;
  likedBy: string[];
  authorBadgeSymbol?: string;
  authorBadgeColor?: string;
  viewsCount?: number;
  viewers?: any[];
}

// Sound click/success effects generator
export function playChimeSound(type: 'click' | 'correct' | 'wrong' | 'completion') {
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    // Check local preferences
    const mute = localStorage.getItem('quiz_sound_effects_muted') === 'true';
    if (mute) return;

    if (type === 'click') {
      osc.frequency.setValueAtTime(600, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
      osc.start();
      osc.stop(context.currentTime + 0.1);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, context.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, context.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, context.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.35);
      osc.start();
      osc.stop(context.currentTime + 0.4);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, context.currentTime); // A3
      osc.frequency.linearRampToValueAtTime(110, context.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      osc.start();
      osc.stop(context.currentTime + 0.3);
    } else if (type === 'completion') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, context.currentTime); // G4
      osc.frequency.setValueAtTime(523.25, context.currentTime + 0.15); // C5
      osc.frequency.setValueAtTime(659.25, context.currentTime + 0.3); // E5
      osc.frequency.setValueAtTime(1046.5, context.currentTime + 0.45); // C6
      gain.gain.setValueAtTime(0.2, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.65);
      osc.start();
      osc.stop(context.currentTime + 0.7);
    }
  } catch (e) {
    console.warn('Audio Context is locked or unsupported', e);
  }
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
    <div className="space-y-6" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white">{isAr ? '🔗 استكشف الكواكيب العلمية' : 'Explore Scientific Galaxies'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isAr ? 'تصفح وقارن واكتشف اختبارات عامة من جميع أنحاء الكوكب لحصد أعلى درجات الخبرة.' : 'Browse, contrast & play public quizzes uploaded by scholars world-wide.'}</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder={isAr ? 'ابحث باسم الاختبار الكوكبي...' : 'Search planetary quizzes...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 px-4 pr-10 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
        </div>
      </div>

      {/* Suggested Tags */}
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => setSelectedTag(null)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
            !selectedTag 
              ? 'bg-primary border-primary text-white shadow-md' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {isAr ? '🌐 الكل' : 'All'}
        </button>
        {tags.map(tag => (
          <button 
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
              selectedTag === tag 
                ? 'bg-primary border-primary text-white shadow-md' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Quizzes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((quiz, idx) => (
          <ParallaxTiltCard 
            key={quiz.id}
            idx={idx}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 flex flex-col justify-between cursor-pointer card-3d border border-slate-100 dark:border-slate-800"
            onClick={() => { playChimeSound('click'); onStartQuiz(quiz.id); }}
          >
            <div className="space-y-3">
              <span className="inline-block bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                🚀 {quiz.questions.length} {isAr ? 'أسئلة' : 'Questions'}
              </span>
              <h3 className="font-display font-black text-sm text-slate-850 dark:text-white text-right leading-tight" style={{ textAlign: isAr ? 'right' : 'left' }}>{quiz.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed" style={{ textAlign: isAr ? 'right' : 'left' }}>
                {quiz.description || (isAr ? 'لا يوجد وصف توضيحي متاح.' : 'No description available.')}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex items-center justify-between w-full">
              <span 
                className="text-[10px] text-slate-400 dark:text-slate-500 font-bold hover:text-primary transition-colors hover:underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onViewProfile && quiz.creatorId && onViewProfile(quiz.creatorId); }}
              >
                👤 {quiz.creatorName}
              </span>
              <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded text-amber-500 dark:text-amber-400 text-[10.5px] font-black">
                <Star className="w-3.5 h-3.5 fill-amber-500 dark:fill-amber-400" />
                <span>{quiz.avgRating || '4.8'}</span>
              </div>
            </div>
          </ParallaxTiltCard>
        ))}
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
    { id: 'ai', titleAr: 'الذكاء الاصطناعي', titleEn: 'AI & Data Science', iconName: 'support', color: 'from-purple-500 to-indigo-600', keywords: ['ai', 'intelligence', 'artificial', 'gemini', 'gpt', 'ذكاء'] },
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

  return (
    <div className="space-y-6" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div>
        <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white">{isAr ? '🗂️ الفئات والمسارات الأكاديمية' : 'Academic Classifications'}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isAr ? 'تصفح مسارات علمية حية ومنتقاة بعناية لزيادة تحصيلك المعرفي.' : 'Browse selective knowledge paths targeted to maximize scientific achievements.'}</p>
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
              className={`relative overflow-hidden p-5 rounded-3xl cursor-pointer border transition-all card-3d ${
                isSelected 
                  ? 'bg-gradient-to-br from-primary/10 to-indigo-600/10 border-primary shadow-xl ring-2 ring-primary/20 dark:ring-primary/40' 
                  : 'bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800/85 hover:border-slate-350 dark:hover:border-slate-700'
              }`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-4">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white font-bold shadow-md`}>
                  <ThreeDIcon name={cat.iconName} className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <h3 className={`font-display font-black text-xs leading-tight ${isSelected ? 'text-primary dark:text-white font-black' : 'text-slate-850 dark:text-white'}`}>{isAr ? cat.titleAr : cat.titleEn}</h3>
                  <p className="text-[10px] text-slate-550 dark:text-slate-400 font-bold">
                    {matchedCount} {isAr ? 'مسابقة متوفرة' : 'Quizzes available'}
                  </p>
                </div>
              </div>
            </ParallaxTiltCard>
          );
        })}
      </div>

      {/* Conditional Quizzes Details based on Category selection */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mt-8 flex items-center gap-2">
          {isAr ? '💎 الاختبارات المتوفرة بالفئة المحددة:' : 'Quiz items for matching classification:'}
          {selectedCat && (
            <span className="text-xs bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light px-2.5 py-0.5 rounded-full font-bold">
              {isAr ? categories.find(c => c.id === selectedCat)?.titleAr : categories.find(c => c.id === selectedCat)?.titleEn}
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(selectedCat ? getFilteredQuizzes(selectedCat) : quizzes).map(quiz => (
            <div 
              key={quiz.id}
              onClick={() => { playChimeSound('click'); onStartQuiz(quiz.id); }}
              className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4.5 rounded-2xl cursor-pointer hover:border-primary/45 hover:shadow-md transition-all flex items-center justify-between gap-3 text-right"
              dir={isAr ? 'rtl' : 'ltr'}
              style={{ textAlign: isAr ? 'right' : 'left' }}
            >
              <div className="space-y-1">
                <h4 className="font-display font-extrabold text-sm text-slate-800 dark:text-white leading-snug">{quiz.title}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{quiz.questions.length} {isAr ? 'أسئلة تفاعلية' : 'questions'}</p>
              </div>
              <button className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all cursor-pointer">
                <Clock className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(selectedCat ? getFilteredQuizzes(selectedCat) : quizzes).length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 col-span-full py-8 select-none bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-205 dark:border-slate-800 rounded-3xl text-center font-bold">
              {isAr ? 'لا توجد اختبارات مضافة في هذه الفئة بعد. كن الأول وأضف واحداً!' : 'No quizzes in this category found yet. Create one now!'}
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
  userLiked,
  isAdmin,
  isAr,
  handleLike,
  onDelete,
  onOpenInsights
}: {
  post: CommunityPost;
  userId: string;
  userName: string;
  userEmail?: string;
  userLiked: boolean;
  isAdmin: boolean;
  isAr: boolean;
  handleLike: (postId: string, e: any) => void;
  onDelete: (postId: string) => void;
  onOpenInsights?: (post: CommunityPost) => void;
}) {
  const hasTriggeredView = React.useRef(false);

  useEffect(() => {
    if (!post.id || hasTriggeredView.current) return;
    hasTriggeredView.current = true;

    const recordView = async () => {
      try {
        const activeUserId = userId || 'user-guest';
        const activeUserName = userName || (isAr ? 'زائر متميز' : 'Guest Scholar');
        const { data: postData } = await supabase.from('community_posts').select('views').eq('id', post.id).single();
        if (postData) {
          const newViews = (postData.views || 0) + 1;
          await supabase.from('community_posts').update({ views: newViews }).eq('id', post.id);
        }
      } catch (err) {
        console.warn('Failed to record post view:', err);
      }
    };
    recordView();
  }, [post.id, userId, userName, isAr]);

  return (
    <div 
      
      
      className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-3 card-3d"
    >
      <div className="flex items-center justify-between text-right" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase sm:text-xs">
            {post.authorName ? post.authorName.substring(0, 1) : '👤'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-row-reverse justify-end">
              <h4 className="text-xs font-black text-slate-800 dark:text-white">{post.authorName}</h4>
              <UserBadge 
                tier={
                  post.authorBadgeSymbol === '👑' ? 'enterprise' :
                  post.authorBadgeSymbol === '✔' ? 'pro' :
                  post.authorBadgeSymbol === 'bot' ? 'premium' :
                  post.authorId?.startsWith('sys') ? 'team' : 'free'
                } 
                size="sm" 
                showTooltip={true} 
                className="ml-1"
              />
            </div>
            <p className="text-[9px] text-slate-500 font-bold mt-0.5">
              {new Date(post.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => onDelete(post.id)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
            title={isAr ? 'حذف' : 'Delete'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed text-right font-semibold" style={{ textAlign: isAr ? 'right' : 'left' }}>
        {post.text}
      </p>

      <div className="border-t border-slate-100 dark:border-slate-800/50 pt-2 flex items-center justify-start gap-4" dir={isAr ? 'rtl' : 'ltr'}>
        <button 
          onClick={(e) => handleLike(post.id, e)}
          className={`flex items-center gap-1.5 text-[10.5px] font-medium py-1 px-3.5 rounded-lg border transition-all cursor-pointer ${
            userLiked 
              ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-500 dark:text-rose-400' 
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${userLiked ? 'fill-rose-400' : ''}`} />
          <span>{post.likes}</span>
        </button>

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

export function CommunitySection({ lang, userId, userName, userEmail, userRole }: { lang: 'ar' | 'en', userId: string, userName: string, userEmail?: string, userRole?: string }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ badgeSymbol?: string; badgeColor?: string } | null>(null);
  const isAr = lang === 'ar';

  const [selectedPostForInsights, setSelectedPostForInsights] = useState<CommunityPost | null>(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const handleOpenInsights = (post: CommunityPost) => {
    const isAdmin = userEmail === 'adman777888999@gmail.com' || userEmail === 'yo01009950871@gmail.com' || userRole === 'admin';
    if (!isAdmin) {
      alert(isAr ? 'عذراً، هذه الإحصائيات التفصيلية للمشاهدات متاحة فقط للمشرف الإداري.' : 'Sorry, detailed viewer insights are only available to admins.');
      return;
    }
    setSelectedPostForInsights(post);
    setIsInsightsOpen(true);
  };

  // Load current user profile for badges attachment
  useEffect(() => {
    if (!userId) return;
    async function fetchUserBadge() {
      try {
        const stats = await getUserProfileStats(userId);
        if (stats) {
          setCurrentUserProfile({
            badgeSymbol: stats.badgeSymbol || '',
            badgeColor: stats.badgeColor || ''
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
      try {
        const fetched = await getCommunityPosts();
        if (fetched && fetched.length > 0) {
          setPosts(fetched);
          localStorage.setItem('quiz_community_posts_cache', JSON.stringify(fetched));
        } else {
          setPosts([]);
          localStorage.setItem('quiz_community_posts_cache', JSON.stringify([]));
        }
      } catch (error) {
        console.warn('Community load fallback to local cache:', error);
        const cache = localStorage.getItem('quiz_community_posts_cache');
        if (cache) {
          setPosts(JSON.parse(cache));
        } else {
          setPosts([]);
          localStorage.setItem('quiz_community_posts_cache', JSON.stringify([]));
        }
      }
    }
    loadPosts();

    // Set polling interval for live update experience
    const interval = setInterval(loadPosts, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const handlePublish = async () => {
    if (!inputText.trim() || isPublishing) return;
    setIsPublishing(true);
    playChimeSound('click');

    const authName = userName || (isAr ? 'طالب متميز' : 'Star Scholar');
    const bSymbol = currentUserProfile?.badgeSymbol || '';
    const bColor = currentUserProfile?.badgeColor || '';

    try {
      const created = await createCommunityPost(
        inputText.trim(),
        userId || 'guest',
        authName,
        bSymbol,
        bColor
      );

      if (created) {
        setPosts(prev => [created, ...prev]);
        setInputText('');
      }

      await createNotification(
        isAr ? 'منشور مجتمع جديد 💬' : 'New Community Post 💬',
        isAr 
          ? `أضاف ${authName} مشاركة جديدة: "${inputText.trim().substring(0, 55)}..."`
          : `${authName} shared a new community post: "${inputText.trim().substring(0, 55)}..."`,
        authName,
        'community'
      );
    } catch (e) {
      console.error('Failed to write community post:', e);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playChimeSound('click');
    
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const baseUserId = userId || 'anonymous';
    let updatedLikedBy = [...(targetPost.likedBy || [])];
    const isLiked = updatedLikedBy.includes(baseUserId);
    let delta = isLiked ? -1 : 1;

    if (isLiked) {
      updatedLikedBy = updatedLikedBy.filter(id => id !== baseUserId);
    } else {
      updatedLikedBy.push(baseUserId);
    }

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          likes: Math.max(0, p.likes + delta),
          likedBy: updatedLikedBy
        };
      }
      return p;
    }));

    try {
      await likeCommunityPost(postId, baseUserId);
    } catch (err) {
      console.warn('Liked state update on server failed:', err);
    }
  };

  return (
    <div className="space-y-6" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div>
        <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white">{isAr ? '💬 مجتمع الفضاء الأكاديمي' : 'Academic Community Hub'}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isAr ? 'تواصل وتفاعل مع المعلمين والطلاب ونظم غرف نقاش تنافسية مذهلة.' : 'Connect & interact with students and educators, exchange notes & high score challenges.'}</p>
      </div>

      {/* Publish Feed Form */}
      {userId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 card-3d">
          <textarea 
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isAr ? 'شارك رأيك في الموقع، أسئلتك، أو تجربتك هنا...' : 'Share your opinion about the site, questions or experience...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-primary transition-all text-right resize-none"
            style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              💡 {isAr ? 'منشورك سيظهر لجميع أعضاء مجتمع الفضاء الأكاديمي.' : 'Your post will be visible to all academic community members.'}
            </p>
            <button 
              onClick={handlePublish}
              disabled={!inputText.trim() || isPublishing}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
          posts.map(post => {
            const userLiked = post.likedBy?.includes(userId || 'anonymous');
            const isAdmin = userEmail === 'adman777888999@gmail.com' || userEmail === 'yo01009950871@gmail.com' || userRole === 'admin';
            return (
              <CommunityPostCard
                key={post.id}
                post={post}
                userId={userId}
                userName={userName}
                userEmail={userEmail}
                userLiked={userLiked}
                isAdmin={isAdmin}
                isAr={isAr}
                handleLike={handleLike}
                onDelete={async (postId) => {
                  if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المنشور؟' : 'Are you sure you want to delete this post?')) {
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    localStorage.setItem('quiz_community_posts_cache', JSON.stringify(posts.filter(p => p.id !== postId)));
                    try {
                      await deleteCommunityPost(postId);
                    } catch (err) {
                      console.error('Failed to delete post on server:', err);
                    }
                  }
                }}
                onOpenInsights={handleOpenInsights}
              />
            );
          })
        )}
      </div>

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
export function BookmarksSection({ quizzes, onStartQuiz, lang, onViewProfile }: { quizzes: Quiz[], onStartQuiz: (id: string) => void, lang: 'ar' | 'en', onViewProfile?: (creatorId: string) => void }) {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const isAr = lang === 'ar';

  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem('quiz_bookmarks_list') || '[]');
    setBookmarkedIds(ids);
  }, []);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playChimeSound('click');
    const ids = JSON.parse(localStorage.getItem('quiz_bookmarks_list') || '[]');
    let updated: string[];
    if (ids.includes(id)) {
      updated = ids.filter((bId: string) => bId !== id);
    } else {
      updated = [...ids, id];
    }
    setBookmarkedIds(updated);
    localStorage.setItem('quiz_bookmarks_list', JSON.stringify(updated));
  };

  const savedQuizzes = quizzes.filter(q => bookmarkedIds.includes(q.id));

  return (
    <div className="space-y-6" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div>
        <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white">{isAr ? '🔖 مسابشاتك المفضلة والمحفوظة' : 'My Pinned Bookmarks'}</h2>
        <p className="text-xs text-slate-505 dark:text-slate-400 mt-1">{isAr ? 'سرعة الوصول للاختبارات التي تود تكرار حلها ومراجعة أسئلتها الصعبة.' : 'Fast-track your access to planetary examinations you wish to repeat or memorize.'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedQuizzes.map(quiz => (
          <div 
            key={quiz.id}
            onClick={() => { playChimeSound('click'); onStartQuiz(quiz.id); }}
            className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-5 flex flex-col justify-between cursor-pointer card-3d text-right relative"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                  💡 {quiz.questions.length} {isAr ? 'سؤال' : 'questions'}
                </span>
                <button 
                  onClick={(e) => toggleBookmark(quiz.id, e)}
                  className="p-1 text-rose-500 hover:text-slate-400 cursor-pointer transition-colors"
                >
                  <Bookmark className="w-5 h-5 fill-rose-500 text-rose-500" />
                </button>
              </div>

              <h3 className="font-display font-black text-sm text-slate-850 dark:text-white text-right leading-tight" style={{ textAlign: isAr ? 'right' : 'left' }}>{quiz.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed" style={{ textAlign: isAr ? 'right' : 'left' }}>
                {quiz.description || (isAr ? 'لا يوجد وصف توضيحي مكتوب لهذا الاختبار.' : 'No description available for this quiz.')}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex items-center justify-between text-slate-450 dark:text-slate-500 text-[10px] font-bold">
              <span 
                className="hover:text-primary transition-colors hover:underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onViewProfile && quiz.creatorId && onViewProfile(quiz.creatorId); }}
              >
                👤 {quiz.creatorName}
              </span>
              <span>{isAr ? 'جاهز للحل بنقرة' : 'Ready to solve'}</span>
            </div>
          </div>
        ))}

        {savedQuizzes.length === 0 && (
          <div className="col-span-full py-16 bg-slate-55 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 max-w-lg mx-auto w-full">
            <Bookmark className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-display font-black text-sm text-slate-700 dark:text-slate-300">{isAr ? 'قائمتك المفضلة خالية تماماً' : 'No Bookmarked Quizzes'}</h4>
            <p className="text-xs text-slate-500 leading-normal max-w-xs mx-auto">
              {isAr 
                ? 'اضغط على رمز الإشارة المرجعية ببطاقة أي اختبار في صفحة الرئيسية لحفظ تقدمه وإيجاده هنا فوراً للحل لاحقاً.'
                : 'Tap the pin symbol on any quiz layout card from the gallery grid to isolate it here for streamlined solving.'}
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
export function AchievementsSection({ lang, completions, quizzes, userId }: { lang: 'ar' | 'en', completions: QuizCompletion[], quizzes: Quiz[], userId: string }) {
  const isAr = lang === 'ar';
  const hasPrem = localStorage.getItem('quiz_is_premium') === 'true';

  // Compute Achievements stats
  const totalSolved = completions.length;
  const totalCreations = quizzes.filter(q => q.creatorId === userId).length;
  const maxScore = completions.length > 0 ? Math.max(...completions.map(c => c.score)) : 0;
  const maxStreak = Math.min(totalSolved * 3, 100); // simulation or calculation

  const achievementsList = [
    {
      id: 'ac1',
      titleAr: 'أول الغيث 💧',
      titleEn: 'First Spark 💧',
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
      descAr: 'قم بتصميم وإنتاج أول اختبار تفاعلي مخصص يدوياً أو بمحرك Gemini.',
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
          <h2 className="text-2xl font-black font-display text-white">{isAr ? '🏆 شارات التوثيق المستحقة' : 'My Accomplishments & Trophies'}</h2>
          <p className="text-xs text-slate-400 mt-1">{isAr ? 'احصد نقاط المعرفة (XP) وافتح بطاقات الإنجاز لتتوج بلقب بروفيسور الفضاء.' : 'Compile academic XP points, unlock custom status cards & raise your rank to space professor.'}</p>
        </div>

        {/* Interactive Simulation Trigger */}
        <button
          
          
          onClick={() => triggerCelebration(achievementsList[Math.floor(Math.random() * achievementsList.length)])}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <span>🎉</span>
          <span>{isAr ? 'محاكاة الفوز بشارة جديدة' : 'Simulate Badge Unlock!'}</span>
        </button>
      </div>

      {/* Interactive Suggestion Ticker */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/15 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-lg animate-bounce">⚡</span>
          <span className="text-slate-300 font-extrabold leading-relaxed">
            {isAr ? 'تم دمج حركات غامرة مستقلة! اضغط على أي بطاقة شارة بالأسفل لتجربة لوحة الاحتفال ثلاثية الأبعاد.' : 'Immersive motion integrated! Click any badge below to launch details and celebratory playback.'}
          </span>
        </div>
      </div>

      {/* Visual Stats Row with Scale-in Animations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'إجمالي النقاط المكتسبة' : 'Total Knowledge XP', val: `${achievementsList.filter(a => a.unlocked).reduce((sum, a) => sum + parseInt(a.rewardText), 0) + (totalSolved * 10)} XP`, color: 'text-amber-500 dark:text-amber-400' },
          { label: isAr ? 'أعلى علامة مسجلة' : 'Max Score Level', val: `${maxScore}%`, color: 'text-indigo-500 dark:text-indigo-400' },
          { label: isAr ? 'سرعة الحل المعتمدة' : 'Performance Speed', val: `${maxStreak}%`, color: 'text-emerald-500 dark:text-emerald-400' },
          { label: isAr ? 'الشارات المفتوحة' : 'Platinum Trophies', val: `${achievementsList.filter(a => a.unlocked).length} / ${achievementsList.length}`, color: 'text-purple-500 dark:text-purple-400' }
        ].map((stat, sIdx) => (
          <div
            key={sIdx}
            
            
            
            className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4.5 rounded-2xl text-right card-3d"
          >
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">{stat.label}</span>
            <span className={`text-xl font-black ${stat.color} block font-display mt-1`}>{stat.val}</span>
          </div>
        ))}
      </div>

      {/* Achievements Cards list with Stagger Revealing */}
      <div 
        
        
        
        className="space-y-4"
      >
        {achievementsList.map(item => (
          <div 
            key={item.id}
            
            onClick={() => triggerCelebration(item)}
            className={`p-5 rounded-3xl border text-right transition-all flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer relative overflow-hidden group card-3d ${
              item.unlocked 
                ? 'bg-gradient-to-br from-indigo-55/40 via-indigo-55/15 to-transparent dark:from-indigo-950/25 dark:via-indigo-950/10 dark:to-transparent border-indigo-200 dark:border-indigo-500/30 shadow-xs' 
                : 'bg-slate-100/60 dark:bg-[#11131c]/40 border-slate-200 dark:border-slate-900/80 grayscale opacity-60'
            }`}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Ambient hover glow ring */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex items-center gap-4 text-right z-10">
              <div 
                
                
                className="text-3xl p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 shrink-0 shadow-sm"
              >
                {item.icon}
              </div>
              <div className="space-y-1 block" style={{ textAlign: isAr ? 'right' : 'left' }}>
                <h4 className="font-display font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <span>{isAr ? item.titleAr : item.titleEn}</span>
                  {item.unlocked ? (
                    <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full select-none animate-pulse">🎉 {isAr ? 'تم الفتح' : 'Unlocked'}</span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-500 font-bold px-2 py-0.5 rounded-full select-none">🔒 {isAr ? 'مقفل' : 'Locked'}</span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm font-semibold leading-relaxed">
                  {isAr ? item.descAr : item.descEn}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 z-10">
              <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold px-3 py-1 rounded-xl border border-amber-500/20">
                ★ {item.rewardText}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Holographic Fullscreen Medal Unlocked Celebration Modal */}
      
        {celebrationMedal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
            {/* Radiant light beam simulation in background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[140px] animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
            </div>

            <div
              
              
              
              
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-500/40 rounded-[36px] p-8 text-center relative overflow-hidden shadow-2xl card-3d"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {/* Gold light burst aura behind the medal */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full opacity-20 blur-3xl" />

              <div className="space-y-6 relative z-10">
                {/* Massive Animated 3D Spinning Medal Box */}
                <div 
                  className="w-32 h-32 mx-auto bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-300 rounded-full flex items-center justify-center text-6xl shadow-xl shadow-amber-500/20 border-4 border-yellow-250 ring-8 ring-amber-500/20"
                >
                  <span className="drop-shadow-md select-none">{celebrationMedal.icon}</span>
                </div>

                {/* Sparkling title labels */}
                <div className="space-y-1.5">
                  <span 
                    
                    
                    className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[10px] text-amber-600 dark:text-amber-300 font-extrabold uppercase tracking-widest"
                  >
                    🏆 {isAr ? 'تم فتح شارة توثيق جديدة!' : 'New Badge Unlocked!'}
                  </span>
                  <h3 className="font-display font-black text-2xl text-slate-800 dark:text-white tracking-tight leading-snug">
                    {isAr ? celebrationMedal.titleAr : celebrationMedal.titleEn}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 font-semibold px-4 leading-relaxed">
                    {isAr ? celebrationMedal.descAr : celebrationMedal.descEn}
                  </p>
                </div>

                {/* Knowledge XP banner */}
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-6 max-w-xs mx-auto flex items-center justify-between text-right">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">{isAr ? 'الجائزة المضافة:' : 'Reward Added:'}</span>
                  <span className="text-base font-black text-amber-500 dark:text-amber-400 font-mono tracking-tight">+{celebrationMedal.rewardText}</span>
                </div>

                {/* Claim confirmation switch */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setCelebrationMedal(null);
                      playChimeSound('click');
                    }}
                    className="w-full py-3.5 rounded-2.5xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/15 hover:scale-103 active:scale-97 transition-all leading-none focus:outline-none"
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
  currentUserEmail
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
}) {
  const isAr = lang === 'ar';
  
  // Tab control state (1: البيانات الأساسية, 2: إدارة الأمان, 3: تخصيص الواجهة)
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  // Profile fields state
  const [nameInput, setNameInput] = useState(userName);
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [phoneInput, setPhoneInput] = useState(() => {
    if (!currentUserId) return '';
    try {
      return localStorage.getItem(`quiz_user_phone_${currentUserId}`) || '';
    } catch (_) { return ''; }
  });

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
  const [badgeSymbol, setBadgeSymbol] = useState('🛡️');
  const [badgeColor, setBadgeColor] = useState('#3b82f6');
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
          if (stats.badgeSymbol) setBadgeSymbol(stats.badgeSymbol);
          if (stats.badgeColor) setBadgeColor(stats.badgeColor);
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

  const themes = [
    { id: 'indigo', name: isAr ? 'داكن (بنفسجي فضائي)' : 'Space Purple', color: 'from-violet-500 via-purple-600 to-pink-500' },
    { id: 'light', name: isAr ? 'فاتح (أبيض رصين)' : 'Minimalist Light', color: 'from-blue-500 via-indigo-600 to-violet-600' },
    { id: 'sky', name: isAr ? 'داكن (أزرق محيطي)' : 'Ocean Blue', color: 'from-sky-400 via-cyan-500 to-blue-600' },
    { id: 'emerald', name: isAr ? 'داكن (أخضر زمردي)' : 'Emerald Green', color: 'from-emerald-400 via-teal-500 to-green-600' },
    { id: 'sunset', name: isAr ? 'داكن (برتقالي الشمس)' : 'Sunset Orange', color: 'from-orange-400 via-amber-500 to-rose-600' },
    { id: 'pastelp', name: isAr ? 'فاتح (وردي باستيل)' : 'Pastel Pink', color: 'from-pink-300 via-rose-300 to-pink-400' }
  ];

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
        // Save phone to localStorage
        localStorage.setItem(`quiz_user_phone_${currentUserId}`, phoneInput.trim());
        
        // Save via DB helper
        await saveUserProfile(
          currentUserId,
          nameInput.trim(),
          undefined,
          currentUserEmail || undefined,
          bioInput.trim(),
          undefined, // location
          badgeSymbol,
          badgeColor,
          usernameInput.trim()
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
    try {
      if (currentUserId) {
        await saveUserProfile(
          currentUserId,
          nameInput.trim(),
          undefined,
          currentUserEmail || undefined,
          bioInput.trim(),
          undefined,
          badgeSymbol,
          badgeColor,
          usernameInput.trim()
        );
        alert(isAr ? 'تم حفظ تفضيلات الشعار والتخصيص بنجاح!' : 'Branding customization saved successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const tabsConfig = [
    { id: 1 as const, label: isAr ? 'البيانات الأساسية' : 'Basic Details', icon: '📝' },
    { id: 2 as const, label: isAr ? 'إدارة الأمان' : 'Security', icon: '🔒' },
    { id: 3 as const, label: isAr ? 'تخصيص الواجهة' : 'Interface', icon: '🎨' }
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
      <div className="bg-[#0e0a1f]/80 backdrop-blur-2xl border border-[#3d1d6d]/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden min-h-[450px]">
        
        {/* TAB 1: البيانات الأساسية */}
        {activeTab === 1 && (
          <div
            
            
            
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-xl">📝</span>
                <span>{isAr ? 'البيانات الأساسية للملف الشخصي' : 'Basic Profile Information'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'قم بتحديث معلوماتك العامة لتسهيل تواصلك مع الطلاب والمعلمين الآخرين' : 'Keep your identity updated to stay synchronized with classes and teachers'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 block">
                  {isAr ? 'الاسم الكامل:' : 'Full Name / Display Name:'}
                </label>
                <input 
                  type="text" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-950/80 border border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                  placeholder={isAr ? 'أدخل اسمك المعروض' : 'Enter your name'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 block">
                  {isAr ? 'اسم المستخدم (معرّف فريد):' : 'Username / Unique ID:'}
                </label>
                <input 
                  type="text" 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-950/80 border border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                  placeholder={isAr ? 'مثال: ahmed_teacher' : 'e.g. ahmed_teacher'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 block">
                  {isAr ? 'رقم الهاتف المتنقل:' : 'Phone Number:'}
                </label>
                <input 
                  type="tel" 
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-slate-950/80 border border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                  placeholder="+966 50 000 0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 block">
                  {isAr ? 'البريد الإلكتروني (غير قابل للتعديل):' : 'Email Address (Read-only):'}
                </label>
                <input 
                  type="email" 
                  value={currentUserEmail || ''}
                  disabled
                  className="w-full bg-slate-950/40 opacity-60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed"
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-300 block">
                  {isAr ? 'نبذة تعريفية (Bio):' : 'Biography:'}
                </label>
                <textarea 
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950/80 border border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none"
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
              <h3 className="text-lg font-black text-white flex items-center gap-2">
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
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="text-xl">🎨</span>
                  <span>{isAr ? 'تخصيص المظهر وتفضيلات النظام' : 'Visual Customization & System Preferences'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr ? 'اختر السمة اللونية وقم بتهيئة إعدادات الصوت والواجهات الفاخرة' : 'Choose colors, adjust sound effects, and personalize branding options'}
                </p>
              </div>

              {/* Theme color cards */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-300 block">
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
                  {isAr ? 'حدد وساماً مخصصاً ليظهر بجوار اسمك في لوحة الصدارة وتفاصيل الملف' : 'Personalize your profile display symbol and avatar ring color'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">{isAr ? 'رمز وسام التميز:' : 'Custom Distinction Badge Symbol:'}</label>
                  <select
                    value={badgeSymbol}
                    onChange={(e) => setBadgeSymbol(e.target.value)}
                    className="w-full bg-slate-950 border border-[#3d1d6d]/30 focus:border-primary rounded-xl px-4 py-2 text-xs text-white outline-none"
                  >
                    <option value="🛡️">🛡️ Shield Guard</option>
                    <option value="⭐">⭐ Golden Star</option>
                    <option value="🏆">🏆 Champ Trophy</option>
                    <option value="☄️">☄️ Space Comet</option>
                    <option value="🚀">🚀 Space Rocket</option>
                    <option value="💎">💎 Elite Diamond</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">{isAr ? 'لون حلقة الوسام المحيطية:' : 'Distinction Ring Glow Color:'}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      className="w-12 h-9 rounded-xl bg-slate-950 border border-[#3d1d6d]/30 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      className="flex-1 bg-slate-950 border border-[#3d1d6d]/30 focus:border-primary rounded-xl px-3 py-1 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveSpecializedBranding}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black rounded-xl cursor-pointer shadow"
                >
                  {isAr ? 'حفظ خصائص الشعار' : 'Save Distinction Branding'}
                </button>
              </div>
            </div>

            {/* Google Drive connected accounts connection */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-black text-white">{isAr ? 'الحسابات السحابية المرتبطة' : 'Linked Cloud Accounts'}</h4>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr ? 'اربط حساب Google Drive لرفع مخرجات الاختبارات وملفات المراجعة مباشرة لسحابتك' : 'Authorize Google Drive integration to sync materials and student notes instantly'}
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow">
                    <svg className="w-6 h-6" viewBox="0 0 1000 866" xmlns="http://www.w3.org/2000/svg">
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
      bgColor: 'bg-[#facc15]/10 dark:bg-[#facc15]/15',
      borderColor: 'border-[#facc15]',
      textColor: 'text-[#eab308]',
      badge: '👑',
      height: 'h-40 sm:h-48'
    };
    if (rank === 2) return {
      bgColor: 'bg-slate-100/60 dark:bg-slate-400/10',
      borderColor: 'border-slate-350 dark:border-slate-500',
      textColor: 'text-slate-400',
      badge: '🥈',
      height: 'h-32 sm:h-38'
    };
    return {
      bgColor: 'bg-orange-550/10 dark:bg-[#ca8a04]/10',
      borderColor: 'border-orange-500/40 dark:border-[#ca8a04]/60',
      textColor: 'text-orange-500 dark:text-orange-400',
      badge: '🥉',
      height: 'h-28 sm:h-32'
    };
  };

  return (
    <div className="space-y-8 animate-fade-in" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div>
        <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white">{isAr ? '🏆 لوحة الشرف ومنصة التتويج' : 'Laureate Podium & Leaderboard'}</h2>
        <p className="text-xs text-slate-505 dark:text-slate-400 mt-1">{isAr ? 'منصة فخرية مخصصة لأسرع عقول الشروق وأدقهم نتائج في التحديات.' : 'Honoring state-of-the-art scholars with precision completion scores.'}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Top 3 Visual Podium Display */}
          {podiumWinners.length > 0 && (
            <div className="flex flex-col sm:flex-row items-end justify-center gap-4 pt-6 pb-2 select-none">
              {renderPodiumOrder().map((winner, index) => {
                const style = getRankStyle(winner.rank);
                return (
                  <div
                    key={winner.userId || index}
                    
                    
                    
                    
                    className={`w-full sm:w-56 rounded-3xl border ${style.borderColor} ${style.bgColor} p-5 flex flex-col justify-end items-center relative space-y-4 overflow-hidden glow-card shadow-lg shrink-0`}
                    style={{ minHeight: '220px' }}
                  >
                    {/* Background badge identifier */}
                    <div className="absolute top-4 right-4 text-3xl opacity-90 animate-pulse select-none">
                      {style.badge}
                    </div>

                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-full bg-slate-900 border-2 ${winner.rank === 1 ? 'border-yellow-400' : winner.rank === 2 ? 'border-slate-350' : 'border-orange-500'} flex items-center justify-center text-white font-extrabold text-sm shadow-md`}>
                          {winner.userName ? winner.userName.substring(0, 1) : '👤'}
                        </div>
                        <span className="absolute -bottom-1 -right-1 bg-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black border border-slate-855 text-white">
                          #{winner.rank}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center justify-center gap-1">
                          {winner.userName || (isAr ? 'عضو غامض' : 'Mystical Scholar')}
                          <UserBadge tier={winner.userTier || 'free'} showLabel={false} />
                        </h4>
                        <p className="text-[10px] text-slate-505 dark:text-slate-400 font-bold max-w-[140px] truncate">{winner.quizTitle}</p>
                      </div>
                    </div>

                    <div className="w-full bg-slate-50 dark:bg-slate-950/65 py-2.5 px-3 rounded-2xl text-center border border-slate-205 dark:border-slate-800/60 block">
                      <span className="text-sm font-black font-mono text-slate-705 dark:text-white block leading-none">{winner.score}%</span>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-black tracking-wide block mt-1">{winner.elapsedSeconds || 45} {isAr ? 'ثانية حل ⏱' : 'sec solve ⏱'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leaderboard Table/List representing rankings 4+ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl card-3d">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-right" dir={isAr ? 'rtl' : 'ltr'}>
              <h3 className="font-display font-black text-sm text-slate-700 dark:text-slate-250">{isAr ? 'قائمة الصدارة المتكاملة:' : 'Complete Global Scoreboard:'}</h3>
              <span className="text-[9.5px] bg-[#22c55e]/15 text-[#22c55e]/90 font-black py-1 px-3 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
                <span>{isAr ? 'تحديث حي ومباشر' : 'Live Sync Feed'}</span>
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {listItems.map((item, idx) => {
                const displayRank = idx + 4;
                return (
                  <div 
                    key={idx}
                    
                    
                    
                     
                    className="p-4.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    dir={isAr ? 'rtl' : 'ltr'}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-xs font-black w-6 text-center select-none text-slate-400 block">
                        #{displayRank}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-xs text-slate-650 dark:text-white font-extrabold shadow">
                        {item.userName ? item.userName.substring(0,1) : '👤'}
                      </div>
                      <div className="space-y-0.5 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                        <h4 className="text-xs font-black text-slate-805 dark:text-white flex items-center gap-1">
                          {item.userName || (isAr ? 'طالب متميز' : 'Elite Student')}
                          <UserBadge tier={item.userTier || 'free'} showLabel={false} />
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-xs">{isAr ? 'حلّ باقتدار:' : 'Solved:'} {item.quizTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-left" style={{ textAlign: isAr ? 'left' : 'right' }}>
                      <div className="text-right">
                        <span className="text-xs font-black text-indigo-505 dark:text-indigo-400 block font-mono">{item.score}%</span>
                        <span className="text-[9px] text-slate-500 font-bold block">{item.elapsedSeconds || 50} {isAr ? 'ثانية ⏱' : 'sec ⏱'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {boardItems.length === 0 && (
                <p className="p-12 text-center text-xs text-slate-400 select-none">
                  {isAr ? 'لا توجد نتائج مسجلة في لوحة الشرف اليوم بعد.' : 'No entries on the podium today yet.'}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
