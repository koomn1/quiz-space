/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Quiz, QuizCompletion, UserStats, QuestionRating, Promotion, Coupon, SubscriptionPlan, AccountCategory, CouponUsage, Season, SeasonMember, RewardsSummary, RewardLevel, RewardBadge, RewardLedgerEntry, RewardLedgerPage, VipTier, RewardChallenge, DailyGiftStatus, WeeklyTask, WeeklyVipLeaderboardEntry, MotivationUsageSummary, MotivationUsageTab } from '../types';
import { availableBadgeTiers, availableBadgeColors, availableNameColors, normalizeBadgeColor, normalizeBadgeTier, normalizeNameColor, BadgeTier, NameColorKey, BadgeColorKey } from '../components/PremiumNameTag';
import { normalizeKnowledgeDuelPayload, normalizeLearningSeasonPayload, normalizeMotivationUsageSummary, normalizePersonalLearningImprovement, normalizeSmartReviewPayload } from './motivationData';

// System/bot pseudo-accounts (AI AI, admin broadcasts). Every row in
// `users` is required to have a valid UUID `uid` — a trigger
// (sync_users_id) casts uid::uuid on every insert, so plain strings like
// 'admin-cosmo' fail with "invalid input syntax for type uuid". These fixed
// UUIDs are what the matching system user rows must be created with (see
// fix_system_users_fk.sql) — use these constants everywhere instead of the
// old literal strings.
export const COSMO_ADMIN_UID = '00000000-0000-4000-8000-000000000001';
export const COSMO_SYSTEM_UID = '00000000-0000-4000-8000-000000000002';

// ---------------- SUPABASE STORAGE UPLOAD HELPERS ----------------

export async function uploadCoverImage(userId: string, file: File): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `covers/${userId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '31536000',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (error) {
      console.error('Cover upload error:', error.message);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.error('Cover upload exception:', e);
    return null;
  }
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `avatars/${userId}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) {
      console.error('Avatar upload error:', error.message);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.error('Avatar upload exception:', e);
    return null;
  }
}

// ---------------- LOCAL STORAGE FALLBACK HELPERS ----------------
// NOTE: the previous local user mock (MOCK_PROFILES / getLocalUsers / saveLocalUsers)
// was removed. It seeded is_premium:true into localStorage for an "admin" profile and
// checkUserPremiumStatus() read it before ever touching Supabase, which meant premium
// status could be spoofed entirely client-side via devtools. Users are now sourced from
// Supabase exclusively; see checkUserPremiumStatus, getUserProfileStats, getAllProfiles.

// NOTE: seed rows (welcome community post, welcome notification, demo coupons)
// now live in Supabase migrations instead of client-side localStorage fallbacks.
// See 20260725_seed_welcome_community_post.sql and 20260727_seed_welcome_notification.sql.

// ---------------- VERIFIED BADGE / NAME COLOR (SUPABASE DIRECT) ----------------
// Deliberately separate from saveUserProfile: the allowed badge_tier/name_color
// values depend on the user's *current, server-verified* plan, not on anything
// the client claims. We re-read is_premium/plan_name from the DB here rather
// than trusting a prop passed in, so a client can't request a Diamond badge
// while actually on a Free plan.
function planNameToTier(planName: string | null | undefined): 'Free' | 'Silver' | 'Gold' | 'Diamond' {
  const p = (planName || '').toLowerCase();
  if (p.includes('diamond') || p.includes('ماس')) return 'Diamond';
  if (p.includes('gold') || p.includes('ذهب')) return 'Gold';
  if (p.includes('silver') || p.includes('فض')) return 'Silver';
  return 'Free';
}

export async function updateBadgeAndNameColor(
  userId: string,
  badgeTier: BadgeTier,
  nameColor: NameColorKey,
  badgeColor: BadgeColorKey = 'blue'
): Promise<void> {
  if (!userId) return;
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; cannot update badge/name color.');

  const { data: userRow, error: fetchError } = await supabase.from('users').select('is_premium, plan_name').eq('uid', userId).single();
  if (fetchError) {
    console.error('Error verifying plan before badge update:', fetchError);
    throw fetchError;
  }
  if (!userRow?.is_premium) {
    throw new Error('This feature requires an active premium subscription.');
  }

  const plan = planNameToTier(userRow.plan_name);
  if (!availableBadgeTiers(plan).includes(badgeTier)) {
    throw new Error(`Badge tier "${badgeTier}" is not available on the ${plan} plan.`);
  }
  if (!availableNameColors(plan).includes(nameColor)) {
    throw new Error(`Name color "${nameColor}" is not available on the ${plan} plan.`);
  }
  if (!availableBadgeColors(plan).includes(badgeColor)) {
    throw new Error(`Badge color "${badgeColor}" is not available on the ${plan} plan.`);
  }

  // IMPORTANT: this MUST go through the RPC, not a plain
  // supabase.from('users').update(...). A raw client-side update to
  // badge_tier/name_color hits the protect_privileged_user_columns trigger,
  // which silently reverts those two columns back to their old values for
  // any non-admin caller — so the save looked successful but never actually
  // took effect. The RPC sets a transaction-local flag right before its own
  // UPDATE that tells the trigger to let this specific, already-validated
  // write through.
  const { error } = await supabase.rpc('update_badge_and_name_color', {
    p_badge_tier: badgeTier,
    p_name_color: nameColor,
    p_badge_color: badgeColor,
  });
  if (error) {
    console.error('Error updating badge/name color:', error);
    throw error;
  }
}


// Replaces the old global (non-user-scoped!) 'quiz_bookmarks_list' localStorage key.

export async function getBookmarkedQuizIds(userId: string): Promise<string[]> {
  if (!userId || !isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('bookmarks').select('quiz_id').eq('user_id', userId);
  if (error) {
    console.error('Error loading bookmarks:', error);
    return [];
  }
  return (data || []).map((r: any) => r.quiz_id);
}

export async function addBookmark(userId: string, quizId: string): Promise<void> {
  if (!userId || !isSupabaseConfigured) throw new Error('Supabase is not configured; cannot bookmark.');
  const { error } = await supabase.from('bookmarks').insert({ id: crypto.randomUUID(), user_id: userId, quiz_id: quizId });
  if (error && error.code !== '23505') { // ignore unique-violation (already bookmarked)
    console.error('Error adding bookmark:', error.message);
    throw error;
  }
}

export async function removeBookmark(userId: string, quizId: string): Promise<void> {
  if (!userId || !isSupabaseConfigured) throw new Error('Supabase is not configured; cannot remove bookmark.');
  const { error } = await supabase.from('bookmarks').delete().eq('user_id', userId).eq('quiz_id', quizId);
  if (error) {
    console.error('Error removing bookmark:', error.message);
    throw error;
  }
}

// ---------------- QUIZ HANDLERS (SUPABASE DIRECT - replaces the old Express REST calls) ----------------
// Reads/writes go straight to Postgres via the Supabase client. Authorization is enforced by
// the RLS policies in supabase/migrations/0001_init.sql (e.g. "only owner or admin can update"),
// not by a manual getAuthenticatedUser() check like the Express version had.

function mapQuizRow(row: any): Quiz {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    creatorBadgeTier: row.creator_badge_tier || 'none',
    creatorBadgeColor: row.creator_badge_color || 'blue',
    creatorNameColor: row.creator_name_color || 'default',
    questions: row.questions,
    totalPlays: row.total_plays,
    avgRating: row.avg_rating,
    ratingsCount: row.ratings_count,
    timeLimit: row.time_limit,
    createdAt: row.created_at,
    category: row.category,
    classroomId: row.classroom_id || undefined,
  } as Quiz;
}

export const SAMPLE_QUIZZES: Quiz[] = [
  {
    id: 'quiz-ai-intro',
    title: 'اختبار تاريخ الذكاء الاصطناعي والابتكار 🤖',
    description: 'اختبار رائع وممتع لتقييم معرفتك بنشأة الذكاء الاصطناعي وتطوره عبر التاريخ الحديث.',
    creatorId: 'admin-quizspace',
    creatorName: 'فريق QuizSpace',
    totalPlays: 142,
    avgRating: 4.9,
    ratingsCount: 38,
    timeLimit: 60,
    createdAt: new Date().toISOString(),
    category: 'ذكاء اصطناعي',
    questions: [
      {
        id: 'q1',
        text: 'من هو العالم الذي صاغ اختبار التورينج (Turing Test) الشهير للذكاء الاصطناعي؟',
        type: 'mcq',
        options: ['آلان تورينج (Alan Turing)', 'جون ماكارتي', 'إيلون ماسك', 'ستيف جوبز'],
        correctIndex: 0,
        explanation: 'قدم آلان تورينج عام 1950 فكرة اختبار التورينج لقياس قدرة الآلة على التفكير والتفكير البشري.'
      },
      {
        id: 'q2',
        text: 'ما معنى مصطلح LLM في مجالات الذكاء الاصطناعي الحالية؟',
        type: 'mcq',
        options: ['Large Language Model (نموذج لغوي ضخم)', 'Light Logic Machine', 'Linear Learning Method', 'Long Memory Matrix'],
        correctIndex: 0,
        explanation: 'LLM تشير إلى Large Language Model وهي نماذج مدربة على كميات ضخمة من البيانات اللغوية.'
      },
      {
        id: 'q3',
        text: 'أي عام تم فيه إطلاق نموذج ChatGPT لأول مرة للعامة؟',
        type: 'mcq',
        options: ['أواخر عام 2022', 'عام 2020', 'عام 2018', 'عام 2024'],
        correctIndex: 0,
        explanation: 'تم إطلاق ChatGPT بواسطة OpenAI في نوفمبر 2022 وحقق انتشاراً هائلاً على مستوى العالم.'
      }
    ]
  },
  {
    id: 'quiz-web-tech',
    title: 'تحدي البرمجة وتقنيات الويب الحديثة 💻',
    description: 'اختبار شامل حول أحدث تقنيات React, TypeScript و HTML5 للبرمجيات.',
    creatorId: 'admin-quizspace',
    creatorName: 'أكاديمية المطورين',
    totalPlays: 98,
    avgRating: 4.8,
    ratingsCount: 24,
    timeLimit: 90,
    createdAt: new Date().toISOString(),
    category: 'برمجة وتقنية',
    questions: [
      {
        id: 'qw1',
        text: 'ما هي الفائدة الرئيسية لاستخدام TypeScript بدلاً من JavaScript العادية؟',
        type: 'mcq',
        options: ['إضافة الأنواع (Static Typing) واكتشاف الأخطاء مبكراً', 'تسريع تشغيل الكود في المتصفح 10 مرات', 'استبدال ملفات HTML', 'إلغاء الحاجة للسيرفر'],
        correctIndex: 0,
        explanation: 'يوفر TypeScript نظام أنواع ثابت يشخص الأخطاء البرمجية قبل تشغيل الكود.'
      },
      {
        id: 'qw2',
        text: 'في مكتبة React، ما المفهوم المستخدم لإدارة التأثيرات الجانبية (Side Effects)؟',
        type: 'mcq',
        options: ['Hook (useEffect)', 'useState', 'useContext', 'useRef'],
        correctIndex: 0,
        explanation: 'يُستخدم Hook الإيعاز useEffect للتعامل مع العمليات الجانبية مثل جلب البيانات والتنصت على الأحداث.'
      }
    ]
  }
];

export async function getQuizzes(): Promise<Quiz[]> {
  let dbQuizzes: Quiz[] = [];

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching quizzes:', error);
    } else {
      dbQuizzes = (data || []).map(mapQuizRow);
    }
  }

  // Sample quizzes are static demo content, not user data, so they still merge in.
  const map = new Map<string, Quiz>();
  SAMPLE_QUIZZES.forEach(q => map.set(q.id, q));
  dbQuizzes.forEach(q => map.set(q.id, q));

  return Array.from(map.values());
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  if (!id) return null;

  // Daily quizzes are private payloads. Never query public.quizzes for a daily id,
  // otherwise an old published row can win before the current session snapshot.
  const isPrivateDailyQuiz = String(id).startsWith('daily-');
  if (isSupabaseConfigured && !isPrivateDailyQuiz) {
    const { data, error } = await supabase.from('quizzes').select('*').eq('id', id).single();
    if (!error && data) return mapQuizRow(data);
    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching quiz ${id}:`, error);
    }
  }

  const sample = SAMPLE_QUIZZES.find(q => q.id === id);
  if (sample) return sample;
  if (typeof window !== 'undefined') {
    try {
      // Daily payloads are private and intentionally restored only from the
      // current tab snapshot; public rows are never a source for daily ids.
      const stored = JSON.parse(window.sessionStorage.getItem(`quizspace-daily-${id}`) || 'null');
      if (stored && stored.id === id && String(stored.id).startsWith('daily-')) {
        return stored as Quiz;
      }
      if (stored && stored.id === id && !String(id).startsWith('daily-')) return stored as Quiz;
    } catch (e) { console.warn('Could not restore private daily quiz:', e); }
  }
  return null;
}

export async function createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'totalPlays' | 'avgRating' | 'ratingsCount'> & { id?: string; timeLimit?: number }): Promise<Quiz> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot create a quiz.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  const finalId = quiz.id || 'quiz-' + Math.random().toString(36).substring(2, 11);
  const creatorId = user?.id || quiz.creatorId || 'user-guest';
  const creatorName = quiz.creatorName || user?.user_metadata?.name || 'صانع متميز';

  // Snapshot the creator's current badge/name-color choice onto the quiz
  // itself (same pattern already used for community_posts), so the badge
  // set in the profile actually shows up next to the creator's name on
  // every quiz card without an extra join at render time.
  let creatorBadgeTier = 'none';
  let creatorBadgeColor = 'blue';
  let creatorNameColor = 'default';
  if (creatorId) {
    try {
      const { data: creatorRow } = await supabase
        .from('users')
        .select('badge_tier, badge_color, name_color, is_premium')
        .eq('uid', creatorId)
        .maybeSingle();
      if (creatorRow?.is_premium) {
        creatorBadgeTier = creatorRow.badge_tier || 'none';
        creatorBadgeColor = creatorRow.badge_color || 'blue';
        creatorNameColor = creatorRow.name_color || 'default';
      }
    } catch (e) {
      console.warn('Could not fetch creator badge info for new quiz:', e);
    }
  }

  const { data, error } = await supabase.from('quizzes').insert({
    id: finalId,
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions,
    creator_id: creatorId,
    creator_name: creatorName,
    creator_badge_tier: creatorBadgeTier,
    creator_badge_color: creatorBadgeColor,
    creator_name_color: creatorNameColor,
    time_limit: quiz.timeLimit || 0,
    category: quiz.category || 'عام',
    classroom_id: quiz.classroomId || null,
    distribution_routing: quiz.classroomId ? 'classroom' : 'public',
  }).select().single();

  if (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
  if (quiz.classroomId) {
    void sendPushEvent({
      title: '🧠 كويز جديد في فصلك',
      body: `${creatorName} نشر كويزاً جديداً: ${quiz.title}`.slice(0, 180),
      url: `/quiz-space/#/classrooms`,
      category: 'quiz',
      classId: quiz.classroomId,
    });
  }

  // Notify every follower of the creator about the newly published quiz.
  // Followers get a targeted notification row; the creator never receives one.
  void notifyFollowersAboutNewQuiz(finalId, creatorId, creatorName, quiz.title);

  return mapQuizRow(data);
}

async function notifyFollowersAboutNewQuiz(
  quizId: string,
  creatorId: string,
  creatorName: string,
  quizTitle: string,
): Promise<void> {
  try {
    if (!isSupabaseConfigured) return;
    const { data: followerRows, error: followError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', creatorId);
    if (followError) {
      console.warn('Could not list followers for quiz notification:', followError);
      return;
    }
    const followers = (followerRows || [])
      .map(row => row?.follower_id)
      .filter((id): id is string => Boolean(id) && id !== creatorId);
    if (followers.length === 0) return;

    const nowIso = new Date().toISOString();
    const rows = followers.map(followerId => ({
      id: `notif-fq-${creatorId}-${quizId}-${followers.indexOf(followerId)}`,
      user_id: followerId,
      type: 'info' as const,
      title: isArabicContext() ? 'كويز جديد من شخص تتابعه' : 'New quiz from someone you follow',
      body: `${creatorName} نشر كويزاً جديداً: ${quizTitle}`.slice(0, 220),
      sender_name: creatorName || 'System',
      resource_type: 'quiz',
      resource_id: quizId,
      is_read: false,
      created_at: nowIso,
    }));

    const { error: insertError } = await supabase.from('notifications').insert(rows);
    if (insertError) {
      console.warn('Could not create follower quiz notifications:', insertError);
    }
  } catch (e) {
    console.warn('Follower notification failed:', e);
  }
}

function isArabicContext(): boolean {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('quiz-space-lang') : null;
    return stored === 'ar' || (!stored && /ar/.test(typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en'));
  } catch (e) {
    return true;
  }
}

export async function updateQuiz(quizId: string, updatedQuiz: Partial<Quiz>): Promise<void> {
  if (!quizId) return;
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot update quiz.');
  }

  const { error } = await supabase.from('quizzes').update({
    title: updatedQuiz.title,
    description: updatedQuiz.description,
    questions: updatedQuiz.questions,
    time_limit: updatedQuiz.timeLimit,
    category: updatedQuiz.category,
    ...(updatedQuiz.classroomId !== undefined ? {
      classroom_id: updatedQuiz.classroomId || null,
      distribution_routing: updatedQuiz.classroomId ? 'classroom' : 'public',
    } : {}),
  }).eq('id', quizId);
  if (error) {
    console.error('Error updating quiz:', error.message);
    throw error;
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  if (!quizId) return;
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot delete quiz.');
  }

  const { data, error } = await supabase.rpc('delete_owned_quiz', { p_quiz_id: quizId });
  if (error) {
    console.error('Error deleting quiz:', error.message);
    throw error;
  }
  if (data !== true) {
    throw new Error('Quiz was not deleted. You may not own this quiz or it no longer exists.');
  }
}

export async function submitQuizAttempt(
  quizId: string,
  data: {
    takerId: string;
    takerName: string;
    score: number;
    rating?: number;
    feedback?: string;
    totalQuestions?: number;
  }
): Promise<any> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; quiz progress cannot be saved.');
  // Daily challenges are private payloads and intentionally do not exist in quizzes.
  // Use their dedicated RPC so solving them still records XP and completion.
  if (quizId.startsWith('daily-')) {
    const { data: dailyResult, error: dailyError } = await supabase.rpc('submit_user_daily_quiz_attempt', {
      p_quiz_id: quizId,
      p_taker_id: data.takerId,
      p_taker_name: data.takerName,
      p_score: data.score,
      p_total_questions: data.totalQuestions || 1,
      p_rating: data.rating ?? null,
      p_feedback: data.feedback || '',
    });
    if (dailyError) throw dailyError;
    const dailyRow = Array.isArray(dailyResult) ? dailyResult[0] : dailyResult;
    if (!dailyRow?.id) throw new Error('Daily quiz completion was not recorded.');
    // The daily RPC writes the private completion, ledger, balance, and slot
    // atomically because daily quiz IDs do not exist in public.quizzes.
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
    return dailyResult;
  }

  const { data: result, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: quizId,
    p_taker_id: data.takerId,
    p_taker_name: data.takerName,
    p_score: data.score,
    p_rating: data.rating ?? null,
    p_feedback: data.feedback || '',
  });
  if (!error) {
    const completionRow = Array.isArray(result) ? result[0] : result;
    if (completionRow?.id) {
      const { error: rewardError } = await supabase.rpc('award_quiz_completion_rewards', { p_completion_id: completionRow.id });
      if (rewardError) console.warn('Rewards migration is not ready yet:', rewardError.message);
      else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
    }
    return result;
  }

  // Keep older databases usable while the RPC migration is being applied.
  // Never return a fake success: save the completion directly and update XP.
  console.error('submit_quiz_attempt RPC failed; using direct persistence fallback:', error);
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes').select('title, questions').eq('id', quizId).single();
  if (quizError || !quiz) throw error;
  const { data: previousAttempts } = await supabase
    .from('completions').select('score').eq('quiz_id', quizId).eq('taker_id', data.takerId);
  const totalQuestions = Math.max(1, Array.isArray(quiz.questions) ? quiz.questions.length : 1);
  const previousBest = Math.max(0, ...(previousAttempts || []).map((row: any) => Number(row.score) || 0));
  const attemptNumber = (previousAttempts || []).length + 1;
  const xpAwarded = attemptNumber === 1
    ? 10 + Math.max(0, data.score) * 10
    : Math.max(0, data.score - previousBest) * 10;
  const completionId = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const isBest = attemptNumber === 1 || data.score > previousBest;
  if (isBest) {
    const { error: bestError } = await supabase.from('completions').update({ is_best: false })
      .eq('quiz_id', quizId).eq('taker_id', data.takerId);
    if (bestError && bestError.code !== '42703') throw bestError;
  }
  const { error: insertError } = await supabase.from('completions').insert({
    id: completionId, quiz_id: quizId, quiz_title: quiz.title,
    taker_id: data.takerId, taker_name: data.takerName, score: data.score,
    total_questions: totalQuestions, rating: data.rating ?? null, feedback: data.feedback || '',
    attempt_number: attemptNumber, is_best: isBest,
  });
  if (insertError) throw insertError;
  if (xpAwarded > 0) {
    const { data: userRow, error: userReadError } = await supabase
      .from('users').select('xp').eq('uid', data.takerId).single();
    if (userReadError || !userRow) throw userReadError || new Error('User profile not found while awarding XP.');
    const { error: xpError } = await supabase.from('users')
      .update({ xp: (userRow.xp || 0) + xpAwarded }).eq('uid', data.takerId);
    if (xpError) throw xpError;
  }
  const { error: rewardError } = await supabase.rpc('award_quiz_completion_rewards', { p_completion_id: completionId });
  if (rewardError) console.warn('Rewards migration is not ready yet:', rewardError.message);
  else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  return { success: true, fallback: true, xp_awarded: xpAwarded, id: completionId, attempt_number: attemptNumber, is_best: isBest };
}

export async function getRewardsSummary(userId: string): Promise<RewardsSummary> {
  const empty: RewardsSummary = { points: 0, coins: 0, level: 1, dailyStreak: 0, vipTier: 'none', badges: [], recentEntries: [], dailyChallenges: [] };
  if (!userId || !isSupabaseConfigured) return empty;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [balanceRes, levelsRes, badgesRes, earnedRes, ledgerRes, vipRes, challengeRes, giftRes] = await Promise.all([
      supabase.from('user_reward_balances').select('points, coins, level, daily_streak, last_daily_claim, vip_tier').eq('user_id', userId).maybeSingle(),
      supabase.from('reward_levels').select('level, name, name_ar, min_points').order('level'),
      supabase.from('reward_badges').select('id, name, name_ar, description, description_ar, icon, sort_order').order('sort_order'),
      supabase.from('user_reward_badges').select('badge_id, earned_at').eq('user_id', userId).order('earned_at', { ascending: false }),
      supabase.from('reward_points_ledger').select('id, points, coins, event_type, event_key, reference_id, metadata, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(12),
      supabase.from('vip_tiers').select('id, name, name_ar, min_points, points_multiplier, daily_coin_bonus, challenge_slots, color, sort_order').order('min_points'),
      supabase.from('reward_challenge_templates').select('id, name, name_ar, description, description_ar, event_type, target, points_reward, coins_reward, icon, sort_order, is_active').eq('is_active', true).order('sort_order'),
      supabase.from('daily_gift_claims').select('claim_date, day_number, points_reward, coins_reward').eq('user_id', userId).eq('claim_date', today).maybeSingle(),
    ]);
    if (balanceRes.error && balanceRes.error.code !== 'PGRST205') throw balanceRes.error;
    const points = Number(balanceRes.data?.points || 0);
    const level = Number(balanceRes.data?.level || 1);
    const levels: RewardLevel[] = (levelsRes.data || []).map((r: any) => ({ level: r.level, name: r.name, nameAr: r.name_ar, minPoints: r.min_points }));
    const vipTiers: VipTier[] = (vipRes.data || []).map((r: any) => ({ id: r.id, name: r.name, nameAr: r.name_ar, minPoints: Number(r.min_points), pointsMultiplier: Number(r.points_multiplier), dailyCoinBonus: Number(r.daily_coin_bonus), challengeSlots: Number(r.challenge_slots), color: r.color, sortOrder: Number(r.sort_order) }));
    const currentVip = vipTiers.find((v) => v.id === (balanceRes.data?.vip_tier || 'none')) || vipTiers.filter((v) => v.minPoints <= points).at(-1);
    const earnedMap = new Map((earnedRes.data || []).map((r: any) => [r.badge_id, r.earned_at]));
    const badges: RewardBadge[] = (badgesRes.data || []).map((r: any) => ({ id: r.id, name: r.name, nameAr: r.name_ar, description: r.description, descriptionAr: r.description_ar, icon: r.icon, sortOrder: r.sort_order, earnedAt: earnedMap.get(r.id) }));
    const recentEntries: RewardLedgerEntry[] = (ledgerRes.data || []).map((r: any) => ({ id: r.id, points: r.points, coins: Number(r.coins || 0), eventType: r.event_type, eventKey: r.event_key, referenceId: r.reference_id, metadata: r.metadata, createdAt: r.created_at }));
    const claimedKeys = new Set(recentEntries.filter((e) => e.eventType === 'daily_challenge' && e.createdAt.slice(0, 10) === today).map((e) => e.referenceId));
    const dailyChallenges: RewardChallenge[] = (challengeRes.data || []).slice(0, currentVip?.challengeSlots || 3).map((r: any) => ({ id: r.id, name: r.name, nameAr: r.name_ar, description: r.description, descriptionAr: r.description_ar, eventType: r.event_type, target: Number(r.target), pointsReward: Number(r.points_reward), coinsReward: Number(r.coins_reward), icon: r.icon, sortOrder: Number(r.sort_order), isActive: r.is_active, claimed: claimedKeys.has(r.id) }));
    const dailyGift: DailyGiftStatus = { claimed: Boolean(giftRes.data), claimDate: giftRes.data?.claim_date, dayNumber: giftRes.data?.day_number, streak: Number(balanceRes.data?.daily_streak || 0), points: giftRes.data?.points_reward, coins: giftRes.data?.coins_reward };
    return { points, coins: Number(balanceRes.data?.coins || 0), level, dailyStreak: Number(balanceRes.data?.daily_streak || 0), lastDailyClaim: balanceRes.data?.last_daily_claim, vipTier: currentVip?.id || 'none', currentLevel: levels.find((l) => l.level === level), nextLevel: levels.find((l) => l.minPoints > points), currentVip, nextVip: vipTiers.find((v) => v.minPoints > points), badges, recentEntries, dailyGift, dailyChallenges };
  } catch (error) {
    console.warn('Rewards are not available yet:', error);
    return empty;
  }
}

export async function getRewardLedger(userId: string, offset = 0, pageSize = 20): Promise<RewardLedgerPage> {
  if (!userId || !isSupabaseConfigured) return { entries: [], hasMore: false };
  const safeOffset = Math.max(0, offset);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const { data, error } = await supabase
    .from('reward_points_ledger')
    .select('id, points, coins, event_type, event_key, reference_id, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(safeOffset, safeOffset + safePageSize);

  if (error) throw error;
  const rows = data || [];
  return {
    entries: rows.slice(0, safePageSize).map((row: any) => ({
      id: row.id,
      points: Number(row.points || 0),
      coins: Number(row.coins || 0),
      eventType: row.event_type,
      eventKey: row.event_key,
      referenceId: row.reference_id || undefined,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    })),
    hasMore: rows.length > safePageSize,
  };
}

export async function getCurrentWeeklyTasks(): Promise<WeeklyTask[]> {
  const { data, error } = await supabase.rpc('get_current_weekly_tasks');
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name || ''),
    nameAr: String(row.name_ar || row.name || ''),
    description: String(row.description || ''),
    descriptionAr: String(row.description_ar || row.description || ''),
    eventType: String(row.event_type || ''),
    target: Number(row.target || 0),
    pointsReward: Number(row.points_reward || 0),
    coinsReward: Number(row.coins_reward || 0),
    icon: String(row.icon || 'target'),
    sortOrder: Number(row.sort_order || 0),
    progress: Number(row.progress || 0),
    completedAt: row.completed_at || undefined,
    claimedAt: row.claimed_at || undefined,
  }));
}

export async function claimWeeklyTask(taskId: string): Promise<{ claimed: boolean; reason?: string; points?: number; coins?: number; totalPoints?: number }> {
  const { data, error } = await supabase.rpc('claim_weekly_task', { p_task_id: taskId });
  if (error) throw error;
  if (typeof window !== 'undefined' && data?.claimed) {
    window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  }
  return {
    claimed: Boolean(data?.claimed),
    reason: data?.reason || undefined,
    points: Number(data?.points || 0),
    coins: Number(data?.coins || 0),
    totalPoints: Number(data?.total_points || 0),
  };
}

export async function getWeeklyVipLeaderboard(): Promise<WeeklyVipLeaderboardEntry[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('get_weekly_vip_leaderboard');
  if (error) throw error;
  return (data || []).map((row: any) => ({
    leaderboardRank: Number(row.leaderboard_rank || 0),
    userId: String(row.user_id || ''),
    displayName: String(row.display_name || 'Quiz Space Player'),
    photoUrl: row.photo_url || undefined,
    vipTier: String(row.vip_tier || 'none'),
    weeklyPoints: Number(row.weekly_points || 0),
    isMe: Boolean(row.is_me),
  }));
}

export async function claimDailyGift(): Promise<DailyGiftStatus> {
  const { data, error } = await supabase.rpc('claim_daily_gift');
  if (error) throw error;
  return { claimed: Boolean(data?.claimed), claimDate: data?.claim_date, dayNumber: data?.day_number, streak: Number(data?.streak || 0), points: Number(data?.points || 0), coins: Number(data?.coins || 0) };
}

export async function claimDailyChallenge(challengeId: string): Promise<{ claimed: boolean; points?: number; coins?: number; totalPoints?: number }> {
  const { data, error } = await supabase.rpc('claim_daily_challenge', { p_challenge_id: challengeId });
  if (error) throw error;
  return { claimed: Boolean(data?.claimed), points: Number(data?.points || 0), coins: Number(data?.coins || 0), totalPoints: Number(data?.total_points || 0) };
}

// ---------------- PROFILE STATS & MANAGEMENT HANDLERS ----------------

export async function getUserProfileStats(userId: string): Promise<UserStats> {
  const empty: UserStats = {
    userId: userId || '',
    name: '',
    email: '',
    photoURL: '',
    isPremium: false,
    planName: 'Free',
    planId: undefined,
    renewalDate: undefined,
    isLifetime: false,
    isFounder: false,
    isSuspended: false,
    categoryId: undefined,
    bio: '',
    location: '',
    createdQuizzes: [],
    completions: []
  } as UserStats;
  if (!userId || !isSupabaseConfigured) return empty;

  try {
    const { data: userRow, error: userError } = await supabase.from('users').select('*').eq('uid', userId).single();
    if (userError) console.error(`Error loading profile for ${userId}:`, userError.message);
    const { data: createdQuizzes } = await supabase.from('quizzes').select('*').eq('creator_id', userId).order('created_at', { ascending: false });
    const { data: completions } = await supabase.from('completions').select('*').eq('taker_id', userId).order('created_at', { ascending: false });

    return {
      userId,
      customId: userRow?.custom_id || '',
      name: userRow?.name || '',
      email: userRow?.email || '',
      photoURL: userRow?.photo_url || '',
      isPremium: userRow?.is_premium || false,
      planName: userRow?.plan_name || 'Free',
      planId: userRow?.plan_id || undefined,
      renewalDate: userRow?.renewal_date || undefined,
      isLifetime: userRow?.is_lifetime || false,
      isFounder: userRow?.is_founder || false,
      isSuspended: userRow?.is_suspended || false,
      categoryId: userRow?.category_id || undefined,
      bio: userRow?.bio || '',
      location: userRow?.location || '',
      phone: userRow?.phone || '',
      activeFrameId: userRow?.active_frame_id || '',
      isAdmin: userRow?.is_admin || false,
      // Never surface a badge/color for a non-premium user, even if the row
      // still has a stale value from a lapsed subscription.
      badgeTier: userRow?.is_premium ? normalizeBadgeTier(userRow?.badge_tier) : 'none',
      nameColor: userRow?.is_premium ? normalizeNameColor(userRow?.name_color) : 'default',
      badgeColor: userRow?.is_premium ? normalizeBadgeColor(userRow?.badge_color) : 'blue',
      xp: userRow?.xp || 0,
      createdQuizzes: (createdQuizzes || []).map(mapQuizRow),
      completions: completions || [],
    } as UserStats;
  } catch (e) {
    console.error('Error loading user profile stats:', e);
    return empty;
  }
}

export async function saveUserProfile(
  userId: string,
  name: string,
  photoURL?: string,
  email?: string,
  bio?: string,
  location?: string,
  badgeSymbol?: string,
  badgeColor?: string,
  customId?: string,
  planId?: string,
  isPremium?: boolean,
  planName?: string,
  isLifetime?: boolean,
  isFounder?: boolean,
  isSuspended?: boolean,
  categoryId?: string,
  renewalDate?: string,
  phone?: string,
  gender?: 'male' | 'female',
  birthdate?: string,
  onboarded?: boolean,
  activeFrameId?: string,
): Promise<void> {
  if (!userId) return;
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot save user profile.');
  }

  const updatedUser: any = {
    uid: userId,
    id: userId,
    name,
    email: email || '',
    bio: bio || '',
    location: location || '',
    // Guarded like custom_id: only touch these when the caller explicitly
    // provides them, so an unrelated name/bio save can't wipe out the badge
    // color that update_badge_and_name_color() set separately.
    badge_symbol: badgeSymbol !== undefined ? badgeSymbol : undefined,
    badge_color: badgeColor !== undefined ? badgeColor : undefined,
    // Preserve existing username if caller doesn't provide one.
    custom_id: customId !== undefined ? customId : undefined,
    active_frame_id: activeFrameId !== undefined ? activeFrameId : undefined,
    updated_at: new Date().toISOString(),
  };

  // Extract customBg from location if possible to ensure DB field stays in sync if needed,
  // though location currently stores the full serialized string.
  if (location && location.includes('||customBg:')) {
    const match = location.match(/\|\|customBg:([^|]*)/);
    if (match && match[1]) {
      updatedUser.cover_url = match[1];
    }
  }

  if (onboarded !== undefined) updatedUser.onboarded = onboarded;
  if (planId !== undefined) updatedUser.plan_id = planId;
  if (isPremium !== undefined) updatedUser.is_premium = isPremium;
  if (planName !== undefined) updatedUser.plan_name = planName;
  if (isLifetime !== undefined) updatedUser.is_lifetime = isLifetime;
  if (isFounder !== undefined) updatedUser.is_founder = isFounder;
  if (isSuspended !== undefined) updatedUser.is_suspended = isSuspended;
  if (categoryId !== undefined) updatedUser.category_id = categoryId;
  if (renewalDate !== undefined) updatedUser.renewal_date = renewalDate;
  if (phone !== undefined) updatedUser.phone = phone;
  if (gender !== undefined) updatedUser.gender = gender;
  if (birthdate !== undefined) updatedUser.birthdate = birthdate;
  if (onboarded !== undefined) updatedUser.onboarded = onboarded;

  // Preserve server-side entitlement fields when a generic profile save is made.
  // A broad upsert from an old/stale client payload can otherwise overwrite a
  // freshly redeemed subscription with Free/default values.
  const { data: existingProfile, error: lookupError } = await supabase
    .from('users')
    .select('photo_url')
    .eq('uid', userId)
    .maybeSingle();
  if (lookupError) {
    console.error(`Error checking existing user profile for ${userId}:`, lookupError.message);
    throw lookupError;
  }

  // Apply photo_url logic: preserve existing photo unless caller provides new one
  if (existingProfile) {
    if (photoURL !== undefined && photoURL !== '') {
      updatedUser.photo_url = photoURL;
    } else if (existingProfile.photo_url) {
      updatedUser.photo_url = existingProfile.photo_url;
    } else {
      updatedUser.photo_url = photoURL || '';
    }
  } else {
    updatedUser.photo_url = photoURL || '';
  }

  const { error } = existingProfile
    ? await supabase.from('users').update(updatedUser).eq('uid', userId)
    : await supabase.from('users').insert(updatedUser);
  if (error) {
    console.error(`Error saving user profile for ${userId}:`, error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// AI chat history — persisted per-user in Supabase so the conversation
// survives clearing the browser or logging in from another device. Only
// text is stored (not raw image bytes, to avoid bloating the table); a
// message that had an image attached is flagged with had_image.
// ---------------------------------------------------------------------------
export interface AIMessageRow {
  id: string;
  role: 'user' | 'cosmo';
  text: string;
  hadImage: boolean;
  createdAt: string;
}

export interface AIChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAIChatConversations(userId: string): Promise<AIChatConversation[]> {
  if (!userId || !isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('cosmo_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('Error loading AI conversations:', error.message);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createAIChatConversation(userId: string, title?: string): Promise<AIChatConversation | null> {
  if (!userId || !isSupabaseConfigured) return null;
  const id = 'conv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const { data, error } = await supabase
    .from('cosmo_conversations')
    .insert({ id, user_id: userId, title: title || 'محادثة جديدة' })
    .select('id, title, created_at, updated_at')
    .single();
  if (error) {
    console.error('Error creating AI conversation:', error.message);
    return null;
  }
  return { id: data.id, title: data.title, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function renameAIChatConversation(conversationId: string, title: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('cosmo_conversations').update({ title }).eq('id', conversationId);
  if (error) console.error('Error renaming AI conversation:', error.message);
}

export async function deleteAIChatConversation(conversationId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('cosmo_conversations').delete().eq('id', conversationId);
  if (error) console.error('Error deleting AI conversation:', error.message);
}

export async function getAIChatHistory(userId: string, conversationId?: string, limit = 200): Promise<AIMessageRow[]> {
  if (!userId || !isSupabaseConfigured) return [];
  let query = supabase
    .from('cosmo_messages')
    .select('id, role, text, had_image, created_at')
    .eq('user_id', userId);
  query = conversationId ? query.eq('conversation_id', conversationId) : query.is('conversation_id', null);
  const { data, error } = await query.order('created_at', { ascending: true }).limit(limit);
  if (error) {
    console.error('Error loading AI history:', error.message);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    role: row.role,
    text: row.text,
    hadImage: !!row.had_image,
    createdAt: row.created_at,
  }));
}

export async function saveAIChatMessage(userId: string, role: 'user' | 'cosmo', text: string, hadImage = false, conversationId?: string): Promise<void> {
  if (!userId || !isSupabaseConfigured) return;
  const { error } = await supabase.from('cosmo_messages').insert({
    user_id: userId,
    role,
    text,
    had_image: hadImage,
    conversation_id: conversationId || null,
  });
  if (error) {
    console.error('Error saving AI message:', error.message);
  }
}

export async function clearAIChatHistory(userId: string): Promise<void> {
  if (!userId || !isSupabaseConfigured) return;
  const { error } = await supabase.from('cosmo_messages').delete().eq('user_id', userId);
  if (error) {
    console.error('Error clearing AI history:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Daily quiz — one shared, auto-regenerating quiz per subscription tier.
// Diamond refreshes every minute, Gold every hour, Free every 24 hours.
// ---------------------------------------------------------------------------
export type DailyQuizTier = 'free' | 'gold' | 'diamond';

export interface DailyQuizSlot {
  quizId: string | null;
  quizPayload?: Quiz | null;
  refreshing: boolean;
  refreshedAt: string | null;
  refreshIntervalSeconds: number;
  secondsUntilRefresh: number;
  answered: boolean;
}

export function planNameToDailyQuizTier(planName?: string, isPremium?: boolean): DailyQuizTier {
  const p = (planName || '').toLowerCase();
  if (p.includes('diamond') || p.includes('الماسي') || p.includes('الماسية')) return 'diamond';
  if (p.includes('gold') || p.includes('الذهبي') || p.includes('الذهبية')) return 'gold';
  // Some older profiles only have isPremium=true and no plan_name. Treat
  // those paid profiles as Gold instead of silently giving them the free timer.
  if (isPremium) return 'gold';
  return 'free';
}

export async function getUserDailyQuizSlot(userId: string, tier: DailyQuizTier): Promise<DailyQuizSlot | null> {
  if (!userId || !isSupabaseConfigured) return null;

  // The RPC validates auth.uid() against p_user_id. Resolve the current
  // Supabase session first so a stale profile id can never produce a false
  // "service unavailable" state.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const authenticatedUserId = authData.user?.id;
  if (authError || !authenticatedUserId) {
    console.error('Daily quiz requires an authenticated Supabase session:', authError?.message || 'No session');
    return null;
  }
  const effectiveUserId = authenticatedUserId === userId ? userId : authenticatedUserId;
  const { data, error } = await supabase.rpc('get_user_daily_quiz_slot', { p_user_id: effectiveUserId, p_tier: tier });
  const row: any = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    console.error('Error loading user daily quiz slot:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      tier,
    });
    return null;
  }
  const nextAvailableMs = row.next_available_at ? new Date(row.next_available_at).getTime() : 0;
  const calculatedSeconds = nextAvailableMs > Date.now()
    ? Math.ceil((nextAvailableMs - Date.now()) / 1000)
    : 0;
  const rawSeconds = Number(row.seconds_until_refresh);
  return {
    quizId: row.quiz_id || row.quiz_payload?.id || null,
    quizPayload: row.quiz_payload || null,
    refreshing: !!row.refreshing,
    refreshedAt: row.generated_at || null,
    refreshIntervalSeconds: Number(row.refresh_interval_seconds) || 86400,
    secondsUntilRefresh: Number.isFinite(rawSeconds) && rawSeconds > 0 ? rawSeconds : calculatedSeconds,
    answered: !!row.answered_at,
  };
}

export async function resetLegacyDailyQuizSlot(userId: string, tier: DailyQuizTier): Promise<boolean> {
  if (!userId || !isSupabaseConfigured) return false;
  const { data: authData } = await supabase.auth.getUser();
  const effectiveUserId = authData.user?.id || userId;
  const { data, error } = await supabase.rpc('reset_legacy_daily_quiz_slot', { p_user_id: effectiveUserId, p_tier: tier });
  if (error) { console.error('Error resetting legacy daily quiz slot:', error.message); return false; }
  return !!data;
}

export async function claimUserDailyQuizRefresh(userId: string, tier: DailyQuizTier): Promise<boolean> {
  if (!userId || !isSupabaseConfigured) return false;
  const { data: authData } = await supabase.auth.getUser();
  const effectiveUserId = authData.user?.id || userId;
  const { data, error } = await supabase.rpc('claim_user_daily_quiz_refresh', { p_user_id: effectiveUserId, p_tier: tier });
  if (error) { console.error('Error claiming user daily quiz refresh:', error.message); return false; }
  return !!data;
}

export async function finalizeUserDailyQuizRefresh(userId: string, tier: DailyQuizTier, quizPayload: Quiz): Promise<void> {
  if (!userId || !isSupabaseConfigured) return;
  const { data: authData } = await supabase.auth.getUser();
  const effectiveUserId = authData.user?.id || userId;
  const { error } = await supabase.rpc('finalize_user_daily_quiz_refresh', { p_user_id: effectiveUserId, p_tier: tier, p_quiz_payload: quizPayload });
  if (error) throw error;
}

export async function releaseUserDailyQuizRefresh(userId: string, tier: DailyQuizTier): Promise<void> {
  if (!userId || !isSupabaseConfigured) return;
  const { data: authData } = await supabase.auth.getUser();
  const effectiveUserId = authData.user?.id || userId;
  const { error } = await supabase.rpc('release_user_daily_quiz_refresh', { p_user_id: effectiveUserId, p_tier: tier });
  if (error) console.error('Error releasing user daily quiz refresh:', error.message);
}
export async function completeUserDailyQuiz(userId: string, quizId: string): Promise<boolean> {
  if (!userId || !quizId || !isSupabaseConfigured) return false;
  const { data: authData } = await supabase.auth.getUser();
  const effectiveUserId = authData.user?.id || userId;
  const { data, error } = await supabase.rpc('complete_user_daily_quiz', { p_user_id: effectiveUserId, p_quiz_id: quizId });
  if (error) {
    console.error('Error completing user daily quiz:', { message: error.message, code: error.code, details: error.details, quizId });
    return false;
  }
  if (!data) console.warn('Daily quiz completion did not match an open private slot:', quizId);
  return !!data;
}

export async function getDailyQuizSlot(tier: DailyQuizTier): Promise<DailyQuizSlot | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_user_daily_quiz_slot', { p_tier: tier }).maybeSingle();
  if (error || !data) {
    console.error('Error loading daily quiz slot:', error?.message);
    return null;
  }
  return {
    quizId: (data as any).quiz_id,
    refreshing: (data as any).refreshing,
    refreshedAt: (data as any).refreshed_at,
    refreshIntervalSeconds: (data as any).refresh_interval_seconds,
    secondsUntilRefresh: (data as any).seconds_until_refresh || 0,
    answered: !!(data as any).answered_at,
  };
}

// Returns true if the caller "won" the right to generate a fresh daily
// quiz for this tier right now (nobody else is already regenerating and
// the previous quiz has actually expired).
export async function claimDailyQuizRefresh(tier: DailyQuizTier): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase.rpc('claim_user_daily_quiz_refresh', { p_tier: tier });
  if (error) {
    console.error('Error claiming daily quiz refresh:', error.message);
    return false;
  }
  return !!data;
}

export async function finalizeDailyQuizRefresh(tier: DailyQuizTier, quizId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('finalize_user_daily_quiz_refresh', { p_tier: tier, p_quiz_id: quizId });
  if (error) console.error('Error finalizing daily quiz refresh:', error.message);
}

// Called if generation fails after claiming, so the slot doesn't stay
// stuck on "refreshing" forever and block every other tab/user.
export async function releaseDailyQuizRefresh(tier: DailyQuizTier): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('release_user_daily_quiz_refresh', { p_tier: tier });
  if (error) console.error('Error releasing daily quiz refresh:', error.message);
}

export async function checkUserPremiumStatus(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (!isSupabaseConfigured) return false;

  try {
    const { data, error } = await supabase.from('users').select('is_premium').eq('uid', userId).single();
    if (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
    return !!data?.is_premium;
  } catch (e) {
    console.error('Error checking premium status:', e);
    return false;
  }
}

// ---------------- PREMIUM TRIAL ACTIVATION REQUEST HANDLERS (SUPABASE DIRECT) ----------------

export async function createPremiumRequest(requestId: string, reqData: any): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; cannot submit premium request.');
  const { error } = await supabase.from('premium_requests').insert({
    id: requestId,
    user_id: reqData.userId,
    name: reqData.name,
    email: reqData.email,
    plan_name: reqData.planName,
    payment_screenshot: reqData.paymentScreenshot,
    status: reqData.status || 'pending',
  });
  if (error) {
    console.error('Error creating premium request:', error.message);
    throw error;
  }
}

export async function getPremiumRequests(userId?: string): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from('premium_requests').select('*');
  if (userId) {
    query = query.eq('user_id', userId);
  }
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) {
    console.error('Error getting premium requests:', error);
    throw error;
  }
  return (data || []).map((row: any) => ({
    ...row,
    userId: row.user_id || row.userId,
    planName: row.plan_name || row.planName,
    paymentScreenshot: row.payment_screenshot || row.paymentScreenshot,
    rejectReason: row.reject_reason || row.rejectReason,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  }));
}

// ---------------- USER SESSIONS HANDLERS (SUPABASE DIRECT) ----------------

export async function recordUserSession(
  userId: string,
  device: string,
  userAgent?: string,
  ipAddress?: string,
  location?: string
): Promise<string | null> {
  if (!userId || !isSupabaseConfigured) return null;
  try {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { error } = await supabase.from('user_sessions').insert({
      id: sessionId,
      user_id: userId,
      device,
      user_agent: userAgent || null,
      ip_address: ipAddress || null,
      location: location || null,
      last_active: new Date().toISOString(),
    });
    if (error) {
      console.warn('Could not record user session to Supabase:', error.message);
      return null;
    }
    return sessionId;
  } catch (e) {
    console.warn('User session record exception:', e);
    return null;
  }
}

export async function getUserSessions(userId: string): Promise<any[]> {
  if (!userId || !isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_active', { ascending: false });

    if (error) {
      console.warn('Error fetching user sessions from Supabase:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      device: row.device,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      location: row.location,
      lastActive: row.last_active,
      createdAt: row.created_at,
    }));
  } catch (e) {
    console.warn('Exception fetching user sessions:', e);
    return [];
  }
}

export async function terminateUserSession(sessionId: string, userId: string): Promise<boolean> {
  if (!sessionId || !userId || !isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error terminating session:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception terminating session:', e);
    return false;
  }
}

export async function updatePremiumRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  userId: string,
  rejectReason?: string,
  planName?: string,
  planId?: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot update premium request.');
  }

  const { error: reqError } = await supabase.from('premium_requests').update({
    status, reject_reason: rejectReason, updated_at: new Date().toISOString(),
  }).eq('id', requestId);
  if (reqError) {
    console.error('Error updating premium activation status:', reqError.message);
    throw reqError;
  }

  const userUpdate = status === 'approved'
    ? {
        is_premium: true,
        plan_name: planName || 'الباقة الذهبية لمعلمي المستقبل (مفعّلة)',
        plan_id: planId || null,
        is_lifetime: planId === 'lifetime',
        is_founder: planId === 'diamond',
        renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    : {
        is_premium: false,
        plan_name: 'Free',
        plan_id: null,
        is_lifetime: false,
        is_founder: false,
        renewal_date: null,
      };

  const { error: userError } = await supabase.from('users').update(userUpdate).eq('uid', userId);
  if (userError) {
    console.error('Error updating user premium status:', userError.message);
    throw userError;
  }
}

// ---------------- CLASSIFIED QUESTION RATINGS HANDLERS (SUPABASE DIRECT) ----------------

export async function rateQuestion(
  userId: string,
  quizId: string,
  quizTitle: string,
  questionId: string,
  questionText: string,
  ratingValue: 'like' | 'dislike'
): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('question_ratings').upsert({
        id: `${userId}_${questionId}`,
        user_id: userId, quiz_id: quizId, quiz_title: quizTitle,
        question_id: questionId, question_text: questionText, rating_value: ratingValue,
      });
      if (error) console.error('Error in rateQuestion:', error.message);
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
}

export async function getUserRatedQuestions(userId: string): Promise<QuestionRating[]> {
  if (!userId) return [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('question_ratings').select('*').eq('user_id', userId);
      if (!error && data) return data;
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

// ---------------- MARKETING PROMOTIONS SYSTEMS (SUPABASE DIRECT) ----------------

export async function getPromotions(): Promise<Promotion[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('promotions').select('*').eq('is_active', true);
      if (!error && data) return data;
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

export async function savePromotion(promo: Promotion): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('promotions').upsert(promo as any);
      if (error) console.error('Error saving promotion:', error.message);
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
}

export async function deletePromotion(promoId: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', promoId);
      if (error) console.error('Error deleting promotion:', error.message);
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
}

// ---------------- COUPONS CODES REDUCTIONS (SUPABASE DIRECT) ----------------

export async function getCoupons(): Promise<Coupon[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('coupon_codes').select('*');
  if (error) {
    console.error('Error loading coupons:', error);
    throw error;
  }
  // AdminSubscriptions.tsx reads the camelCase names (c.applicablePlans, etc.)
  // while the DB row comes back snake_case — alias both so existing UI code
  // that reads either casing keeps working.
  return (data || []).map((row: any) => ({
    ...row,
    discountPercent: row.discount_percent,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiryDate: row.expiry_date,
    isActive: row.is_active,
    createdAt: row.created_at,
    applicablePlans: row.applicable_plans,
  }));
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  if (!code || !isSupabaseConfigured) return null;
  const cleanedCode = code.trim().toUpperCase();
  let data: any = null;
  let error: any = null;
  ({ data, error } = await supabase.rpc('get_coupon_by_code', { p_code: cleanedCode }));

  // Keep coupon validation resilient if an older deployed RPC is unavailable;
  // coupon_codes is intentionally readable through RLS for coupon validation.
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    if (error) console.error('RPC coupon lookup failed; using direct lookup:', error);
    const byCode = await supabase
      .from('coupon_codes')
      .select('*')
      .ilike('code', cleanedCode)
      .limit(1)
      .maybeSingle();
    if (!byCode.data && !byCode.error) {
      const byId = await supabase
        .from('coupon_codes')
        .select('*')
        .ilike('id', cleanedCode)
        .limit(1)
        .maybeSingle();
      data = byId.data;
      error = byId.error;
    } else {
      data = byCode.data;
      error = byCode.error;
    }
  }

  if (error) {
    console.error('Error looking up coupon:', error);
    return null;
  }
  // get_coupon_by_code is declared as RETURNS SETOF coupon_codes, so
  // Supabase returns an array even though the lookup is limited to one row.
  // Normalize it here so every caller receives the documented Coupon object.
  const row: any = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    ...row,
    discountPercent: row.discountPercent ?? row.discount_percent,
    maxUses: row.maxUses ?? row.max_uses,
    usedCount: row.usedCount ?? row.used_count,
    expiryDate: row.expiryDate ?? row.expiry_date,
    isActive: row.isActive ?? row.is_active,
    createdAt: row.createdAt ?? row.created_at,
    applicablePlans: row.applicablePlans ?? row.applicable_plans,
  } as Coupon;
}

export async function saveCoupon(coupon: Coupon): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; cannot save coupon.');
  // coupon_codes only has snake_case columns (discount_percent, max_uses, ...),
  // but callers (e.g. AdminSubscriptions.tsx) build the object with camelCase
  // keys. Upserting the object as-is sent unknown columns like "applicablePlans"
  // straight to PostgREST, which rejected the whole request — that's the
  // "حدث خطأ أثناء حفظ الكود" error. Normalize to snake_case here so either
  // casing works.
  const row: any = {
    id: coupon.id,
    code: coupon.code,
    discount_percent: coupon.discountPercent ?? coupon.discount_percent ?? 0,
    max_uses: coupon.maxUses ?? coupon.max_uses ?? 0,
    used_count: coupon.usedCount ?? coupon.used_count ?? 0,
    expiry_date: coupon.expiryDate ?? coupon.expiry_date ?? null,
    is_active: coupon.isActive ?? coupon.is_active ?? true,
    created_at: coupon.createdAt ?? coupon.created_at ?? new Date().toISOString(),
    applicable_plans: coupon.applicablePlans ?? coupon.applicable_plans ?? 'silver,gold,diamond',
  };
  const { error } = await supabase.rpc('admin_save_coupon', { p_coupon: row });
  if (error) {
    console.error('Error saving coupon via admin RPC:', error.message);
    throw error;
  }
}

export async function deleteCoupon(couponId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; cannot delete coupon.');
  const { error } = await supabase.rpc('admin_delete_coupon', { p_coupon_id: couponId });
  if (error) {
    console.error('Error deleting coupon via admin RPC:', error.message);
    throw error;
  }
}

// ---------------- SCORE METRICS INTEGRATION (SUPABASE DIRECT) ----------------

export async function getBestScoreByQuizId(quizId: string): Promise<number> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from('completions').select('score').eq('quiz_id', quizId).order('score', { ascending: false }).limit(1).single();
      return data?.score ?? 0;
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return 0;
}

function mapCompletionRow(row: any): QuizCompletion {
  return {
    id: row.id,
    quizId: row.quiz_id ?? row.quizId ?? '',
    quizTitle: row.quiz_title ?? row.quizTitle ?? '',
    takerId: row.taker_id ?? row.takerId ?? '',
    takerName: row.taker_name ?? row.takerName ?? '',
    score: Number(row.score ?? 0),
    totalQuestions: Number(row.total_questions ?? row.totalQuestions ?? 0),
    rating: row.rating ?? undefined,
    feedback: row.feedback ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

export async function getCompletionsByQuizId(quizId: string): Promise<QuizCompletion[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('completions').select('*').eq('quiz_id', quizId).order('created_at', { ascending: false });
      if (!error && data) return data.map(mapCompletionRow);
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

export async function getQuizTakersUnique(quizId: string): Promise<QuizCompletion[]> {
  // Returns one row per solver: best score + attempt count (deduplicates repeat solvers)
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_quiz_takers_unique', { p_quiz_id: quizId });
      if (!error && data) {
        return (data as any[]).map(row => ({
          id: `unique-${row.taker_id}-${row.last_attempt_at}`,
          quizId: quizId,
          quizTitle: '',
          takerId: row.taker_id,
          takerName: row.taker_name,
          score: row.best_score,
          totalQuestions: row.total_questions,
          rating: row.rating,
          feedback: '',
          attemptNumber: row.attempts_count,
          isBest: true,
          createdAt: row.last_attempt_at,
        }));
      }
    } catch (e) { console.warn('get_quiz_takers_unique RPC failed, falling back to client dedup:', e); }
  }
  // Client-side fallback: group by taker_id, keep latest
  const all = await getCompletionsByQuizId(quizId);
  const map = new Map<string, QuizCompletion>();
  for (const comp of all) {
    const existing = map.get(comp.takerId);
    if (!existing || (comp.createdAt && comp.createdAt > existing.createdAt)) {
      map.set(comp.takerId, comp);
    }
  }
  return Array.from(map.values());
}

export async function getSiteStats(): Promise<any> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_site_stats');
      if (!error && data) return data;
    } catch (e) { console.warn('get_site_stats RPC failed:', e); }
  }
  return null;
}

export async function getRecentCompletions(limitCount = 10): Promise<QuizCompletion[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('completions').select('*').order('created_at', { ascending: false }).limit(limitCount);
      if (!error && data) return data.map(mapCompletionRow);
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

// ---------------- SOCIAL: MOODS & COMMUNITY NETWORK POSTS (SUPABASE DIRECT / LOCAL FALLBACK) ----------------

function mapCommunityPostRow(row: any): any {
  return {
    id: row.id,
    text: row.text,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    likes: row.likes || 0,
    likedBy: row.liked_by || [],
    authorBadgeSymbol: row.author_badge_symbol || '',
    authorBadgeColor: row.author_badge_color || '',
    authorBadgeTier: row.author_badge_tier || 'none',
    authorNameColor: row.author_name_color || 'default',
    viewsCount: row.views_count || 0,
    viewers: row.viewers || [],
  };
}

export async function getCommunityPosts(): Promise<any[]> {
  if (!isSupabaseConfigured) {
    console.error('Supabase is not configured; community posts require a database connection.');
    return [];
  }
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to load community posts:', error);
    throw error;
  }
  // NOTE: previously this returned raw snake_case Supabase rows directly, but
  // the rendering code reads camelCase fields (post.authorName, post.likedBy,
  // etc.) - meaning author name/badge/likes were silently never displaying
  // correctly for real (non-cached) posts. Mapping fixes that.
  return (data || []).map(mapCommunityPostRow);
}

export async function createCommunityPost(
  text: string,
  authorId: string,
  authorName: string,
  authorBadgeSymbol?: string,
  authorBadgeColor?: string,
  authorBadgeTier?: BadgeTier,
  authorNameColor?: NameColorKey
): Promise<any> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot create a community post.');
  }
  const newPost = {
    id: 'cp-' + Math.random().toString(36).substring(2, 11),
    text,
    author_id: authorId,
    author_name: authorName,
    author_badge_symbol: authorBadgeSymbol || '',
    author_badge_color: authorBadgeColor || '',
    author_badge_tier: authorBadgeTier || 'none',
    author_name_color: authorNameColor || 'default',
    likes: 0,
    liked_by: [],
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('community_posts').insert(newPost).select().single();
  if (error) {
    console.error('Failed to create community post:', error);
    throw error;
  }
  return mapCommunityPostRow(data);
}

export async function likeCommunityPost(postId: string, userId: string): Promise<any> {
  if (!isSupabaseConfigured) {
  }
  // Uses the toggle_post_like RPC defined in the 20260723 migration so the
  // like/unlike toggle happens atomically in Postgres instead of a local mirror.
  const { data, error } = await supabase.rpc('toggle_post_like', {
    p_post_id: postId,
    p_user_id: userId
  });
  if (error) {
    console.error('Failed to toggle post like:', error);
    throw error;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Community post reactions — six reaction types instead of a single like.
// ---------------------------------------------------------------------------
export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'fire';

export interface PostReactionResult {
  counts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
}

export async function togglePostReaction(postId: string, reaction: ReactionType): Promise<PostReactionResult> {
  const { data, error } = await supabase.rpc('toggle_post_reaction', {
    p_post_id: postId,
    p_reaction: reaction,
  });
  if (error) {
    console.error('Failed to toggle post reaction:', error);
    throw error;
  }
  return {
    counts: data?.counts || {},
    myReaction: data?.myReaction ?? data?.my_reaction ?? null,
  };
}

// Batch-load reaction breakdowns + the current user's own reaction for a
// list of posts in one round trip (used when the community feed first loads).
export async function getReactionsForPosts(
  postIds: string[],
  currentUserId?: string
): Promise<Record<string, PostReactionResult>> {
  if (!isSupabaseConfigured || postIds.length === 0) return {};
  const { data, error } = await supabase
    .from('post_reactions')
    .select('post_id, user_id, reaction')
    .in('post_id', postIds);
  if (error) {
    console.error('Failed to load post reactions:', error.message);
    return {};
  }
  const result: Record<string, PostReactionResult> = {};
  for (const row of data || []) {
    if (!result[row.post_id]) result[row.post_id] = { counts: {}, myReaction: null };
    const entry = result[row.post_id];
    entry.counts[row.reaction as ReactionType] = (entry.counts[row.reaction as ReactionType] || 0) + 1;
    if (currentUserId && row.user_id === currentUserId) {
      entry.myReaction = row.reaction as ReactionType;
    }
  }
  return result;
}

export async function deleteCommunityPost(postId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot delete a community post.');
  }
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) {
    console.error('Failed to delete community post:', error);
    throw error;
  }
  return true;
}

// ---------------- COMMUNICATION: CHATS & DIRECT MESSAGES (SUPABASE DIRECT) ----------------

export async function getDirectMessages(userId: string): Promise<any[]> {
  if (!userId) return [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

export async function sendDirectMessage(
  senderId: string,
  senderName: string,
  receiverId: string,
  receiverName: string,
  text: string
): Promise<any> {
  const newMsg = {
    id: 'msg-' + Math.random().toString(36).substring(2, 11),
    sender_id: senderId,
    sender_name: senderName,
    receiver_id: receiverId,
    receiver_name: receiverName,
    text,
    is_read: false,
    created_at: new Date().toISOString()
  };

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot send message.');
  }
  const { data, error } = await supabase.from('direct_messages').insert({
    id: newMsg.id,
    sender_id: senderId, sender_name: senderName,
    receiver_id: receiverId, receiver_name: receiverName, text,
  }).select().single();
  if (error) {
    // This used to swallow the error and return a fabricated "sent" message,
    // so the sender's UI showed success while the receiver never got anything.
    console.error('Failed to send direct message:', error);
    throw error;
  }
  return data;
}

export async function deleteDirectMessage(messageId: string): Promise<void> {
  if (!messageId) return;
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured; cannot delete message.');
  }
  const { data, error } = await supabase.rpc('delete_own_direct_message', { p_message_id: messageId });
  if (error) {
    console.error('Failed to delete direct message:', error);
    throw error;
  }
  if (data !== true) {
    throw new Error('Message was not deleted. Only the sender can delete it.');
  }
}

export async function markMessagesAsRead(userId: string, contactId: string): Promise<void> {
  if (!userId || !contactId) return;
  if (isSupabaseConfigured) {
    try {
      await supabase.from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', contactId);
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
}

// ---------------- ALERTS & GENERAL NOTIFICATIONS (SUPABASE DIRECT) ----------------
export async function recordPushNotificationOpen(eventId: string): Promise<void> {
  if (!isSupabaseConfigured || !eventId) return;
  try {
    await supabase.rpc('record_push_notification_open', { p_event_id: eventId });
  } catch (error) {
    console.warn('Could not record push notification open:', error);
  }
}

export async function sendPushEvent(payload: { title: string; body: string; url?: string; category: 'classroom' | 'community' | 'quiz' | 'system'; classId?: string }): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  try {
    const { data, error } = await supabase.functions.invoke('send-promotion-push', { body: { ...payload, url: payload.url || '/' } });
    if (error) {
      console.warn('Could not send push event:', error.message);
      return 0;
    }
    return Number(data?.sent || 0);
  } catch (error) {
    console.warn('Push event unavailable:', error);
    return 0;
  }
}

export async function savePushSubscription(userId: string, subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }): Promise<void> {
  if (!isSupabaseConfigured || !userId || !subscription.endpoint) return;
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys?.p256dh || null,
    auth: subscription.keys?.auth || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) console.warn('Could not save push subscription:', error.message);
}

export interface UserNotificationPreferences {
  emailAlerts: boolean;
  rankUpdates: boolean;
  weeklyReports: boolean;
  pushEnabled: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  emailAlerts: true,
  rankUpdates: true,
  weeklyReports: false,
  pushEnabled: true,
};

export async function getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
  if (!isSupabaseConfigured || !userId) return DEFAULT_NOTIFICATION_PREFERENCES;

  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('email_alerts, rank_updates, weekly_reports, push_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Could not load notification preferences:', error.message);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  if (!data) return DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    emailAlerts: data.email_alerts !== false,
    rankUpdates: data.rank_updates !== false,
    weeklyReports: data.weekly_reports === true,
    pushEnabled: data.push_enabled !== false,
  };
}

export async function updateUserNotificationPreferences(
  userId: string,
  preferences: UserNotificationPreferences,
): Promise<void> {
  if (!isSupabaseConfigured || !userId) {
    throw new Error('Authentication is required to save notification preferences.');
  }

  const { error } = await supabase.from('user_notification_preferences').upsert({
    user_id: userId,
    email_alerts: preferences.emailAlerts,
    rank_updates: preferences.rankUpdates,
    weekly_reports: preferences.weeklyReports,
    push_enabled: preferences.pushEnabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) {
    console.error('Could not save notification preferences:', error.message);
    throw new Error('Unable to save notification preferences.');
  }
}

export async function getNotifications(): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);
  if (error) {
    console.error('Error reading notification alerts:', error);
    throw error;
  }
  return data || [];
}

export async function createNotification(
  title: string,
  body: string,
  senderName?: string,
  type?: string
): Promise<any> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; cannot create notification.');
  const newNotif = {
    id: 'notif-' + Math.random().toString(36).substring(2, 11),
    title,
    body,
    sender_name: senderName || 'System',
    type: type || 'info',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('notifications').insert(newNotif).select().single();
  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
  return data;
}

export async function broadcastPlatformNotification(title: string, body: string): Promise<number> {
  const { data, error } = await supabase.rpc('broadcast_platform_notification', {
    p_title: title,
    p_body: body,
  });
  if (error) {
    throw new Error('Unable to send the platform notification.');
  }
  return Number(data || 0);
}

export async function recordWebVital(metricName: 'lcp' | 'fcp' | 'cls' | 'ttfb', metricValue: number, path: string, deviceClass: 'mobile' | 'tablet' | 'desktop'): Promise<void> {
  const { error } = await supabase.rpc('record_web_vital', {
    p_metric_name: metricName,
    p_metric_value: metricValue,
    p_path: path,
    p_device_class: deviceClass,
  });
  if (error) throw error;
}

export async function getAllProfiles(): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching all profiles:', error);
    throw error;
  }
  return data || [];
}

export async function updateUserSubscription(userId: string, isPremium: boolean, planName: string, planId?: string, isLifetime?: boolean, isFounder?: boolean, renewalDate?: string): Promise<any> {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase is not configured; cannot update subscription.') };
  }
  const { error } = await supabase.from('users').update({
    is_premium: isPremium,
    plan_name: planName,
    plan_id: planId || null,
    is_lifetime: isLifetime || false,
    is_founder: isFounder || false,
    renewal_date: renewalDate || (isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null),
  }).eq('uid', userId);
  if (error) console.error('Error updating user subscription:', error);
  return { error };
}

// ---------------- SUBSCRIPTION PLANS (SUPABASE DIRECT) ----------------

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('subscription_plans').select('*').order('priority_level', { ascending: true });
      if (!error && data) return data as SubscriptionPlan[];
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

export async function getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('priority_level', { ascending: true });
      if (!error && data) return data as SubscriptionPlan[];
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

// ---------------- ACCOUNT CATEGORIES (SUPABASE DIRECT) ----------------

export async function getAccountCategories(): Promise<AccountCategory[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('account_categories').select('*').order('sort_order', { ascending: true });
      if (!error && data) return data as AccountCategory[];
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

// ---------------- COUPON USAGES (SUPABASE DIRECT) ----------------

export async function getCouponUsageByUser(couponId: string, userId: string): Promise<CouponUsage | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('coupon_usages').select('*').eq('coupon_id', couponId).eq('user_id', userId).maybeSingle();
      if (!error && data) return data as CouponUsage;
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return null;
}

export async function recordCouponUsage(
  couponId: string,
  userId: string,
  discountPercent: number,
  planId?: string,
  orderId?: string
): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('record_coupon_usage', {
    p_coupon_id: couponId,
    p_user_id: userId,
    p_discount_percent: discountPercent,
    p_plan_id: planId,
    p_order_id: orderId
  });
  if (error) {
    console.error('Error recording coupon usage:', error);
    throw error;
  }
  return String(data || '');
}

export async function redeemCouponForUser(
  couponId: string,
  userId: string,
  discountPercent: number,
  planId: string,
  planName: string,
  orderId: string,
  renewalDate: string,
): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('redeem_coupon_for_user', {
    p_coupon_id: couponId,
    p_user_id: userId,
    p_discount_percent: discountPercent,
    p_plan_id: planId,
    p_plan_name: planName,
    p_order_id: orderId,
    p_renewal_date: renewalDate,
  });
  if (error) {
    console.error('Error redeeming coupon atomically:', error);
    throw error;
  }
  if (!data) throw new Error('Coupon redemption was not persisted');
  return String(data);
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const defaults: PlatformSettings = { maintenanceMode: false, allowRegistrations: true };
  if (!isSupabaseConfigured) return defaults;

  const { data, error } = await supabase
    .from('platform_settings')
    .select('maintenance_mode, allow_registrations, updated_at, updated_by')
    .eq('singleton', true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching platform settings:', error.message);
    return defaults;
  }

  return {
    maintenanceMode: data.maintenance_mode === true,
    allowRegistrations: data.allow_registrations !== false,
    updatedAt: data.updated_at || undefined,
    updatedBy: data.updated_by || null,
  };
}

export async function updatePlatformSettings(
  maintenanceMode: boolean,
  allowRegistrations: boolean,
): Promise<PlatformSettings> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { data, error } = await supabase.rpc('update_platform_settings', {
    p_maintenance_mode: maintenanceMode,
    p_allow_registrations: allowRegistrations,
  });

  if (error) {
    console.error('Error updating platform settings:', error.message);
    throw new Error('Unable to save platform settings.');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Platform settings were not persisted.');

  return {
    maintenanceMode: row.maintenance_mode === true,
    allowRegistrations: row.allow_registrations !== false,
    updatedAt: row.updated_at || undefined,
    updatedBy: row.updated_by || null,
  };
}

export async function getAiPerformanceLogs(): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('get_ai_performance_logs');
  if (error) {
    console.error('Error fetching AI logs:', error.message);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// ---------------- SEASONS (SUPABASE DIRECT) ----------------

export async function getActiveSeason(): Promise<Season | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_active_season');
      if (!error && data && data.length > 0) return data[0] as Season;
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return null;
}

export async function getSeasons(includeArchived: boolean = false): Promise<Season[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('seasons').select('*').order('created_at', { ascending: false });
      if (!includeArchived) {
        query = query.or('is_archived.is.false,is_archived.is.null');
      }
      const { data, error } = await query;
      if (!error && data) return data as Season[];
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

export async function getSeasonById(seasonId: string): Promise<Season | null> {
  if (!seasonId) return null;
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('seasons').select('*').eq('id', seasonId).single();
      if (!error && data) return data as Season;
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return null;
}

export async function createSeason(season: Season): Promise<Season | null> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; cannot create season.');
  const { data, error } = await supabase.from('seasons').insert(season as any).select().single();
  if (error) {
    console.error('Error creating season:', error);
    throw error;
  }
  return data as Season;
}

export async function updateSeason(seasonId: string, updates: Partial<Season>): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; cannot update season.');
  const { error } = await supabase.from('seasons').update(updates as any).eq('id', seasonId);
  if (error) {
    console.error('Error updating season:', error.message);
    throw error;
  }
}

export async function deleteSeason(seasonId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured; cannot delete season.');
  const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
  if (error) {
    console.error('Error deleting season:', error.message);
    throw error;
  }
}

// ---------------- SEASON MEMBERS (SUPABASE DIRECT) ----------------

export async function enrollInSeason(seasonId: string, userId: string): Promise<string | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('enroll_in_season', {
        p_season_id: seasonId,
        p_user_id: userId,
      });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Error enrolling in season:', e);
    }
  }
  return null;
}

export async function getSeasonMembers(seasonId: string, limit: number = 50): Promise<SeasonMember[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_season_leaderboard', {
        p_season_id: seasonId,
        p_limit: limit,
      });
      if (!error && data) return data as SeasonMember[];
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

export async function getMySeasonMemberships(userId: string): Promise<(SeasonMember & { season: Season })[]> {
  if (!userId) return [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('season_members')
        .select('*, seasons(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });
      if (!error && data) return data as any[];
    } catch (e) { console.error('Unhandled Supabase error:', e); }
  }
  return [];
}

export async function updateSeasonMemberScore(seasonId: string, userId: string, quizScore: number): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.rpc('update_season_member_score', {
        p_season_id: seasonId,
        p_user_id: userId,
        p_score_delta: quizScore,
      });
      if (error) console.error('Error updating season member score:', error.message);
    } catch (e) {
      console.warn('Error updating season member score:', e);
    }
  }
}


// ---------------- CLASSROOM LESSON VIDEOS ----------------

export interface LessonVideo {
  id: string;
  classId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string | null;
  videoUrl: string;
  videoType: 'youtube' | 'live';
  isLive: boolean;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
}

export async function getLessonVideos(classId: string): Promise<LessonVideo[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('classroom_lesson_videos')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error getting lesson videos:', error.message);
      return [];
    }
    return (data || []).map(v => ({
      id: v.id,
      classId: v.class_id,
      creatorId: v.creator_id,
      creatorName: v.creator_name,
      title: v.title,
      description: v.description,
      videoUrl: v.video_url,
      videoType: v.video_type || 'youtube',
      isLive: v.is_live || false,
      isPinned: v.is_pinned || false,
      viewCount: v.view_count || 0,
      createdAt: v.created_at,
    }));
  } catch (e) {
    console.error('Error getting lesson videos:', e);
    return [];
  }
}

export async function addLessonVideo(params: {
  classId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description?: string;
  videoUrl: string;
  videoType?: 'youtube' | 'live';
  isLive?: boolean;
}): Promise<LessonVideo | null> {
  if (!isSupabaseConfigured) return null;
  const videoId = `lv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  try {
    const { data, error } = await supabase
      .from('classroom_lesson_videos')
      .insert([{
        id: videoId,
        class_id: params.classId,
        creator_id: params.creatorId,
        creator_name: params.creatorName,
        title: params.title,
        description: params.description || null,
        video_url: params.videoUrl,
        video_type: params.videoType || 'youtube',
        is_live: params.isLive || false,
      }])
      .select()
      .single();
    if (error) {
      console.error('Error adding lesson video:', error.message, error.details, error.hint);
      throw new Error(error.message || 'Unable to save the lesson.');
    }
    return {
      id: data.id,
      classId: data.class_id,
      creatorId: data.creator_id,
      creatorName: data.creator_name,
      title: data.title,
      description: data.description,
      videoUrl: data.video_url,
      videoType: data.video_type || 'youtube',
      isLive: data.is_live || false,
      isPinned: data.is_pinned || false,
      viewCount: data.view_count || 0,
      createdAt: data.created_at,
    };
  } catch (e: any) {
    console.error('Error adding lesson video:', e);
    throw e instanceof Error ? e : new Error('Unable to save the lesson.');
  }
}

export async function deleteLessonVideo(videoId: string, classId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('classroom_lesson_videos')
      .delete()
      .eq('id', videoId)
      .eq('class_id', classId);
    if (error) {
      console.error('Error deleting lesson video:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error deleting lesson video:', e);
    return false;
  }
}

export async function incrementLessonVideoViews(videoId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.rpc('increment_lesson_video_views', {
      p_video_id: videoId,
    });
    if (error) console.error('Error incrementing video views:', error.message);
  } catch (e) {
    console.error('Error incrementing video views:', e);
  }
}

// Extract YouTube video ID from URL
export function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

// ===== Motivation Hub Functions =====
// Free limited engagement features (lucky spin, mystery box, brain challenge, etc.)

export async function getMotivationStatus() {
  const user = supabase.auth.getUser();
  const { data: { user: authUser } } = await user;
  if (!authUser) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_motivation_status');
  if (error) {
    console.error('get_motivation_status error:', error);
    return null;
  }
  return data;
}

export async function claimLuckySpin() {
  const { data, error } = await supabase.rpc('claim_lucky_spin');
  if (error) return { success: false, message: error.message };
  return data;
}

export async function claimMysteryBox() {
  const { data, error } = await supabase.rpc('claim_mystery_box');
  if (error) return { success: false, message: error.message };
  return data;
}

export async function submitBrainChallenge(answer: string) {
  const { data, error } = await supabase.rpc('submit_brain_challenge', { p_answer: answer });
  if (error) return { success: false, message: error.message };
  if (typeof window !== 'undefined' && data?.success && Number(data?.points || 0) > 0) {
    window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  }
  return data;
}

export async function updateDailyStreak() {
  const { data, error } = await supabase.rpc('update_daily_streak');
  if (error) return { success: false, message: error.message };
  return data;
}

export async function getLearningStreakStatus() {
  const { data, error } = await supabase.rpc('get_learning_streak_status');
  if (error) throw error;
  const status = data || {};
  return {
    currentStreak: Number(status.current_streak || 0),
    longestStreak: Number(status.longest_streak || 0),
    protectionDays: Math.max(0, Math.min(2, Number(status.protection_days || 0))),
    checkedInToday: Boolean(status.checked_in_today),
    lastLoginDate: status.last_login_date ? String(status.last_login_date) : undefined,
    lastProtectionEarnedAt: status.last_protection_earned_at ? String(status.last_protection_earned_at) : undefined,
    lastProtectionUsedFor: status.last_protection_used_for ? String(status.last_protection_used_for) : undefined,
  };
}

export async function getLearningClassChallenges(classId: string) {
  const { data, error } = await supabase.rpc('get_learning_class_challenges', { p_class_id: classId });
  if (error) throw error;
  const payload = data || {};
  return (Array.isArray(payload.challenges) ? payload.challenges : []).map((challenge: any) => ({
    id: String(challenge.id), title: String(challenge.title || ''), description: String(challenge.description || ''),
    targetCount: Number(challenge.target_count || 0), currentCount: Number(challenge.current_count || 0),
    endsAt: String(challenge.ends_at || ''), completedAt: challenge.completed_at ? String(challenge.completed_at) : undefined,
    rewardPoints: Number(challenge.reward_points || 0), myContributions: Number(challenge.my_contributions || 0), claimed: Boolean(challenge.claimed),
  }));
}

export async function createLearningClassChallenge(classId: string, title: string, description: string, targetCount: number, endsAt: string) {
  const { data, error } = await supabase.rpc('create_learning_class_challenge', {
    p_class_id: classId, p_title: title, p_description: description, p_target_count: targetCount, p_ends_at: endsAt,
  });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function claimLearningClassChallenge(challengeId: string) {
  const { data, error } = await supabase.rpc('claim_learning_class_challenge', { p_challenge_id: challengeId });
  if (error) return { claimed: false, message: error.message };
  if (typeof window !== 'undefined' && data?.claimed) window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  return data;
}

export async function getActiveLearningSeason() {
  const { data, error } = await supabase.rpc('get_active_learning_season');
  if (error) throw error;
  return normalizeLearningSeasonPayload(data);
}

export async function claimLearningSeasonReward(seasonId: string, choiceKey: string) {
  const { data, error } = await supabase.rpc('claim_learning_season_reward', { p_season_id: seasonId, p_choice_key: choiceKey });
  if (error) return { claimed: false, message: error.message };
  if (typeof window !== 'undefined' && data?.claimed) window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  return data;
}

export async function createPrivateKnowledgeDuel() {
  const { data, error } = await supabase.rpc('create_private_knowledge_duel');
  if (error) return { message: error.message };
  return { duelId: data?.duel_id ? String(data.duel_id) : '', inviteCode: data?.invite_code ? String(data.invite_code) : '' };
}

export async function joinPrivateKnowledgeDuel(inviteCode: string) {
  const { data, error } = await supabase.rpc('join_private_knowledge_duel', { p_invite_code: inviteCode });
  if (error) return { message: error.message };
  return { duelId: data?.duel_id ? String(data.duel_id) : '' };
}

export async function getPrivateKnowledgeDuelState(duelId: string) {
  const { data, error } = await supabase.rpc('get_private_knowledge_duel_state', { p_duel_id: duelId });
  if (error) throw error;
  return normalizeKnowledgeDuelPayload(data);
}

export async function submitPrivateKnowledgeDuelAnswer(duelId: string, sequence: number, answer: string) {
  const { data, error } = await supabase.rpc('submit_private_knowledge_duel_answer', { p_duel_id: duelId, p_sequence: sequence, p_answer: answer });
  if (error) return { accepted: false, message: error.message };
  return data;
}

export async function getSmartReviewCards() {
  const { data, error } = await supabase.rpc('get_smart_review_cards');
  if (error) throw error;
  return normalizeSmartReviewPayload(data);
}

export async function getPersonalLearningImprovement() {
  const { data, error } = await supabase.rpc('get_personal_learning_improvement');
  if (error) throw error;
  return normalizePersonalLearningImprovement(data);
}

const motivationUsageTabs: MotivationUsageTab[] = ['motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review', 'motivation-season', 'motivation-duel', 'motivation-store'];

export async function recordMotivationUsageEvent(tab: MotivationUsageTab, eventType: 'view' | 'engaged' = 'view'): Promise<void> {
  if (!motivationUsageTabs.includes(tab)) return;
  const { error } = await supabase.rpc('record_motivation_usage_event', { p_tab: tab, p_event_type: eventType });
  if (error) throw error;
}

export async function getMotivationUsageSummary(days = 30): Promise<MotivationUsageSummary> {
  const safeDays = Math.max(7, Math.min(90, Math.round(days)));
  const { data, error } = await supabase.rpc('get_motivation_usage_summary', { p_days: safeDays });
  if (error) throw error;
  return normalizeMotivationUsageSummary(data);
}

export async function addReferral(referredUserId: string) {
  const { data, error } = await supabase.rpc('add_referral', { p_referred_user_id: referredUserId });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function updateWeeklyAchievement(type: string, increment = 1) {
  const { data, error } = await supabase.rpc('update_weekly_achievement', {
    p_achievement_type: type,
    p_count_increment: increment
  });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function getDailyBrainChallenge() {
  const { data, error } = await supabase.rpc('get_daily_brain_challenge');
  if (error) return { success: false, message: error.message };
  return data;
}

export async function getRewardStoreItems() {
  const { data, error } = await supabase.from('reward_store_items').select('*').eq('is_active', true).order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRewardInventory(userId: string) {
  const { data, error } = await supabase.from('reward_inventory').select('item_id, quantity, source, is_active, purchased_at').eq('user_id', userId).eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function activateRewardFrame(itemId: string) {
  const { data, error } = await supabase.rpc('activate_reward_frame', { p_item_id: itemId });
  if (error) return { success: false, message: error.message };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  }
  return data;
}

export async function deactivateRewardFrame() {
  const { data, error } = await supabase.rpc('deactivate_reward_frame');
  if (error) return { success: false, message: error.message };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  }
  return data;
}

export async function purchaseRewardItem(itemId: string) {
  const { data, error } = await supabase.rpc('purchase_reward_item', { p_item_id: itemId });
  if (error) return { success: false, message: error.message };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  }
  return data;
}

export async function createRewardPointsOrder(itemId: string, paymentMethod: 'vodafone_cash' | 'instapay', paymentReference?: string, receiptUrl?: string) {
  const { data, error } = await supabase.rpc('create_reward_points_order', {
    p_item_id: itemId,
    p_payment_method: paymentMethod,
    p_payment_reference: paymentReference || null,
    p_receipt_url: receiptUrl || null,
  });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function getRewardPaymentSettings() {
  const { data, error } = await supabase.from('reward_payment_settings').select('vodafone_number, instapay_handle, instapay_link').eq('id', 'default').maybeSingle();
  if (error) throw error;
  return data || { vodafone_number: '', instapay_handle: '', instapay_link: null };
}

export async function getRewardStoreOrders() {
  const { data, error } = await supabase.from('reward_store_orders').select('id, user_id, item_id, amount_points, amount_egp, payment_method, payment_reference, receipt_url, status, notes, created_at, updated_at').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function adminGrantRewardPoints(userId: string, amount: number, note = '', currency = 'points') {
  const { data, error } = await supabase.rpc('admin_grant_reward_points', { 
    p_user_id: userId, 
    p_amount: amount, 
    p_reason: note,
    p_currency: currency
  });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function adminReviewRewardOrder(orderId: string, status: 'approved' | 'rejected', note = '') {
  const { data, error } = await supabase.rpc('admin_review_reward_order', { p_order_id: orderId, p_status: status, p_note: note });
  if (error) return { success: false, message: error.message };
  if (status === 'approved') window.dispatchEvent(new CustomEvent('quizspace-rewards-updated'));
  return data;
}

export async function createGroupChallenge(classId: string, title: string, description: string, target: number, endDate: string) {
  const { data, error } = await supabase.rpc('create_group_challenge', {
    p_class_id: classId,
    p_title: title,
    p_description: description,
    p_target: target,
    p_end_date: endDate
  });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function contributeToGroupChallenge(challengeId: string) {
  const { data, error } = await supabase.rpc('contribute_to_group_challenge', { p_challenge_id: challengeId });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function checkHappyHour() {
  const { data, error } = await supabase.rpc('is_happy_hour');
  if (error) return { is_happy_hour: false, multiplier: 1.0 };
  return data;
}

export async function getGroupChallenges(classId: string) {
  const { data, error } = await supabase
    .from('group_challenges')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getGroupChallengeProgress(challengeId: string) {
  const { data, error } = await supabase
    .from('group_challenge_progress')
    .select('*')
    .eq('challenge_id', challengeId);
  if (error) throw error;
  return data;
}
