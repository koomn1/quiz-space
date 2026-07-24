import React, { useState } from 'react';
import { User, Calendar, Sparkles, Check, Crown, Zap, X, ShieldCheck } from 'lucide-react';
import { saveUserProfile } from '../lib/db';
import { supabase } from '../lib/supabaseClient';

interface PostRegisterOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialName: string;
  onSaveName: (name: string) => void;
  lang?: string;
  onSelectPlan?: (planId: string) => void;
}

export const PostRegisterOnboardingModal: React.FC<PostRegisterOnboardingModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialName,
  onSaveName,
  lang = 'ar',
  onSelectPlan
}) => {
  const [name, setName] = useState(initialName || '');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [birthdate, setBirthdate] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'vip'>('free');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalName = name.trim() || initialName || 'طالب متميز';
      if (userId) {
        await saveUserProfile(userId, finalName, undefined, undefined, `النوع: ${gender || 'غير محدد'} | الميلاد: ${birthdate || 'غير محدد'}`);
        await supabase.from('users').update({ onboarded: true }).eq('uid', userId);
      }
      onSaveName(finalName);
      localStorage.setItem(`quiz_profile_onboarded_${userId}`, 'true');
      if (selectedPlan !== 'free' && onSelectPlan) {
        onSelectPlan(selectedPlan);
      }
      onClose();
    } catch (err) {
      console.error('Error saving onboarding info:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`quiz_profile_onboarded_${userId}`, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden my-8 text-right">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-primary to-purple-500 text-white shadow-lg shadow-primary/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display">
                {lang === 'ar' ? 'أهلاً بك! إكمال بيانات الحساب ✨' : 'Welcome! Complete Your Profile ✨'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar' ? 'خصص حسابك للبدء في التمتع بتجربة إعداد واجتياز الاختبارات' : 'Personalize your profile to start creating & taking quizzes'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* User Full Name / Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-end">
              <span>{lang === 'ar' ? 'الاسم المعروض / اسم المستخدِم' : 'Display Name / Username'}</span>
              <User className="w-4 h-4 text-primary" />
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-colors text-right"
              required
            />
          </div>

          {/* Gender & Birthdate Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gender Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-end">
                <span>{lang === 'ar' ? 'النوع' : 'Gender'}</span>
                <User className="w-4 h-4 text-primary" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    gender === 'male'
                      ? 'bg-primary/20 border-primary text-primary shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  👨‍🎓 {lang === 'ar' ? 'ذكر' : 'Male'}
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    gender === 'female'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  👩‍🎓 {lang === 'ar' ? 'أنثى' : 'Female'}
                </button>
              </div>
            </div>

            {/* Birthdate Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-end">
                <span>{lang === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}</span>
                <Calendar className="w-4 h-4 text-primary" />
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary transition-colors text-right"
              />
            </div>
          </div>

          {/* Subscription Plans Recommendations */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-end">
              <span>{lang === 'ar' ? 'اختر خطة الاشتراك المناسبة لك' : 'Choose Suggested Plan'}</span>
              <Crown className="w-4 h-4 text-amber-400" />
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Free Plan */}
              <div
                onClick={() => setSelectedPlan('free')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-between text-center relative ${
                  selectedPlan === 'free'
                    ? 'bg-slate-800 border-slate-500 ring-2 ring-slate-400/30'
                    : 'bg-slate-800/40 border-slate-700/60 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-700/50 text-slate-300 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white mb-0.5">{lang === 'ar' ? 'مجاني' : 'Free'}</span>
                <span className="text-[10px] text-slate-400">{lang === 'ar' ? 'أساسي' : 'Basic'}</span>
              </div>

              {/* Pro Plan */}
              <div
                onClick={() => setSelectedPlan('pro')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-between text-center relative ${
                  selectedPlan === 'pro'
                    ? 'bg-primary/20 border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/10'
                    : 'bg-slate-800/40 border-slate-700/60 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="absolute -top-2 bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black">
                  {lang === 'ar' ? 'شائع' : 'POPULAR'}
                </div>
                <div className="p-2 rounded-xl bg-primary/30 text-primary mb-1 mt-1">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white mb-0.5">{lang === 'ar' ? 'بريميوم برو' : 'Pro Plan'}</span>
                <span className="text-[10px] text-primary">{lang === 'ar' ? 'ذكاء اصطناعي بلا حدود' : 'Unlimited AI'}</span>
              </div>

              {/* VIP Plan */}
              <div
                onClick={() => setSelectedPlan('vip')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-between text-center relative ${
                  selectedPlan === 'vip'
                    ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800/40 border-slate-700/60 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="p-2 rounded-xl bg-amber-500/30 text-amber-400 mb-1">
                  <Crown className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white mb-0.5">{lang === 'ar' ? 'الخطة الذهبية' : 'VIP Gold'}</span>
                <span className="text-[10px] text-amber-400">{lang === 'ar' ? 'شامل المميزات' : 'Full Features'}</span>
              </div>
            </div>
          </div>

          {/* Actions: Save & Skip */}
          <div className="pt-4 space-y-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-700 text-white font-black text-sm rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'حفظ الحساب والمتابعة' : 'Save Profile & Continue'}</span>
                </>
              )}
            </button>

            {/* Skip Button under Save as requested ("وتحت اسكيب") */}
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2.5 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer text-center"
            >
              {lang === 'ar' ? 'تخطي الآن' : 'Skip for Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
