import React from 'react';
import {
  Zap,
  BrainCircuit,
  Globe,
  Telescope,
  GraduationCap,
  FlaskConical,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { type OrbState } from 'thinking-orbs';

/* ═══════════════════════════════════════════════════════════
    Cosmo AI — 8-Mode Intelligence Engine (Mode Router)
   ═══════════════════════════════════════════════════════════ */
export type CosmoMode =
  | 'instant'
  | 'thinking'
  | 'search'
  | 'deep_research'
  | 'study'
  | 'problem_solving'
  | 'creation'
  | 'analysis';

export interface CosmoModeConfig {
  id: CosmoMode;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  icon: React.ElementType;
  color: string;
  bgTint: string;
  borderTint: string;
  orbState: OrbState;
  stateLabelsAr: string[];
  stateLabelsEn: string[];
}

export const COSMO_MODES: CosmoModeConfig[] = [
  {
    id: 'instant',
    labelAr: 'إجابة فورية',
    labelEn: 'Instant',
    descAr: 'إجابات سريعة ومباشرة',
    descEn: 'Quick and direct answers',
    icon: Zap,
    color: '#007472',
    bgTint: 'rgba(0,116,114,0.12)',
    borderTint: 'rgba(0,116,114,0.3)',
    orbState: 'composing',
    stateLabelsAr: ['يكتب الرد...'],
    stateLabelsEn: ['Composing reply...'],
  },
  {
    id: 'thinking',
    labelAr: 'تفكير معمق',
    labelEn: 'Thinking',
    descAr: 'تحليل منطقي خطوة بخطوة',
    descEn: 'Step-by-step logical analysis',
    icon: BrainCircuit,
    color: '#F59E0B',
    bgTint: 'rgba(245,158,11,0.12)',
    borderTint: 'rgba(245,158,11,0.3)',
    orbState: 'solving',
    stateLabelsAr: ['يحلل المسألة...', 'يستنتج النتائج...', 'يراجع المنطق...'],
    stateLabelsEn: ['Analyzing...', 'Reasoning...', 'Verifying logic...'],
  },
  {
    id: 'search',
    labelAr: 'بحث موثق',
    labelEn: 'Search',
    descAr: 'إجابات مدعومة بمصادر حقيقية',
    descEn: 'Answers backed by real sources',
    icon: Globe,
    color: '#06B6D4',
    bgTint: 'rgba(6,182,212,0.12)',
    borderTint: 'rgba(6,182,212,0.3)',
    orbState: 'searching',
    stateLabelsAr: ['يبحث في الويب...', 'يقرأ المصادر...'],
    stateLabelsEn: ['Searching the web...', 'Reading sources...'],
  },
  {
    id: 'deep_research',
    labelAr: 'بحث متعمق',
    labelEn: 'Deep Research',
    descAr: 'دراسة متعددة المصادر مع تقرير',
    descEn: 'Multi-source research report',
    icon: Telescope,
    color: '#8B5CF6',
    bgTint: 'rgba(139,92,246,0.12)',
    borderTint: 'rgba(139,92,246,0.3)',
    orbState: 'connecting',
    stateLabelsAr: ['يفكك الأسئلة الفرعية...', 'يبحث بعمق...', 'يقارن الأدلة...', 'يكتب التقرير...'],
    stateLabelsEn: ['Decomposing sub-questions...', 'Deep searching...', 'Comparing evidence...', 'Writing report...'],
  },
  {
    id: 'study',
    labelAr: 'تعلم تفاعلي',
    labelEn: 'Study',
    descAr: 'شرح تدريجي وتلميحات وأسئلة',
    descEn: 'Interactive Socratic teaching',
    icon: GraduationCap,
    color: '#10B981',
    bgTint: 'rgba(16,185,129,0.12)',
    borderTint: 'rgba(16,185,129,0.3)',
    orbState: 'weaving',
    stateLabelsAr: ['يصيغ الشرح التعليمي...', 'يحضر أسئلة الفهم...'],
    stateLabelsEn: ['Preparing lesson...', 'Creating check questions...'],
  },
  {
    id: 'problem_solving',
    labelAr: 'حل مسائل',
    labelEn: 'Problem Solving',
    descAr: 'حل رياضي وعلمي مع تدقيق الوحدات',
    descEn: 'Math & science solving with unit checks',
    icon: FlaskConical,
    color: '#EF4444',
    bgTint: 'rgba(239,68,68,0.12)',
    borderTint: 'rgba(239,68,68,0.3)',
    orbState: 'solving',
    stateLabelsAr: ['يحل المسألة خطوة بخطوة...', 'يتحقق من الوحدات...', 'يراجع الناتج...'],
    stateLabelsEn: ['Solving step by step...', 'Checking units...', 'Verifying result...'],
  },
  {
    id: 'creation',
    labelAr: 'إنشاء محتوى',
    labelEn: 'Create',
    descAr: 'اختبارات وملخصات وبطاقات وخطط',
    descEn: 'Quizzes, summaries, flashcards, plans',
    icon: Sparkles,
    color: '#EE8361',
    bgTint: 'rgba(238,131,97,0.14)',
    borderTint: 'rgba(238,131,97,0.35)',
    orbState: 'shaping',
    stateLabelsAr: ['ينشئ المحتوى التعليمي...', 'ينظم البنية...'],
    stateLabelsEn: ['Creating content...', 'Structuring output...'],
  },
  {
    id: 'analysis',
    labelAr: 'تحليل الأداء',
    labelEn: 'Analysis',
    descAr: 'تحليل درجاتك ونقاط ضعفك',
    descEn: 'Analyze your scores and weak points',
    icon: BarChart3,
    color: '#14B8A6',
    bgTint: 'rgba(20,184,166,0.12)',
    borderTint: 'rgba(20,184,166,0.3)',
    orbState: 'connecting',
    stateLabelsAr: ['يحلل بيانات أدائك...', 'يحدد نقاط الضعف...'],
    stateLabelsEn: ['Analyzing your data...', 'Identifying weak points...'],
  },
];

export function getModeConfig(mode: CosmoMode): CosmoModeConfig {
  return COSMO_MODES.find(m => m.id === mode) || COSMO_MODES[0];
}

/** Auto-detect the best mode from user input text */
export function detectCosmoMode(text: string): CosmoMode {
  const t = text.toLowerCase().trim();
  // Deep Research — explicit long-form research requests
  if (/(?:ابحث بعمق|بحث متعمق|تقرير بحثي|دراسة مقارنة|deep research|research report|compare sources|in-depth analysis)/i.test(t)) return 'deep_research';
  // Search — web search requests
  if (/(?:ابحث|بحث|على الإنترنت|علي الانترنت|آخر الأخبار|اخر الاخبار|مصادر|search|research|latest news|on the web|find online)/i.test(t)) return 'search';
  // Problem Solving — math/science problems
  if (/(?:حل|احسب|ناتج|معادلة|تكامل|مشتقة|solve|calculate|integral|derivative|equation|formula|compute|\d+\s*[+\-×÷*/^]\s*\d+)/i.test(t)) return 'problem_solving';
  // Study — interactive learning
  if (/(?:اشرحلي|اشرح لي|علمني|فهمني|بسطلي|explain|teach me|help me understand|simplify|break down|tutor)/i.test(t)) return 'study';
  // Analysis — performance analysis
  if (/(?:حلل أدائي|حلل درجاتي|نقاط ضعفي|تقدمي|analyze my|my performance|my scores|my progress|weak points|strengths)/i.test(t)) return 'analysis';
  // Creation — content creation (quizzes handled separately)
  if (/(?:لخص|ملخص|بطاقات|فلاش كارد|خطة مراجعة|خطة دراسية|summarize|summary|flashcard|study plan|review plan)/i.test(t)) return 'creation';
  // Thinking — complex reasoning
  if (/(?:فكر|حلل|قارن|ناقش|لماذا|كيف يمكن|ما الفرق|think|analyze|compare|discuss|why|how can|what.s the difference|pros and cons|evaluate)/i.test(t) && t.length > 40) return 'thinking';
  // Default
  return 'instant';
}

/** Build mode-specific system prompt augmentation */
export function buildModeInstruction(mode: CosmoMode, isAr: boolean): string {
  switch (mode) {
    case 'thinking':
      return isAr
        ? '\n\n[وضع التفكير المعمق] حلّل الطلب بعناية. قدّم تحليلاً منظماً يتضمن: 1) فهم المسألة 2) تحديد المعطيات والمطلوب 3) خطوات التحليل المنطقي 4) النتيجة المدعومة بالتبرير. لا تعرض "تفكيرك الداخلي" بل قدّم شرحاً واضحاً ومبرراً.'
        : '\n\n[Thinking Mode] Analyze carefully. Provide: 1) Problem understanding 2) Key facts 3) Logical reasoning steps 4) Justified conclusion. Show clear reasoning, not raw internal thoughts.';
    case 'search':
      return isAr
        ? '\n\n[وضع البحث الموثق] استخدم نتائج البحث المرفقة لتقديم إجابة مدعومة بمصادر حقيقية. اذكر كل مصدر استخدمته برابطه. ميّز بوضوح بين المعلومات المؤكدة من المصادر والاستنتاجات الشخصية. إذا لم تتوفر أداة بحث، صرّح بذلك.'
        : '\n\n[Search Mode] Use attached search results. Cite real sources with URLs. Clearly distinguish confirmed facts from inferences. If no search tool is available, state that.';
    case 'deep_research':
      return isAr
        ? '\n\n[وضع البحث المتعمق] أجرِ دراسة شاملة متعددة الخطوات: 1) فكّك السؤال إلى أسئلة فرعية 2) ابحث في كل محور 3) قارن الأدلة وكشف التناقضات 4) اكتب تقريراً منظماً بعناوين واضحة مع ذكر المصادر وتواريخها. لا تختلق مراجع وهمية.'
        : '\n\n[Deep Research Mode] Conduct multi-step research: 1) Decompose into sub-questions 2) Research each axis 3) Compare evidence, detect contradictions 4) Write a structured report with headings and cited sources. Never fabricate references.';
    case 'study':
      return isAr
        ? '\n\n[وضع التعلم التفاعلي] اشرح بأسلوب سقراطي تدريجي. ابدأ بسؤال تمهيدي لقياس فهم الطالب، ثم قدّم الشرح على مراحل مع تلميحات، واختم بسؤال تحقق من الفهم. لا تحرق الإجابة مباشرة إلا إذا طلب الطالب ذلك صراحةً.'
        : '\n\n[Study Mode] Use Socratic teaching. Start with a check question, explain in stages with hints, end with a comprehension check. Do not spoil answers unless explicitly asked.';
    case 'problem_solving':
      return isAr
        ? '\n\n[وضع حل المسائل] حل المسألة خطوة بخطوة بمنهج علمي دقيق. اكتب المعطيات والمطلوب أولاً، ثم القوانين المستخدمة، ثم خطوات الحل بالتفصيل مع التعويض، وتحقق من صحة الوحدات الفيزيائية والنتيجة النهائية. استخدم تنسيق رياضي واضح.'
        : '\n\n[Problem Solving Mode] Solve step by step. State givens and unknowns, list formulas, show detailed substitution, verify units and final answer. Use clear mathematical formatting.';
    case 'creation':
      return isAr
        ? '\n\n[وضع الإنشاء] أنشئ محتوى تعليمي عالي الجودة (ملخصات، بطاقات استذكار، خطط دراسية) بتنظيم احترافي وتقسيم واضح بالعناوين والنقاط. ركّز على الدقة العلمية والشمولية.'
        : '\n\n[Creation Mode] Create high-quality educational content (summaries, flashcards, study plans) with professional structure, headings, and bullet points. Focus on accuracy and completeness.';
    case 'analysis':
      return isAr
        ? '\n\n[وضع تحليل الأداء] حلّل بيانات أداء الطالب المتاحة فقط. حدّد نقاط القوة والضعف بدقة، واقترح خطة تحسين مخصصة. لا تخترع بيانات غير موجودة. إذا كانت البيانات غير كافية، اطلب من الطالب إكمال اختبار أولاً.'
        : '\n\n[Analysis Mode] Analyze only available student data. Identify strengths and weaknesses precisely, suggest a personalized improvement plan. Do not invent data. If insufficient, ask the student to complete a quiz first.';
    default:
      return '';
  }
}
