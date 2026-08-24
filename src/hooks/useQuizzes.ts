import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuizzes, createQuiz, deleteQuiz, updateQuiz } from '../lib/db';
import { Quiz, GeneratedQuiz } from '../types';
import { generateWithOpenRouter } from '../services/openrouterService';
import { generateWithGroq } from '../services/groqService';
import { generateWithDeepSeek } from '../services/deepseekService';
import { generateWithOpenAI } from '../services/openaiService';
import { hasUnexpectedForeignLanguage, normalizeArabicGeneratedQuiz, requiresArabicGeneration } from '../lib/quizLanguageValidation';

function normalizeAnswer(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[.,،؛:!?؟"'`()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function inferCorrectIndex(correctAnswer: unknown, options: string[]): number | undefined {
  const answer = normalizeAnswer(correctAnswer);
  if (!answer) return undefined;
  const exactIndex = options.findIndex(option => normalizeAnswer(option) === answer);
  if (exactIndex >= 0) return exactIndex;
  if (options.length === 2) {
    if (['صح', 'صحيح', 'true', 'yes', 'نعم'].includes(answer)) return 0;
    if (['خطأ', 'خاطئ', 'false', 'no', 'لا'].includes(answer)) return 1;
  }
  return undefined;
}

// Helper for static schema validation
export function validateAndCleanQuiz(data: any): GeneratedQuiz {
  if (!data || typeof data !== 'object') {
    throw new Error('Data is not a valid object');
  }

  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'اختبار أكاديمي مخصص';
  const description = typeof data.description === 'string' && data.description.trim() ? data.description.trim() : 'اختبار تم توليده بواسطة الذكاء الاصطناعي';

  if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('Questions array must be a non-empty array');
  }

  const cleanedQuestions = data.questions.map((q: any, index: number) => {
    if (!q || typeof q !== 'object') {
      throw new Error(`Question at index ${index} is not an object`);
    }

    if (!q.text || typeof q.text !== 'string' || !q.text.trim()) {
      throw new Error(`Question at index ${index} lacks a valid text prompt`);
    }

    const type = (q.type === 'mcq' || q.type === 'tf' || q.type === 'essay') ? q.type : 'mcq';
    
    let options: string[] = [];
    let correctIndex = 0;
    let correctAnswer: string | undefined = undefined;

    if (type === 'mcq') {
      const candidateOptions = Array.isArray(q.options)
        ? q.options.map((opt: any) => String(opt || '').trim()).filter(Boolean)
        : [];
      options = candidateOptions.length >= 2
        ? candidateOptions
        : ['خيّار أ', 'خيّار ب', 'خيّار ج', 'خيّار د'];
      const suppliedIndex = typeof q.correctIndex === 'number' && Number.isInteger(q.correctIndex)
        ? q.correctIndex
        : -1;
      const inferredIndex = inferCorrectIndex(q.correctAnswer, options);
      correctIndex = suppliedIndex >= 0 && suppliedIndex < options.length
        ? suppliedIndex
        : inferredIndex ?? 0;
    } else if (type === 'tf') {
      options = ['صح', 'خطأ'];
      const suppliedIndex = typeof q.correctIndex === 'number' && Number.isInteger(q.correctIndex)
        ? q.correctIndex
        : -1;
      const inferredIndex = inferCorrectIndex(q.correctAnswer, options);
      correctIndex = suppliedIndex === 0 || suppliedIndex === 1
        ? suppliedIndex
        : inferredIndex ?? 0;
    } else {
      // Essay questions are assessed separately and do not need selectable options.
      correctAnswer = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
    }

    return {
      text: q.text.trim(),
      type,
      options,
      correctIndex,
      correctAnswer,
      explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
    };
  });

  return {
    title,
    description,
    questions: cleanedQuestions,
  };
}

// Races a promise against a timeout. If the timeout wins, we move on to the
// next provider in generateQuizWithFallback instead of waiting indefinitely
// (the original request may still finish in the background, but we stop
// caring about it — this only prevents the UI from hanging on it).
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s`));
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

const PROVIDER_TIMEOUT_MS = 35_000;

export async function generateQuizWithFallback(
  topic: string,
  amount: number,
  alreadyGeneratedQuestions?: string[]
): Promise<GeneratedQuiz> {
  const enforceArabic = requiresArabicGeneration(topic);
  const providers = [
    { key: 'openrouter', run: () => generateWithOpenRouter(topic, amount, alreadyGeneratedQuestions) },
    { key: 'groq', run: () => generateWithGroq(topic, amount, alreadyGeneratedQuestions) },
    { key: 'deepseek', run: () => generateWithDeepSeek(topic, amount, alreadyGeneratedQuestions) },
    { key: 'openai', run: () => generateWithOpenAI(topic, amount, alreadyGeneratedQuestions) },
  ];

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      console.log(`Attempting Quiz generation with ${provider.key}...`);
      const result = await withTimeout(provider.run(), PROVIDER_TIMEOUT_MS, provider.key);
      const cleaned = validateAndCleanQuiz(result);
      const languageSafe = enforceArabic ? normalizeArabicGeneratedQuiz(cleaned) : cleaned;
      if (enforceArabic && hasUnexpectedForeignLanguage(languageSafe)) {
        throw new Error('Generated quiz contains unexpected foreign-language text');
      }
      console.log(`${provider.key} Quiz Generation succeeded and passed schema validation!`);
      return languageSafe;
    } catch (err: any) {
      const errMsg = err.message || err;
      console.warn(`${provider.key} Generation failed:`, errMsg);
      errors.push(`${provider.key}: ${errMsg}`);
    }
  }

  throw new Error(`Failed to generate quiz with any AI service. Detail logs:\n${errors.join('\n')}`);
}

export const generateInstantQuiz = generateQuizWithFallback;

export function useQuizzes() {
  const queryClient = useQueryClient();

  // Fetch quizzes with real-time freshness settings
  const { data: quizzes = [], isLoading, error, refetch } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: getQuizzes,
    staleTime: 0, // Keep data always considered stale for immediate updates
    refetchOnWindowFocus: true, // Auto refetch when window gets focus
    refetchInterval: 7500, // Background polling every 7.5 seconds for instant consistency
  });


  // Mutation to create a quiz
  const createMutation = useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  // Mutation to update a quiz
  const updateMutation = useMutation({
    mutationFn: ({ id, quiz }: { id: string; quiz: Partial<Quiz> }) => updateQuiz(id, quiz),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  // Mutation to delete a quiz
  const deleteMutation = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  return {
    quizzes,
    isLoadingQuizzes: isLoading,
    error,
    refetchQuizzes: refetch,
    createQuiz: createMutation.mutateAsync,
    isCreatingQuiz: createMutation.isPending,
    updateQuiz: updateMutation.mutateAsync,
    isUpdatingQuiz: updateMutation.isPending,
    deleteQuiz: deleteMutation.mutateAsync,
    isDeletingQuiz: deleteMutation.isPending,
    generateQuizWithFallback,
    generateInstantQuiz,
  };
}
