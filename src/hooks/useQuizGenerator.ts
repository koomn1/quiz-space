import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { createQuiz } from '../lib/db';
import { Question } from '../types';
import { generateQuizWithFallback } from './useQuizzes';
import { generateQuizFromFile } from '../services/aiWorkerClient';


export interface ProgressState {
  current: number;
  total: number;
  stage: 'scanning' | 'generating' | 'saving' | 'complete';
  message: string;
}

export function useQuizGenerator() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = React.useState<ProgressState | null>(null);

  const generatorMutation = useMutation({
    mutationFn: async (params: {
      type: 'topic' | 'pasted_text' | 'file_direct';
      topic?: string;
      text?: string;
      fileUri?: string;
      fileUploadName?: string;
      mimeType?: string;
      totalPages?: number;
      extractionMode?: 'literal' | 'generate';
      customInstruction?: string;
      totalQuestions: number;
      userId: string;
      creatorName: string;
      category: string;
    }) => {
      const {
        type,
        topic,
        text,
        fileUri,
        fileUploadName,
        mimeType,
        totalPages,
        extractionMode,
        customInstruction,
        totalQuestions,
        userId,
        creatorName,
        category,
      } = params;

      setProgress({
        current: 0,
        total: totalQuestions,
        stage: 'generating',
        message: 'جاري تهيئة عملية التوليد...',
      });

      let accumulatedQuestions: any[] = [];
      let finalTitle = '';
      let finalDescription = '';

      const BATCH_SIZE = 40;

      if (type === 'topic') {
        const totalBatches = Math.ceil(totalQuestions / BATCH_SIZE);
        for (let i = 0; i < totalBatches; i++) {
          const currentBatchSize = Math.min(BATCH_SIZE, totalQuestions - i * BATCH_SIZE);
          setProgress({
            current: i * BATCH_SIZE,
            total: totalQuestions,
            stage: 'generating',
            message: `جاري توليد الدفعة ${i + 1} من ${totalBatches} (${i * BATCH_SIZE}/${totalQuestions} سؤال)...`,
          });

          const data = await generateQuizWithFallback(
            topic || '',
            currentBatchSize,
            accumulatedQuestions.map(q => q.text)
          );

          if (data.questions && Array.isArray(data.questions)) {
            if (!finalTitle && data.title) finalTitle = data.title;
            if (!finalDescription && data.description) finalDescription = data.description;
            
            accumulatedQuestions = [...accumulatedQuestions, ...data.questions];
          }
        }
      } else if (type === 'pasted_text') {
        const totalBatches = Math.ceil(totalQuestions / BATCH_SIZE);
        for (let i = 0; i < totalBatches; i++) {
          const currentBatchSize = Math.min(BATCH_SIZE, totalQuestions - i * BATCH_SIZE);
          setProgress({
            current: i * BATCH_SIZE,
            total: totalQuestions,
            stage: 'generating',
            message: `جاري تحليل النص وتوليد الدفعة ${i + 1} من ${totalBatches} (${i * BATCH_SIZE}/${totalQuestions} سؤال)...`,
          });

          const data = await generateQuizWithFallback(
            `النص المصدر للأسئلة:\n\n${text}`,
            currentBatchSize,
            accumulatedQuestions.map(q => q.text)
          );

          if (data.questions && Array.isArray(data.questions)) {
            if (!finalTitle && data.title) finalTitle = data.title;
            if (!finalDescription && data.description) finalDescription = data.description;
            accumulatedQuestions = [...accumulatedQuestions, ...data.questions];
          }
        }
      } else if (type === 'file_direct') {
        setProgress({
          current: 0,
          total: totalQuestions,
          stage: 'generating',
          message: 'جاري مسح المستند وتحليله بالذكاء الاصطناعي متعدد الوسائط...',
        });

        if (!fileUri) throw new Error('لم يتم العثور على محتوى المستند.');
        const data = await generateQuizFromFile(fileUri, mimeType || 'application/pdf', totalQuestions, customInstruction);

        if (data.questions && Array.isArray(data.questions)) {
          if (!finalTitle && data.title) finalTitle = data.title;
          if (!finalDescription && data.description) finalDescription = data.description;
          accumulatedQuestions = data.questions;
        }
      }

      if (totalQuestions > 0 && accumulatedQuestions.length > totalQuestions) {
        accumulatedQuestions = accumulatedQuestions.slice(0, totalQuestions);
      }

      if (accumulatedQuestions.length === 0) {
        throw new Error('فشل توليد أي أسئلة صالحة للطلب المختار.');
      }

      setProgress({
        current: totalQuestions,
        total: totalQuestions,
        stage: 'saving',
        message: 'جاري حفظ الاختبار بالكامل في قاعدة البيانات...',
      });

      const finalQuizTitle = finalTitle?.trim() || (type === 'topic' ? `اختبار: ${topic}` : 'اختبار مخصص جديد');
      const finalQuizDesc = finalDescription?.trim() || 'اختبار مخصص تم توليده بدقة كاملة بالذكاء الاصطناعي كوانتم.';

      const createdQuiz = await createQuiz({
        title: finalQuizTitle,
        description: finalQuizDesc,
        creatorId: userId,
        creatorName: creatorName || 'صانع متميز',
        questions: accumulatedQuestions.map((q: any, idx: number) => {
          const isEnglish = !/[\u0600-\u06FF]/.test(q.text || '');
          return {
            id: `q-gen-${idx}-${Date.now()}`,
            type: q.type === 'tf' ? 'tf' : q.type === 'essay' ? 'essay' : 'mcq',
            text: q.text || '',
            options: q.type === 'tf'
              ? (q.options && q.options.length === 2 && q.options[0].trim() ? q.options : (isEnglish ? ['True', 'False'] : ['صح', 'خطأ']))
              : q.type === 'essay' ? [] : (q.options || ['', '', '', '']),
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
          };
        }),
        timeLimit: 0,
        category: category || 'عام',
      });

      setProgress({
        current: totalQuestions,
        total: totalQuestions,
        stage: 'complete',
        message: 'تم توليد وحفظ الاختبار بنجاح! ✨',
      });

      if (fileUploadName) {
        console.log('Processed locally, no backend cleanup needed.');
      }

      queryClient.invalidateQueries({ queryKey: ['quizzes'] });

      return {
        quiz: createdQuiz,
        questions: accumulatedQuestions,
        title: finalQuizTitle,
        description: finalQuizDesc,
      };
    },
  });

  return {
    generateAndSaveQuiz: generatorMutation.mutateAsync,
    isGenerating: generatorMutation.isPending,
    generationProgress: progress,
    generationError: generatorMutation.error ? (generatorMutation.error as Error).message : null,
    resetGeneration: () => {
      generatorMutation.reset();
      setProgress(null);
    },
  };
}
