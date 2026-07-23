/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Quiz, QuizCompletion, UserStats, QuestionRating, Promotion, Coupon, SubscriptionPlan, AccountCategory, CouponUsage, Season, SeasonMember } from '../types';

// ---------------- SUPABASE STORAGE UPLOAD HELPERS ----------------

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

const MOCK_PROFILES = [
  {
    uid: 'adman777888999',
    id: 'adman777888999',
    email: 'adman777888999@gmail.com',
    name: 'المسؤول الفائق (Super Admin)',
    photo_url: '',
    plan_name: 'الباقة الماسية لمعلمي المستقبل (مفعّلة)',
    is_premium: true,
    joined_date: new Date().toISOString()
  },
  {
    uid: 'admin-quizspace',
    id: 'admin-quizspace',
    email: 'admin@quizspace.com',
    name: 'فريق QuizSpace',
    photo_url: '',
    plan_name: 'Free',
    is_premium: false,
    joined_date: new Date().toISOString()
  },
  {
    uid: 'user-guest',
    id: 'user-guest',
    email: 'guest@quizspace.com',
    name: 'طالب زائر',
    photo_url: '',
    plan_name: 'Free',
    is_premium: false,
    joined_date: new Date().toISOString()
  }
];

export function getLocalUsers(): any[] {
  try {
    const raw = localStorage.getItem('quiz_local_users');
    if (!raw) {
      localStorage.setItem('quiz_local_users', JSON.stringify(MOCK_PROFILES));
      return MOCK_PROFILES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return MOCK_PROFILES;
  }
}

export function saveLocalUsers(users: any[]): void {
  try {
    localStorage.setItem('quiz_local_users', JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save local users:', e);
  }
}

const DEFAULT_SEASONS: Season[] = [];

export function getLocalSeasons(): Season[] {
  try {
    const raw = localStorage.getItem('quiz_local_seasons');
    return raw ? JSON.parse(raw) : DEFAULT_SEASONS;
  } catch (e) {
    return DEFAULT_SEASONS;
  }
}

export function saveLocalSeasons(seasons: Season[]): void {
  try {
    localStorage.setItem('quiz_local_seasons', JSON.stringify(seasons));
  } catch (e) {
    console.error('Failed to save local seasons:', e);
  }
}

const DEFAULT_ACCOUNT_CATEGORIES: AccountCategory[] = [];

export function getLocalAccountCategories(): AccountCategory[] {
  try {
    const raw = localStorage.getItem('quiz_local_account_categories');
    return raw ? JSON.parse(raw) : DEFAULT_ACCOUNT_CATEGORIES;
  } catch (e) {
    return DEFAULT_ACCOUNT_CATEGORIES;
  }
}

export function saveLocalAccountCategories(categories: AccountCategory[]): void {
  try {
    localStorage.setItem('quiz_local_account_categories', JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save local account categories:', e);
  }
}

export function getLocalSeasonMembers(seasonId?: string): (SeasonMember & { season?: Season })[] {
  try {
    const raw = localStorage.getItem('quiz_local_season_members');
    if (!raw) return [];
    const all: (SeasonMember & { season?: Season })[] = JSON.parse(raw);
    if (seasonId) return all.filter(m => m.seasonId === seasonId);
    return all;
  } catch (e) {
    return [];
  }
}

export function saveLocalSeasonMembers(members: (SeasonMember & { season?: Season })[]): void {
  try {
    localStorage.setItem('quiz_local_season_members', JSON.stringify(members));
  } catch (e) {
    console.error('Failed to save local season members:', e);
  }
}

export function getLocalSubscriptionPlans(): SubscriptionPlan[] {
  try {
    const raw = localStorage.getItem('quiz_local_subscription_plans');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalSubscriptionPlans(plans: SubscriptionPlan[]): void {
  try {
    localStorage.setItem('quiz_local_subscription_plans', JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to save local subscription plans:', e);
  }
}

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'QUIZ50',
    code: 'QUIZ50',
    discountPercent: 50,
    maxUses: 100,
    usedCount: 0,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    applicablePlans: 'silver,gold,diamond'
  },
  {
    id: 'FREE100',
    code: 'FREE100',
    discountPercent: 100,
    maxUses: 100,
    usedCount: 0,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    applicablePlans: 'silver,gold,diamond'
  }
];

export function getLocalCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem('quiz_local_coupons');
    if (!raw) {
      localStorage.setItem('quiz_local_coupons', JSON.stringify(DEFAULT_COUPONS));
      return DEFAULT_COUPONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_COUPONS;
  }
}

export function saveLocalCoupons(coupons: Coupon[]): void {
  try {
    localStorage.setItem('quiz_local_coupons', JSON.stringify(coupons));
  } catch (e) {
    console.error('Failed to save local coupons:', e);
  }
}

const DEFAULT_COMMUNITY_POSTS = [
  {
    id: 'cp-welcome',
    text: 'مرحباً بكم في مجتمع QuizSpace التعليمي! شاركونا اختباراتكم وآرائكم هنا 🚀',
    author_id: 'admin-quizspace',
    author_name: 'فريق QuizSpace',
    author_badge_symbol: '👑',
    author_badge_color: '#f59e0b',
    likes: 0,
    liked_by: [],
    created_at: new Date().toISOString()
  }
];

export function getLocalCommunityPosts(): any[] {
  try {
    const raw = localStorage.getItem('quiz_local_community_posts');
    if (!raw) {
      localStorage.setItem('quiz_local_community_posts', JSON.stringify(DEFAULT_COMMUNITY_POSTS));
      return DEFAULT_COMMUNITY_POSTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_COMMUNITY_POSTS;
  }
}

export function saveLocalCommunityPosts(posts: any[]): void {
  try {
    localStorage.setItem('quiz_local_community_posts', JSON.stringify(posts));
  } catch (e) {
    console.error('Failed to save local community posts:', e);
  }
}

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-welcome',
    title: 'مرحباً بك في منصة Quiz Space! 🎉',
    body: 'ابدأ الآن بحل أو إنشاء أول اختبار تفاعلي وصعد لوحة المتصدرين!',
    sender_name: 'System',
    type: 'info',
    created_at: new Date().toISOString()
  }
];

export function getLocalNotifications(): any[] {
  try {
    const raw = localStorage.getItem('quiz_local_notifications');
    if (!raw) {
      localStorage.setItem('quiz_local_notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_NOTIFICATIONS;
  }
}

export function saveLocalNotifications(notifs: any[]): void {
  try {
    localStorage.setItem('quiz_local_notifications', JSON.stringify(notifs));
  } catch (e) {
    console.error('Failed to save local notifications:', e);
  }
}

export function getLocalPremiumRequests(): any[] {
  try {
    const raw = localStorage.getItem('quiz_local_premium_requests');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalPremiumRequests(requests: any[]): void {
  try {
    localStorage.setItem('quiz_local_premium_requests', JSON.stringify(requests));
  } catch (e) {
    console.error('Failed to save local premium requests:', e);
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
    questions: row.questions,
    totalPlays: row.total_plays,
    avgRating: row.avg_rating,
    ratingsCount: row.ratings_count,
    timeLimit: row.time_limit,
    createdAt: row.created_at,
    category: row.category,
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

// Helper to read/write local custom quizzes
export function getLocalQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem('quiz_custom_quizzes');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveQuizToLocalStorage(quiz: Quiz): void {
  try {
    const list = getLocalQuizzes();
    const existingIndex = list.findIndex(q => q.id === quiz.id);
    if (existingIndex >= 0) {
      list[existingIndex] = quiz;
    } else {
      list.unshift(quiz);
    }
    localStorage.setItem('quiz_custom_quizzes', JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save quiz to localStorage:', e);
  }
}

export async function getQuizzes(): Promise<Quiz[]> {
  const localQuizzes = getLocalQuizzes();
  let dbQuizzes: Quiz[] = [];

  try {
    const { data, error } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      dbQuizzes = data.map(mapQuizRow);
    }
  } catch (e) {
    console.warn('Error fetching Supabase quizzes:', e);
  }

  // Merge sample quizzes, DB quizzes, and local custom quizzes by ID
  const map = new Map<string, Quiz>();
  SAMPLE_QUIZZES.forEach(q => map.set(q.id, q));
  dbQuizzes.forEach(q => map.set(q.id, q));
  localQuizzes.forEach(q => map.set(q.id, q));

  return Array.from(map.values());
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  if (!id) return null;
  const localQuizzes = getLocalQuizzes();
  const foundLocal = localQuizzes.find(q => q.id === id);
  if (foundLocal) return foundLocal;

  try {
    const { data, error } = await supabase.from('quizzes').select('*').eq('id', id).single();
    if (!error && data) return mapQuizRow(data);
  } catch (e) {}

  const sample = SAMPLE_QUIZZES.find(q => q.id === id);
  return sample || null;
}

export async function createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'totalPlays' | 'avgRating' | 'ratingsCount'> & { id?: string; timeLimit?: number }): Promise<Quiz> {
  const { data: { user } } = await supabase.auth.getUser();
  const finalId = quiz.id || 'quiz-' + Math.random().toString(36).substring(2, 11);
  const creatorId = user?.id || quiz.creatorId || 'user-guest';
  const creatorName = quiz.creatorName || user?.user_metadata?.name || localStorage.getItem('quiz_userName') || 'صانع متميز';

  const newQuiz: Quiz = {
    id: finalId,
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions,
    creatorId,
    creatorName,
    totalPlays: 0,
    avgRating: 5.0,
    ratingsCount: 1,
    timeLimit: quiz.timeLimit || 0,
    createdAt: new Date().toISOString(),
    category: quiz.category || 'عام',
  };

  // 1. Always save to LocalStorage immediately for zero-friction user experience
  saveQuizToLocalStorage(newQuiz);

  // 2. Also try inserting into Supabase Postgres
  try {
    const { data, error } = await supabase.from('quizzes').insert({
      id: finalId,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions,
      creator_id: creatorId,
      creator_name: creatorName,
      time_limit: quiz.timeLimit || 0,
      category: quiz.category || 'عام',
    }).select().single();

    if (!error && data) {
      return mapQuizRow(data);
    }
  } catch (e) {
    console.warn('Supabase insert skipped or failed, quiz stored in local state:', e);
  }

  return newQuiz;
}

export async function updateQuiz(quizId: string, updatedQuiz: Partial<Quiz>): Promise<void> {
  if (!quizId) return;
  // Update local storage
  const localList = getLocalQuizzes();
  const idx = localList.findIndex(q => q.id === quizId);
  if (idx >= 0) {
    localList[idx] = { ...localList[idx], ...updatedQuiz };
    localStorage.setItem('quiz_custom_quizzes', JSON.stringify(localList));
  }

  const { error } = await supabase.from('quizzes').update({
    title: updatedQuiz.title,
    description: updatedQuiz.description,
    questions: updatedQuiz.questions,
    time_limit: updatedQuiz.timeLimit,
    category: updatedQuiz.category,
  }).eq('id', quizId);
  if (error) console.error('Error updating quiz:', error.message);
}

export async function deleteQuiz(quizId: string): Promise<void> {
  if (!quizId) return;
  // Remove from local storage
  const localList = getLocalQuizzes().filter(q => q.id !== quizId);
  localStorage.setItem('quiz_custom_quizzes', JSON.stringify(localList));

  const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
  if (error) console.error('Error deleting quiz:', error.message);
}

export async function submitQuizAttempt(
  quizId: string,
  data: {
    takerId: string;
    takerName: string;
    score: number;
    rating?: number;
    feedback?: string;
  }
): Promise<any> {
  try {
    const { data: result, error } = await supabase.rpc('submit_quiz_attempt', {
      p_quiz_id: quizId,
      p_taker_id: data.takerId,
      p_taker_name: data.takerName,
      p_score: data.score,
      p_rating: data.rating ?? null,
      p_feedback: data.feedback || '',
    });
    if (!error) return result;
  } catch (e) {}

  return { success: true, local: true };
}

// ---------------- PROFILE STATS & MANAGEMENT HANDLERS ----------------

export async function getUserProfileStats(userId: string): Promise<UserStats> {
  const localName = localStorage.getItem('quiz_userName') || 'طالب متميز';
  const localPhoto = localStorage.getItem('quiz_userPhoto') || '';
  const localQuizzes = getLocalQuizzes().filter(q => q.creatorId === userId);

  const localUsers = getLocalUsers();
  const matchedLocalUser = localUsers.find(u => u.uid === userId || u.id === userId);

  const empty: UserStats = { 
    userId: userId || '', 
    name: matchedLocalUser?.name || localName, 
    email: matchedLocalUser?.email || localPhoto,
    photoURL: matchedLocalUser?.photo_url || localPhoto, 
    isPremium: matchedLocalUser?.is_premium || false, 
    planName: matchedLocalUser?.plan_name || 'Free',
    planId: matchedLocalUser?.plan_id,
    renewalDate: matchedLocalUser?.renewal_date,
    isLifetime: matchedLocalUser?.is_lifetime || false,
    isFounder: matchedLocalUser?.is_founder || false,
    isSuspended: matchedLocalUser?.is_suspended || false,
    categoryId: matchedLocalUser?.category_id,
    bio: matchedLocalUser?.bio || '',
    location: matchedLocalUser?.location || '',
    createdQuizzes: localQuizzes, 
    completions: []
  } as UserStats;
  if (!userId) return empty;

  if (isSupabaseConfigured) {
    try {
      const { data: userRow } = await supabase.from('users').select('*').eq('uid', userId).single();
      const { data: createdQuizzes } = await supabase.from('quizzes').select('*').eq('creator_id', userId).order('created_at', { ascending: false });
      const { data: completions } = await supabase.from('completions').select('*').eq('taker_id', userId).order('created_at', { ascending: false });

      const mergedQuizzes = new Map<string, Quiz>();
      localQuizzes.forEach(q => mergedQuizzes.set(q.id, q));
      (createdQuizzes || []).map(mapQuizRow).forEach(q => mergedQuizzes.set(q.id, q));

      return {
        userId,
        name: userRow?.name || localName,
        email: userRow?.email || '',
        photoURL: userRow?.photo_url || localPhoto,
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
        createdQuizzes: Array.from(mergedQuizzes.values()),
        completions: completions || [],
      } as UserStats;
    } catch (e) {
      return empty;
    }
  } else {
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
): Promise<void> {
  if (!userId) return;

  const finalPlanId = planId || localStorage.getItem(`quiz_planId_${userId}`) || undefined;
  const finalIsPremium = isPremium ?? (localStorage.getItem(`quiz_isPremium_${userId}`) === 'true' ? true : false);
  const finalPlanName = planName || localStorage.getItem(`quiz_planName_${userId}`) || 'Free';
  const finalIsLifetime = isLifetime ?? false;
  const finalIsFounder = isFounder ?? false;
  const finalIsSuspended = isSuspended ?? false;
  const finalCategoryId = categoryId || undefined;
  const finalRenewalDate = renewalDate || undefined;

  localStorage.setItem('quiz_userName', name);
  if (photoURL) localStorage.setItem('quiz_userPhoto', photoURL);
  if (finalPlanName) localStorage.setItem(`quiz_planName_${userId}`, finalPlanName);
  if (finalIsPremium !== undefined) localStorage.setItem(`quiz_isPremium_${userId}`, String(finalIsPremium));
  if (finalPlanId) localStorage.setItem(`quiz_planId_${userId}`, finalPlanId);

  const localUsers = getLocalUsers();
  const existingIdx = localUsers.findIndex(u => u.uid === userId || u.id === userId);
  const updatedUser = {
    uid: userId,
    id: userId,
    name,
    photo_url: photoURL || '',
    email: email || '',
    bio: bio || '',
    location: location || '',
    badge_symbol: badgeSymbol || '',
    badge_color: badgeColor || '',
    custom_id: customId || '',
    updated_at: new Date().toISOString(),
    is_premium: finalIsPremium,
    plan_name: finalPlanName,
    plan_id: finalPlanId,
    is_lifetime: finalIsLifetime,
    is_founder: finalIsFounder,
    is_suspended: finalIsSuspended,
    category_id: finalCategoryId,
    renewal_date: finalRenewalDate,
  };

  if (existingIdx >= 0) {
    localUsers[existingIdx] = { ...localUsers[existingIdx], ...updatedUser };
  } else {
    localUsers.unshift(updatedUser);
  }
  saveLocalUsers(localUsers);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('users').upsert({
        uid: userId,
        name,
        photo_url: photoURL,
        email,
        bio,
        location,
        badge_symbol: badgeSymbol,
        badge_color: badgeColor,
        custom_id: customId,
        updated_at: new Date().toISOString(),
        is_premium: finalIsPremium,
        plan_name: finalPlanName,
        plan_id: finalPlanId,
        is_lifetime: finalIsLifetime,
        is_founder: finalIsFounder,
        is_suspended: finalIsSuspended,
        category_id: finalCategoryId,
        renewal_date: finalRenewalDate,
      }, { onConflict: 'uid' });

      if (error) console.error(`Error upserting user profile for ${userId}:`, error.message);
    } catch (e) {
      console.warn('Upsert profile error:', e);
    }
  }
}

export async function checkUserPremiumStatus(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  const localUsers = getLocalUsers();
  const matched = localUsers.find(u => u.uid === userId || u.id === userId);
  if (matched) return !!matched.is_premium;

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from('users').select('is_premium').eq('uid', userId).single();
      return !!data?.is_premium;
    } catch (e) {}
  }
  return false;
}

// ---------------- PREMIUM TRIAL ACTIVATION REQUEST HANDLERS (SUPABASE DIRECT) ----------------

export async function createPremiumRequest(requestId: string, reqData: any): Promise<void> {
  const newRequest = {
    id: requestId,
    user_id: reqData.userId,
    name: reqData.name,
    email: reqData.email,
    plan_name: reqData.planName,
    payment_screenshot: reqData.paymentScreenshot,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const locals = getLocalPremiumRequests();
  locals.unshift(newRequest);
  saveLocalPremiumRequests(locals);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('premium_requests').insert({
        id: requestId,
        user_id: reqData.userId,
        name: reqData.name,
        email: reqData.email,
        plan_name: reqData.planName,
        payment_screenshot: reqData.paymentScreenshot,
        status: 'pending',
      });
      if (error) console.error('Error creating premium request:', error.message);
    } catch (e) {}
  }
}

export async function getPremiumRequests(): Promise<any[]> {
  const locals = getLocalPremiumRequests();
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('premium_requests').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const map = new Map();
        locals.forEach(r => map.set(r.id, r));
        data.forEach(r => map.set(r.id, r));
        return Array.from(map.values()).sort((a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('Error getting premium requests:', e);
    }
  }
  return locals;
}

export async function updatePremiumRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  userId: string,
  rejectReason?: string,
  planName?: string,
  planId?: string
): Promise<void> {
  const locals = getLocalPremiumRequests();
  const idx = locals.findIndex(r => r.id === requestId);
  if (idx >= 0) {
    locals[idx].status = status;
    locals[idx].reject_reason = rejectReason;
    locals[idx].updated_at = new Date().toISOString();
    saveLocalPremiumRequests(locals);
  }

  const localUsers = getLocalUsers();
  const uIdx = localUsers.findIndex(u => u.uid === userId || u.id === userId);
  if (uIdx >= 0) {
    localUsers[uIdx].is_premium = (status === 'approved');
    localUsers[uIdx].plan_name = status === 'approved' ? (planName || 'الباقة الذهبية لمعلمي المستقبل (مفعّلة)') : 'Free';
    localUsers[uIdx].plan_id = status === 'approved' ? (planId || undefined) : undefined;
    localUsers[uIdx].is_lifetime = status === 'approved' ? (planId === 'lifetime') : false;
    localUsers[uIdx].is_founder = status === 'approved' ? (planId === 'diamond') : false;
    localUsers[uIdx].renewal_date = status === 'approved' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
    saveLocalUsers(localUsers);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('premium_requests').update({
        status, reject_reason: rejectReason, updated_at: new Date().toISOString(),
      }).eq('id', requestId);
      if (error) {
        console.error('Error updating premium activation status:', error.message);
        return;
      }
      if (status === 'approved') {
        await supabase.from('users').update({
          is_premium: true,
          plan_name: planName || 'الباقة الذهبية لمعلمي المستقبل (مفعّلة)',
          plan_id: planId || null,
          is_lifetime: planId === 'lifetime',
          is_founder: planId === 'diamond',
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('uid', userId);
      } else {
        await supabase.from('users').update({
          is_premium: false,
          plan_name: 'Free',
          plan_id: null,
          is_lifetime: false,
          is_founder: false,
          renewal_date: null,
        }).eq('uid', userId);
      }
    } catch (e) {}
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
    } catch (e) {}
  }
}

export async function getUserRatedQuestions(userId: string): Promise<QuestionRating[]> {
  if (!userId) return [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('question_ratings').select('*').eq('user_id', userId);
      if (!error && data) return data;
    } catch (e) {}
  }
  return [];
}

// ---------------- MARKETING PROMOTIONS SYSTEMS (SUPABASE DIRECT) ----------------

export async function getPromotions(): Promise<Promotion[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('promotions').select('*').eq('is_active', true);
      if (!error && data) return data;
    } catch (e) {}
  }
  return [];
}

export async function savePromotion(promo: Promotion): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('promotions').upsert(promo as any);
      if (error) console.error('Error saving promotion:', error.message);
    } catch (e) {}
  }
}

export async function deletePromotion(promoId: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', promoId);
      if (error) console.error('Error deleting promotion:', error.message);
    } catch (e) {}
  }
}

// ---------------- COUPONS CODES REDUCTIONS (SUPABASE DIRECT / LOCAL FALLBACK) ----------------

export async function getCoupons(): Promise<Coupon[]> {
  const locals = getLocalCoupons();
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('coupon_codes').select('*');
      if (!error && data) {
        const map = new Map<string, Coupon>();
        locals.forEach(c => map.set(c.id, c));
        data.forEach(c => map.set(c.id, c));
        return Array.from(map.values());
      }
    } catch (e) {
      console.warn('Error loading coupons:', e);
    }
  }
  return locals;
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  if (!code) return null;
  const locals = getLocalCoupons();
  const cleanedCode = code.trim().toUpperCase();
  const matchedLocal = locals.find(c => c.code.toUpperCase() === cleanedCode || c.id.toUpperCase() === cleanedCode);
  
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_coupon_by_code', { p_code: cleanedCode });
      if (!error && data) return data;
    } catch (e) {}
  }
  return matchedLocal || null;
}

export async function saveCoupon(coupon: Coupon): Promise<void> {
  const locals = getLocalCoupons();
  const idx = locals.findIndex(c => c.id === coupon.id || c.code === coupon.code);
  if (idx >= 0) {
    locals[idx] = coupon;
  } else {
    locals.push(coupon);
  }
  saveLocalCoupons(locals);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('coupon_codes').upsert(coupon as any);
      if (error) console.error('Error saving coupon:', error.message);
    } catch (e) {}
  }
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const locals = getLocalCoupons().filter(c => c.id !== couponId);
  saveLocalCoupons(locals);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('coupon_codes').delete().eq('id', couponId);
      if (error) console.error('Error deleting coupon:', error.message);
    } catch (e) {}
  }
}

// ---------------- SCORE METRICS INTEGRATION (SUPABASE DIRECT) ----------------

export async function getBestScoreByQuizId(quizId: string): Promise<number> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from('completions').select('score').eq('quiz_id', quizId).order('score', { ascending: false }).limit(1).single();
      return data?.score ?? 0;
    } catch (e) {}
  }
  return 0;
}

export async function getCompletionsByQuizId(quizId: string): Promise<QuizCompletion[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('completions').select('*').eq('quiz_id', quizId).order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }
  return [];
}

export async function getRecentCompletions(limitCount = 10): Promise<QuizCompletion[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('completions').select('*').order('created_at', { ascending: false }).limit(limitCount);
      if (!error && data) return data;
    } catch (e) {}
  }
  return [];
}

// ---------------- SOCIAL: MOODS & COMMUNITY NETWORK POSTS (SUPABASE DIRECT / LOCAL FALLBACK) ----------------

export async function getCommunityPosts(): Promise<any[]> {
  const locals = getLocalCommunityPosts();
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const map = new Map();
        locals.forEach(p => map.set(p.id, p));
        data.forEach(p => map.set(p.id, p));
        return Array.from(map.values()).sort((a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('Error loading community posts:', e);
    }
  }
  return locals;
}

export async function createCommunityPost(
  text: string,
  authorId: string,
  authorName: string,
  authorBadgeSymbol?: string,
  authorBadgeColor?: string
): Promise<any> {
  const newPost = {
    id: 'cp-' + Math.random().toString(36).substring(2, 11),
    text,
    author_id: authorId,
    author_name: authorName,
    author_badge_symbol: authorBadgeSymbol || '',
    author_badge_color: authorBadgeColor || '',
    likes: 0,
    liked_by: [],
    created_at: new Date().toISOString()
  };

  const locals = getLocalCommunityPosts();
  locals.unshift(newPost);
  saveLocalCommunityPosts(locals);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('community_posts').insert(newPost).select().single();
      if (!error && data) return data;
    } catch (e) {}
  }
  return newPost;
}

export async function likeCommunityPost(postId: string, userId: string): Promise<any> {
  const locals = getLocalCommunityPosts();
  const post = locals.find(p => p.id === postId);
  if (post) {
    const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
    const idx = likedBy.indexOf(userId);
    if (idx >= 0) {
      likedBy.splice(idx, 1);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      likedBy.push(userId);
      post.likes = (post.likes || 0) + 1;
    }
    post.liked_by = likedBy;
    saveLocalCommunityPosts(locals);
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId, p_user_id: userId });
      if (!error && data) return data;
    } catch (e) {}
  }
  return post;
}

export async function deleteCommunityPost(postId: string): Promise<boolean> {
  const locals = getLocalCommunityPosts().filter(p => p.id !== postId);
  saveLocalCommunityPosts(locals);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      return !error;
    } catch (e) {}
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
    } catch (e) {}
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

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('direct_messages').insert({
        id: newMsg.id,
        sender_id: senderId, sender_name: senderName,
        receiver_id: receiverId, receiver_name: receiverName, text,
      }).select().single();
      if (!error && data) return data;
    } catch (e) {}
  }
  return newMsg;
}

export async function markMessagesAsRead(userId: string, contactId: string): Promise<void> {
  if (!userId || !contactId) return;
  if (isSupabaseConfigured) {
    try {
      await supabase.from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', contactId);
    } catch (e) {}
  }
}

// ---------------- ALERTS & GENERAL NOTIFICATIONS (SUPABASE DIRECT / LOCAL FALLBACK) ----------------

export async function getNotifications(): Promise<any[]> {
  const locals = getLocalNotifications();
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);
      if (!error && data) {
        const map = new Map();
        locals.forEach(n => map.set(n.id, n));
        data.forEach(n => map.set(n.id, n));
        return Array.from(map.values()).sort((a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('Error reading notification alerts:', e);
    }
  }
  return locals;
}

export async function createNotification(
  title: string,
  body: string,
  senderName?: string,
  type?: string
): Promise<any> {
  const newNotif = {
    id: 'notif-' + Math.random().toString(36).substring(2, 11),
    title,
    body,
    sender_name: senderName || 'System',
    type: type || 'info',
    created_at: new Date().toISOString()
  };

  const locals = getLocalNotifications();
  locals.unshift(newNotif);
  saveLocalNotifications(locals);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('notifications').insert(newNotif).select().single();
      if (!error && data) return data;
    } catch (e) {}
  }
  return newNotif;
}

export async function getAllProfiles(): Promise<any[]> {
  const localUsers = getLocalUsers();
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const map = new Map();
        localUsers.forEach(u => map.set(u.uid, u));
        data.forEach(u => map.set(u.uid, u));
        return Array.from(map.values());
      }
    } catch (e) {
      console.warn('Error fetching all profiles:', e);
    }
  }
  return localUsers;
}

export async function updateUserSubscription(userId: string, isPremium: boolean, planName: string, planId?: string, isLifetime?: boolean, isFounder?: boolean, renewalDate?: string): Promise<any> {
  const localUsers = getLocalUsers();
  const uIdx = localUsers.findIndex(u => u.uid === userId || u.id === userId);
  if (uIdx >= 0) {
    localUsers[uIdx].is_premium = isPremium;
    localUsers[uIdx].plan_name = planName;
    localUsers[uIdx].plan_id = planId;
    localUsers[uIdx].is_lifetime = isLifetime || false;
    localUsers[uIdx].is_founder = isFounder || false;
    localUsers[uIdx].renewal_date = renewalDate || (isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null);
    saveLocalUsers(localUsers);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('users').update({
        is_premium: isPremium,
        plan_name: planName,
        plan_id: planId || null,
        is_lifetime: isLifetime || false,
        is_founder: isFounder || false,
        renewal_date: renewalDate || (isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null),
      }).eq('uid', userId);
      return { error };
    } catch (e) {
      return { error: e };
    }
  }
  return { error: null };
}

// ---------------- SUBSCRIPTION PLANS (SUPABASE DIRECT) ----------------

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('subscription_plans').select('*').order('priority_level', { ascending: true });
      if (!error && data) return data as SubscriptionPlan[];
    } catch (e) {}
  }
  return [];
}

export async function getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('priority_level', { ascending: true });
      if (!error && data) return data as SubscriptionPlan[];
    } catch (e) {}
  }
  return [];
}

// ---------------- ACCOUNT CATEGORIES (SUPABASE DIRECT) ----------------

export async function getAccountCategories(): Promise<AccountCategory[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('account_categories').select('*').order('sort_order', { ascending: true });
      if (!error && data) return data as AccountCategory[];
    } catch (e) {}
  }
  return [];
}

// ---------------- COUPON USAGES (SUPABASE DIRECT) ----------------

export async function getCouponUsageByUser(couponId: string, userId: string): Promise<CouponUsage | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('coupon_usages').select('*').eq('coupon_id', couponId).eq('user_id', userId).maybeSingle();
      if (!error && data) return data as CouponUsage;
    } catch (e) {}
  }
  return null;
}

export async function recordCouponUsage(
  couponId: string,
  userId: string,
  discountPercent: number,
  planId?: string,
  orderId?: string
): Promise<string | null> {
  const localCoupons = getLocalCoupons();
  const localIdx = localCoupons.findIndex(c => c.id === couponId);
  if (localIdx >= 0) {
    if (localCoupons[localIdx].usedCount >= localCoupons[localIdx].maxUses) {
      return null;
    }
    localCoupons[localIdx].usedCount = (localCoupons[localIdx].usedCount || 0) + 1;
    saveLocalCoupons(localCoupons);
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('record_coupon_usage', {
        p_coupon_id: couponId,
        p_user_id: userId,
        p_discount_percent: discountPercent,
        p_plan_id: planId || null,
        p_order_id: orderId || null,
      });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Error recording coupon usage:', e);
    }
  }
  return 'local-' + Date.now();
}

// ---------------- SEASONS (SUPABASE DIRECT) ----------------

export async function getActiveSeason(): Promise<Season | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_active_season');
      if (!error && data && data.length > 0) return data[0] as Season;
    } catch (e) {}
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
    } catch (e) {}
  }
  return [];
}

export async function getSeasonById(seasonId: string): Promise<Season | null> {
  if (!seasonId) return null;
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('seasons').select('*').eq('id', seasonId).single();
      if (!error && data) return data as Season;
    } catch (e) {}
  }
  return null;
}

export async function createSeason(season: Season): Promise<Season | null> {
  const localSeasons = getLocalSeasons();
  localSeasons.unshift(season);
  saveLocalSeasons(localSeasons);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('seasons').insert(season as any).select().single();
      if (!error && data) return data as Season;
    } catch (e) {
      console.warn('Error creating season:', e);
    }
  }
  return season;
}

export async function updateSeason(seasonId: string, updates: Partial<Season>): Promise<void> {
  const localSeasons = getLocalSeasons();
  const idx = localSeasons.findIndex(s => s.id === seasonId);
  if (idx >= 0) {
    localSeasons[idx] = { ...localSeasons[idx], ...updates };
    saveLocalSeasons(localSeasons);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('seasons').update(updates as any).eq('id', seasonId);
      if (error) console.error('Error updating season:', error.message);
    } catch (e) {
      console.warn('Error updating season:', e);
    }
  }
}

export async function deleteSeason(seasonId: string): Promise<void> {
  const localSeasons = getLocalSeasons().filter(s => s.id !== seasonId);
  saveLocalSeasons(localSeasons);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
      if (error) console.error('Error deleting season:', error.message);
    } catch (e) {
      console.warn('Error deleting season:', e);
    }
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
    } catch (e) {}
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
    } catch (e) {}
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

