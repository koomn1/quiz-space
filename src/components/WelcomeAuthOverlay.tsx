import React from 'react';
import { XCircle, Sparkles, Award } from 'lucide-react';
import { MainLogo } from './MainLogo';

interface WelcomeAuthOverlayProps {
  authRedirectQuizId: string;
  quizzes: any[];
  lang: 'ar' | 'en';
  userName: string;
  setUserName: (name: string) => void;
  loginRedirectTab: string | null;
  onGoogleLogin: () => Promise<void> | void;
  onClose: () => void;
  onContinueAsGuest: (quizId: string) => void;
}

export default function WelcomeAuthOverlay({
  authRedirectQuizId,
  quizzes,
  lang,
  userName,
  setUserName,
  loginRedirectTab,
  onGoogleLogin,
  onClose,
  onContinueAsGuest
}: WelcomeAuthOverlayProps) {
  const isAr = lang === 'ar';
  const isAuthQuiz = authRedirectQuizId !== 'login-trigger';
  const targetQuiz = isAuthQuiz ? quizzes.find(q => q.id === authRedirectQuizId) : null;
  const authQuizTitle = targetQuiz?.title || '';

  // Determine heading and subtitle based on context
  let modalHeading = '';
  let modalSubtitle = '';
  if (isAuthQuiz) {
    modalHeading = isAr 
      ? `مطلوب التحقق من حسابك لبدء الحل 🏆`
      : `Account Verification Required to Begin 🏆`;
    modalSubtitle = isAr
      ? `أنت على وشك البدء في حل «${authQuizTitle || 'الاختبار التفاعلي'}». يرجى تسجيل الدخول بحساب Google لحفظ إجاباتك فورياً، إصدار شهادتك الرسمية، والتنافس على الصدارة!`
      : `You are about to start "${authQuizTitle || 'the interactive quiz'}". Please sign in with Google to preserve your results, issue printable PDF diplomas, and join the global leaderboards!`;
  } else if (loginRedirectTab === 'profile') {
    modalHeading = isAr
      ? `سجل دخولك للوصول إلى لوحة معطياتك الشاملة 👤`
      : `Sign in to Access Your Stats Panel 👤`;
    modalSubtitle = isAr
      ? `سجل دخولك الآن لاستعراض إحصائياتك الأكاديمية الشاملة، مراجعة محاولاتك السابقة، وطباعة شهادات تقديرك المكتسبة.`
      : `Sign in with Google to view your comprehensive score history, track learning progress, and print your verified graduation certificates.`;
  } else if (loginRedirectTab === 'create') {
    modalHeading = isAr
      ? `مرحباً بك في استوديو صناعة الاختبارات 🎨`
      : `Welcome to the Creator Studio 🎨`;
    modalSubtitle = isAr
      ? `صناعة وتوليد أسئلة الاختبارات بمحركات الذكاء الاصطناعي التوليدي من Gemini متاحة مجاناً بحسابك لحفظ إبداعاتك ومشاركتها مع متميزي العالم.`
      : `Designing and generating quizzes from images with Gemini AI is free and requires authenticating to preserve your workspace resources.`;
  } else {
    modalHeading = isAr
      ? `مرحباً بك مجدداً في Quiz Space! ✨`
      : `Welcome Back to Quiz Space! ✨`;
    modalSubtitle = isAr
      ? `الفضاء الأكاديمي التفاعلي للتعلم وصناعة الاختبارات وتتبع مسيرتك الدراسية بنقرة واحدة.`
      : `Your personalized interactive orbit for compiling exams, testing physical textbooks, and tracking high-score streaks.`;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-white via-sky-50 to-sky-300 dark:from-[#090d16] dark:via-[#111827] dark:to-[#1e293b] flex flex-col items-center justify-center p-4">
      <div
        
        
        
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-8 space-y-4 sm:space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-right relative font-sans scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
        dir={isAr ? 'rtl' : 'ltr'}
        style={{ textAlign: isAr ? 'right' : 'left' }}
      >
        {/* Visual background orbits */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className={`flex ${isAr ? 'justify-start' : 'justify-end'}`}>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
            title={isAr ? 'تخطي للحل كزائر' : 'Skip & solve as guest'}
          >
            <XCircle className="w-5.5 h-5.5" />
          </button>
        </div>

        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-3">
            <MainLogo size="md" showText={false} />
          </div>
          <h2 className="font-display font-black text-lg sm:text-xl tracking-tight text-slate-950 dark:text-slate-100 leading-snug">
            {modalHeading}
          </h2>
          <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {modalSubtitle}
          </p>
        </div>

        {/* Inline Guest Nickname Personalization */}
        <div className="bg-slate-50/70 dark:bg-slate-900/40 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-2 text-right">
          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block" style={{ textAlign: isAr ? 'right' : 'left' }}>
            {isAr ? '👤 تخصيص اسمك كطالب زائر (لتسجيل درجاتك المؤقتة):' : '👤 Customize your guest name (for temporary scores):'}
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={isAr ? 'مثال: أحمد الدوسري، طالب متميز...' : 'e.g., Jane Doe, Star Scholar...'}
            className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 outline-none focus:border-primary dark:focus:border-primary-hover transition-all"
            style={{ textAlign: isAr ? 'right' : 'left' }}
          />
        </div>

        <div className="bg-[#fcf8f2] dark:bg-amber-950/10 p-4 sm:p-5 rounded-2.5xl space-y-2.5 border border-amber-100/50 dark:border-amber-950/20 text-right">
          <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 border-b border-amber-100/40 dark:border-amber-905/30 pb-1" style={{ textAlign: isAr ? 'right' : 'left' }}>
            {isAr ? 'لماذا ينصح بتفعيل تسجيل الدخول؟ 🤔' : 'Why connect your Google account? 🤔'}
          </h4>
          <ul className="space-y-2 text-[10.5px] sm:text-[11px] text-slate-600 dark:text-slate-350">
            <li className="flex items-start gap-2.5">
              <span className="text-indigo-500 font-bold text-xs">✓</span>
              <span><strong>{isAr ? 'حفظ وحماية تقدمك الفردي:' : 'Preserve Progress:'}</strong> {isAr ? 'أرشفة شاملة وسجل أكاديمي كامل لجميع حلولك وتفاصيل محاولاتك.' : 'Keep a full academic transcript of all your interactive quiz attempts.'}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-indigo-500 font-bold text-xs">✓</span>
              <span><strong>{isAr ? 'شهادات تخرج باسمك الحقيقي:' : 'Verified PDF Certificates:'}</strong> {isAr ? 'توليد شهادات مهارية حية باسمك الشخصي فوراً لطباعتها ومشاركتها.' : 'Instantly compose and print certified mastery diplomas featuring your chosen real name.'}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-indigo-500 font-bold text-xs">✓</span>
              <span><strong>صعود لوحات الشرف والترتيب الحية:</strong> {isAr ? 'تمثيل اسمك الحقيقي في صدارة منجزات الطلاب وتحدي المنافسين.' : 'Securely bind your scores to lock in the absolute highest streaks on live lists.'}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3 pt-1">
          <button
            onClick={onGoogleLogin}
            className="w-full py-3 sm:py-3.5 rounded-2.5xl bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isAr ? 'تأكيد التسجيل بحساب Google للبدء 🚀' : 'Confirm & Authenticate via Google 🚀'}</span>
          </button>

          {isAuthQuiz && (
            <button
              onClick={() => onContinueAsGuest(authRedirectQuizId)}
              className="w-full py-2.5 sm:py-3 rounded-2.5xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <span>{isAr ? 'المتابعة كطالب زائر وحل الاختبار فوراً 👤' : 'Continue as guest & solve quiz instantly 👤'}</span>
            </button>
          )}
          
          {/* Iframe tip with instant link */}
          <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-extrabold leading-normal pt-1">
            {isAr
              ? '💡 تواجه مشكلة في تسجيل الدخول؟ إذا تم حظر النوافذ المنبثقة من متصفحك لوجود التطبيق في وضع المعاينة،'
              : '💡 Having trouble? If popups are blocked inside the preview iframe, you can'}
            {' '}
            <button
              onClick={() => {
                onClose();
                window.open(window.location.href, '_blank');
              }}
              className="text-indigo-500 hover:text-indigo-600 underline font-black cursor-pointer bg-transparent border-none p-0 inline"
            >
              {isAr ? 'اضغط هنا لفتح التطبيق في نافذة مستقلة ومتابعة الدخول بأمان' : 'click here to open in a new tab & continue login securely'}
            </button>
            {isAr ? '.' : '.'}
          </div>
        </div>
      </div>
    </div>
  );
}
