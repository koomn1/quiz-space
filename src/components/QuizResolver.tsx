/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import CosmicLoader from "./CosmicLoader";
import { Quiz, Question, QuizCompletion } from '../types';
import { CheckCircle2, XCircle, ArrowLeft, ArrowRight, Star, RefreshCw, FileText, Share2, BadgeCheck, Printer, Heart, Download, Clock, ThumbsUp, ThumbsDown, Sparkles, Lock } from 'lucide-react';
import { getQuizById, submitQuizAttempt, rateQuestion, getBestScoreByQuizId } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { explainQuestionWithGemini } from '../services/geminiService';
import { getApiUrl } from '../lib/origin';
import { fetchWithAuth } from '../lib/authFetch';
import { pushNotificationsManager } from '../lib/pushNotifications';
import confetti from 'canvas-confetti';
import { playNotificationSound } from '../lib/sound';
import QuizDetailedReport from './QuizDetailedReport';
import QuizCountdownTimer from './QuizCountdownTimer';
import { playChimeSound } from './ExtraFeatures';

import { translations } from '../lib/i18n';

function replaceOklchColors(value: string): string {
  if (typeof value !== 'string' || !value.includes('oklch')) {
    return value;
  }
  
  const oklchGlobalRegex = /oklch\(\s*([\d.]+)(\%?)(?:\s+|\s*,\s*)([\d.]+)(?:\s+|\s*,\s*)([\d.]+)(?:\s*[\/,\s]\s*([\d.]+)(\%?))?\s*\)/gi;
  
  return value.replace(oklchGlobalRegex, (match, p1, p2, p3, p4, p5, p6) => {
    let L = parseFloat(p1);
    if (p2 === '%') L /= 100;
    const C = parseFloat(p3);
    const H = parseFloat(p4);
    
    let alpha: number | undefined;
    if (p5) {
      alpha = parseFloat(p5);
      if (p6 === '%') alpha /= 100;
    }

    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = Math.max(0, l_ * l_ * l_);
    const m = Math.max(0, m_ * m_ * m_);
    const s = Math.max(0, s_ * s_ * s_);

    let rL = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let gL = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let bL = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const f = (c: number) => {
      if (c <= 0.0031308) return 12.92 * c;
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    };

    const r = Math.max(0, Math.min(255, Math.round(f(rL) * 255)));
    const g = Math.max(0, Math.min(255, Math.round(f(gL) * 255)));
    const b_ = Math.max(0, Math.min(255, Math.round(f(bL) * 255)));

    if (alpha !== undefined) {
      return `rgba(${r}, ${g}, ${b_}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${b_})`;
  });
}

interface QuizResolverProps {
  quizId: string;
  userId: string;
  userName: string;
  onGoHome: () => void;
  onShareQuiz?: (quizId: string, quizTitle: string, quizDescription?: string) => void;
  lang?: 'ar' | 'en';
  onQuizLockChange?: (isLocked: boolean) => void;
  userPlan?: 'Free' | 'Silver' | 'Gold' | 'Diamond';
}

export default function QuizResolver({
  quizId,
  userId,
  userName,
  onGoHome,
  onShareQuiz,
  lang = 'ar',
  onQuizLockChange,
  userPlan = 'Free'
}: QuizResolverProps) {
  const t = translations[lang];
  const isAr = lang === 'ar';
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Solving states
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const [isAnswersFrozen, setIsAnswersFrozen] = React.useState(false);
  const [userAnswers, setUserAnswers] = React.useState<number[]>([]);
  const [essayAnswers, setEssayAnswers] = React.useState<string[]>([]);
  const [essayAnswerText, setEssayAnswerText] = React.useState('');
  const [essayAssessed, setEssayAssessed] = React.useState<boolean | null>(null);
  const [essayAssessments, setEssayAssessments] = React.useState<Record<number, boolean>>({});
  const [score, setScore] = React.useState(0);
  const [isQuizCompleted, setIsQuizCompleted] = React.useState(false);
  const [hasShaken, setHasShaken] = React.useState(false);

  // Timer states
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [isTimeOut, setIsTimeOut] = React.useState(false);

  // Review states
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const [takerName, setTakerName] = React.useState(userName || '');
  const [rating, setRating] = React.useState<number>(5);
  const [feedback, setFeedback] = React.useState('');
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [isReviewSubmitted, setIsReviewSubmitted] = React.useState(false);

  // Forced rating states
  const [savedCompletionId, setSavedCompletionId] = React.useState<string | null>(null);
  const [selectedRating, setSelectedRating] = React.useState<number>(0);
  const [feedbackText, setFeedbackText] = React.useState<string>('');

  // Question ratings states
  const [questionRatings, setQuestionRatings] = React.useState<Record<string, 'like' | 'dislike'>>({});

  // Flashcards state
  const [isFlashcardMode, setIsFlashcardMode] = React.useState(false);
  const [currentFlashcardIdx, setCurrentFlashcardIdx] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [aiFlashcardExplanations, setAiFlashcardExplanations] = React.useState<Record<string, string>>({});
  const [aiFlashcardLoading, setAiFlashcardLoading] = React.useState<Record<string, boolean>>({});

  const handleFetchAiFlashcardExplanation = async (qId: string, q: Question) => {
    if (aiFlashcardLoading[qId]) return;
    setAiFlashcardLoading(prev => ({ ...prev, [qId]: true }));
    try {
      let correctAnswer = '';
      if (q.type === 'essay') {
        correctAnswer = q.correctAnswer || '';
      } else {
        correctAnswer = q.type === 'mcq' 
          ? q.options[q.correctIndex] 
          : (q.correctIndex === 0 ? (isAr ? 'صح' : 'True') : (isAr ? 'خطأ' : 'False'));
      }

      const { explanation } = await explainQuestionWithGemini(
        q.text,
        q.options || [],
        correctAnswer
      );
      if (explanation) {
        setAiFlashcardExplanations(prev => ({ ...prev, [qId]: explanation }));
      } else {
        setAiFlashcardExplanations(prev => ({ ...prev, [qId]: isAr ? 'عذراً، فشل توليد الشرح الأكاديمي حالياً.' : 'Failed to generate explanation.' }));
      }
    } catch (err) {
      setAiFlashcardExplanations(prev => ({ ...prev, [qId]: isAr ? 'خطأ في الاتصال بالمعلم الذكي.' : 'Error contacting the AI Tutor.' }));
    } finally {
      setAiFlashcardLoading(prev => ({ ...prev, [qId]: false }));
    }
  };

  // Sync question ratings local state
  React.useEffect(() => {
    const activeUserId = userId || 'user-guest';
    try {
      const localRatings = JSON.parse(localStorage.getItem('quiz_local_question_ratings') || '[]');
      const ratingMap: Record<string, 'like' | 'dislike'> = {};
      localRatings.forEach((r: any) => {
        if (r.userId === activeUserId) {
          ratingMap[r.questionId] = r.ratingValue;
        }
      });
      setQuestionRatings(ratingMap);
    } catch (_) {}
  }, [userId]);

  const handleRateQuestion = async (qId: string, qText: string, rVal: 'like' | 'dislike') => {
    const activeUserId = userId || 'user-guest';
    const newRatings = { ...questionRatings, [qId]: rVal };
    setQuestionRatings(newRatings);
    
    if (quiz) {
      await rateQuestion(activeUserId, quiz.id, quiz.title, qId, qText, rVal);
    }
  };

  // Play premium success sound when quiz finishes & trigger auto-save + route lock
  React.useEffect(() => {
    if (isQuizCompleted) {
      playNotificationSound('success');

      if (onQuizLockChange) {
        onQuizLockChange(true);
      }

      const autoSave = async () => {
        try {
          const finalName = takerName.trim() || userName.trim() || 'طالب متميز';
          const res = await submitQuizAttempt(quizId, {
            takerId: userId || 'anonymous',
            takerName: finalName,
            score,
            rating: undefined,
            feedback: ''
          });

          if (res && res.completion) {
            setSavedCompletionId(res.completion.id);
            console.log('Quiz auto-saved successfully, completion ID:', res.completion.id);
          }
        } catch (e) {
          console.error('Quiz auto-save failed:', e);
        }
      };
      autoSave();
    } else {
      if (onQuizLockChange) {
        onQuizLockChange(false);
      }
    }
  }, [isQuizCompleted, quizId, userId, takerName, userName, score]);

  // Intercept and block all navigation popstate, back gestures, and close actions when in results overlay
  React.useEffect(() => {
    if (isQuizCompleted && selectedRating === 0) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = isAr 
          ? 'تقييم الاختبار مطلوب لحفظ درجاتك ولا يمكنك الخروج الآن!' 
          : 'Rating the quiz is required to save your progress!';
        return e.returnValue;
      };

      // Push history state to prevent student from navigating back or out of results overlay
      window.history.pushState(null, '', window.location.href);
      const handlePopState = (e: PopStateEvent) => {
        window.history.pushState(null, '', window.location.href);
        alert(isAr 
          ? 'تنبيه إلزامي: يرجى اختيار تقييم بالنجوم (1-5) والضغط على "إنهاء وخروج" لحفظ درجاتك بنجاح.' 
          : 'Mandatory: Please select a star rating (1-5) and click "Finish & Exit" to save your score.');
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isQuizCompleted, selectedRating, isAr]);

  // Fetch single Quiz on load with localStorage restore capability
  React.useEffect(() => {
    let isActive = true;
    async function loadQuiz() {
      setIsLoading(true);
      setError(null);
      
      // Reset all states to standard defaults at the beginning of load to prevent state bleed-over across different users/quizzes
      if (isActive) {
        setCurrentIdx(0);
        setSelectedIdx(null);
        setIsAnswersFrozen(false);
        setUserAnswers([]);
        setEssayAnswers([]);
        setEssayAnswerText('');
        setEssayAssessed(null);
        setEssayAssessments({});
        setScore(0);
        setIsQuizCompleted(false);
        setHasShaken(false);
        setTimeLeft(0);
        setIsTimeOut(false);
        setIsReviewSubmitted(false);
        setFeedback('');
        setRating(5);
        setTakerName(userName || '');
      }

      try {
        const data = await getQuizById(quizId);
        if (!data) {
          throw new Error('لم يتم العثور على هذا الاختبار!');
        }
        if (isActive) {
          setQuiz(data);
          
          let resolvedTimeLeft = data.timeLimit && data.timeLimit > 0 ? data.timeLimit : 0;
          let resolvedEssayAnswers = new Array(data.questions.length).fill('');
          
          // Attempt to restore saved progress session representation from localStorage scoped to BOTH userId and quizId
          try {
            const savedKey = `quiz_session_${userId || 'anonymous'}_${quizId}`;
            const saved = localStorage.getItem(savedKey);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed) {
                if (typeof parsed.currentIdx === 'number') setCurrentIdx(parsed.currentIdx);
                if (Array.isArray(parsed.userAnswers)) setUserAnswers(parsed.userAnswers);
                if (Array.isArray(parsed.essayAnswers)) resolvedEssayAnswers = parsed.essayAnswers;
                if (typeof parsed.score === 'number') setScore(parsed.score);
                if (typeof parsed.isQuizCompleted === 'boolean') setIsQuizCompleted(parsed.isQuizCompleted);
                if (typeof parsed.isAnswersFrozen === 'boolean') setIsAnswersFrozen(parsed.isAnswersFrozen);
                if (parsed.selectedIdx !== undefined) setSelectedIdx(parsed.selectedIdx);
                if (typeof parsed.essayAnswerText === 'string') setEssayAnswerText(parsed.essayAnswerText);
                if (parsed.essayAssessed !== undefined) setEssayAssessed(parsed.essayAssessed);
                if (parsed.essayAssessments !== undefined) setEssayAssessments(parsed.essayAssessments);
                if (typeof parsed.timeLeft === 'number') resolvedTimeLeft = parsed.timeLeft;
              }
            } else {
              // No saved state exists, init clean states
              setUserAnswers([]);
              setEssayAnswers(resolvedEssayAnswers);
            }
          } catch (e) {
            console.warn('Failed to restore quiz session from localStorage:', e);
          }
          
          setTimeLeft(resolvedTimeLeft);
          if (!localStorage.getItem(`quiz_session_${userId || 'anonymous'}_${quizId}`)) {
            setEssayAnswers(resolvedEssayAnswers);
          }
        }
      } catch (err: any) {
        if (isActive) {
          setError(err.message || 'عذراً، تعذر الوصول لمحتوى هذا الرابط.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }
    loadQuiz();
    return () => {
      isActive = false;
    };
  }, [quizId, userId, userName]);

  // Active countdown timer loop triggering automated submission on expiry
  React.useEffect(() => {
    if (isQuizCompleted || !quiz || !quiz.timeLimit || timeLeft <= 0) {
      if (quiz && quiz.timeLimit && timeLeft === 0 && !isQuizCompleted) {
        setIsTimeOut(true);
        setIsQuizCompleted(true);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimeOut(true);
          setIsQuizCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isQuizCompleted, quiz]);

  // Automatic saving state changes to localStorage
  React.useEffect(() => {
    if (!quiz) return;
    try {
      const stateToSave = {
        currentIdx,
        userAnswers,
        essayAnswers,
        essayAnswerText,
        essayAssessed,
        essayAssessments,
        score,
        isQuizCompleted,
        isAnswersFrozen,
        selectedIdx,
        timeLeft
      };
      localStorage.setItem(`quiz_session_${userId || 'anonymous'}_${quizId}`, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save quiz state to localStorage:', e);
    }
  }, [quiz, currentIdx, userAnswers, essayAnswers, essayAnswerText, essayAssessed, essayAssessments, score, isQuizCompleted, isAnswersFrozen, selectedIdx, timeLeft, quizId, userId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 max-w-xl mx-auto">
        <CosmicLoader />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">جاري سحب مفردات وأسئلة الاختبار التفاعلي...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl p-10 text-center max-w-xl mx-auto space-y-5 shadow-xs">
        <XCircle className="w-12 h-12 mx-auto text-red-500" />
        <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100">رابط غير متوفر</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {error || 'عذراً، يبدو أن الاختبار المطلوب قد تم تعديله أو حذفه مسبقاً من قبل الناشر.'}
        </p>
        <button
          onClick={onGoHome}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIdx];
  const progressPercent = Math.round(((currentIdx) / quiz.questions.length) * 100);

  // Option submission check
  const handleSelectOption = (idx: number) => {
    if (isAnswersFrozen) return;
    setSelectedIdx(idx);
    setIsAnswersFrozen(true);

    const isCorrect = idx === currentQuestion.correctIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
      try {
        playNotificationSound('success');
      } catch (_) {}
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#4F46E5', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']
      });
    } else {
      try {
        playNotificationSound('tap');
      } catch (_) {}
      setHasShaken(true);
      setTimeout(() => setHasShaken(false), 500);
    }

    const nextAnswers = [...userAnswers];
    nextAnswers[currentIdx] = idx;
    setUserAnswers(nextAnswers);
  };

  // Next question navigation
  const handleNextQuestion = () => {
    setSelectedIdx(null);
    setIsAnswersFrozen(false);
    setEssayAnswerText('');
    setEssayAssessed(null);

    if (currentIdx + 1 < quiz.questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsQuizCompleted(true);
    }
  };

  // Submit final scores & reviews to Firestore
  const handleSaveResult = async () => {
    if (!takerName.trim()) {
      alert('فضلاً قم بإدراج اسمك أولاً قبل حفظ النتيجة.');
      return;
    }
    setIsSubmittingReview(true);

    try {
      const previousBestScore = await getBestScoreByQuizId(quizId);
      
      await submitQuizAttempt(quizId, {
        takerId: userId,
        takerName: takerName.trim(),
        score,
        rating,
        feedback: feedback.trim()
      });

      if (previousBestScore > 0 && score > previousBestScore) {
        const body = lang === 'ar' 
          ? `تهانينا! الطالب «${takerName.trim()}» حطم الرقم القياسي السابق وسجل ${score} في اختبار «${quiz.title}»!`
          : `Congratulations! Player «${takerName.trim()}» just shattered the previous high score with ${score} points on the quiz «${quiz.title}»!`;
        pushNotificationsManager.dispatchRecordBroken(quizId, quiz.title, takerName.trim(), score, body);
      }

      setIsReviewSubmitted(true);
    } catch (e) {
      console.error(e);
      alert('عذراً، فشل تسجيل التقييم في الفايربيز داتابيز.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Submit the forced star rating and release route lock
  const handleFinalSubmitAndExit = async () => {
    if (selectedRating === 0) return;
    setIsSubmittingReview(true);

    try {
      const finalName = takerName.trim() || userName.trim() || 'طالب متميز';
      
      // Save rating attempt safely to Supabase/LocalStorage
      try {
        if (savedCompletionId) {
          try { await supabase.from('completions').update({
            rating: selectedRating,
            feedback: feedbackText.trim()
          }).eq('id', savedCompletionId); } catch {}
        } else {
          try { await submitQuizAttempt(quizId, {
            takerId: userId || 'anonymous',
            takerName: finalName,
            score,
            rating: selectedRating,
            feedback: feedbackText.trim()
          }); } catch {}
        }
      } catch (e) {
        console.warn('Rating save fallback:', e);
      }

      try {
        playNotificationSound('success');
      } catch (_) {}

      // Release route block!
      if (onQuizLockChange) {
        onQuizLockChange(false);
      }

      // Return home
      onGoHome();
    } catch (err) {
      console.error('Quiz exit error:', err);
      if (onQuizLockChange) onQuizLockChange(false);
      onGoHome();
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Retake test setup
  const handleRetake = () => {
    setCurrentIdx(0);
    setSelectedIdx(null);
    setIsAnswersFrozen(false);
    setUserAnswers([]);
    setScore(0);
    setIsQuizCompleted(false);
    setIsReviewSubmitted(false);
    setFeedback('');
    setRating(5);
    setIsTimeOut(false);
    setEssayAnswers(new Array(quiz ? quiz.questions.length : 0).fill(''));
    setEssayAnswerText('');
    setEssayAssessed(null);
    setEssayAssessments({});
    if (quiz && quiz.timeLimit) {
      setTimeLeft(quiz.timeLimit);
    }
    try {
      localStorage.removeItem(`quiz_session_${userId || 'anonymous'}_${quizId}`);
    } catch (_) {}
  };

  // Print friendly / Export PDF trigger
  const handlePrintQuiz = () => {
    window.print();
  };

  // PDF dynamic generate & export using html2canvas & jsPDF
  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('quiz-pdf-export-content');
      if (!element) {
        throw new Error('لم يتم العثور على محتوى التوصيف للشهادة.');
      }

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2, // Retain crystal clear rendering
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const win = clonedDoc.defaultView;
          if (win) {
            const originalGetComputedStyle = win.getComputedStyle;
            win.getComputedStyle = function (el, pseudoElt) {
              const style = originalGetComputedStyle(el, pseudoElt);
              return new Proxy(style, {
                get(target, prop) {
                  if (prop === 'getPropertyValue') {
                    return function (propertyName: string) {
                      const val = target.getPropertyValue(propertyName);
                      if (typeof val === 'string' && val.includes('oklch')) {
                        return replaceOklchColors(val);
                      }
                      return val;
                    };
                  }
                  const value = target[prop as any];
                  if (typeof value === 'string' && value.includes('oklch')) {
                    return replaceOklchColors(value);
                  }
                  const valFunc = value as any;
                  if (typeof valFunc === 'function') {
                    return valFunc.bind(target);
                  }
                  return value;
                }
              });
            };
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate aspect ratio for A4
      const imgWidth = 595.28; // A4 size width in pt (approx. 210mm)
      const pageHeight = 841.89; // A4 size height in pt (approx. 297mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      const pdf = new jsPDF('p', 'pt', 'a4');
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add extra pages if report is taller than A4 page height
      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const cleanTitle = quiz.title.replace(/[\s\W]+/g, '_');
      pdf.save(`تقرير_${cleanTitle}_${takerName.trim() || 'طالب'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('حدث خطأ أثناء رصد الصورة وتحويل الملف لـ PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div  className="max-w-3xl mx-auto space-y-8 pb-16 print:bg-white print:p-0">
      
      {/* Top progress bar tracking percentage of completed questions with Framer Motion anim */}
      {!isQuizCompleted && (
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-1.5 rounded-full overflow-hidden shadow-inner print:hidden relative">
          <div
            
            style={{ width: `${progressPercent}%` }}
            
            className="h-full bg-primary rounded-full relative"
          />
        </div>
      )}

      {/* Return Page Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 print:hidden">
        {!isQuizCompleted ? (
          <button
            onClick={onGoHome}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary/90 font-bold"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الخروج للرئيسية</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-[#b175ff] font-extrabold animate-pulse">
            <span>🔒 الجلسة مقيدة حتى إتمام التقييم</span>
          </div>
        )}

        <span className="text-[11px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-md">
          الناشر: {quiz.creatorName}
        </span>
      </div>

      {/* Solving Phase layout */}
      {!isQuizCompleted ? (
        <div className="space-y-6">
          
          {/* Dual Toggle tab representing solving vs study flashcards */}
          <div className="flex bg-slate-100/80 dark:bg-slate-900/40 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 w-fit mx-auto print:hidden gap-1.5 shadow-xs">
            <button
              onClick={() => {
                playChimeSound('click');
                setIsFlashcardMode(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                !isFlashcardMode
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{isAr ? 'الوضع التنافسي: حل واختبار ⚡' : 'Competitive Mode: Solve & Test'}</span>
            </button>
            <button
              onClick={() => {
                playChimeSound('click');
                setIsFlashcardMode(true);
                setIsFlipped(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                isFlashcardMode
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <BadgeCheck className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'الوضع الأكاديمي: كروت الاستذكار 🎴' : 'Academic Mode: Study Flashcards'}</span>
            </button>
          </div>

          {/* CSS Animation injection for active answer & 3D rotating flashcards effects */}
          <style>{`
            @keyframes shake-panel {
              0%, 100% { transform: translateX(0); }
              15%, 45%, 75% { transform: translateX(-8px); }
              30%, 60%, 90% { transform: translateX(8px); }
            }
            .shake-question {
              animation: shake-panel 0.45s ease-in-out;
              border-color: #EF4444 !important;
              box-shadow: 0 0 20px rgba(239, 68, 68, 0.2) !important;
            }
            .preserve-3d {
              transform-style: preserve-3d;
            }
            .backface-hidden {
              backface-visibility: hidden;
              -webkit-backface-visibility: hidden;
            }
            .rotate-y-180 {
              transform: rotateY(180deg);
            }
          `}</style>

          {isFlashcardMode ? (
            userPlan !== 'Gold' && userPlan !== 'Diamond' ? (
              /* Elegant preview screen with an upgrade prompt for locked users */
              <div className="bg-[#0e0a1f]/80 backdrop-blur-2xl border border-[#3d1d6d]/40 rounded-3xl p-8 max-w-lg mx-auto text-center space-y-6 shadow-[0_0_40px_rgba(139,92,246,0.25)] animate-fade-in my-8 relative overflow-hidden">
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.4)] animate-bounce">
                  <Lock className="w-8 h-8 text-white" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
                    <span>{isAr ? 'ميزة بطاقات الاستذكار 🎴' : 'Study Flashcards Feature 🎴'}</span>
                    <span className="text-[10px] bg-gradient-to-r from-amber-400 to-pink-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">PREMIUM</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    {isAr 
                      ? 'تمتع بأسلوب المذاكرة الفائقة وتدبر النظريات العلمية عبر بطاقات الاستذكار التفاعلية ثلاثية الأبعاد المدعومة بالذكاء الاصطناعي. تتوفر هذه الميزة حصرياً للمشتركين في الباقات المميزة.' 
                      : 'Supercharge your preparation and master complex scientific paradigms with AI-powered interactive 3D study flashcards, exclusive to premium plan subscribers.'}
                  </p>
                </div>

                {/* Simulated Glassmorphic preview of a study card */}
                <div className="border border-white/5 bg-white/5 rounded-2xl p-5 text-right space-y-3 blur-[2px] pointer-events-none select-none my-2 relative">
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span># 1</span>
                    <span>{isAr ? 'كارت الاستذكار المعلق' : 'Preview Flashcard'}</span>
                  </div>
                  <div className="h-4 bg-slate-800/80 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-slate-800/80 rounded w-1/2 animate-pulse" />
                  <div className="h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/10 mt-4">
                    <span className="text-[10px] text-purple-400 font-extrabold">{isAr ? 'كشف الإجابة والتحليل الدقيق 👁️' : 'Reveal Solution & Analytics 👁️'}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => {
                      playChimeSound('correct');
                      // Trigger payment tab switch or route
                      window.location.hash = '#billing';
                      onGoHome();
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 text-white font-black text-xs rounded-xl hover:brightness-110 shadow-lg shadow-violet-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isAr ? 'رقّ حسابك للباقة الذهبية أو الماسية لفتح الميزة 👑' : 'Upgrade to Gold / Diamond Plan Now 👑'}</span>
                  </button>
                  <button
                    onClick={onGoHome}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-800"
                  >
                    <span>{isAr ? 'العودة للاختبارات الأخرى 🔙' : 'Return to Other Quizzes 🔙'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in py-4">
              {/* Interactive Flashcard instructions & progress indicator */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4.5 rounded-2.5xl shadow-sm">
                <div className="space-y-1 text-center sm:text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <h4 className="text-xs font-black text-slate-805 dark:text-white flex items-center justify-center sm:justify-start gap-1.5 leading-normal">
                    <BadgeCheck className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>{isAr ? 'كروت الاستذكار التفاعلية ثلاثية الأبعاد 🎴' : 'Interactive 3D Study Flashcards'}</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-normal">
                    {isAr ? 'انقر على كارت السؤال لقلبه ومعاينة الإجابة والتحليل وتدبر نظريته العلمية.' : 'Click any question card to flip and analyze the detailed scientific key solution.'}
                  </p>
                </div>
                <div className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 font-black px-3 py-1.5 rounded-xl border border-purple-500/10 tracking-wide font-sans">
                  {isAr ? 'الكارت' : 'Card'} {currentFlashcardIdx + 1} / {quiz.questions.length}
                </div>
              </div>

              {/* The Outer Perspective Card Box */}
              <div 
                className="w-full max-w-lg mx-auto h-[350px] [perspective:1000px] cursor-pointer"
                onClick={() => {
                  setIsFlipped(!isFlipped);
                  playChimeSound('click');
                }}
              >
                {/* Inner Card Container with perspective 3D transform */}
                <div
                  className="w-full h-full relative preserve-3d"
                  
                  
                >
                  {/* FRONT SIDE (Question) */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rounded-x3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 p-8 flex flex-col justify-between shadow-xs transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-650 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-3 py-1 rounded-full">
                        {quiz.questions[currentFlashcardIdx].type === 'mcq'
                          ? (isAr ? '❓ اختيار من متعدد' : '❓ Multiple Choice')
                          : quiz.questions[currentFlashcardIdx].type === 'tf'
                          ? (isAr ? '⭐ صح / خطأ' : '⭐ True / False')
                          : (isAr ? '✏️ سؤال مقالي' : '✏️ Essay Question')}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400"># {currentFlashcardIdx + 1}</span>
                    </div>

                    <div className="text-center py-4">
                      {quiz.questions[currentFlashcardIdx].imageUrl && (
                        <div className="flex justify-center mb-3">
                          <img
                            src={quiz.questions[currentFlashcardIdx].imageUrl}
                            alt="Question Diagram"
                            referrerPolicy="no-referrer"
                            className="max-h-28 rounded-lg object-contain border border-slate-200 dark:border-slate-800"
                          />
                        </div>
                      )}
                      <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-808 dark:text-slate-100 leading-relaxed max-h-36 overflow-y-auto px-2">
                        {quiz.questions[currentFlashcardIdx].text}
                      </h3>
                    </div>

                    <div className="flex flex-col items-center gap-1 text-[11px] text-slate-400 font-bold border-t border-dashed border-slate-150 dark:border-slate-800 pt-4">
                      <span className="flex items-center gap-1 text-purple-500 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                        <span>{isAr ? 'انقر لقلب الكارت وكشف السر الأكاديمي 🔄' : 'Click to flip and reveal the academic secret 🔄'}</span>
                      </span>
                    </div>
                  </div>

                  {/* BACK SIDE (Answer & Explanation) */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-x3 rounded-3xl bg-white dark:bg-slate-950 border border-purple-200 dark:border-purple-900/60 p-6 sm:p-8 flex flex-col justify-between shadow-md">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                          {isAr ? '✔ الإجابة النموذجية المرصودة' : '✔ Correct Model Answer'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400"># {currentFlashcardIdx + 1}</span>
                      </div>

                      {/* Display answer contents accurately depending on its category */}
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/10 rounded-2xl text-center">
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 leading-relaxed">
                          {(() => {
                            const q = quiz.questions[currentFlashcardIdx];
                            if (q.type === 'essay') {
                              return q.correctAnswer || (isAr ? 'مراجعة نموذجية بالذكاء الاصطناعي' : 'AI assessed model standard');
                            } else if (q.type === 'mcq') {
                              return q.options[q.correctIndex] || (isAr ? 'الخيار المعتمد' : 'Selected choice');
                            } else {
                              return q.correctIndex === 0 ? (isAr ? 'صح / صواب' : 'True') : (isAr ? 'خطأ / خطأ' : 'False');
                            }
                          })()}
                        </span>
                      </div>

                      {/* Academic explanation insights with Gemini integration option */}
                      <div className="space-y-1 text-right max-h-32 overflow-y-auto px-1" style={{ textAlign: isAr ? 'right' : 'left' }}>
                        <span className="text-[10px] font-black text-slate-400 block">{isAr ? '🔦 التفسير والشرح الأكاديمي:' : '💡 Explanatory Concept Notes:'}</span>
                        <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                          {quiz.questions[currentFlashcardIdx].explanation || (isAr 
                            ? 'تم رصد الفكرة لقياس الاسترجاع والاستدلال المهاري للحدث.' 
                            : 'Formulated to gauge explicit memory and cognitive reasoning recall.')}
                        </p>

                        {/* Custom lesson explanation block generated live on-demand */}
                        {aiFlashcardExplanations[quiz.questions[currentFlashcardIdx].id] && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[9px] uppercase font-black text-purple-650 dark:text-purple-400 block">{isAr ? '⚡ شرح كوزمو المعلم الرقمي:' : '⚡ Lesson by AI Tutor Cosmo:'}</span>
                            <p className="text-[11px] text-purple-950 dark:text-purple-105 leading-relaxed bg-purple-500/5 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/10 whitespace-pre-line font-medium text-right">
                              {aiFlashcardExplanations[quiz.questions[currentFlashcardIdx].id]}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-150 dark:border-slate-800/80 pt-3 mt-1 gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // prevent flipping card
                          handleFetchAiFlashcardExplanation(quiz.questions[currentFlashcardIdx].id, quiz.questions[currentFlashcardIdx]);
                          playChimeSound('click');
                        }}
                        disabled={aiFlashcardLoading[quiz.questions[currentFlashcardIdx].id]}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer transition-all border shrink-0 flex items-center gap-1 ${
                          aiFlashcardLoading[quiz.questions[currentFlashcardIdx].id]
                            ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-605 dark:text-purple-350 border-purple-200/55 animate-pulse'
                            : aiFlashcardExplanations[quiz.questions[currentFlashcardIdx].id]
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-650 dark:text-purple-400 hover:bg-purple-500/20 border-purple-500/20'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        <span>
                          {aiFlashcardLoading[quiz.questions[currentFlashcardIdx].id]
                            ? (isAr ? 'استحضار كوزمو...' : 'Summoning Cosmo...')
                            : aiFlashcardExplanations[quiz.questions[currentFlashcardIdx].id]
                            ? (isAr ? 'جاهز كلياً ✔' : 'Lesson Ready ✔')
                            : (isAr ? 'شرح ذكي مفصل بالـ AI 🧠' : 'Detailed AI Lesson 🧠')}
                        </span>
                      </button>

                      <span className="text-[10px] text-slate-400 font-bold block">
                        {isAr ? 'انقر للطلب مجدداً' : 'Click to flip back'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation and Actions */}
              <div className="flex items-center justify-between gap-4 max-w-sm mx-auto">
                <button
                  onClick={() => {
                    if (currentFlashcardIdx > 0) {
                      setCurrentFlashcardIdx(currentFlashcardIdx - 1);
                      setIsFlipped(false);
                      playChimeSound('click');
                    }
                  }}
                  disabled={currentFlashcardIdx === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 text-slate-550" />
                  <span>{isAr ? 'السابق' : 'Previous'}</span>
                </button>

                <div className="flex gap-1.5 justify-center items-center flex-wrap max-w-[150px]">
                  {quiz.questions.map((_, i) => (
                    <button
                      
                      onClick={() => {
                        setCurrentFlashcardIdx(i);
                        setIsFlipped(false);
                        playChimeSound('click');
                      }}
                      className={`h-2 rounded-full transition-all ${
                        i === currentFlashcardIdx 
                          ? 'w-5 bg-purple-650 dark:bg-purple-400' 
                          : 'w-2 bg-slate-205 dark:bg-slate-800 hover:bg-slate-300'
                      }`}
                      title={`${isAr ? 'كارت' : 'Card'} ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (currentFlashcardIdx + 1 < quiz.questions.length) {
                      setCurrentFlashcardIdx(currentFlashcardIdx + 1);
                      setIsFlipped(false);
                      playChimeSound('click');
                    }
                  }}
                  disabled={currentFlashcardIdx + 1 === quiz.questions.length}
                  className="px-4 py-2.5 rounded-xl border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>{isAr ? 'التالي' : 'Next'}</span>
                  <ArrowLeft className="w-4 h-4 text-slate-550" />
                </button>
              </div>
            </div>
            )
          ) : (
            <>
              {/* Progress Details row */}
              <div className="space-y-2 print:hidden">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-primary">السؤال {currentIdx + 1} من {quiz.questions.length}</span>
                  <span className="font-mono">{progressPercent}% مكتمل</span>
                </div>
                
                {/* Smooth linear progress bar */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    
                    style={{ width: `${progressPercent}%` }}
                    className="h-full bg-primary rounded-full"
                    
                  />
                </div>
              </div>
          <style>{`
            @keyframes shake-panel {
              0%, 100% { transform: translateX(0); }
              15%, 45%, 75% { transform: translateX(-8px); }
              30%, 60%, 90% { transform: translateX(8px); }
            }
            .shake-question {
              animation: shake-panel 0.45s ease-in-out;
              border-color: #EF4444 !important;
              box-shadow: 0 0 20px rgba(239, 68, 68, 0.2) !important;
            }
          `}</style>

          {/* Active Question Panel with elegant minimalist design */}
          
            <div
              
              
              
              
              
              className={`relative p-6 sm:p-10 md:p-12 rounded-[2rem] bg-white/95 dark:bg-[#090d16]/70 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] space-y-10 transition-all duration-500 overflow-hidden ${
                hasShaken ? 'shake-question' : ''
              } ${
                isAnswersFrozen 
                  ? (selectedIdx === currentQuestion.correctIndex 
                      ? 'border border-emerald-500/30 dark:border-emerald-500/20 shadow-[0_8px_40px_rgb(16,185,129,0.08)]' 
                      : 'border border-rose-500/30 dark:border-rose-500/20 shadow-[0_8px_40px_rgb(244,63,113,0.08)]')
                  : 'border border-white/40 dark:border-slate-800/60 hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] hover:-translate-y-1'
              }`}
            >
            {/* Live Countdowns or State Headers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
              <div className="flex items-center gap-2">
                {quiz.timeLimit ? (
                  <QuizCountdownTimer
                    timeLeft={timeLeft}
                    totalTime={quiz.timeLimit}
                    lang={lang}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
                    <span>{isAr ? 'دراسة مستمرة (مفتوح)' : 'Study Mode (Open)'}</span>
                  </div>
                )}
              </div>

              {isAnswersFrozen ? (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  {selectedIdx === currentQuestion.correctIndex ? 'الإجابة صحيحة' : 'الإجابة خاطئة'}
                </span>
              ) : (
                <span className="text-[11px] text-primary dark:text-primary-light font-medium tracking-wide">
                  بانتظار إجابتك
                </span>
              )}
            </div>

            <h3 className="font-display font-medium text-2xl sm:text-3xl text-slate-800 dark:text-slate-100 leading-[1.6] text-right md:text-center z-10 relative tracking-tight selection:bg-primary/20">
              {currentQuestion.text}
            </h3>

            {currentQuestion.imageUrl && (
              <div className="flex justify-center my-4">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question Diagram"
                  referrerPolicy="no-referrer"
                  className="max-h-72 rounded-2xl object-contain border border-slate-200 dark:border-slate-700 shadow-xs"
                />
              </div>
            )}

            {/* Answer Feedbacks UI with instant transitions */}
            {currentQuestion.type === 'essay' ? (
              <div className="space-y-6 text-right font-sans" dir="rtl">
                {!isAnswersFrozen ? (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">صغ جوابك المقالي في الصندوق التالي:</label>
                    <textarea
                      value={essayAnswerText}
                      onChange={(e) => setEssayAnswerText(e.target.value)}
                      placeholder="ابدأ في كتابة الإجابة المقترحة هنا..."
                      rows={5}
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary text-sm font-medium text-slate-800 dark:text-slate-100 transition-all text-right shadow-inner"
                    />
                    <button
                      type="button"
                      disabled={!essayAnswerText.trim()}
                      onClick={() => {
                        const nextAnswers = [...essayAnswers];
                        nextAnswers[currentIdx] = essayAnswerText.trim();
                        setEssayAnswers(nextAnswers);
                        setIsAnswersFrozen(true);
                      }}
                      className="w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تأكيد الإجابة وقراءة الجواب النموذجي</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5 animate-fade-in text-right">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">إجابتك المكتوبة:</span>
                        <p className="text-xs text-slate-705 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{essayAnswerText || 'لا توجد إجابة مكتوبة.'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900 space-y-1.5">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">الجواب النموذجي المرصود بذكاء Gemini:</span>
                        <p className="text-xs text-slate-800 dark:text-slate-205 whitespace-pre-wrap leading-relaxed font-semibold">{currentQuestion.correctAnswer || 'لم يتم تحديد إجابة تفصيلية.'}</p>
                      </div>
                    </div>

                    {essayAssessed === null ? (
                      <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/20 space-y-3">
                        <p className="text-xs font-bold text-slate-750 dark:text-slate-200 text-center">بمقارنة صياغتك للأفكار الفائتة، هل ترى أن إجابتك صحيحة ومقبولة؟</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEssayAssessed(true);
                              setEssayAssessments(prev => ({ ...prev, [currentIdx]: true }));
                              setScore(prev => prev + 1);
                              confetti({ particleCount: 60, spread: 50 });
                              playNotificationSound('success');
                            }}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
                          >
                            ✅ إجابتي ملائمة وقريبة للنموذج (+1)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEssayAssessed(false);
                              setEssayAssessments(prev => ({ ...prev, [currentIdx]: false }));
                            }}
                            className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
                          >
                            ❌ إجابتي غير متناسقة أو خاطئة (0)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl border border-dotted border-slate-300/60 text-center text-xs font-semibold bg-slate-50 dark:bg-slate-900/40">
                        {essayAssessed ? (
                          <span className="text-emerald-600 dark:text-emerald-400">🎉 رائع! قمت باحتساب الإجابة صحيحة (+1 نقطة في محصلتك).</span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">تم رصد السؤال كإجابة تحتاج لمزيد من المراجعة والتحصيل الفردي.</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, oIdx) => {
                  const isSelected = selectedIdx === oIdx;
                  const isCorrect = oIdx === currentQuestion.correctIndex;
                  const showFeedback = isAnswersFrozen;

                  let optClass = 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 border hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200';
                  
                  if (showFeedback) {
                    if (isCorrect) {
                      optClass = 'border-emerald-500 bg-emerald-50/50 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-500/50 dark:text-emerald-300 border-2';
                    } else if (isSelected) {
                      optClass = 'border-rose-500 bg-rose-50/50 text-rose-800 dark:bg-rose-900/20 dark:border-rose-500/50 dark:text-rose-300 border-2';
                    } else {
                      optClass = 'opacity-40 border-slate-100 bg-transparent text-slate-400 dark:border-slate-800 border';
                    }
                  }

                  return (
                    <button
                      
                      disabled={isAnswersFrozen}
                      onClick={() => handleSelectOption(oIdx)}
                      className={`relative flex items-center p-5 rounded-[1.25rem] text-sm font-medium text-right transition-all duration-300 cursor-pointer ${optClass} overflow-hidden`}
                      
                      
                      
                    >
                      <div className="flex-1 pr-1 pl-10 leading-relaxed font-semibold">
                        {option}
                      </div>

                      {/* Letter badge or Feedback Icon */}
                      <div className="absolute left-6 flex items-center justify-center">
                        {showFeedback ? (
                          <>
                            {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-bounce" />}
                            {!isCorrect && isSelected && <XCircle className="w-5 h-5 text-rose-500 shadow-sm" />}
                          </>
                        ) : (
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold border border-slate-100 dark:border-slate-700/50 transition-colors group-hover:border-primary group-hover:text-primary">
                            {String.fromCharCode(isAr ? (1575 + oIdx) /* أرابك */ : (65 + oIdx) )}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Interactive Answer explanation segment */}
            
              {isAnswersFrozen && (
                <div
                  
                  
                  
                  className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3 text-right"
                >
                  <div className="flex items-center gap-2 justify-start text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>توضيح الإجابة</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentQuestion.explanation || 'تم إدراج هذا السؤال كاختبار مباشر، جميع الخيارات صياغتها علمية دقيقة.'}
                  </p>
                </div>
              )}
            
          </div>
        

          {/* Action button bar */}
          <div className="flex justify-end pt-2 print:hidden">
            {isAnswersFrozen && (
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold transition-all duration-205 cursor-pointer shadow-md shadow-primary/20"
              >
                <span>{currentIdx + 1 === quiz.questions.length ? 'إنهاء وحساب الدرجة' : 'السؤال التالي'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          </>
          )}
        </div>
      ) : (
        /* Completed Results Screen Panel */
        <div className="space-y-8 animate-fade-in print:bg-white print:p-0">
          
          {/* Circular Graph and scores info card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-8 sm:p-12 rounded-3xl shadow-sm text-center space-y-6 print:border-none print:shadow-none">
            
            <div className="space-y-2">
              <BadgeCheck className="w-12 h-12 text-primary mx-auto animate-bounce" />
              <h3 className="font-display font-extrabold text-2xl text-slate-800 dark:text-slate-100">تهانينا! لقد أكملت الاختبار بنجاح</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">"{quiz.title}"</p>
            </div>

            {/* Score circle layout */}
            <div className="relative mx-auto w-32 h-32 flex items-center justify-center rounded-full bg-primary-light/50 dark:bg-slate-900 border-4 border-primary">
              <div className="text-center">
                <span className="font-display font-black text-3xl text-primary block">
                  {Math.round((score / quiz.questions.length) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {score} من أصل {quiz.questions.length} صحيح
                </span>
              </div>
            </div>

            {/* User score assessment feedback banner */}
            <div className="max-w-md mx-auto text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {score === quiz.questions.length ? (
                <span className="p-2 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 font-bold block">علامة كاملة وممتازة! أنت خبير ومتقن لهذا الموضوع بالكامل. 🏆</span>
              ) : score >= quiz.questions.length / 2 ? (
                <span className="p-2 py-1.5 rounded-xl bg-primary-light dark:bg-primary/20 text-primary font-bold block">نتيجة مميزة جداً! استمر في التعلم والدراسة لتسجيل الدرجة النهائية. 👍</span>
              ) : (
                <span className="p-2 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 font-bold block">جيد، حاول مراجعة الإجابات الخاطئة وإعادة المحاولة لتحسين نتيجتك وتدريب مهاراتك. 📚</span>
              )}
            </div>

            {/* Print or Direct PDF actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 print:hidden">
              <button
                onClick={handleExportPDF}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-slate-400 text-white font-bold text-xs shadow-xs transition-with duration-150 cursor-pointer active:scale-95"
              >
                {isGeneratingPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري تصدير التقرير...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تصدير وثيقة PDF مفصلة</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrintQuiz}
                className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs border border-slate-200/50 dark:border-slate-600 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>تحميل / طباعة بصيغة PDF</span>
              </button>

              {onShareQuiz && (
                <button
                  onClick={() => onShareQuiz(quiz.id, quiz.title, quiz.description)}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-primary/10 dark:bg-primary-dark/25 text-primary dark:text-primary font-bold text-xs border border-primary/20 transition-colors cursor-pointer hover:bg-primary/20 dark:hover:bg-primary-dark/40"
                  title="نشر ومشاركة"
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة الاختبار ونشره للعامة</span>
                </button>
              )}
            </div>

          </div>

          {/* Ratings & Star review submissions panel */}
          <div className="bg-[#130b2b]/95 border-2 border-[#9b51e0]/60 p-6 sm:p-8 rounded-3xl shadow-[0_0_30px_rgba(155,81,224,0.35)] space-y-6 text-center select-none relative overflow-hidden print:hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#9b51e0]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#b175ff]/10 text-[#b175ff] animate-pulse">
                <Star className="w-6 h-6 fill-[#b175ff] text-[#b175ff]" />
              </div>
              <h4 className="font-display font-black text-lg text-white tracking-tight">
                {isAr ? 'تقييم الاختبار إلزامي لحفظ النتيجة وإنهاء الجلسة ✨' : 'Rating is required to save results & finish session ✨'}
              </h4>
              <p className="text-xs text-indigo-200/70 max-w-md mx-auto leading-relaxed">
                {isAr 
                  ? 'يرجى اختيار تقييم بالنجوم ودعم ومشاركة رأيك معنا لتفعيل زر الخروج وحفظ درجاتك في سجل الأداء بنجاح.' 
                  : 'Please provide a star rating to enable the exit button and successfully save your final record.'}
              </p>
            </div>

            {/* Neon Stars selection */}
            <div className="flex items-center justify-center gap-3.5 py-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = star <= selectedRating;
                return (
                  <button
                    
                    onClick={() => {
                      playChimeSound('click');
                      setSelectedRating(star);
                    }}
                    className="transform transition-all duration-150 hover:scale-130 active:scale-95 cursor-pointer relative group"
                  >
                    <Star
                      className={`w-9 h-9 sm:w-11 sm:h-11 transition-all duration-300 ${
                        isSelected 
                          ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.85)]' 
                          : 'text-slate-650 hover:text-[#b175ff]'
                      }`}
                    />
                    {isSelected && (
                      <span className="absolute inset-0 bg-amber-400 rounded-full filter blur-md opacity-25 scale-75 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Optional feedback comments for premium depth */}
            <div className="space-y-2 max-w-md mx-auto text-right">
              <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider block" style={{ textAlign: isAr ? 'right' : 'left' }}>
                {isAr ? 'ملاحظاتك الإضافية (اختياري):' : 'Additional Feedback (Optional):'}
              </label>
              <textarea
                rows={2}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={isAr ? 'اكتب ما فادك أو ما يحتاج للتعديل في الاختبار...' : 'Write what was helpful or what needs improvements...'}
                className="w-full bg-[#0a0518] border border-[#3d1d6d]/50 rounded-2xl p-3 text-xs text-slate-100 outline-none focus:border-[#b175ff] focus:ring-1 focus:ring-[#b175ff]/30 transition-all placeholder:text-slate-500"
                style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}
              />
            </div>

            {/* Forced Button: "إنهاء وخروج" (Finish & Exit) */}
            <div className="max-w-xs mx-auto pt-2">
              <button
                onClick={handleFinalSubmitAndExit}
                disabled={selectedRating === 0 || isSubmittingReview}
                className={`w-full py-3.5 rounded-2xl font-black text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  selectedRating > 0
                    ? 'bg-gradient-to-r from-violet-600 via-primary to-pink-500 text-white shadow-[0_0_25px_rgba(124,58,237,0.5)] hover:scale-102 hover:shadow-[0_0_35px_rgba(124,58,237,0.7)] active:scale-98'
                    : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                {isSubmittingReview ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري تدوين التقييم...' : 'Saving rating...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'إنهاء وخروج ✨' : 'Finish & Exit ✨'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Detailed Academic Answers Report */}
          <QuizDetailedReport
            questions={quiz.questions}
            userAnswers={userAnswers}
            essayAnswers={essayAnswers}
            essayAssessments={essayAssessments}
            lang={lang}
            questionRatings={questionRatings}
            onRateQuestion={handleRateQuestion}
          />

          {/* Printable Layout Sheet (Hidden from screen view, only active during native print commands) */}
          <div className="hidden print:block space-y-6 pt-10 text-slate-800 bg-white">
            <div className="border-b-2 border-slate-300 pb-4 text-center">
              <h2 className="text-2xl font-bold">{quiz.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>
              <p className="text-xs text-slate-400 mt-2">الاختبار مطبوع من منصة Quiz Space ومعد من قبل: {quiz.creatorName}</p>
            </div>

            <div className="space-y-6 pt-4">
              {quiz.questions.map((q, idx) => (
                <div  className="space-y-2 border-b border-slate-200 pb-4">
                  <h4 className="text-sm font-bold">س {idx + 1}: {q.text}</h4>
                  
                  {q.type === 'mcq' ? (
                    <div className="grid grid-cols-2 gap-2 pl-6 pt-1 text-xs">
                      {q.options.map((opt, oIdx) => (
                        <div  className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center ${oIdx === q.correctIndex ? 'bg-black' : ''}`} />
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-4 pl-6 pt-1 text-xs">
                      <div className="flex items-center gap-1">
                        <div className={`w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center ${q.correctIndex === 0 ? 'bg-black' : ''}`} />
                        <span>صح</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center ${q.correctIndex === 1 ? 'bg-black' : ''}`} />
                        <span>خطأ</span>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded-md mt-2 font-medium">
                    الإجابة الصحيحة المقررة: الخيار رقم ({q.correctIndex + 1}) - {q.options[q.correctIndex]}
                    <br />
                    الشرح والتوضيح: {q.explanation || 'تم إدراج هذا السؤال كاختبار مباشر.'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden high-fidelity template for PDF generation */}
          <div 
            id="quiz-pdf-export-content" 
            className="text-right p-12 bg-white text-slate-805 font-sans"
            style={{ 
              position: 'absolute', 
              top: '-9999px', 
              left: '-9999px', 
              width: '794px', 
              direction: 'rtl' 
            }}
          >
            {/* Decorative Header Banner */}
            <div className="flex items-center justify-between border-b-2 border-primary pb-6 mb-8 mb-4">
              <div>
                <h1 className="text-2xl font-black text-primary font-display">منصة Quiz Space</h1>
                <p className="text-xs text-slate-500 font-semibold">المنصة الأكاديمية الذكية لإنشاء وحل الاختبارات</p>
              </div>
              <div className="text-left">
                <span className="inline-block px-3.5 py-1.5 bg-primary/10 text-primary rounded-xl font-bold text-xs border border-primary/20">
                  وثيقة تفصيلية معتمدة
                </span>
                <p className="text-[10px] text-slate-400 mt-1.5 font-mono">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Title & Introduction */}
            <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl mb-8 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-primary block mb-0.5">تقرير نتائج الطالب:</span>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{quiz.title}</h2>
                </div>
                {/* Score box */}
                <div className="text-center px-5 py-3 bg-primary text-white rounded-xl shadow-xs">
                  <span className="block text-2xl font-black leading-none">{Math.round((score / quiz.questions.length) * 100)}%</span>
                  <span className="text-[10px] opacity-90 mt-1 block">النسبة المحققة</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {quiz.description || "لا يوجد وصف إضافي متوفر."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200/50 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">اسم الطالب الممتحن:</span>
                  <span className="text-slate-800 font-bold">{takerName || userName || 'طالب مجهول'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">أستاذ/ناشر الاختبار:</span>
                  <span className="text-slate-800 font-bold">{quiz.creatorName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">الدرجة المحصلة:</span>
                  <span className="text-slate-800 font-bold font-mono">{score} من أصل {quiz.questions.length}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">تقدير التقييم الورقي:</span>
                  <span className={`font-bold ${score === quiz.questions.length ? 'text-emerald-600' : score >= quiz.questions.length / 2 ? 'text-primary' : 'text-red-500'}`}>
                    {score === quiz.questions.length ? 'ممتاز مع مرتبة الشرف 🏆' : score >= quiz.questions.length / 2 ? 'جيد جداً / مجتاز 👍' : 'غير كافٍ / يحتاج إعادة 📚'}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed questions list */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 border-r-4 border-primary pr-3.5 mb-4">تفاصيل إجابات الأسئلة</h3>
              {quiz.questions.map((q, qIdx) => {
                const userAnswerIdx = userAnswers[qIdx];
                const isEssayCorrect = essayAssessments[qIdx] === true;
                const isCorrect = q.type === 'essay' ? isEssayCorrect : userAnswerIdx === q.correctIndex;
                
                return (
                  <div  className="border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs break-inside-avoid text-right" dir="rtl">
                    <div className="flex items-start justify-between gap-3 border-b border-light-200 pb-2">
                      <h4 className="text-sm font-bold text-slate-900 leading-relaxed text-right flex-1">
                        س {qIdx + 1}: {q.text}
                      </h4>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                        isCorrect 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-105' 
                          : 'bg-red-50 text-red-700 border border-red-105'
                      }`}>
                        {isCorrect ? 'إجابة صحيحة ✓' : 'إجابة غير صحيحة ✗'}
                      </span>
                    </div>

                    {/* Displaying Options with Ticks/Crosses */}
                    {q.type === 'essay' ? (
                      <div className="space-y-3 pl-0 text-xs text-right">
                        <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                          <span className="text-[10px] font-bold text-primary block">كتبت كإجابة ومحاولة:</span>
                          <p className="text-slate-700 dark:text-slate-300 italic whitespace-pre-wrap">{essayAnswers[qIdx] || 'لم يتم تسجيل إجابة مكتوبة.'}</p>
                        </div>
                        <div className="p-3 bg-emerald-50/40 rounded-xl space-y-1 border border-emerald-100/50">
                          <span className="text-[10px] font-bold text-emerald-800 block">الجواب النموذجي المرصود بذكاء Gemini:</span>
                          <p className="text-emerald-950 font-semibold whitespace-pre-wrap">{q.correctAnswer || 'لا يوجد إجابة نموذجية مسجلة مسبقاً.'}</p>
                        </div>
                      </div>
                    ) : q.type === 'mcq' ? (
                      <div className="grid grid-cols-2 gap-3 pl-6 text-xs text-right" dir="rtl">
                        {q.options.map((opt, oIdx) => {
                          const isUserSelected = userAnswerIdx === oIdx;
                          const isThisCorrect = oIdx === q.correctIndex;

                          let itemStyle = "border-slate-100 bg-slate-50 text-slate-600";
                          let indicator = "○";
                          if (isThisCorrect) {
                            itemStyle = "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold";
                            indicator = "✓";
                          } else if (isUserSelected) {
                            itemStyle = "border-red-300 bg-red-50 text-red-800 font-semibold";
                            indicator = "✗";
                          }

                          return (
                            <div  className={`flex items-center gap-2 p-2.5 border rounded-xl text-right ${itemStyle}`} style={{ direction: 'rtl' }}>
                              <span className="font-mono text-sm leading-none mr-1">{indicator}</span>
                              <span className="mr-1">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 pl-6 text-xs text-right" dir="rtl">
                        {/* True/False Options represented beautifully */}
                        {[0, 1].map((oIdx) => {
                          const isUserSelected = userAnswerIdx === oIdx;
                          const isThisCorrect = oIdx === q.correctIndex;
                          const label = oIdx === 0 ? 'صح' : 'خطأ';

                          let itemStyle = "border-slate-100 bg-slate-50 text-slate-600";
                          let indicator = "○";
                          if (isThisCorrect) {
                            itemStyle = "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold";
                            indicator = "✓";
                          } else if (isUserSelected) {
                            itemStyle = "border-red-300 bg-red-50 text-red-800 font-semibold";
                            indicator = "✗";
                          }

                          return (
                            <div  className={`flex items-center gap-2 p-2.5 border rounded-xl text-right ${itemStyle}`} style={{ direction: 'rtl' }}>
                              <span className="font-mono text-sm leading-none mr-1">{indicator}</span>
                              <span className="mr-1">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Question Info Footer Area */}
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-right">
                      <div className="font-bold text-primary mb-1">الإجابة وبناء التفوق:</div>
                      <p className="leading-relaxed">
                        {q.type === 'essay' ? (
                          <>
                            <span>هذا السؤال من النوع الإنشائي المقالي المفتوح، وتعتمد درجتُه على التقييم الذاتي بمطابقة إجابتك بالجواب الفعلي.</span>
                          </>
                        ) : (
                          <>
                            عملية الاختيار النموذجي تصب في <span className="bg-emerald-100 text-emerald-950 px-1 py-0.5 rounded font-bold">"{q.options[q.correctIndex] || (q.correctIndex === 0 ? 'صح' : 'خطأ')}"</span>.
                          </>
                        )}
                        <br />
                        <span className="text-slate-500 font-medium block mt-1">{q.explanation || 'تم تضمين هذا السؤال لقياس وتوجيه المعرفة المباشرة بمصداقية.'}</span>
                      </p>
                    </div>

                    {/* Rate Question segment */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                      <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">قيم جودة وفائدة هذا السؤال:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRateQuestion(q.id || `q-${qIdx}`, q.text, 'like')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold cursor-pointer transition-all ${
                            questionRatings[q.id || `q-${qIdx}`] === 'like'
                              ? 'bg-emerald-500 text-white font-bold border border-emerald-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/55 dark:border-slate-700/60'
                          }`}
                          title="هذا السؤال مفيد وممتاز"
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${questionRatings[q.id || `q-${qIdx}`] === 'like' ? 'fill-white' : ''}`} />
                          <span>أعجبني</span>
                        </button>
                        <button
                          onClick={() => handleRateQuestion(q.id || `q-${qIdx}`, q.text, 'dislike')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold cursor-pointer transition-all ${
                            questionRatings[q.id || `q-${qIdx}`] === 'dislike'
                              ? 'bg-red-500 text-white font-bold border border-red-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/55 dark:border-slate-705/60'
                          }`}
                          title="هذا السؤال يحتاج إلى تعديل أو غير واضح"
                        >
                          <ThumbsDown className={`w-3.5 h-3.5 ${questionRatings[q.id || `q-${qIdx}`] === 'dislike' ? 'fill-white' : ''}`} />
                          <span>لم يعجبني</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Closing Signature Area */}
            <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between text-slate-400 text-[10px]">
              <span>رقم التحقق الحسي للرابط: {quiz.id}</span>
              <span>منصة Quiz Space - جميع الحقوق محفوظة لغايات التعليم المستمر</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
