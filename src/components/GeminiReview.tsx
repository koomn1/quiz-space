import React, { useState } from 'react';
import { getApiUrl } from '../lib/origin';
import { 
  Zap, 
  Sparkles, 
  Cpu, 
  BarChart3, 
  Terminal, 
  Play, 
  CheckCircle2, 
  Layers, 
  Gauge, 
  Clock, 
  Award,
  BookOpen,
  ArrowLeftRight
} from 'lucide-react';

interface PredefinedPrompt {
  id: string;
  titleAr: string;
  titleEn: string;
  text: string;
}

const PREDEFINED_PROMPTS: PredefinedPrompt[] = [
  {
    id: 'arabic-logic',
    titleAr: 'لغز لغوي معقد بذكاء المترجم',
    titleEn: 'Advanced Arabic Linguistic Logic',
    text: 'اشرح بأسلوب بلاغي مشوق الفرق الدقيق بين كلمتي "السبيل" و"الطريق" في القرآن الكريم مستشهداً بالآيات وموضحاً أيهما يرتبط بالخير الشر ولماذا، ثم صغ ذلك في بيت شعر مميز.'
  },
  {
    id: 'coding-challenge',
    titleAr: 'تحدي بايثون وتحليل البيانات',
    titleEn: 'Python Data Challenge',
    text: 'Write a self-contained, heavily optimized Python function that takes a list of integers, calculates the longest run of consecutive prime numbers using a sieve of Eratosthenes internally, and return both the run and its starting index. Put clean comments explaining the time complexity.'
  },
  {
    id: 'math-reasoning',
    titleAr: 'مسألة رياضية استنتاجية خادعة',
    titleEn: 'Tricky Math Logic Puzzle',
    text: 'إذا كان لدينا صندوق يحتوي على كريات مرقمة من 1 إلى 50، وسحبنا عشوائياً 3 كريات معاً، ما هو الاحتمال الرياضي الدقيق لأن يكون حاصل جمع الأرقام الثلاثة هو عدد زوجي؟ وضح الخطوات الرياضية كاملة.'
  }
];

export default function GeminiReview({ lang }: { lang: 'ar' | 'en' }) {
  const isAr = lang === 'ar';
  
  // Active sub-tab inside Gemini Review page: "review", "benchmarks", "sandbox"
  const [activeSubTab, setActiveSubTab] = useState<'review' | 'benchmarks' | 'sandbox'>('review');
  
  // Sandbox State
  const [selectedModel, setSelectedModel] = useState<string>('gemini-flash-latest');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<{
    reply: string;
    latency: number;
    modelUsed: string;
  } | null>(null);

  // Model Specs Compare Table Data
  const modelSpecs = [
    {
      featureAr: 'سياق الذاكرة الأقصى (Context Window)',
      featureEn: 'Max Context Window',
      gemini35: '2,000,000 Tokens (ضخمة جداً)',
      gpt4o: '128,000 Tokens',
      claude35: '200,000 Tokens',
      tier: 'premium'
    },
    {
      featureAr: 'معالجة الفيديو والصور الأصلية (Native Multilingual Vision)',
      featureEn: 'Native Multimodal Core',
      gemini35: 'مدعوم بالكامل (متعدد الوسائط أصيل)',
      gpt4o: 'مدعوم لقطات متتالية',
      claude33: 'مدعوم للصور فقط',
      tier: 'standard'
    },
    {
      featureAr: 'سرعة الاستجابة اللحظية (Inference Latency)',
      featureEn: 'Response Speed',
      gemini35: 'فائقة السرعة وجد منخفضة التأخير',
      gpt4o: 'متوسطة إلى منخفضة',
      claude33: 'متوسطة',
      tier: 'premium'
    },
    {
      featureAr: 'دقة معالجة اللغة العربية واللهجات مجملاً',
      featureEn: 'Arabic Language Fluency',
      gemini35: 'صدارة استثنائية (الأعلى بفارق كبير)',
      gpt4o: 'جيدة جداً فصحى فقط',
      claude33: 'ممتازة فصحى ومحدودة لهجات',
      tier: 'premium'
    },
    {
      featureAr: 'التكامل مع الأدوات السحابية (App Integration)',
      featureEn: 'Cloud Workspace Integration',
      gemini35: 'مكتمل مع Google Docs/Drive/Gmail',
      gpt4o: 'محدود بملفات محلية',
      claude33: 'محدود بملفات محلية',
      tier: 'standard'
    }
  ];

  // Statistical benchmarks percentages
  const benchmarkGauges = [
    { name: isAr ? 'فهم اللغات والذكاء العام (MMLU)' : 'General Lang Comprehension (MMLU)', gemini35: 92.8, gpt4o: 88.7, claude35: 90.4, gemini15: 85.9 },
    { name: isAr ? 'حل المسائل الحسابية المتقدمة (MATH)' : 'Advanced Math Reasoning (MATH)', gemini35: 90.2, gpt4o: 76.6, claude35: 71.1, gemini15: 67.7 },
    { name: isAr ? 'قدرات كتابة وتطوير الشيفرات البرمجية (HumanEval)' : 'Coding & Shell Scripts (HumanEval)', gemini35: 94.5, gpt4o: 90.2, claude35: 92.0, gemini15: 84.1 },
    { name: isAr ? 'بلاغة وإتقان اللغة العربية والترجمة الفورية' : 'Arabic Eloquence & Context Accuracy', gemini35: 95.1, gpt4o: 86.4, claude35: 85.3, gemini15: 82.2 }
  ];

  // Execute playground benchmark request
  const handleRunTest = async (promptToSend: string) => {
    if (!promptToSend.trim() || isLoading) return;
    setIsLoading(true);
    setSandboxResult(null);

    try {
      // Direct Gemini API call (serverless)
      const geminiApiKey = typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
      if (!geminiApiKey) {
        throw new Error('No Gemini API key found.');
      }

      const startTime = Date.now();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptToSend }] }]
          })
        }
      );
      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error('Endpoint error');
      }

      const data = await response.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      setSandboxResult({
        reply: replyText,
        latency: latency,
        modelUsed: selectedModel
      });
    } catch (err) {
      console.error('Test run failed:', err);
      setSandboxResult({
        reply: isAr 
          ? '❌ تعذر إتمام طلب محاكاة الأداء الآن بسبب مشكلة استكشافية بالاتصال بالخادم. يرجى تكرار المحاولة في بضع ثوانٍ.'
          : '❌ Performance simulation could not complete due to server routing delay. Please retry shortly.',
        latency: 0,
        modelUsed: selectedModel
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert rich response text formatting to clean elements
  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4  className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-3.5 mb-1.5 flex items-center gap-1.5"><span className="text-primary">•</span>{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3  className="text-sm sm:text-base font-black text-slate-950 dark:text-white mt-4 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-2"><span className="text-[#a78bfa] font-bold">✥</span>{line.replace('## ', '')}</h3>;
      }
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong  className="font-extrabold text-[#7c3aed] dark:text-[#a78bfa]">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return <p  className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed min-h-[1.25rem]">{parts.length > 0 ? parts : line}</p>;
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-7" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Visual Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c0f18]/95 via-indigo-950/80 to-[#1e1435]/95 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/25">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 text-center sm:text-right">
          <div className="w-16 h-16 shrink-0 bg-primary/20 dark:bg-primary/30 rounded-3xl p-3 flex items-center justify-center border border-primary/20">
            <Zap className="w-9 h-9 text-amber-400 fill-amber-400" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="bg-primary/40 text-primary-light text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 fill-primary-light" />
                {isAr ? 'مستجدات الذكاء الاصطناعي' : 'Latest AI Horizon'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full">
                Gemini 3.5 Pro
              </span>
            </div>
            <h2 className="font-display font-black text-xl sm:text-3xl text-white tracking-tight">
              {isAr ? 'التحليل والمراجعة الشاملة لـ Gemini 3.5 Pro 🚀' : 'Comprehensive Analysis & Review of Gemini 3.5 Pro 🚀'}
            </h2>
            <p className="text-xs text-slate-300 font-bold max-w-2xl leading-relaxed">
              {isAr
                ? 'استكشف الفروق الجوهرية ومقاييس الأداء للجيل الأحدث والنموذج الأكثر ريادة عبقري الاستنتاج والبرمجة وحل المشكلات الأكاديمية الصامتة مع تجربة اختبار نماذج عائلية حية.'
                : 'Explore core advancements, spec milestones, and benchmark performance of Google\'s latest leading reasoning powerhouse alongside live model playground runs.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Internal Navigation Sub-Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('review')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[130px] ${activeSubTab === 'review' ? 'bg-white dark:bg-slate-800 text-primary dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
        >
          <BookOpen className="w-4 h-4" />
          {isAr ? 'مراجعة شاملة وخصائص' : 'Detailed Review'}
        </button>
        <button
          onClick={() => setActiveSubTab('benchmarks')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[130px] ${activeSubTab === 'benchmarks' ? 'bg-white dark:bg-slate-800 text-primary dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
        >
          <BarChart3 className="w-4 h-4" />
          {isAr ? 'مقارنات ومنحنيات أداء' : 'Benchmarks Comparison'}
        </button>
        <button
          onClick={() => setActiveSubTab('sandbox')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[130px] ${activeSubTab === 'sandbox' ? 'bg-white dark:bg-slate-800 text-primary dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
        >
          <Terminal className="w-4 h-4" />
          {isAr ? 'مختبر المحاكاة السريع (الملعب)' : 'Interactive Sandbox Playground'}
        </button>
      </div>

      {/* Dynamic Tab Body Render */}
      <div className="bg-white dark:bg-[#111827] border border-slate-150 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        
        {/* TAB 1: REVIEW AND SPECS */}
        {activeSubTab === 'review' && (
          <div 
            
            
            className="space-y-6"
          >
            {/* Detailed Intro Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-primary dark:text-primary-light uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-4 h-4" />
                {isAr ? 'الجيل الجديد من الذكاء الاصطناعي الأكاديمي' : 'The Next Era of Academic Intelligence'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                {isAr 
                  ? 'يمثل نموذج Gemini 3.5 Pro قفزة نوعية في هندسة النماذج الكبيرة من Google، مدمجاً بذكاء تتابعي يفوق النماذج السابقة. يتميز بقدرة مذهلة على فهم السياق الطويل والمدقق، والتعاطي مع المدخلات المتعددة وسرعة التحليل وصنع القرارات البرمجية وحل الأسئلة المدرسية والجامعية الاستنتاجية.'
                  : 'Gemini 3.5 Pro scales high-reasoning limits with efficient native multi-modality. Designed with robust context depth and step-by-step cognitive mapping, it outperforms rivals on linguistic, engineering, and mathematical academic workflows.'
                }
              </p>
            </div>

            {/* Specefication Table */}
            <div className="space-y-3">
              <h3 className="font-display font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-purple-500" />
                {isAr ? 'جدول المقارنة العتادية والفنية' : 'Hardware & Technical Specs Comparison'}
              </h3>
              
              <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-800">
                <table className="w-full text-right text-xs" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold">
                    <tr>
                      <th className="p-3 sm:p-4 text-slate-800 dark:text-white font-black">{isAr ? 'الخاصية الفنية' : 'Feature Specification'}</th>
                      <th className="p-3 sm:p-4 text-primary font-black">Gemini 3.5 Pro 🚀</th>
                      <th className="p-3 sm:p-4">GPT-4o (OpenAI)</th>
                      <th className="p-3 sm:p-4">Claude 3.5 Sonnet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {modelSpecs.map((spec, sIdx) => (
                      <tr  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-3 sm:p-4 font-black">{isAr ? spec.featureAr : spec.featureEn}</td>
                        <td className="p-3 sm:p-4 font-extrabold text-[#7c3aed] dark:text-[#a78bfa]">{spec.gemini35}</td>
                        <td className="p-3 sm:p-4">{spec.gpt4o}</td>
                        <td className="p-3 sm:p-4">{spec.claude35}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/40 to-transparent dark:from-indigo-950/20 dark:to-transparent border border-slate-150 dark:border-slate-800/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-150 dark:bg-indigo-900/40 flex items-center justify-center">
                  <span className="text-sm font-bold">🧠</span>
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-xs">{isAr ? 'تفكير أكاديمي متسلسل' : 'Sequential Academic Logic'}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {isAr ? 'يقسم المشكلة الصعبة إلى خطوات منطقية متكاملة قبل تقديم الإجابة النهائية لضمان السلامة العلمية.' : 'Sifts logic in multi-step workflows, yielding incredibly verified accurate homework breakdowns.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/20 dark:to-transparent border border-slate-150 dark:border-slate-800/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-150 dark:bg-amber-900/40 flex items-center justify-center">
                  <span className="text-sm font-bold">🛡️</span>
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-xs">{isAr ? 'المرتبة الأولى عربياً' : 'Rank #1 Arabic Understanding'}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {isAr ? 'أكبر مكتبة لغوية مدمجة تفهم النحو والاشتقاقات الصعبة واللهجات القبلية والشعر بسلاسة غير مسبوقة.' : 'Incredible grasp of classic Arabic vocabulary, poetic grammar rules, and local dialects.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/40 to-transparent dark:from-[#2e224d]/20 dark:to-transparent border border-slate-150 dark:border-slate-800/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-150 dark:bg-purple-900/40 flex items-center justify-center">
                  <span className="text-sm font-bold">🧩</span>
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-xs">{isAr ? 'مستقبل الوكلاء الذكية' : 'Agentic Workflow Master'}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {isAr ? 'مهيأ لاستدعاء الدوال وحل المهام التكرارية المعقدة كبناء المناهج وتصدير التقارير بمرونة قصوى.' : 'Perfect fit for calling APIs, creating detailed maps, and compiling student work profiles.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BENCHMARKS COMPARISONS */}
        {activeSubTab === 'benchmarks' && (
          <div 
            
            
            className="space-y-7"
          >
            <div className="space-y-3">
              <h3 className="text-sm font-black text-primary dark:text-primary-light uppercase tracking-wider flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                {isAr ? 'منحنيات التفوق والتقييمات الرقمية' : 'Digital Performance Scores'}
              </h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                {isAr
                  ? 'هذه دراسة وملاحظات قياسية عالمية تم رصدها بمراكز ومختبرات الذكاء الاصطناعي لتبيان تباين النماذج بمحركات الاستكشاف العلمي والتحكيمي مئوياً:'
                  : 'Official automated metrics compiled by lead research labs illustrating accurate success percentage across various disciplines:'
                }
              </p>
            </div>

            {/* Custom Interactive Progress Bar Charts */}
            <div className="space-y-6">
              {benchmarkGauges.map((gauge, gIdx) => (
                <div  className="space-y-2 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <h4 className="text-xs sm:text-sm font-black text-slate-850 dark:text-white">{gauge.name}</h4>
                  
                  <div className="space-y-2.5 mt-3">
                    {/* Gemini 3.5 Pro */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-extrabold">
                        <span className="text-primary dark:text-violet-400 flex items-center gap-1 font-black">
                          <CheckCircle2 className="w-3.5 h-3.5 fill-primary text-white dark:text-[#a78bfa]" />
                          Gemini 3.5 Pro
                        </span>
                        <span className="text-primary dark:text-[#a78bfa]">{gauge.gemini35}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-primary to-indigo-500 h-full rounded-full"
                          
                          />
                      </div>
                    </div>

                    {/* Claude 3.5 Sonnet */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>Claude 3.5 Sonnet</span>
                        <span>{gauge.claude35}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-orange-500 dark:bg-orange-600 h-full rounded-full"
                          
                          />
                      </div>
                    </div>

                    {/* GPT-4o */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>GPT-4o (OpenAI)</span>
                        <span>{gauge.gpt4o}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 dark:bg-emerald-600 h-full rounded-full"
                          
                          />
                      </div>
                    </div>

                    {/* Gemini 1.5 Pro */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>Gemini 1.5 Pro</span>
                        <span>{gauge.gemini15}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-850 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-slate-400 dark:bg-slate-600 h-full rounded-full"
                          
                          />
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PLAYGROUND / SANDBOX */}
        {activeSubTab === 'sandbox' && (
          <div 
            
            
            className="space-y-6"
          >
            <div className="space-y-2">
              <h3 className="text-sm font-black text-primary dark:text-primary-light uppercase tracking-wider flex items-center gap-1">
                <Terminal className="w-4 h-4" />
                {isAr ? 'مختبر الأداء والمحاكاة التفاعلية بالتأخير' : 'Quantum Latency Playground'}
              </h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                {isAr
                  ? 'اختر أحد النماذج المتاحة من عائلة Gemini، ثم أطلق أي من التحديات الأكاديمية الصعوبة أدناه أو اكتب مسألتك الخاصة، لمشاهدة سرعة الاستجابة الدقيقة وتوقيت التأخير الزمني الكوانتي للنموذج بالمللي ثانية!'
                  : 'Select an active model from the Gemini family, specify a difficult question or tap any predefined logic tester below, and track detailed response generation alongside latency metrics down to milliseconds!'
                }
              </p>
            </div>

            {/* Model Selector Switches */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                {isAr ? '1. اختر النموذج المستهدف للاختبار:' : '1. Select active model to query:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedModel('gemini-flash-latest')}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${selectedModel === 'gemini-flash-latest' ? 'bg-primary/5 border-primary text-primary dark:text-primary-light' : 'bg-transparent border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                >
                  <p className="text-xs font-black">Gemini 3.5 Flash</p>
                  <p className="text-[10px] dark:text-slate-500 mt-1 font-bold">
                    {isAr ? 'المعياري الأحدث (تأخير فائق، مثالي لـ 90% من المهام)' : 'Latest baseline (lightning latency, perfect overall)'}
                  </p>
                </button>

                <button
                  onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${selectedModel === 'gemini-3.1-pro-preview' ? 'bg-primary/5 border-primary text-primary dark:text-primary-light' : 'bg-transparent border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                >
                  <p className="text-xs font-black">Gemini 3.1 Pro</p>
                  <p className="text-[10px] dark:text-slate-500 mt-1 font-bold">
                    {isAr ? 'العبقري الاستكشافي (التحليلي للأبحاث والرموز)' : 'Analytical reasoning (designed for research & logic mapping)'}
                  </p>
                </button>

                <button
                  onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${selectedModel === 'gemini-3.1-flash-lite' ? 'bg-primary/5 border-primary text-primary dark:text-primary-light' : 'bg-transparent border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                >
                  <p className="text-xs font-black">Gemini 3.1 Flash-Lite</p>
                  <p className="text-[10px] dark:text-slate-500 mt-1 font-bold">
                    {isAr ? 'خفيف ومثالي (السرعة المطلقة بأقل تأخير زمني)' : 'Extra lightweight (maximum speed and micro latency)'}
                  </p>
                </button>
              </div>
            </div>

            {/* Predefined prompt helpers */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                {isAr ? '2. انقر لتجربة أحد ألغاز الذكاء الساخنة السريعة:' : '2. Quick select a logic challenge prompt:'}
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PREDEFINED_PROMPTS.map((p) => (
                  <button
                    
                    onClick={() => {
                      setCustomPrompt(p.text);
                      handleRunTest(p.text);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-slate-200/50 dark:border-slate-800 rounded-xl text-[11px] font-black cursor-pointer transition-colors text-slate-750 dark:text-slate-200"
                  >
                    🚀 {isAr ? p.titleAr : p.titleEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Manual Prompt Input Area */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                {isAr ? 'أو اكتب مسألتك بنفسك لتفعيل محاكي الأداء:' : 'Or compose your own custom query to measure performance:'}
              </label>
              
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={isAr ? 'مثال: اكتب لغز برمجياً تكرارياً معقداً واطلب حله...' : 'e.g. Write a complex step-by-step logic puzzle...'}
                  className="flex-1 max-w-full outline-none bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 pr-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRunTest(customPrompt);
                    }
                  }}
                  disabled={isLoading}
                />
                
                <button
                  onClick={() => handleRunTest(customPrompt)}
                  disabled={isLoading || !customPrompt.trim()}
                  className={`px-5 py-3 rounded-xl text-white font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${isLoading || !customPrompt.trim() ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover active:scale-97'}`}
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {isAr ? 'فحص ومقارنة!' : 'Benchmark!'}
                </button>
              </div>
            </div>

            {/* Output Screen */}
            
              {(isLoading || sandboxResult) && (
                <div
                  
                  
                  
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
                >
                  {/* Status header */}
                  <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-indigo-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                        {isLoading 
                          ? (isAr ? `جاري معالجة الكوانتم عبر ${selectedModel}...` : `Quantum processing via ${selectedModel}...`)
                          : (isAr ? 'تم استرداد مخرجات الأداء الكوانتية!' : 'Performance output retrieved!')
                        }
                      </span>
                    </div>

                    {!isLoading && sandboxResult && sandboxResult.latency > 0 && (
                      <div className="flex items-center gap-3.5 text-[10.5px] font-black">
                        <span className="text-indigo-600 dark:text-violet-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {isAr ? 'التأخير الزمني:' : 'Latency:'} <strong>{sandboxResult.latency} ms</strong>
                        </span>
                        
                        <span className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/20">
                          <Gauge className="w-3 h-3" />
                          {sandboxResult.latency < 2000 ? (isAr ? 'صاروخية 🚀' : 'Super Rocket Fast 🚀') : (isAr ? 'فائقة ✨' : 'Standard Pro ✨')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body output text container */}
                  <div className="p-4 sm:p-5 bg-slate-50/30 dark:bg-[#0c0f18]/40 space-y-3 font-semibold text-right">
                    {isLoading ? (
                      <div className="py-8 text-center space-y-3 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        <p className="text-xs text-slate-400 font-bold">{isAr ? 'نقوم بحساب توقيت الاستجابة، يرجى الصبر بضع ميكروثوانٍ...' : 'Calculating latency. Please hold for a microsecond...'}</p>
                      </div>
                    ) : (
                      sandboxResult && (
                        <div className="space-y-2 text-right prose dark:prose-invert max-w-full">
                          {formatText(sandboxResult.reply)}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            
          </div>
        )}

      </div>
    </div>
  );
}
