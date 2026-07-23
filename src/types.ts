/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  type: 'mcq' | 'tf' | 'essay';
  text: string;
  options: string[]; // empty for True/False, or contains ["صح", "خطأ"]. empty for essay.
  correctIndex: number; // 0-indexed correct option (e.g., 0 for True, 1 for False, or 0-3 for MCQ). For essay, 0.
  correctAnswer?: string; // model correct answer for open-ended essay questions
  explanation?: string;
  imageUrl?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  questions: Question[];
  createdAt: string;
  totalPlays: number;
  avgRating: number;
  ratingsCount: number;
  timeLimit?: number; // Optional countdown timer duration in seconds
  category?: string;
  distributionRouting?: 'public' | 'classroom' | 'community';
  classroomId?: string;
}

export interface QuizCompletion {
  id: string;
  quizId: string;
  quizTitle: string;
  takerId: string;
  takerName: string;
  score: number; // number of correct answers
  totalQuestions: number;
  rating?: number; // 1-5 stars (optional)
  feedback?: string; // written review
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  currency?: string;
  durationMonths: number;
  features: string[];
  badgeStyle: 'pro' | 'premium' | 'team' | 'enterprise' | 'lifetime' | 'founder';
  badgeColor: string;
  priorityLevel: number;
  isLifetime?: boolean;
  isActive?: boolean;
}

export interface AccountCategory {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  color?: string;
  minQuizzes?: number;
  minScore?: number;
  isHidden?: boolean;
  sortOrder?: number;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  userId: string;
  discountPercent: number;
  planId?: string;
  orderId?: string;
  createdAt: string;
}

export interface Season {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isArchived: boolean;
  prizeDescription?: string;
  prizeImageUrl?: string;
  maxParticipants?: number;
  rulesText?: string;
  rulesTextAr?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SeasonMember {
  id: string;
  seasonId: string;
  userId: string;
  userName?: string;
  rankPosition?: number;
  totalScore: number;
  quizzesCompleted: number;
  joinedAt: string;
  updatedAt?: string;
}

export interface Promotion {
  id: string;
  discountPercent: number;
  endDate: string;
  applicablePlans: string[]; // e.g., ["silver", "gold", "diamond"]
  isActive: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent?: number;
  discount_percent?: number;
  maxUses?: number;
  max_uses?: number;
  usedCount?: number;
  used_count?: number;
  expiryDate?: string;
  expiry_date?: string;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  applicablePlans?: string;
  applicable_plans?: string;
}

export interface PaymentProof {
  id: string;
  userId: string;
  userName: string;
  planId: string;
  planName: string;
  amount: number;
  method: 'vodafone_cash' | 'instapay' | 'bank_transfer' | 'request';
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  receiptUrl?: string;
  submittedAt: string;
  notes?: string;
}

export interface UserStats {
  userId: string;
  name: string;
  photoURL?: string;
  isPremium?: boolean;
  planId?: string;
  planName?: string;
  renewalDate?: string;
  isLifetime?: boolean;
  isFounder?: boolean;
  isSuspended?: boolean;
  categoryId?: string;
  createdQuizzes: Quiz[];
  completions: QuizCompletion[];
  ratedQuestions?: QuestionRating[];
  bio?: string;
  location?: string;
  email?: string;
  joinedDate?: string;
  badgeSymbol?: string;
  badgeColor?: string;
  customId?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface QuestionRating {
  id: string; // userId_questionId
  userId: string;
  quizId: string;
  quizTitle: string;
  questionId: string;
  questionText: string;
  ratingValue: 'like' | 'dislike';
  createdAt: string;
}

export interface GeneratedQuestion {
  text: string;
  type: 'mcq' | 'tf' | 'essay';
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation?: string;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
}
export function getUserRoleAndPlan(stats: UserStats | null): { role: 'student' | 'teacher'; plan: 'Free' | 'Silver' | 'Gold' | 'Diamond' } {
  let plan: 'Free' | 'Silver' | 'Gold' | 'Diamond' = 'Free';

  if (stats && stats.planName) {
    const p = stats.planName.toLowerCase();
    if (p.includes('diamond') || p.includes('الماسية')) plan = 'Diamond';
    else if (p.includes('gold') || p.includes('الذهبية')) plan = 'Gold';
    else if (p.includes('silver') || p.includes('الفضية')) plan = 'Silver';
  }

  // Purely subscription-based role determination to erase Bio-Based/Text-Based Role Locking
  // ANY user account with 'Gold' or 'Diamond' plan is granted full 'teacher' (creator) capabilities, others are 'student'
  const role: 'student' | 'teacher' = (plan === 'Gold' || plan === 'Diamond') ? 'teacher' : 'student';

  return { role, plan };
}
