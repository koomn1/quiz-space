import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuizzes, createQuiz, deleteQuiz, updateQuiz } from '../lib/db';
import { Quiz, GeneratedQuiz } from '../types';
import { generateWithGemini } from '../services/geminiService';
import { generateWithGroq } from '../services/groqService';
import { generateWithDeepSeek } from '../services/deepseekService';
import { generateWithOpenAI } from '../services/openaiService';

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
    
    let options: string[] | undefined = undefined;
    let correctIndex: number | undefined = undefined;
    let correctAnswer: string | undefined = undefined;

    if (type === 'mcq') {
      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        options = ['خيّار أ', 'خيّار ب', 'خيّار ج', 'خيّار د'];
      } else {
        options = q.options.map((opt: any) => String(opt || '').trim()).filter(Boolean);
      }
      correctIndex = typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < (options?.length || 4) 
        ? q.correctIndex 
        : 0;
    } else if (type === 'tf') {
      options = ['صح', 'خطأ'];
      correctIndex = typeof q.correctIndex === 'number' && (q.correctIndex === 0 || q.correctIndex === 1) 
        ? q.correctIndex 
        : 0;
    } else {
      // essay
      correctAnswer = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
    }

    return {
      text: q.text.trim(),
      type,
      options: options || [],
      correctIndex: correctIndex ?? 0,
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

export async function generateQuizWithFallback(
  topic: string,
  amount: number,
  alreadyGeneratedQuestions?: string[]
): Promise<GeneratedQuiz> {
  const errors: string[] = [];

  // Attempt 1: Gemini
  try {
    console.log('Attempting Quiz generation with Gemini...');
    const result = await generateWithGemini(topic, amount, alreadyGeneratedQuestions);
    const cleaned = validateAndCleanQuiz(result);
    console.log('Gemini Quiz Generation succeeded and passed schema validation!');
    return cleaned;
  } catch (err: any) {
    const errMsg = err.message || err;
    console.warn('Gemini Generation failed:', errMsg);
    errors.push(`Gemini: ${errMsg}`);
  }

  // Attempt 2: Groq
  try {
    console.log('Attempting Quiz generation with Groq...');
    const result = await generateWithGroq(topic, amount, alreadyGeneratedQuestions);
    const cleaned = validateAndCleanQuiz(result);
    console.log('Groq Quiz Generation succeeded and passed schema validation!');
    return cleaned;
  } catch (err: any) {
    const errMsg = err.message || err;
    console.warn('Groq Generation failed:', errMsg);
    errors.push(`Groq: ${errMsg}`);
  }

  // Attempt 3: DeepSeek
  try {
    console.log('Attempting Quiz generation with DeepSeek...');
    const result = await generateWithDeepSeek(topic, amount, alreadyGeneratedQuestions);
    const cleaned = validateAndCleanQuiz(result);
    console.log('DeepSeek Quiz Generation succeeded and passed schema validation!');
    return cleaned;
  } catch (err: any) {
    const errMsg = err.message || err;
    console.warn('DeepSeek Generation failed:', errMsg);
    errors.push(`DeepSeek: ${errMsg}`);
  }

  // Attempt 4: OpenAI
  try {
    console.log('Attempting Quiz generation with OpenAI...');
    const result = await generateWithOpenAI(topic, amount, alreadyGeneratedQuestions);
    const cleaned = validateAndCleanQuiz(result);
    console.log('OpenAI Quiz Generation succeeded and passed schema validation!');
    return cleaned;
  } catch (err: any) {
    const errMsg = err.message || err;
    console.warn('OpenAI Generation failed:', errMsg);
    errors.push(`OpenAI: ${errMsg}`);
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
