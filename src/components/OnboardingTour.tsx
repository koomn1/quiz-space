import React from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, BookOpen, ImageIcon, HelpCircle } from 'lucide-react';
import { playNotificationSound } from '../lib/sound';

interface Step {
  id: string;
  title: string;
  content: string;
  selector: string; // DOM selector to highlight
  tabTarget?: 'landing' | 'create' | 'profile';
  icon: React.ReactNode;
}

interface OnboardingTourProps {
  activeTab: 'landing' | 'create' | 'profile';
  setActiveTab: (tab: 'landing' | 'create' | 'profile') => void;
  onClose: () => void;
}

export default function OnboardingTour({
  activeTab,
  setActiveTab,
  onClose
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null);

  const steps: Step[] = React.useMemo(() => [
    {
      id: 'welcome',
      title: 'مرحباً بك في Quiz Space! ✨',
      content: 'دعنا نأخذك في جولة تعليمية سريعة ومبسطة للتعرف على المنصة وكيفية استغلال الذكاء الاصطناعي في قياس مستواك وتوليد الأسئلة فوراً!',
      selector: 'body', // Center of screen
      icon: <Sparkles className="w-6 h-6 text-primary" />
    },
    {
      id: 'create-tab',
      title: 'أزرار صنع وإنشاء الاختبارات 🛠️',
      content: 'اضغط على زر "صنع اختبار" في شريط التنقل أو البوابة الرئيسية للدخول إلى صفحة المولد الذكي وصياغة أسئلتك المخصصة.',
      selector: '#nav-btn-create',
      tabTarget: 'landing',
      icon: <BookOpen className="w-6 h-6 text-primary" />
    },
    {
      id: 'ai-ocr',
      title: 'مسح واستخراج الأسئلة من الصور بالذكاء الاصطناعي 📸',
      content: 'هل لديك صورة لكتاب، دفتر، أو حتى ورقة امتحان جاهزة؟ تبويب "التحميل والمسح الذكي" ومحرك Gemini 2.5 يقومان بنسخ الأسئلة حرفياً ونمذجتها كـ اختبار تفاعلي فوري ببضع ثوانٍ وبأعلى دقة تصحيح!',
      selector: '#tab-btn-ocr',
      tabTarget: 'create',
      icon: <ImageIcon className="w-6 h-6 text-primary" />
    },
    {
      id: 'done',
      title: 'أنت جاهز تماماً للبدء! 🚀',
      content: 'الآن، تصفح الكتالوج، قم بحل الاختبارات لمعرفة تفاصيل مستواك، أو امسح أوراقك ومذكراتك لتبدأ رحلتك التفاعلية معنا. نتمنى لك دراسة ممتعة!',
      selector: 'body',
      icon: <HelpCircle className="w-6 h-6 text-emerald-500" />
    }
  ], []);

  const currentStep = steps[currentStepIndex];
  const selector = currentStep?.selector;
  const tabTarget = currentStep?.tabTarget;

  // Dynamically calculate and update target highlight element bounding box
  const updateHighlight = React.useCallback(() => {
    if (!selector || selector === 'body') {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(selector);
    if (element) {
      setHighlightRect(element.getBoundingClientRect());
    } else {
      setHighlightRect(null);
    }
  }, [selector]);

  // Handle active tab switching when steps require a specific tab focus
  React.useEffect(() => {
    if (tabTarget && activeTab !== tabTarget) {
      setActiveTab(tabTarget);
      // Wait briefly for tab DOM render before recalculating highlight position
      const timer = setTimeout(updateHighlight, 350);
      return () => clearTimeout(timer);
    } else {
      updateHighlight();
    }
  }, [currentStepIndex, activeTab, tabTarget, setActiveTab, updateHighlight]);

  // Listen to window size changes/resizes to keep highlight rectangle accurate
  React.useEffect(() => {
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);
    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [updateHighlight]);

  const handleNext = () => {
    playNotificationSound('tap');
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const handleBack = () => {
    playNotificationSound('tap');
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const finishTour = () => {
    playNotificationSound('success');
    localStorage.setItem('quiz_onboarding_shown', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden select-none pointer-events-auto">
      {/* Semi-transparent backdrop with click-through masking */}
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-[1px] transition-all duration-300"
        onClick={finishTour}
      />

      {/* Dynamic DOM pulsing spotlight glow wrapper */}
      
        {highlightRect && (
          <div
            
            
            
            
            className="absolute z-[101] rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] dark:shadow-[0_0_0_9999px_rgba(2,6,23,0.85)] pointer-events-none"
          >
            {/* Soft internal indicator ripple animation */}
            <span className="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-60 pointer-events-none" />
          </div>
        )}
      

      {/* Floating Card UI */}
      <div className="absolute inset-0 flex items-center justify-center p-4 z-[102] pointer-events-none">
        <div
          
          
          
          className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-700 pointer-events-auto text-right space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-row-reverse">
            <button 
              onClick={finishTour}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 flex-row-reverse">
              <div className="w-10 h-10 bg-primary/10 dark:bg-primary-dark/25 rounded-xl flex items-center justify-center">
                {currentStep.icon}
              </div>
              <span className="text-xs bg-primary/10 dark:bg-primary-dark/30 text-primary px-2.5 py-1 rounded-lg font-bold">
                خطوة {currentStepIndex + 1} من {steps.length}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-display font-extrabold text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-snug">
              {currentStep.title}
            </h4>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              {currentStep.content}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
            {/* Completion indicators */}
            <div className="flex items-center gap-1">
              {steps.map((_, idx) => (
                <span 
                  
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex 
                      ? 'w-5 bg-primary' 
                      : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span>{currentStepIndex === steps.length - 1 ? 'إنهاء الجولة' : 'التالي'}</span>
                {currentStepIndex !== steps.length - 1 && <ArrowLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
