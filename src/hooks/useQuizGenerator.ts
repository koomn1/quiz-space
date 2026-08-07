import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { createQuiz } from '../lib/db';
import { Question } from '../types';
import { generateQuizWithFallback } from './useQuizzes';
import { generateQuizFromFile, generateQuizFromFileStreaming, StreamProgress } from '../services/aiWorkerClient';
import { splitPdfIntoPageImages } from '../lib/pdfSplitter';


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
      sourceFile?: File;
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
        sourceFile,
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

          let data = await generateQuizWithFallback(
            topic || '',
            currentBatchSize,
            accumulatedQuestions.map(q => q.text)
          );
          // Models occasionally return fewer questions than requested —
          // retry the batch once, asking for the exact missing remainder.
          const returned = Array.isArray(data?.questions) ? data.questions.length : 0;
          if (returned > 0 && returned < currentBatchSize) {
            try {
              const extra = await generateQuizWithFallback(
                topic || '',
                currentBatchSize - returned,
                [...accumulatedQuestions.map(q => q.text), ...data.questions.map((q: any) => String(q.text || ''))].slice(-200)
              );
              if (Array.isArray(extra?.questions) && extra.questions.length > 0) {
                data.questions = [...data.questions, ...extra.questions];
              }
            } catch { /* keep whatever we already have */ }
          }

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

          let data = await generateQuizWithFallback(
            `النص المصدر للأسئلة:\n\n${text}`,
            currentBatchSize,
            accumulatedQuestions.map(q => q.text)
          );
          const returned2 = Array.isArray(data?.questions) ? data.questions.length : 0;
          if (returned2 > 0 && returned2 < currentBatchSize) {
            try {
              const extra = await generateQuizWithFallback(
                `النص المصدر للأسئلة:\n\n${text}`,
                currentBatchSize - returned2,
                [...accumulatedQuestions.map(q => q.text), ...data.questions.map((q: any) => String(q.text || ''))].slice(-200)
              );
              if (Array.isArray(extra?.questions) && extra.questions.length > 0) {
                data.questions = [...data.questions, ...extra.questions];
              }
            } catch { /* keep whatever we already have */ }
          }

          if (data.questions && Array.isArray(data.questions)) {
            if (!finalTitle && data.title) finalTitle = data.title;
            if (!finalDescription && data.description) finalDescription = data.description;
            accumulatedQuestions = [...accumulatedQuestions, ...data.questions];
          }
        }
      } else if (type === 'file_direct') {
        setProgress({
          current: 0,
          total: 100,
          stage: 'generating',
          message: 'جاري تحليل المستند وتجهيز الـ Chunks...',
        });

        let base64 = '';
        if (sourceFile) {
          const reader = new FileReader();
          base64 = await new Promise((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(sourceFile);
          });
        } else if (fileUri) {
          base64 = fileUri.split(',')[1] || fileUri;
        }

        if (!base64) throw new Error('لم يتم العثور على محتوى المستند.');

        let data;
        try {
          data = await generateQuizFromFileStreaming(
            base64,
            mimeType || 'application/pdf',
            customInstruction,
            (progress: StreamProgress) => {
              if (progress.type === 'init') {
                setProgress({
                  current: 0,
                  total: progress.totalChunks || 1,
                  stage: 'generating',
                  message: `جاري معالجة ${progress.totalPages} صفحة في ${progress.totalChunks} مجموعة...`,
                });
              } else if (progress.type === 'progress') {
                setProgress({
                  current: progress.processed || 0,
                  total: progress.total || 1,
                  stage: 'generating',
                  message: `معالجة المجموعة ${progress.processed}/${progress.total} - استخراج ${progress.questionsExtracted} سؤال (${progress.percentage}%)`,
                });
              }
            }
          );
        } catch (err) {
          console.warn('Streaming failed, falling back to standard extraction:', err);
          data = await generateQuizFromFile(base64, mimeType || 'application/pdf', totalQuestions, customInstruction, extractionMode);
        }

        if (data.questions && Array.isArray(data.questions)) {
          if (!finalTitle && data.title) finalTitle = data.title;
          if (!finalDescription && data.description) finalDescription = data.description;
          accumulatedQuestions = data.questions;

          // Validation logic for sequential numbering
          const sorted = [...accumulatedQuestions].sort((a, b) => (a.number || 0) - (b.number || 0));
          let expected = 1;
          const gaps: number[] = [];
          for (const q of sorted) {
            if (q.number && q.number > expected) {
              for (let m = expected; m < q.number; m++) gaps.push(m);
              expected = q.number + 1;
            } else if (q.number) {
              expected = q.number + 1;
            }
          }

          if (gaps.length > 0) {
            console.warn('Gaps detected in question numbering:', gaps);
            // Optionally notify user or attempt a targeted recovery here
          }
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
            number: q.number || (idx + 1),
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
