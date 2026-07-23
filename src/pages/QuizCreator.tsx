/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import CosmicLoader from "../components/CosmicLoader";
import { Question, Quiz } from '../types';
import { Plus, Trash2, Camera, Sparkles, Wand2, Save, FileText, ChevronLeft, Image as ImageIcon, HelpCircle, Clock, Check, MessageSquare, User, BookOpen, Tag, FolderOpen, XCircle, Search } from 'lucide-react';
import { createQuiz, updateQuiz, getQuizzes } from '../lib/db';
import { translations } from '../lib/i18n';
import { getApiUrl, getAppOrigin } from '../lib/origin';
import { supabase } from '../lib/supabaseClient';
import { fetchWithAuth } from '../lib/authFetch';
import { useQuizGenerator } from '../hooks/useQuizGenerator';
import DrivePicker from '../components/DrivePicker';
import { encryptMessage } from '../lib/encryption';
import { useSearchParams } from '../hooks/useSearchParams';

interface QuizCreatorProps {
  userId: string;
  userName: string;
  userEmail?: string;
  onQuizCreated: () => void;
  quizToEdit?: Quiz | null;
  onCancelEdit?: () => void;
  lang?: 'ar' | 'en';
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
  userPlan?: 'Free' | 'Silver' | 'Gold' | 'Diamond';
}

// Function to load pdf.js from CDN dynamically
const loadPdfJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjs);
    };
    script.onerror = () => {
      reject(new Error('فشل تحميل مكتبة قارئ الـ PDF من الخادم الخارجي.'));
    };
    document.body.appendChild(script);
  });
};

// Extracts text page-by-page from an uploaded PDF
const extractTextFromPdf = async (file: File): Promise<string[]> => {
  const pdfjs = await loadPdfJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    pageTexts.push(pageText);
  }
  return pageTexts;
};

interface HybridPagePart {
  pageNumber: number;
  type: 'text' | 'image';
  text?: string;
  imageBase64?: string;
}

interface ExtractionPart {
  partIndex: number;
  pages: number[];
  type: 'text' | 'image';
  textContent?: string;
  imageBase64?: string;
}

// Extracts either text or renders to canvas if it's a scanned page containing images
const extractHybridPagesFromPdf = async (
  file: File, 
  onPageProgress: (pageIndex: number, totalPages: number, pageType: 'text' | 'image') => void
): Promise<HybridPagePart[]> => {
  const pdfjs = await loadPdfJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: HybridPagePart[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ').trim();
    
    // If page contains less than 150 characters, it is most likely a scanned page or image
    if (pageText.length > 150) {
      onPageProgress(i, pdf.numPages, 'text');
      pages.push({
        pageNumber: i,
        type: 'text',
        text: pageText
      });
    } else {
      onPageProgress(i, pdf.numPages, 'image');
      
      // Render page to canvas to get image data for OCR
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('فشل إنشاء سياق رسم ثنائي الأبعاد لقراءة الصور.');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      pages.push({
        pageNumber: i,
        type: 'image',
        imageBase64
      });
    }
  }
  return pages;
};

// Partitions PDF pages into small digestible portions to avoid model confusion
const partitionHybridPages = (pages: HybridPagePart[]): ExtractionPart[] => {
  const parts: ExtractionPart[] = [];
  let partId = 1;
  
  let currentTextPages: number[] = [];
  let currentTextContent = '';
  
  for (const page of pages) {
    if (page.type === 'image') {
      // Flush any digital text pages accumulated first
      if (currentTextPages.length > 0) {
        parts.push({
          partIndex: partId++,
          pages: [...currentTextPages],
          type: 'text',
          textContent: currentTextContent
        });
        currentTextPages = [];
        currentTextContent = '';
      }
      // Add the image page as a standalone high-precision OCR part
      parts.push({
        partIndex: partId++,
        pages: [page.pageNumber],
        type: 'image',
        imageBase64: page.imageBase64
      });
    } else {
      // Accumulate text pages
      currentTextPages.push(page.pageNumber);
      currentTextContent += `\n--- الصفحة ${page.pageNumber} ---\n${page.text || ''}`;
      
      // Split text pages into chunks of 3 max to protect token limit & reasoning quality
      if (currentTextPages.length >= 3) {
        parts.push({
          partIndex: partId++,
          pages: [...currentTextPages],
          type: 'text',
          textContent: currentTextContent
        });
        currentTextPages = [];
        currentTextContent = '';
      }
    }
  }
  
  // Flush any trailing text pages
  if (currentTextPages.length > 0) {
    parts.push({
      partIndex: partId++,
      pages: currentTextPages,
      type: 'text',
      textContent: currentTextContent
    });
  }
  
  return parts;
};

const cropBase64Image = (base64Str: string, box: number[]): Promise<string> => {
  return new Promise((resolve) => {
    if (!box || box.length !== 4) {
      resolve('');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }
      const [ymin, xmin, ymax, xmax] = box;
      // safety constraint
      if (ymin >= ymax || xmin >= xmax || ymin < 0 || xmin < 0 || ymax > 1000 || xmax > 1000) {
        resolve('');
        return;
      }
      
      const x = (xmin / 1000) * img.width;
      const y = (ymin / 1000) * img.height;
      const w = ((xmax - xmin) / 1000) * img.width;
      const h = ((ymax - ymin) / 1000) * img.height;
      
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      console.warn('Failed to load image for cropping');
      resolve('');
    };
    img.src = base64Str;
  });
};

const COUNT_OPTIONS_WITH_AUTO = [
  { value: 0, label: 'تحديد تلقائي بذكاء الآلة', sub: 'استخراج كافة الأسئلة المتاحة بالكامل', icon: '✨', highlight: true },
  { value: 3, label: '3 أسئلة', sub: 'سريعة وخفيفة لتقييم خاطف', icon: '⚡' },
  { value: 5, label: '5 أسئلة', sub: 'قياسية متوازنة وشاملة الكفاءة', icon: '📊' },
  { value: 10, label: '10 أسئلة', sub: 'متكاملة ومترابطة للموضوع', icon: '🎯' },
  { value: 20, label: '20 سؤالاً', sub: 'مراجعة مكثفة للمعلومات', icon: '🔥' },
  { value: 50, label: '50 سؤالاً', sub: 'مراجعة شاملة لجزئيات الباب', icon: '📚' },
  { value: 100, label: '100 سؤال', sub: 'اختبار تجريبي كامل وموسع', icon: '🏆' },
  { value: 200, label: '200 سؤال', sub: 'بنك أسئلة واسع ومتشعب الفروع', icon: '💾' },
  { value: 300, label: '300 سؤال', sub: 'بنك أسئلة ضخم ومغطي للفصل', icon: '🧠' },
  { value: 500, label: '500 سؤال', sub: 'الحد الأقصى للمستندات الضخمة', icon: '🌌' },
];

const COUNT_OPTIONS_NO_AUTO = [
  { value: 3, label: '3 أسئلة', sub: 'سريعة وخفيفة لتقييم خاطف', icon: '⚡' },
  { value: 5, label: '5 أسئلة', sub: 'قياسية متوازنة وشاملة الكفاءة', icon: '📊' },
  { value: 10, label: '10 أسئلة', sub: 'متكاملة ومترابطة للموضوع', icon: '🎯' },
  { value: 20, label: '20 سؤالاً', sub: 'مراجعة مكثفة للمعلومات', icon: '🔥' },
  { value: 50, label: '50 سؤالاً', sub: 'مراجعة شاملة لجزئيات الباب', icon: '📚' },
  { value: 100, label: '100 سؤال', sub: 'اختبار تجريبي كامل وموسع', icon: '🏆' },
  { value: 200, label: '200 سؤال', sub: 'بنك أسئلة واسع ومتشعب الفروع', icon: '💾' },
  { value: 300, label: '300 سؤال', sub: 'بنك أسئلة ضخم ومغطي للفصل', icon: '🧠' },
  { value: 500, label: '500 سؤال', sub: 'الحد الأقصى للمستندات الضخمة', icon: '🌌' },
];

export default function QuizCreator({
  userId,
  userName,
  userEmail = '',
  onQuizCreated,
  quizToEdit = null,
  onCancelEdit,
  lang = 'ar',
  onOpenAuthModal,
  userPlan = 'Free'
}: QuizCreatorProps) {
  const [searchParams] = useSearchParams();
  const t = translations[lang];
  const isAr = lang === 'ar';
  const [activeMode, setActiveMode] = React.useState<'manual' | 'ocr' | 'ai' | 'paste'>('manual');

  // Dynamic free tier limits for non-premium accounts (2 uses each)
  const [fileUses, setFileUses] = React.useState<number>(() => {
    const saved = localStorage.getItem('cosmo_limit_file_ocr');
    return saved !== null ? parseInt(saved, 10) : 2;
  });
  const [sentenceUses, setSentenceUses] = React.useState<number>(() => {
    const saved = localStorage.getItem('cosmo_limit_sentence_ai');
    return saved !== null ? parseInt(saved, 10) : 2;
  });
  const [bookUses, setBookUses] = React.useState<number>(() => {
    const saved = localStorage.getItem('cosmo_limit_book_paste');
    return saved !== null ? parseInt(saved, 10) : 2;
  });

  // Paywall overlay modal triggers
  const [showPaywallOcr, setShowPaywallOcr] = React.useState(false);
  const [showPaywallSentence, setShowPaywallSentence] = React.useState(false);
  const [showPaywallBook, setShowPaywallBook] = React.useState(false);

  // Helper to render uses indicators
  const renderUsesIndicator = (usesCount: number) => {
    if (userPlan === 'Gold' || userPlan === 'Diamond') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-pulse">
          <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span>{isAr ? 'توليد غير محدود ✨' : 'Unlimited Generation ✨'}</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black shadow-[0_0_15px_rgba(139,92,246,0.25)] ${
        usesCount > 0 
          ? 'bg-violet-500/10 border border-violet-500/30 text-violet-400' 
          : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${usesCount > 0 ? 'bg-violet-400' : 'bg-rose-400'} animate-ping`} />
        <span>{isAr ? `متبقي لديك ${usesCount} من المحاولات` : `${usesCount} attempts remaining`}</span>
      </span>
    );
  };

  // Helper to render paywall overlay
  const renderPaywallOverlay = (titleAr: string, titleEn: string) => {
    return (
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center space-y-5 rounded-[32px] border border-violet-500/35 shadow-[0_0_50px_rgba(139,92,246,0.3)] animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-500 flex items-center justify-center border border-white/15 shadow-[0_0_25px_rgba(139,92,246,0.5)] animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        
        <div className="space-y-2">
          <h4 className="text-lg font-black text-white">
            {isAr ? `لقد نفدت محاولاتك المجانية لـ [${titleAr}]` : `Free attempts exhausted for [${titleEn}]`}
          </h4>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            {isAr 
              ? 'لقد نفدت محاولاتك المجانية لهذه الأداة، يرجى ترقية الحساب إلى الباقة الذهبية أو الماسية لفتح توليد غير محدود!' 
              : 'You have run out of free attempts for this tool. Please upgrade to the Gold or Diamond plan to unlock unlimited generations!'}
          </p>
        </div>

        <button
          onClick={() => {
            // Trigger switch to billing / subscription
            const billingTabBtn = document.querySelector('[data-tab-id="billing"]');
            if (billingTabBtn) {
              (billingTabBtn as HTMLElement).click();
            } else {
              window.location.hash = '#billing';
            }
          }}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 via-violet-600 to-pink-500 text-white font-black text-xs rounded-xl hover:brightness-110 shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2 cursor-pointer border border-white/10"
        >
          <span>{isAr ? 'ترقية الاشتراك إلى الباقة الذهبية الآن 👑' : 'Upgrade to Gold Plan Now 👑'}</span>
        </button>
      </div>
    );
  };
  
  // Quiz information
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('عام');
  const [distributionRouting, setDistributionRouting] = React.useState<'public' | 'classroom' | 'community'>('public');
  const [classrooms, setClassrooms] = React.useState<any[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = React.useState<string>('');
  const [loadingClassrooms, setLoadingClassrooms] = React.useState(false);

  React.useEffect(() => {
    const fetchClassrooms = async () => {
      setLoadingClassrooms(true);
      try {
        const { data, error } = await supabase.from('classrooms').select('*');
        if (!error && data) setClassrooms(data);
      } catch (err) {
        console.error('Error fetching classrooms in QuizCreator:', err);
      } finally {
        setLoadingClassrooms(false);
      }
    };
    fetchClassrooms();
  }, []);

  React.useEffect(() => {
    const paramClassroomId = searchParams.get('classroomId');
    if (paramClassroomId) {
      setDistributionRouting('classroom');
      setSelectedClassroomId(paramClassroomId);
    }
  }, [searchParams]);

  const [newCustomCategory, setNewCustomCategory] = React.useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = React.useState(false);
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([
    'عام',
    'علوم',
    'رياضيات',
    'تاريخ',
    'جغرافيا',
    'لغات',
    'ذكاء اصطناعي'
  ]);

  React.useEffect(() => {
    const fetchExistingCategories = async () => {
      try {
        const quizList = await getQuizzes();
        const cats = new Set<string>([
          'عام',
          'علوم',
          'رياضيات',
          'تاريخ',
          'جغرافيا',
          'لغات',
          'ذكاء اصطناعي'
        ]);
        quizList.forEach((q: any) => {
          if (q.category && q.category.trim()) {
            cats.add(q.category.trim());
          }
        });
        setAvailableCategories(Array.from(cats));
      } catch (err) {
        console.error('Error compiling categories:', err);
      }
    };
    fetchExistingCategories();
  }, [quizToEdit]);
  const [creatorName, setCreatorName] = React.useState(userName || 'صانع غامض');
  const [timeLimit, setTimeLimit] = React.useState<number>(0);
  const [questions, setQuestions] = React.useState<Question[]>([
    {
      id: 'q-initial-0',
      type: 'mcq',
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: ''
    }
  ]);

  // Pasted Text States
  const [pastedText, setPastedText] = React.useState('');
  const [pasteCount, setPasteCount] = React.useState(5);
  const [isGeneratingPaste, setIsGeneratingPaste] = React.useState(false);
  const [pasteError, setPasteError] = React.useState<string | null>(null);

  // Image Upload / OCR / PDF States
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploadedFilePreview, setUploadedFilePreview] = React.useState<string | null>(null);
  const [fileType, setFileType] = React.useState<'image' | 'pdf' | null>(null);
  const [pdfCount, setPdfCount] = React.useState(5);
  
  const [isProcessingOcr, setIsProcessingOcr] = React.useState(false);
  const [ocrError, setOcrError] = React.useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = React.useState<{
    stage: 'analyzing' | 'extracting' | 'compiling';
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Google Drive state
  const [gdriveAccount, setGdriveAccount] = React.useState<string | null>(() => {
    if (!userId) return null;
    try {
      return localStorage.getItem(`gdrive_account_${userId}`);
    } catch (_) { return null; }
  });

  const [isDrivePickerOpen, setIsDrivePickerOpen] = React.useState(false);
  const [isDownloadingFromDrive, setIsDownloadingFromDrive] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [searchDriveQuery, setSearchDriveQuery] = React.useState('');
  const [selectedDriveFile, setSelectedDriveFile] = React.useState<any | null>(null);

  // File Chat Prompt & Batch rendering states
  const [fileCustomPrompt, setFileCustomPrompt] = React.useState('');
  const [ocrBatches, setOcrBatches] = React.useState<{
    id: number;
    nameAr: string;
    nameEn: string;
    questionsCount: number;
    status: 'pending' | 'loading' | 'success' | 'error';
    errorMsg?: string;
  }[]>([]);
  const [activeBatchId, setActiveBatchId] = React.useState<number | null>(null);
  const [extractionMode, setExtractionMode] = React.useState<'literal' | 'generate'>('literal');

  // AI Prompt/Topic state
  const [aiTopic, setAiTopic] = React.useState('');
  const [aiCount, setAiCount] = React.useState(5);
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  
  // Progress simulation
  const [simulatedCount, setSimulatedCount] = React.useState(0);
  const [targetCount, setTargetCount] = React.useState(5);
  const [isSimulatingProgress, setIsSimulatingProgress] = React.useState(false);

  // Saving state
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Drag over states for file uploads
  const [dragActive, setDragActive] = React.useState(false);

  // New batching generator hook
  const {
    generateAndSaveQuiz,
    isGenerating,
    generationProgress,
    generationError,
    resetGeneration,
  } = useQuizGenerator();

  // Synchronize ocrProgress with generationProgress
  React.useEffect(() => {
    if (generationProgress && activeMode === 'ocr') {
      setOcrProgress({
        stage: generationProgress.stage === 'scanning' ? 'analyzing' : generationProgress.stage === 'saving' ? 'compiling' : 'extracting',
        current: generationProgress.current,
        total: generationProgress.total,
        message: generationProgress.message,
      });
    } else {
      setOcrProgress(null);
    }
  }, [generationProgress, activeMode]);

  const renderErrorMsg = (errorStr: string | null) => {
    if (!errorStr) return null;
    const needsLogin = errorStr.includes('يجب تسجيل الدخول') || errorStr.includes('تسجيل الدخول') || errorStr.toLowerCase().includes('login');
    
    return (
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 text-xs font-medium flex flex-col sm:flex-row items-center justify-between gap-3 text-right w-full" dir="rtl">
        <div className="flex-1">
          {errorStr}
        </div>
        {needsLogin && onOpenAuthModal && (
          <button
            type="button"
            onClick={() => onOpenAuthModal('login')}
            className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-red-600/10 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>{isAr ? 'تسجيل الدخول الآن 🔐' : 'Log In Now 🔐'}</span>
          </button>
        )}
      </div>
    );
  };

  // Load quizToEdit if edited
  React.useEffect(() => {
    if (quizToEdit) {
      setTitle(quizToEdit.title || '');
      setDescription(quizToEdit.description || '');
      setTimeLimit(quizToEdit.timeLimit || 0);
      setCreatorName(quizToEdit.creatorName || userName);
      setCategory(quizToEdit.category || 'عام');
      if (quizToEdit.questions && Array.isArray(quizToEdit.questions)) {
        setQuestions(quizToEdit.questions);
      }
      if (quizToEdit.distributionRouting) {
        setDistributionRouting(quizToEdit.distributionRouting);
      }
      if (quizToEdit.classroomId) {
        setSelectedClassroomId(quizToEdit.classroomId);
      }
      setActiveMode('manual');
    }
  }, [quizToEdit, userName]);

  // Simulate progress
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSimulatingProgress) {
      interval = setInterval(() => {
        setSimulatedCount((prev) => {
          if (prev < targetCount - 1) {
            // Speed up initially, slow down closer to target
            const increment = Math.max(1, Math.floor((targetCount - prev) / 10));
            return prev + increment;
          }
          return prev;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isSimulatingProgress, targetCount]);

  // Image base64 conversion helper
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Helper to split image into vertical chunks for better processing
  const splitImageIntoParts = async (file: File, parts: number = 3): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Failed to create canvas context');
        
        const partHeight = img.height / parts;
        const result: string[] = [];
        
        for (let i = 0; i < parts; i++) {
          canvas.width = img.width;
          canvas.height = partHeight;
          ctx.drawImage(img, 
            0, i * partHeight, img.width, partHeight, 
            0, 0, img.width, partHeight
          );
          result.push(canvas.toDataURL(file.type));
        }
        resolve(result);
      };
      img.src = URL.createObjectURL(file);
      img.onerror = reject;
    });
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setOcrError(null);
    setUploadedFile(file);
    if (file.type.startsWith('image/')) {
      setFileType('image');
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFileType('pdf');
      setUploadedFilePreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processSelectedFile(file);
    }
  };

  // Call Direct Document Upload & AI Processing (Fast & Powerful Files API with Sequential Batch extraction)
  const handleProcessDocument = async () => {
    if (!uploadedFile) return;
    if (userPlan !== 'Gold' && userPlan !== 'Diamond' && fileUses <= 0) {
      setShowPaywallOcr(true);
      return;
    }
    // Decrement counter
    if (userPlan !== 'Gold' && userPlan !== 'Diamond') {
      const nextVal = Math.max(0, fileUses - 1);
      setFileUses(nextVal);
      localStorage.setItem('cosmo_limit_file_ocr', nextVal.toString());
    }
    setIsProcessingOcr(true);
    setOcrError(null);

    // Step 1: Uploading and analyzing metadata
    setOcrProgress({
      stage: 'analyzing',
      current: 1,
      total: 10,
      message: isAr 
        ? 'الخطوة 1: جاري قراءة هيكل المستند وتحديد عدد صفحاته الكلي بذكاء ومجهر جوجل...' 
        : 'Step 1: Reading aggregate page count and structure with Gemini...'
    });

    try {
      // Convert to base64
      const base64Data = await convertToBase64(uploadedFile);
      const base64Clean = base64Data.split(',')[1]; // Strip data URL prefix

      // We handle document initialization locally now in serverless
      const initData = { fileUri: base64Clean, fileUploadName: uploadedFile.name, totalPages: 1 };
      const { fileUri, fileUploadName, totalPages } = initData;

      // Step 2: Trigger the batch generation / auto-detect scan via our hook mutation!
      const result = await generateAndSaveQuiz({
        type: 'file_direct',
        fileUri,
        fileUploadName,
        mimeType: uploadedFile.type || 'application/octet-stream',
        totalPages,
        extractionMode,
        customInstruction: fileCustomPrompt,
        totalQuestions: pdfCount,
        userId,
        creatorName,
        category: 'عام',
      });

      // Step 3: Populate results in UI State
      setTitle(result.title);
      setDescription(result.description);
      setQuestions(
        result.quiz.questions.map((q: any, i: number) => ({
          ...q,
          id: q.id || `q-direct-${i}-${Date.now()}`
        }))
      );

      // Transition to Manual Editor mode seamlessly
      setActiveMode('manual');
      setUploadedFile(null);
      setUploadedFilePreview(null);
      setFileType(null);
      setFileCustomPrompt('');
      setIsProcessingOcr(false);
      setOcrProgress(null);
      return; // Handled completely
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || (isAr ? 'عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي لمعالجة هذا الملف.' : 'Error communicating with AI services for direct upload.'));
      setIsProcessingOcr(false);
      setOcrProgress(null);
      return;
    }
  };

  // Call AI generative backend with batching loop
  const handleGenerateAiQuiz = async () => {
    if (!aiTopic.trim()) {
      setAiError('يرجى تحديد موضوع الاختبار لتوليد الأسئلة.');
      return;
    }
    if (userPlan !== 'Gold' && userPlan !== 'Diamond' && sentenceUses <= 0) {
      setShowPaywallSentence(true);
      return;
    }
    // Decrement counter
    if (userPlan !== 'Gold' && userPlan !== 'Diamond') {
      const nextVal = Math.max(0, sentenceUses - 1);
      setSentenceUses(nextVal);
      localStorage.setItem('cosmo_limit_sentence_ai', nextVal.toString());
    }
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const result = await generateAndSaveQuiz({
        type: 'topic',
        topic: aiTopic.trim(),
        totalQuestions: aiCount,
        userId,
        creatorName,
        category: 'عام',
      });

      setTitle(result.title);
      setDescription(result.description);
      setQuestions(
        result.quiz.questions.map((q: any, i: number) => ({
          ...q,
          id: q.id || `q-ai-${i}-${Date.now()}`
        }))
      );

      setActiveMode('manual'); // Switch to manual to view and edit!
      setAiTopic('');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'عذراً، حدث خطأ في محرك Gemini.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Generate quiz from pasted textbook / PDF raw text content in consecutive batches
  const handleGenerateFromPastedText = async () => {
    if (!pastedText.trim()) {
      setPasteError('يرجى لصق نصوص دراسية أو فقرات من الملف أولاً.');
      return;
    }
    if (userPlan !== 'Gold' && userPlan !== 'Diamond' && bookUses <= 0) {
      setShowPaywallBook(true);
      return;
    }
    // Decrement counter
    if (userPlan !== 'Gold' && userPlan !== 'Diamond') {
      const nextVal = Math.max(0, bookUses - 1);
      setBookUses(nextVal);
      localStorage.setItem('cosmo_limit_book_paste', nextVal.toString());
    }
    setIsGeneratingPaste(true);
    setPasteError(null);

    try {
      const result = await generateAndSaveQuiz({
        type: 'pasted_text',
        text: pastedText.trim(),
        totalQuestions: pasteCount,
        userId,
        creatorName,
        category: 'عام',
      });

      setTitle(result.title);
      setDescription(result.description);
      setQuestions(
        result.quiz.questions.map((q: any, i: number) => ({
          ...q,
          id: q.id || `q-paste-${i}-${Date.now()}`
        }))
      );

      setActiveMode('manual'); // Switch to manual to view and edit!
      setPastedText('');
    } catch (err: any) {
      console.error(err);
      setPasteError(err.message || 'عذراً، حدث خطأ أثناء معالجة النص بالذكاء الاصطناعي.');
    } finally {
      setIsGeneratingPaste(false);
    }
  };

  // Question manipulation helpers
  const [dedupStatus, setDedupStatus] = React.useState<string | null>(null);

  const handleAutoDeduplicate = () => {
    const seen = new Set<string>();
    const uniqueQuestions = questions.filter(q => {
      const cleanText = q.text.trim().toLowerCase();
      if (!cleanText) return true;
      if (seen.has(cleanText)) return false;
      seen.add(cleanText);
      return true;
    });
    
    const diff = questions.length - uniqueQuestions.length;
    if (diff > 0) {
      setQuestions(uniqueQuestions);
      setDedupStatus(`تمت تصفية وحذف ${diff} سؤال مكرر بنجاح! ✨`);
    } else {
      setDedupStatus(`مسودتك خالية تماماً من أي أسئلة مكررة! 👍`);
    }
    setTimeout(() => {
      setDedupStatus(null);
    }, 4000);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q-manual-${questions.length}-${Date.now()}`,
        type: 'mcq',
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: ''
      }
    ]);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, updated: Partial<Question>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...updated } as Question;
    setQuestions(next);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, val: string) => {
    const next = [...questions];
    const q = next[qIndex];
    const opts = [...q.options];
    opts[optIndex] = val;
    next[qIndex] = { ...q, options: opts };
    setQuestions(next);
  };

  // Publish or Update Quiz in database
  const handlePublishQuiz = async () => {
    if (!title.trim()) {
      setSaveError('يرجى تحديد عنوان جذاب للاختبار.');
      return;
    }

    const invalidQuestion = questions.some(q => !q.text.trim());
    if (invalidQuestion) {
      setSaveError('يرجى التأكد من كتابة نص الأسئلة بالكامل.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const sanitizedQuestions = questions.map((q, index) => ({
        id: q.id || `q-${index}-${Date.now()}`,
        type: q.type || 'mcq',
        text: q.text.trim(),
        options: q.type === 'tf' ? ['صح', 'خطأ'] : q.options,
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        imageUrl: q.imageUrl || ''
      }));

      let savedQuiz: any;
      if (quizToEdit) {
        // Update Firestore database
        await updateQuiz(quizToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          creatorId: userId,
          creatorName: creatorName.trim(),
          questions: sanitizedQuestions,
          timeLimit: timeLimit,
          category: category,
          distributionRouting: distributionRouting,
          classroomId: distributionRouting === 'classroom' ? selectedClassroomId : null
        });
        savedQuiz = { id: quizToEdit.id, title: title.trim() };
      } else {
        // Create new quiz in Firestore
        savedQuiz = await createQuiz({
          title: title.trim(),
          description: description.trim(),
          creatorId: userId,
          creatorName: creatorName.trim(),
          questions: sanitizedQuestions,
          timeLimit: timeLimit,
          category: category,
          distributionRouting: distributionRouting,
          classroomId: distributionRouting === 'classroom' ? selectedClassroomId : null
        });
      }

      // Auto-dispatch back into the classroom's encrypted feed if classroomId is present
      const targetClassroomId = distributionRouting === 'classroom' ? (selectedClassroomId || searchParams.get('classroomId')) : null;
      if (targetClassroomId && savedQuiz && savedQuiz.id) {
        try {
          const embedText = `[QUIZ_EMBED:${savedQuiz.id}:${title.trim()}]`;
          const cipher = await encryptMessage(embedText, targetClassroomId);

          // Post message to classroom E2EE chat
          await supabase.from('classroom_messages').insert({
            classroom_id: targetClassroomId,
            sender_id: userId,
            sender_name: userName,
            sender_photo: null,
            encrypted_text: cipher
          });

          // Notification logic handled natively/locally
          console.log('Classroom notification triggered');
        } catch (e) {
          console.error("Failed to automatically dispatch quiz to classroom:", e);
        }
      }

      // Reset values
      setTitle('');
      setDescription('');
      setTimeLimit(0);
      setCategory('عام');
      setQuestions([
        {
          id: 'q-initial-0',
          type: 'mcq',
          text: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: ''
        }
      ]);
      
      onQuizCreated();
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'عذراً، فشل حفظ أو تحديث الاختبار في قاعدة البيانات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Fullscreen AI Generation Loading Screen with blob animation */}
      
        {(isGenerating || isGeneratingAi || isGeneratingPaste || isProcessingOcr) && (
          <div
            
            
            
            className="fixed inset-0 z-50 bg-[#F8FAFC] dark:bg-[#090d16] overflow-hidden flex flex-col items-center justify-center font-sans"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Pulsating colorful blobs backing */}
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] bg-blue-400 dark:bg-blue-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] sm:blur-[120px] animate-blob"></div>
              <div className="absolute top-1/3 right-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-purple-400 dark:bg-purple-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] sm:blur-[120px] animate-blob animation-delay-2000"></div>
              <div className="absolute bottom-1/4 left-1/3 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] bg-pink-300 dark:bg-pink-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] sm:blur-[120px] animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 text-center space-y-8 px-6 max-w-lg">
              {/* Spinner & Sparkles */}
              <div className="flex justify-center">
                <div className="relative">
                  <CosmicLoader size="lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-4.5xl font-black text-slate-800 dark:text-slate-100 tracking-wide animate-pulse font-display leading-tight">
                  {isAr ? 'جاري صياغة الأسئلة...' : 'Crafting questions...'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                  {generationProgress?.message || (isAr 
                    ? 'يقوم محرك الذكاء الاصطناعي بتحليل المحتوى وصياغة اختبار تفاعلي فائق الدقة...' 
                    : 'The AI model is analyzing the material and compiling a highly accurate interactive quiz...')}
                </p>
              </div>

              {/* High-end Progress Bar and Counter */}
              <div className="bg-white/40 dark:bg-slate-900/40 p-5 rounded-[24px] border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-lg space-y-3">
                <div className="flex justify-between items-center text-xs font-extrabold text-slate-700 dark:text-slate-300" dir={isAr ? 'rtl' : 'ltr'}>
                  <span>{isAr ? 'نسبة التقدم الكلية:' : 'Overall Progress:'}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {generationProgress ? generationProgress.current : 0} / {generationProgress ? generationProgress.total : (isGeneratingAi ? aiCount : isGeneratingPaste ? pasteCount : 10)} {isAr ? 'سؤال' : 'questions'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${Math.min(100, Math.max(8, (generationProgress ? (generationProgress.current / (generationProgress.total || 1)) * 100 : 0)))}%` 
                    }}
                  />
                </div>
                <div className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  {isAr ? 'يرجى عدم إغلاق هذه الصفحة أثناء معالجة المحاضرة' : 'PLEASE DO NOT CLOSE THIS VIEW DURING ANALYSIS'}
                </div>
              </div>
            </div>
          </div>
        )}
      

      <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in text-right" dir="rtl">
      
      {/* Visual Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-800 dark:text-slate-100">
            {quizToEdit ? 'تعديل وتحديث الاختبار الحالي' : 'استوديو صياغة الأسئلة والاختبارات'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {quizToEdit ? 'قم بتنقيح بيانات الأسئلة وخيارات الحل بدقة تامة ثم احفظ التعديلات.' : 'اختر طريقتك المفضلة لبدء صياغة اختبار حديث ومشاركته فوراً مع شبكتك العلمية.'}
          </p>
        </div>

        {quizToEdit && onCancelEdit && (
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 turn-on-rtl-flip" />
            <span>إلغاء التعديل</span>
          </button>
        )}
      </div>

      {!quizToEdit && (
        /* Creation Mode Select Toggles */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-100/50 dark:bg-slate-800/40 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 font-medium backdrop-blur-sm">
          <button
            onClick={() => setActiveMode('manual')}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-white dark:bg-slate-700/80 text-primary shadow-sm shadow-black/5 font-extrabold border border-slate-200/50 dark:border-slate-600/50'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>كتابة يدوية</span>
          </button>

          <button
            id="tab-btn-ocr"
            onClick={() => setActiveMode('ocr')}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs transition-all cursor-pointer ${
              activeMode === 'ocr'
                ? 'bg-white dark:bg-slate-700/80 text-primary shadow-sm shadow-black/5 font-extrabold border border-slate-200/50 dark:border-slate-600/50'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>صورة أو PDF</span>
          </button>

          <button
            onClick={() => setActiveMode('paste')}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs transition-all cursor-pointer ${
              activeMode === 'paste'
                ? 'bg-white dark:bg-slate-700/80 text-primary shadow-sm shadow-black/5 font-extrabold border border-slate-200/50 dark:border-slate-600/50'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>لصق نصوص PDF</span>
          </button>

          <button
            onClick={() => setActiveMode('ai')}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs transition-all cursor-pointer ${
              activeMode === 'ai'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-primary/20 font-extrabold border-none'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeMode === 'ai' ? 'text-white' : 'text-primary'}`} />
            <span>توليد تلقائي AI</span>
          </button>
        </div>
      )}

      {/* UI Panels for different creation modes */}
      
        
        {/* Panel 1: AI Prompt / Generating عن أي موضوع */}
        {activeMode === 'ai' && !quizToEdit && (
          <div
            
            
            
            
            className="glass-card p-6 sm:p-10 rounded-[32px] space-y-6 relative overflow-hidden"
          >
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-500/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />
            
            {showPaywallSentence && renderPaywallOverlay("كويز من جملة", "Single Sentence Quiz")}

            <div className="flex items-start gap-4 relative z-10" dir="rtl">
              <div className="p-3 bg-violet-50 dark:bg-slate-800/80 rounded-2xl text-violet-600 dark:text-violet-400 shadow-sm border border-violet-100 dark:border-violet-900/30">
                <Wand2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1 flex-1 text-right">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100 tracking-tight">توليد اختبار فوري بذكاء Gemini التوليدي</h3>
                  {renderUsesIndicator(sentenceUses)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  اكتب أي موضوع ترغب في إنشاء أسئلة حوله وسيقوم محرك الذكاء الاصطناعي بصياغتها وحفظها في المسودة لتراجعها وتعدلها قبل النشر النهائي.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2 relative z-10">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-350 tracking-wide uppercase px-1">الموضوع التعليمي المستهدف:</label>
                <input
                  type="text"
                  placeholder="مثال: لغات البرمجة الحديثة، أساسيات الكيمياء، الحرب العالمية الثانية..."
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 px-5 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-right shadow-inner backdrop-blur-sm"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block pb-2">عدد الأسئلة المطلوبة:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[280px] overflow-y-auto pr-1" dir="rtl">
                  {COUNT_OPTIONS_NO_AUTO.map((opt) => {
                    const isSelected = aiCount === opt.value;
                    return (
                      <button
                        
                        type="button"
                        onClick={() => setAiCount(opt.value)}
                        className={`group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 overflow-hidden text-right select-none active:scale-[0.98] cursor-pointer ${
                          isSelected
                            ? 'border-violet-500 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5 shadow-[0_4px_20px_rgba(139,92,246,0.12)] ring-1 ring-violet-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                        }`} key={opt.value}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-100" />
                        )}
                        <div className="flex items-center gap-3 w-full flex-row-reverse text-right z-10">
                          <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                            isSelected ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                          }`}>
                            <span className="text-lg leading-none">{opt.icon}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-1">
                            <div className={`text-xs font-extrabold tracking-tight ${isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {opt.label}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                              {opt.sub}
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 mr-auto ${
                            isSelected ? 'border-violet-500 bg-violet-500 text-white scale-100' : 'border-slate-300 dark:border-slate-700 bg-transparent scale-90'
                          }`}>
                            {isSelected ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {renderErrorMsg(aiError)}

            <button
              onClick={() => {
                if (userPlan !== 'Gold' && userPlan !== 'Diamond' && sentenceUses <= 0) {
                  setShowPaywallSentence(true);
                  return;
                }
                handleGenerateAiQuiz();
              }}
              disabled={isGeneratingAi}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold transition-all disabled:opacity-50 cursor-pointer ${
                (userPlan !== 'Gold' && userPlan !== 'Diamond' && sentenceUses <= 0)
                  ? 'bg-slate-400 dark:bg-slate-700 hover:bg-slate-500'
                  : 'bg-primary hover:bg-primary-hover'
              }`}
            >
              {isGeneratingAi ? (
                <div className="flex flex-col items-center justify-center w-full relative">
                  <div className="flex justify-between w-full text-xs font-bold mb-1.5 px-1" dir="rtl">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{generationProgress?.message || 'جاري الصياغة والتحليل عبر Gemini...'}</span>
                    </div>
                    <span>{generationProgress ? generationProgress.current : 0} / {generationProgress ? generationProgress.total : aiCount} سؤال</span>
                  </div>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-white h-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.max(5, (generationProgress ? (generationProgress.current / (generationProgress.total || 1)) * 100 : 0)))}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>توليد الأسئلة فوراً</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Panel 2: Pasted Text / PDF Text Paste */}
        {activeMode === 'paste' && !quizToEdit && (
          <div
            
            
            
            
            className="glass-card p-6 sm:p-10 rounded-[32px] space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />
            
            {showPaywallBook && renderPaywallOverlay("استخراج من نص كتاب", "Book Text Extractions")}

            <div className="flex items-start gap-4 relative z-10" dir="rtl">
              <div className="p-3 bg-amber-50 dark:bg-slate-800/80 rounded-2xl text-amber-600 dark:text-amber-400 shadow-sm border border-amber-100 dark:border-amber-900/30">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1 text-right">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100 tracking-tight">تحويل النصوص المنسوخة (كتب ومستندات)</h3>
                  {renderUsesIndicator(bookUses)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  انسخ المادة العلمية أو الصفحات التي قمت بنسخها من ملفات الـ PDF أو المحاضرات والكتب، ثم الصقها هنا مباشرة. سيقوم ذكاء Gemini بصياغة أسئلة اختبار دقيقة فوراً وبنفس لغة الفقرات المرفقة تماماً.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 relative z-10">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-350 tracking-wide uppercase px-1">الصق محتوى الفقرات أو نصوص ملف الـ PDF هنا:</label>
              <textarea
                rows={8}
                placeholder="مثال:
Chapter 1: Fundamentals of Computing
A computer is a digital electronic machine...
أو الصق باللغة العربية، وسيتم الحفاظ على لغة الأسئلة دون ترجمة إجبارية..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 px-5 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-right shadow-inner resize-none backdrop-blur-sm"
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block pb-2">عدد الأسئلة المطلوبة:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[280px] overflow-y-auto pr-1" dir="rtl">
                  {COUNT_OPTIONS_WITH_AUTO.map((opt) => {
                    const isSelected = pasteCount === opt.value;
                    return (
                      <button
                        
                        type="button"
                        onClick={() => setPasteCount(opt.value)}
                        className={`group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 overflow-hidden text-right select-none active:scale-[0.98] cursor-pointer ${
                          isSelected
                            ? 'border-violet-500 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5 shadow-[0_4px_20px_rgba(139,92,246,0.12)] ring-1 ring-violet-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                        }`} key={opt.value}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-100" />
                        )}
                        <div className="flex items-center gap-3 w-full flex-row-reverse text-right z-10">
                          <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                            isSelected ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                          }`}>
                            <span className="text-lg leading-none">{opt.icon}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-1">
                            <div className={`text-xs font-extrabold tracking-tight ${isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {opt.label}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                              {opt.sub}
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 mr-auto ${
                            isSelected ? 'border-violet-500 bg-violet-500 text-white scale-100' : 'border-slate-300 dark:border-slate-700 bg-transparent scale-90'
                          }`}>
                            {isSelected ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (userPlan !== 'Gold' && userPlan !== 'Diamond' && bookUses <= 0) {
                      setShowPaywallBook(true);
                      return;
                    }
                    handleGenerateFromPastedText();
                  }}
                  disabled={isGeneratingPaste || (!pastedText.trim() && (userPlan === 'Gold' || userPlan === 'Diamond' || bookUses > 0))}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold transition-all disabled:opacity-50 cursor-pointer ${
                    (userPlan !== 'Gold' && userPlan !== 'Diamond' && bookUses <= 0)
                      ? 'bg-slate-400 dark:bg-slate-700 hover:bg-slate-500'
                      : 'bg-primary hover:bg-primary-hover'
                  }`}
                >
                  {isGeneratingPaste ? (
                    <div className="flex flex-col items-center justify-center w-full relative">
                      <div className="flex justify-between w-full text-xs font-bold mb-1.5 px-1" dir="rtl">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{generationProgress?.message || 'جاري القراءة وصياغة الأسئلة...'}</span>
                        </div>
                        <span>{generationProgress ? generationProgress.current : 0} / {generationProgress ? generationProgress.total : pasteCount} سؤال</span>
                      </div>
                      <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-white h-full transition-all duration-300 ease-out"
                          style={{ width: `${Math.min(100, Math.max(5, (generationProgress ? (generationProgress.current / (generationProgress.total || 1)) * 100 : 0)))}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>تحويل النصوص إلى اختبار جاهز</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {renderErrorMsg(pasteError)}
          </div>
        )}

        {/* Panel 2: Image OCR & PDF Upload */}
        {activeMode === 'ocr' && !quizToEdit && (
          <div
            
            
            
            
            className="glass-card p-6 sm:p-10 rounded-[32px] space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />
            
            {showPaywallOcr && renderPaywallOverlay("الاستخراج من ملف", "File Extractions")}

            <div className="flex items-start gap-4 relative z-10" dir="rtl">
              <div className="p-3 bg-amber-50 dark:bg-slate-800/80 rounded-2xl text-amber-600 dark:text-amber-400 shadow-sm border border-amber-100 dark:border-amber-900/30">
                <Camera className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1 text-right">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100 tracking-tight">استخراج الأسئلة من صورة أو ملف كورس PDF دراسي</h3>
                  {renderUsesIndicator(fileUses)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  هل لديك صورة لورقة امتحان أو كشكول دراسي، أو كتاب الكتروني بصيغة PDF؟ ارفعها هنا، وسيقوم ذكاء Gemini الاصطناعي بقراءة واستخلاص كامل الأسئلة لتسوية مسوداتها فوراً.
                </p>
              </div>
            </div>

            {/* Conditional Google Drive integration layout */}
            {gdriveAccount && !uploadedFile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10" dir="rtl">
                {/* Column 1: Choose from device (Drag & Drop) */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-[24px] p-8 text-center transition-all duration-300 flex flex-col justify-center items-center min-h-[220px] ${
                    dragActive
                      ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/50 hover:border-primary/50 cursor-pointer backdrop-blur-sm'
                  }`}
                >
                  <input
                    type="file"
                    id="document-upload-input"
                    accept="image/*, application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="document-upload-input" className="cursor-pointer space-y-3 block w-full">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xs rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{isAr ? 'اختر ملفاً من جهازك' : 'Choose file from device'}</p>
                      <p className="text-[11px] text-slate-400 font-medium font-sans">{isAr ? 'اسحب وأسقط ملف PDF أو صورة هنا' : 'Drag & drop image or PDF here'}</p>
                    </div>
                  </label>
                </div>

                {/* Column 2: Import from Google Drive (Connected) */}
                <div
                  onClick={() => setIsDrivePickerOpen(true)}
                  className="group relative border border-slate-200 dark:border-slate-800 rounded-[24px] p-8 text-center bg-gradient-to-br from-[#1a73e8]/5 via-[#34a853]/5 to-[#f9ab00]/5 hover:from-[#1a73e8]/10 hover:via-[#34a853]/10 hover:to-[#f9ab00]/10 border-indigo-500/10 hover:border-indigo-500/30 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-center items-center min-h-[220px]"
                >
                  <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[24px]" />
                  
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-md flex items-center justify-center shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300 border border-slate-150 dark:border-slate-800">
                    <svg className="w-8 h-8" viewBox="0 0 1000 866" xmlns="http://www.w3.org/2000/svg">
                      <path d="M333.333 0L500 288.675L166.667 866.025L0 577.35Z" fill="#0F9D58" />
                      <path d="M166.667 866.025L833.333 866.025L666.667 577.35L333.333 577.35Z" fill="#4285F4" />
                      <path d="M666.667 0L1000 577.35L833.333 866.025L500 288.675Z" fill="#FFBA00" />
                    </svg>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">
                      {isAr ? 'استيراد من Google Drive' : 'Import from Google Drive'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-indigo-300 font-bold">
                      {isAr ? 'توليد فوري من مستندات السحابة' : 'Instant generation from cloud documents'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard file upload zone if Google Drive is not connected OR a file is already uploaded */
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-[24px] p-8 sm:p-10 text-center transition-all duration-300 z-10 ${
                  dragActive
                    ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/50 hover:border-primary/50 cursor-pointer backdrop-blur-sm'
                }`}
              >
                <input
                  type="file"
                  id="document-upload-input"
                  accept="image/*, application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <label htmlFor="document-upload-input" className="cursor-pointer space-y-3 block">
                  {uploadedFile ? (
                    <div className="space-y-4">
                      {fileType === 'image' && uploadedFilePreview ? (
                        <img
                          src={uploadedFilePreview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-xl object-contain shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-800 shadow-xs rounded-3xl flex items-center justify-center mx-auto text-red-500">
                          <FileText className="w-10 h-10" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-400">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • {isAr ? 'اضغط مجدداً لاستبدال المستند' : 'Click again to replace document'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 space-y-3">
                      <div className="w-14 h-14 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xs rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-755 dark:text-slate-300">{isAr ? 'اسحب صورة الامتحان أو ملف الـ PDF وألقه هنا' : 'Drag & drop exam image or PDF here'}</p>
                        <p className="text-xs text-slate-400 font-medium font-sans">{isAr ? 'يدعم صيغ JPG, PNG أو ملفات PDF الأكاديمية متعددة الصفحات' : 'Supports JPG, PNG, or multi-page academic PDF files'}</p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Subtle placeholder link if Google Drive is NOT connected and no file is uploaded */}
            {!gdriveAccount && !uploadedFile && (
              <div className="flex justify-center pt-2 relative z-10" dir="rtl">
                <button
                  type="button"
                  onClick={() => {
                    const basePath = window.location.hostname.includes('github.io') ? '/quiz-space/' : '/';
                    window.history.pushState(null, '', `${basePath}#/dashboard/settings?tab=settings&section=connected`);
                  }}
                  className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold hover:underline cursor-pointer flex items-center gap-1.5 bg-indigo-500/5 dark:bg-indigo-500/10 px-4 py-2.5 rounded-xl border border-indigo-500/10 hover:border-indigo-500/20"
                >
                  <span>{isAr ? '+ ربط حساباتك السحابية للتوليد الفوري' : '+ Connect your cloud accounts for instant generation'}</span>
                </button>
              </div>
            )}

            {renderErrorMsg(ocrError)}

            {uploadedFile && (
              <div className="space-y-3 p-5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 rounded-3xl text-right animate-fade-in space-y-4">
                <label className="text-xs font-black text-slate-600 dark:text-slate-350 block border-b border-slate-200/50 dark:border-slate-800 pb-2">
                  🔮 نمط استخراج الأسئلة من الملف:
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir="rtl">
                  <button
                    type="button"
                    onClick={() => setExtractionMode('literal')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                      extractionMode === 'literal'
                        ? 'border-emerald-500 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.015] shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${
                      extractionMode === 'literal' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {extractionMode === 'literal' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className={`text-xs font-extrabold ${extractionMode === 'literal' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        استخراج حرفي فائق الأمانة (أسئلة فقط)
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-550 leading-relaxed mt-1">
                        استخراج وحفظ الأسئلة الموجودة بالفعل في مستندك بدقة ١٠٠٪ دون زيادة أو توليد إضافي. (مثالي لأوراق الامتحانات والواجبات).
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtractionMode('generate')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                      extractionMode === 'generate'
                        ? 'border-violet-500 bg-violet-500/[0.03] dark:bg-violet-500/[0.015] shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${
                      extractionMode === 'generate' ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {extractionMode === 'generate' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className={`text-xs font-extrabold ${extractionMode === 'generate' ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        صياغة وتوليد ذكي شامل الكورس
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-550 leading-relaxed mt-1">
                        قراءة الشروحات وتوليد أسئلة وتدريبات جديدة ممتازة تغطي كافة الفصول بذكاء من خلال صياغة المحول.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {uploadedFile && fileType === 'pdf' && (
              <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-right animate-fade-in">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block pb-1">عدد الأسئلة المطلوب استخراجها من ملف الـ PDF الدراسي:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[280px] overflow-y-auto pr-1" dir="rtl">
                  {COUNT_OPTIONS_WITH_AUTO.map((opt) => {
                    const isSelected = pdfCount === opt.value;
                    return (
                      <button
                        
                        type="button"
                        onClick={() => setPdfCount(opt.value)}
                        className={`group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 overflow-hidden text-right select-none active:scale-[0.98] cursor-pointer ${
                          isSelected
                            ? 'border-violet-500 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5 shadow-[0_4px_20px_rgba(139,92,246,0.12)] ring-1 ring-violet-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                        }`} key={opt.value}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-100" />
                        )}
                        <div className="flex items-center gap-3 w-full flex-row-reverse text-right z-10">
                          <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                            isSelected ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                          }`}>
                            <span className="text-lg leading-none">{opt.icon}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-1">
                            <div className={`text-xs font-extrabold tracking-tight ${isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {opt.label}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                              {opt.sub}
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 mr-auto ${
                            isSelected ? 'border-violet-500 bg-violet-500 text-white scale-100' : 'border-slate-300 dark:border-slate-700 bg-transparent scale-90'
                          }`}>
                            {isSelected ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat discussion file prompt box (As requested) */}
            {uploadedFile && (
              <div className="space-y-3.5 p-5 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border border-violet-100/70 dark:border-slate-800/85 rounded-3xl text-right animate-fade-in shadow-xs">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400">دردشة توجيهية سريعة مع الملف (اختياري)</span>
                  <div className="p-1 px-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                  أخبر الذكاء الاصطناعي عما تريد استخراجه أو التركيز عليه من هذا الملف تحديداً (مثلاً: رتبها، استبعد مقدمات الفصول، ركز على أسئلة الامتحان فقط، إلخ).
                </p>

                <textarea
                  value={fileCustomPrompt}
                  onChange={(e) => setFileCustomPrompt(e.target.value)}
                  placeholder={isAr 
                    ? "اكتب هنا أية شروط إضافية تود إجبار الذكاء الاصطناعي عليها لتفصيل محتوى الملف بدقة تامة..." 
                    : "Write here any extra constraints or chat prompts you would like the AI model to prioritize..."}
                  className="w-full h-24 p-3.5 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-right text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all font-sans"
                  dir="rtl"
                />

                {/* Quick assistant suggestion pills */}
                <div className="flex flex-wrap gap-1.5 justify-end pt-1">
                  {[
                    "استخرج الـ 101 سؤال بالكامل دون أي إسقاط أو كسل 🏆",
                    "ركز فقط على أسئلة الفصول الأخيرة والامتحانات 📖",
                    "أريد أسئلة صعبة مع شرح تفصيلي ممتع للإجابة الصحيحة 🧠",
                    "اجعل طابع الأسئلة اختيار من متعدد مع خيارات قريبة وممتازة 🎯"
                  ].map((sug, idx) => (
                    <button
                      
                      type="button"
                      onClick={() => setFileCustomPrompt(sug)}
                      className="text-[10px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-800 px-3 py-1.5 rounded-xl cursor-pointer transition-all active:scale-95" key={sug}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Progress Bar and Monitor (As requested) */}
            {isProcessingOcr && (
              <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-slate-900/30 border border-amber-500/15 dark:border-slate-800 space-y-5 shadow-xs">
                {ocrProgress && (
                  <>
                    <div className="flex justify-between items-center text-xs flex-row-reverse text-right">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        {ocrProgress.stage === 'analyzing' && (isAr ? '🔍 تقسيم محتوى الكورس لجرعات تتابعية...' : '🔍 Partitioning document for sequentials...')}
                        {ocrProgress.stage === 'extracting' && (isAr ? '🔮 استخراج الأسئلة من الجزء الجاري...' : '🔮 Extracting questions from segment...')}
                        {ocrProgress.stage === 'compiling' && (isAr ? '📊 تجميع وحبك بنك الأسئلة النهائي...' : '📊 Organizing completed quiz...')}
                      </span>
                      <span className="font-mono font-bold text-slate-500">
                        {ocrProgress.current} / {ocrProgress.total}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300 ease-out" 
                        style={{ width: `${Math.max(5, Math.min(100, (ocrProgress.current / ocrProgress.total) * 100))}%` }}
                      />
                    </div>
                    
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed text-right flex items-center justify-end gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      {ocrProgress.message}
                    </p>
                  </>
                )}

                {/* Sub-components tracker: monitors processed, pending and active batches */}
                {ocrBatches && ocrBatches.length > 0 && (
                  <div className="pt-2 border-t border-slate-205 dark:border-slate-800/80 space-y-2.5 text-right" dir="rtl">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-normal">مراقبة الاستخراج التتابعي الذكي</span>
                      <span>تتبع استمرار العمل بالأقسام الكلية</span>
                    </label>

                    <div className="space-y-2">
                      {ocrBatches.map((batch, index) => {
                        const isActive = activeBatchId === batch.id;
                        return (
                          <div 
                            
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                              isActive 
                                ? 'bg-violet-500/5 border-violet-300 dark:border-violet-900/60 shadow-[0_2px_10px_rgba(139,92,246,0.06)]' 
                                : batch.status === 'success'
                                ? 'bg-emerald-500/5 border-emerald-200 dark:border-emerald-950/30'
                                : batch.status === 'error'
                                ? 'bg-rose-500/5 border-rose-200 dark:border-rose-950/30'
                                : 'bg-slate-50/30 border-slate-100 dark:border-slate-800/50 opacity-60'
                            }`} key={batch.id}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] ${
                                isActive
                                  ? 'bg-violet-500 text-white border-violet-500 animate-pulse'
                                  : batch.status === 'success'
                                  ? 'bg-emerald-500 text-white border-emerald-500 text-[8px]'
                                  : batch.status === 'error'
                                  ? 'bg-rose-500 text-white border-rose-500'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}>
                                {batch.status === 'success' ? '✓' : index + 1}
                              </div>
                              <span className={`font-semibold ${
                                isActive ? 'text-violet-700 dark:text-violet-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {isAr ? batch.nameAr : batch.nameEn}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {batch.status === 'success' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                  تم استخراج {batch.questionsCount} سؤالاً
                                </span>
                              )}
                              {batch.status === 'error' && (
                                <span className="text-[10px] text-rose-500 font-semibold max-w-[120px] truncate">
                                  {batch.errorMsg || 'فشل الجزء'}
                                </span>
                              )}
                              {batch.status === 'pending' && (
                                <span className="text-[10px] text-slate-400">قيد الانتظار</span>
                              )}
                              
                              {/* Pulsing/bouncy waiting dots (نقاط تطلع وتنزل بتاعت الانتظار) */}
                              {isActive && (
                                <div className="flex items-center gap-1 bg-violet-100 dark:bg-violet-950/65 px-2.5 py-1 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.3s]" />
                                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-600 animate-bounce [animation-delay:-0.15s]" />
                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-600 animate-bounce" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right leading-relaxed pt-1.5 border-t border-slate-200/50 dark:border-slate-800/80">
                  {isAr 
                    ? '💡 بفضل نظام الاستخراج التتابعي الذكي المتوفر لـ Premium، نقسم الأسئلة لجرعات مريحة، مما يمنع انقطاع أو كسل الذكاء الاصطناعي ويأتي بالدروس كاملة.'
                    : '💡 Sequential processing splits assignments into micro-batches to bypass model limits and ensure full comprehensive coverage of long books.'}
                </div>
              </div>
            )}

            {uploadedFile && (
              <button
                onClick={() => {
                  if (userPlan !== 'Gold' && userPlan !== 'Diamond' && fileUses <= 0) {
                    setShowPaywallOcr(true);
                    return;
                  }
                  handleProcessDocument();
                }}
                disabled={isProcessingOcr}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md select-none active:scale-[0.99] ${
                  (userPlan !== 'Gold' && userPlan !== 'Diamond' && fileUses <= 0)
                    ? 'bg-slate-400 dark:bg-slate-700 hover:bg-slate-500 shadow-none'
                    : 'bg-primary hover:bg-primary-hover shadow-primary/10'
                }`}
              >
                {isProcessingOcr ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري تحضير واستيراد الاختبار المتتابع بالتفصيل...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>ابدأ معالجة وتوليد الأسئلة فوراً بذكاء Gemini المعزز</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Panel 3: Manual Editor/Verifier Form (Active edit modes) */}
        {activeMode === 'manual' && (
          <div
            
            
            
            
            className="space-y-8"
          >
            {/* Meta-Info Card and Top Actions */}
            <div className="glass-card p-6 sm:p-10 rounded-[32px] space-y-6 relative overflow-hidden">
              <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-5 relative z-10">
                <div className="flex items-center gap-3" dir="rtl">
                  <span className="p-3 bg-violet-500/10 text-violet-600 rounded-2xl shadow-sm border border-violet-100 dark:border-violet-900/30">⚙️</span>
                  <div className="text-right">
                    <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100 tracking-tight">بيانات وتفاصيل مسودة الاختبار الحالية</h3>
                    <p className="text-[10px] text-slate-450 mt-0.5 font-medium">تفاصيل الهوية والزمن الموصى لطلابك لحل هذا الاختبار</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                  <button
                    type="button"
                    onClick={handlePublishQuiz}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50 cursor-pointer w-full sm:w-auto hover:-translate-y-0.5"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{quizToEdit ? 'تحديث الاختبار' : 'حفظ ونشر الاختبار'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                <div className="space-y-2 sm:col-span-2 text-right">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wide px-1">عنوان الاختبار المباشر:</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: أسئلة مراجعة الجغرافيا للصف الثالث الثانوي"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 pr-12 pl-4 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-right shadow-inner backdrop-blur-sm"
                      dir="rtl"
                    />
                    <FileText className="w-5 h-5 text-violet-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2 text-right">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wide px-1">وصف الاختبار ومحتوياته (اختياري):</label>
                  <div className="relative">
                    <textarea
                      rows={2}
                      placeholder="وصف موجز يوضح محتوى هذا الاختبار وأهميته للطلاب..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 pr-12 pl-4 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-right resize-none shadow-inner backdrop-blur-sm"
                      dir="rtl"
                    />
                    <BookOpen className="w-5 h-5 text-violet-400 absolute right-4 top-6 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wide px-1">اسم صانع الاختبار / المعلم:</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="اسم المعلم أو صانع المحتوى..."
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 pr-12 pl-4 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-right shadow-inner backdrop-blur-sm"
                      dir="rtl"
                    />
                    <User className="w-5 h-5 text-violet-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wide px-1">الحد الزمني للاختبار (0 يعني مفتوح):</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={timeLimit || ''}
                      onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 pr-12 pl-4 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all font-mono font-bold text-right shadow-inner backdrop-blur-sm"
                      dir="rtl"
                    />
                    <Clock className="w-5 h-5 text-violet-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2 text-right">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wide px-1">
                    تصنيف وتبويب هذا الاختبار 📂:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <select
                        value={showCustomCategoryInput ? 'new' : category}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            setShowCustomCategoryInput(true);
                            setCategory('');
                          } else {
                            setShowCustomCategoryInput(false);
                            setCategory(e.target.value);
                          }
                        }}
                        className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 pr-12 pl-4 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-right shadow-inner appearance-none relative z-10"
                        dir="rtl"
                      >
                        {availableCategories.map((catName) => (
                          <option key={catName} value={catName}>
                            {catName}
                          </option>
                        ))}
                        <option value="new">🆕 تصنيف جديد غير موجود...</option>
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-violet-400 z-20">
                        ▼
                      </div>
                      <Tag className="w-5 h-5 text-violet-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-20" />
                    </div>

                    {showCustomCategoryInput && (
                      <div className="relative animate-fade-in flex gap-2">
                        <input
                          type="text"
                          placeholder="اكتب اسم التصنيف الجديد هنا..."
                          value={newCustomCategory}
                          onChange={(e) => {
                            setNewCustomCategory(e.target.value);
                            setCategory(e.target.value.trim());
                          }}
                          className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-violet-400 dark:border-violet-800/80 pr-12 pl-4 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-right shadow-inner"
                          dir="rtl"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newCustomCategory.trim();
                            if (trimmed) {
                              if (!availableCategories.includes(trimmed)) {
                                setAvailableCategories((prev) => [...prev, trimmed]);
                              }
                              setCategory(trimmed);
                              setNewCustomCategory('');
                              setShowCustomCategoryInput(false);
                            }
                          }}
                          className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer"
                        >
                          إضافة
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enforce Criterion #2: Professional 3-way distribution routing system */}
                <div className="space-y-3 sm:col-span-2 text-right pt-4 border-t border-slate-200/50 dark:border-slate-800/80 mt-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block uppercase tracking-wide px-1">
                    {isAr ? 'مسار توزيع وتوجيه نشر الاختبار 🌐:' : 'Quiz Publishing Distribution Router:'}
                  </label>
                  <p className="text-[10px] text-slate-500 px-1">
                    {isAr ? 'حدد النطاق والجمهور المستهدف لتوزيع هذا الاختبار وحصره تلقائياً' : 'Determine the visibility and target sync channel for this quiz deployment'}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* Option 1: Public */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
                      distributionRouting === 'public' 
                        ? 'bg-violet-500/15 border-violet-500 text-white shadow-lg shadow-violet-500/5' 
                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}>
                      <input 
                        type="radio" 
                        name="distributionRouting" 
                        value="public" 
                        checked={distributionRouting === 'public'}
                        onChange={() => setDistributionRouting('public')}
                        className="sr-only"
                      />
                      <div className="flex flex-col text-right w-full" style={{ direction: 'rtl', textAlign: 'right' }}>
                        <span className="text-xs font-black text-white flex items-center gap-1.5 justify-start">
                          <span className="text-emerald-400">🌐</span>
                          <span>{isAr ? 'نشر عام للجميع' : 'Public Distribution'}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1">
                          {isAr ? 'يكون الاختبار متاحاً للبحث والاستكشاف لجميع الطلاب في المنصة' : 'The quiz will be discoverable on the global public marketplace'}
                        </span>
                      </div>
                    </label>

                    {/* Option 2: Classroom Restricted */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
                      distributionRouting === 'classroom' 
                        ? 'bg-violet-500/15 border-violet-500 text-white shadow-lg shadow-violet-500/5' 
                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}>
                      <input 
                        type="radio" 
                        name="distributionRouting" 
                        value="classroom" 
                        checked={distributionRouting === 'classroom'}
                        onChange={() => setDistributionRouting('classroom')}
                        className="sr-only"
                      />
                      <div className="flex flex-col text-right w-full" style={{ direction: 'rtl', textAlign: 'right' }}>
                        <span className="text-xs font-black text-white flex items-center gap-1.5 justify-start">
                          <span className="text-indigo-400">🎓</span>
                          <span>{isAr ? 'فصل دراسي خاص' : 'Classroom Restricted'}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1">
                          {isAr ? 'محصور وموجه فقط للفصول والقاعات الدراسية والطلاب المنضمين بكود' : 'Exclusive to students enrolled in your verified classrooms'}
                        </span>
                      </div>
                    </label>

                    {/* Option 3: Community Group Sync */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
                      distributionRouting === 'community' 
                        ? 'bg-violet-500/15 border-violet-500 text-white shadow-lg shadow-violet-500/5' 
                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}>
                      <input 
                        type="radio" 
                        name="distributionRouting" 
                        value="community" 
                        checked={distributionRouting === 'community'}
                        onChange={() => setDistributionRouting('community')}
                        className="sr-only"
                      />
                      <div className="flex flex-col text-right w-full" style={{ direction: 'rtl', textAlign: 'right' }}>
                        <span className="text-xs font-black text-white flex items-center gap-1.5 justify-start">
                          <span className="text-pink-400">👥</span>
                          <span>{isAr ? 'مزامنة مجتمعية' : 'Community Group Sync'}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1">
                          {isAr ? 'يتم بث ومشاركة الاختبار مباشرة في ساحات نقاش مجموعات الاهتمام' : 'Broadcasting straight into public and private interest circle feeds'}
                        </span>
                      </div>
                    </label>
                  </div>

                  {distributionRouting === 'classroom' && (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-500/5 border border-slate-200 dark:border-slate-800 text-right space-y-3" style={{ direction: 'rtl' }}>
                      <div className="flex items-center justify-between flex-row-reverse">
                        <label className="text-xs font-black text-slate-300 flex items-center gap-2">
                          <span className="text-lg">🏫</span>
                          <span>{isAr ? 'اختر الفصل الدراسي المستهدف لنشر الاختبار:' : 'Select the target classroom to publish the quiz:'}</span>
                        </label>
                        {loadingClassrooms && (
                          <span className="text-[10px] text-slate-400 animate-pulse">{isAr ? 'جاري جلب الفصول...' : 'Loading classrooms...'}</span>
                        )}
                      </div>
                      
                      {(() => {
                        const myClassrooms = classrooms.filter((c: any) => {
                          const isOwner = c.createdBy === userId;
                          const isSuperAdmin = userId === 'adman777888999' || userEmail === 'adman777888999@gmail.com';
                          return isOwner || isSuperAdmin;
                        });

                        return myClassrooms.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            {myClassrooms.map((c: any) => {
                              const isSelected = selectedClassroomId === c.id;
                              return (
                                <div 
                                  
                                  onClick={() => setSelectedClassroomId(c.id)}
                                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all text-right select-none ${
                                    isSelected 
                                      ? 'bg-violet-500/15 border-violet-500 text-white shadow-lg shadow-violet-500/5' 
                                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                  }`} key={c.id}
                                >
                                  <div className="font-black text-xs text-white flex items-center justify-between flex-row-reverse">
                                    <span>{c.name}</span>
                                    {isSelected && <span className="text-violet-400 text-xs font-bold">✓ {isAr ? 'محدد' : 'Selected'}</span>}
                                  </div>
                                  <div className="text-[10px] text-slate-450 mt-1.5 flex items-center gap-1.5 justify-end">
                                    <span>👤 {c.creatorName}</span>
                                    <span>•</span>
                                    <span>🔑 {isAr ? 'كود الفصل:' : 'Code:'} {c.code}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-right text-xs text-amber-200 leading-relaxed">
                            {isAr 
                              ? '⚠️ لا توجد فصول دراسية تملكها أو تديرها حالياً. لنشر الاختبار في فصل خاص، يجب أولاً إنشاء فصل والبدء كمعلم من صفحة الفصول.' 
                              : '⚠️ No classrooms owned or managed by you found. To publish a quiz to a private classroom, you must first create a classroom as a teacher from the Classrooms page.'}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Questions list array */}
            <div className="space-y-6">
              <div className="glass-card bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[28px] border border-slate-200/50 dark:border-slate-700/50 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between shadow-sm backdrop-blur-sm">
                <div className="flex flex-col gap-1.5 text-right">
                  <div className="flex items-center gap-2.5 justify-end sm:justify-start flex-row-reverse sm:flex-row">
                    <div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                    <h3 className="font-display font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                      الأسئلة المدرجة في مسودتك الآن ({questions.length})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    يمكنك تعديل محتوى أو إجابات أو خيارات أي سؤال بشكل يدوي مباشر أدناه
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleAutoDeduplicate}
                    className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 py-3 px-5 rounded-[18px] border border-amber-200/50 dark:border-amber-500/20 font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                    title="تصفية الأسئلة المكررة تلقائياً"
                  >
                    <span className="text-sm">🧹</span>
                    <span>تصفية المكررات تلقائياً</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex items-center gap-2 text-xs text-violet-700 dark:text-violet-300 bg-violet-100/50 dark:bg-violet-500/10 hover:bg-violet-200/50 dark:hover:bg-violet-500/20 py-3 px-5 rounded-[18px] border border-violet-200/50 dark:border-violet-500/30 font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>إضافة سؤال يدوي جديد</span>
                  </button>
                </div>
              </div>

              {dedupStatus && (
                <div
                  
                  
                  className="p-4 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 rounded-[20px] text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center shadow-sm backdrop-blur-sm"
                >
                  {dedupStatus}
                </div>
              )}

              {questions.map((question, qIdx) => {
                const hasText = question.text.trim().length > 0;
                return (
                  <div
                    
                    className="group glass-card border border-slate-200/50 dark:border-slate-700/50 p-6 sm:p-8 rounded-[28px] shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex flex-col gap-6 text-right" key={question.id || qIdx}
                  >
                    {/* Visual side accent border */}
                    <div 
                      className={`absolute top-0 right-0 h-full w-[6px] rounded-r-full transition-all duration-300 shadow-md ${
                        question.type === 'mcq' ? 'bg-indigo-500 shadow-indigo-500/30' :
                        question.type === 'tf' ? 'bg-pink-500 shadow-pink-500/30' :
                        'bg-amber-500 shadow-amber-500/30'
                      }`} 
                    />

                    {/* Floating Number and Delete Control */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200/40 dark:border-slate-800/60">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center font-display font-black text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 w-10 h-10 rounded-full border border-slate-200/60 dark:border-slate-700 shadow-sm shadow-black/5">
                          {qIdx + 1}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-extrabold rounded-xl font-sans tracking-wide ${
                          question.type === 'mcq' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20' :
                          question.type === 'tf' ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-500/20' :
                          'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20'
                        }`}>
                          {question.type === 'mcq' && <span>🧩 اختيار من متعدد (MCQ)</span>}
                          {question.type === 'tf' && <span>⚖️ صح أو خطأ (True / False)</span>}
                          {question.type === 'essay' && <span>✍️ سؤال مقالي (Essay)</span>}
                        </span>
                        
                        <span className={`inline-flex items-center text-[10px] font-mono font-bold px-3.5 py-1.5 rounded-xl border ${
                          hasText ? 'bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50' : 'bg-rose-50/50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50'
                        }`}>
                          {hasText ? '✨ جاهز ومكتمل' : '⚠️ مسودة فارغة'}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        disabled={questions.length === 1}
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="p-2.5 rounded-xl text-red-500 bg-red-50 dark:bg-red-500/10 border border-transparent hover:border-red-200 dark:hover:border-red-500/30 disabled:opacity-30 disabled:bg-transparent transition-all cursor-pointer hover:scale-105 active:scale-95"
                        title="حذف هذا السؤال"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Question Fields Form */}
                    <div className="space-y-5 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        
                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide px-1">نص السؤال المباشر:</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: أي من المحيطات التالية هو الأكبر مساحة على كوكب الأرض؟"
                            value={question.text}
                            onChange={(e) => handleQuestionChange(qIdx, { text: e.target.value })}
                            className="w-full bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 px-5 py-4 rounded-[20px] outline-none text-sm text-slate-800 dark:text-slate-100 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-right shadow-inner backdrop-blur-sm"
                          />
                        </div>

                        <div className="space-y-2 font-sans min-w-[210px]">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide px-1">نوع السؤال:</label>
                          <select
                            value={question.type}
                            onChange={(e) => {
                              const newType = e.target.value as 'mcq' | 'tf' | 'essay';
                              const newOptions = newType === 'tf' ? ['صح', 'خطأ'] : newType === 'essay' ? [] : ['', '', '', ''];
                              handleQuestionChange(qIdx, { 
                                type: newType, 
                                options: newOptions, 
                                correctIndex: 0,
                                correctAnswer: newType === 'essay' ? 'اكتب الإجابة النموذجية الموصى بها هنا للتقييم الذاتي...' : ''
                              });
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 px-3 py-3 rounded-2xl outline-none text-xs text-slate-850 dark:text-slate-100 focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium cursor-pointer text-right"
                          >
                            <option value="mcq">🧩 اختيار من متعدد (MCQ)</option>
                            <option value="tf">⚖️ صح أو خطأ (True / False)</option>
                            <option value="essay">✍️ سؤال مقالي إنشائي (Essay)</option>
                          </select>
                        </div>

                      </div>

                      {/* Options Grid based on choice type */}
                      {question.type === 'mcq' ? (
                        <div className="space-y-3 font-sans pt-1">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide px-1">
                            الخيارات المتاحة (يرجى اختيار الجواب الصحيح عبر الضغط على دائرة التفعيل الخضراء):
                          </label>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
                            {question.options.map((option, optIdx) => {
                              const isCorrect = question.correctIndex === optIdx;
                              return (
                                <div 
                                   
                                  className={`flex items-center gap-3 px-5 py-4 rounded-[20px] border transition-all duration-300 shadow-sm ${
                                    isCorrect 
                                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/50 shadow-emerald-500/10 ring-1 ring-emerald-500/20 z-10 scale-[1.01]' 
                                      : 'bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 backdrop-blur-sm'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleQuestionChange(qIdx, { correctIndex: optIdx })}
                                    className={`w-6 h-6 rounded-full border-[2.5px] flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                                      isCorrect ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 bg-white dark:bg-slate-850'
                                    }`}
                                    title="تحديد كإجابة صحيحة"
                                  >
                                    {isCorrect && (
                                      <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                                      </svg>
                                    )}
                                  </button>
                                  <input
                                    type="text"
                                    placeholder={`الخيار ${optIdx + 1}...`}
                                    value={option}
                                    onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                    className={`flex-1 bg-transparent outline-none text-sm font-semibold transition-all ${
                                      isCorrect ? 'text-emerald-900 dark:text-emerald-100 placeholder-emerald-700/40 dark:placeholder-emerald-300/40' : 'text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500'
                                    }`}
                                  />
                                  <span className={`text-[10px] font-bold select-none tracking-tight shrink-0 ${
                                    isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                                  }`}>
                                    {isCorrect ? 'الجواب الصحيح' : `الخيار ${String.fromCharCode(65 + optIdx)}`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : question.type === 'tf' ? (
                        <div className="space-y-3 font-sans pt-1">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide px-1">توزيع الخيارات وتعيين الجواب السليم:</label>
                          <div className="flex items-center gap-4">
                            {[
                              { label: 'صَح (True)', val: 0 },
                              { label: 'خطَأ (False)', val: 1 }
                            ].map((tfOpt) => {
                              const isSelected = question.correctIndex === tfOpt.val;
                              return (
                                <button
                                  
                                  type="button"
                                  onClick={() => handleQuestionChange(qIdx, { correctIndex: tfOpt.val })}
                                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[20px] font-bold text-sm border shadow-sm transition-all duration-300 cursor-pointer ${
                                    isSelected 
                                      ? (tfOpt.val === 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 text-emerald-700 dark:text-emerald-400 shadow-emerald-500/10 ring-1 ring-emerald-500/20 scale-[1.02]' 
                                                   : 'bg-red-50 dark:bg-rose-500/10 border-red-400 text-red-700 dark:text-rose-400 shadow-rose-500/10 ring-1 ring-rose-500/20 scale-[1.02]')
                                      : 'bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 text-slate-500 hover:bg-slate-100 hover:border-slate-300 backdrop-blur-sm'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded-full border-[2.5px] flex items-center justify-center ${
                                    isSelected 
                                      ? (tfOpt.val === 0 ? 'border-emerald-500 bg-emerald-500' : 'border-red-500 bg-red-500') 
                                      : 'border-slate-400'
                                  }`}>
                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                  </div>
                                  <span>{tfOpt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 font-sans pt-1 text-right">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide px-1">الإجابة النموذجية المرجعية (للتقييم الذاتي للطلاب):</label>
                          <textarea
                            placeholder="اكتب الجواب الكامل أو المعاير النموذجية لمراجعتها ذاتياً عند الانتهاء..."
                            value={question.correctAnswer || ''}
                            onChange={(e) => handleQuestionChange(qIdx, { correctAnswer: e.target.value })}
                            rows={3}
                            className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 px-5 py-4 rounded-[20px] outline-none text-sm text-emerald-900 dark:text-emerald-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold resize-none shadow-inner backdrop-blur-sm text-right leading-relaxed"
                          />
                        </div>
                      )}

                      {/* Image Attachment (PDF OCR crop or Manual upload) */}
                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block text-right uppercase tracking-wide px-1">صورة توضيحية أو رسم بياني مرافق (اختياري):</label>
                        
                        {question.imageUrl ? (
                          <div className="relative group w-fit max-w-sm mx-auto border border-indigo-200 dark:border-indigo-500/30 p-2.5 rounded-[24px] bg-slate-50/80 dark:bg-slate-900/60 shadow-md">
                            <img 
                              src={question.imageUrl} 
                              alt="Question Illustration" 
                              className="max-h-48 rounded-[16px] object-contain mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(qIdx, { imageUrl: '' })}
                              className="absolute -top-3 -left-3 bg-red-50 dark:bg-rose-500/10 hover:bg-red-100 dark:hover:bg-rose-500/20 border border-red-200 dark:border-rose-500/30 text-red-600 dark:text-rose-400 p-2.5 rounded-full shadow-md transition-all cursor-pointer hover:scale-110 active:scale-95 z-20 backdrop-blur-md"
                              title="حذف الصورة المرفقة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 rounded-[24px] bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-800/30 dark:hover:bg-slate-800/80 transition-all duration-300 group hover:border-violet-400/50 dark:hover:border-violet-500/50 backdrop-blur-sm">
                            <label className="flex flex-col items-center gap-2 cursor-pointer w-full text-center">
                              <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                <ImageIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                              </div>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">اضغط لإدراج أو سحب صورة لهذا السؤال</span>
                              <span className="text-xs text-slate-500 dark:text-slate-500 font-medium tracking-wide border px-3 py-1 rounded-full border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">PNG, JPG, SVG</span>
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const base64 = await new Promise<string>((resolve, reject) => {
                                        const reader = new FileReader();
                                        reader.onload = () => resolve(reader.result as string);
                                        reader.onerror = reject;
                                        reader.readAsDataURL(file);
                                      });
                                      handleQuestionChange(qIdx, { imageUrl: base64 });
                                    } catch (err) {
                                      console.error('Failed to convert image:', err);
                                    }
                                  }
                                }}
                                className="hidden" 
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Explanations section */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 mt-3">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide px-1">شرح وتوضيح تعليمي مفصّل للجواب الصحيح (اختياري، يظهر للطالب كإفادة):</label>
                        <textarea
                          rows={2}
                          placeholder="مثال: يمثل المحيط الهادئ ثلث مساحة الكرة الأرضية الإجمالية..."
                          value={question.explanation || ''}
                          onChange={(e) => handleQuestionChange(qIdx, { explanation: e.target.value })}
                          className="w-full bg-indigo-50/60 dark:bg-indigo-900/10 border border-indigo-200/80 dark:border-indigo-800/40 px-5 py-4 rounded-[20px] outline-none text-sm text-indigo-950 dark:text-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold resize-none shadow-inner backdrop-blur-sm text-right leading-relaxed"
                        />
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {saveError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {saveError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-between mt-8 mb-4">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <span>إضافة سؤال جديد</span>
              </button>

              <button
                type="button"
                onClick={handlePublishQuiz}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold shadow-lg shadow-primary/30 transition-all disabled:opacity-50 cursor-pointer w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{quizToEdit ? 'تحديث ونشر الاختبار' : 'حفظ ونشر الاختبار النهائي'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      

      {/* Google Drive Real File Picker Modal */}
      <DrivePicker
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onFileSelected={(file) => {
          processSelectedFile(file);
          setIsDrivePickerOpen(false);
        }}
        lang={isAr ? 'ar' : 'en'}
      />

    </div>
    </>
  );
}
