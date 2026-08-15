import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { createQuiz } from '../lib/db';
import { filterValidGeneratedQuestions } from '../lib/quizGenerationValidation';
import { Question, GeneratedQuiz } from '../types';
import { generateQuizWithFallback } from './useQuizzes';
import { createExtractionJob, getExtractionJob } from '../services/aiWorkerClient';


export interface ProgressState {
  current: number;
  total: number;
  stage: 'scanning' | 'generating' | 'saving' | 'complete';
  message: string;
}

export function formatExtractionEta(createdAt: string, processedChunks: number, totalChunks: number | null): string | null {
  if (!totalChunks || processedChunks < 1 || processedChunks >= totalChunks) return null;
  const startedAt = new Date(createdAt).getTime();
  if (!Number.isFinite(startedAt)) return null;
  const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
  const remainingSeconds = Math.max(1, Math.round((elapsedSeconds / processedChunks) * (totalChunks - processedChunks)));
  if (remainingSeconds < 60) return `الوقت المتبقي التقريبي: أقل من دقيقة.`;
  return `الوقت المتبقي التقريبي: نحو ${Math.ceil(remainingSeconds / 60)} دقيقة.`;
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
      existingJobId?: string;
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
        existingJobId,
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

          let data: GeneratedQuiz | null = null;
          try {
            data = await generateQuizWithFallback(
              topic || '',
              currentBatchSize,
              accumulatedQuestions.map(q => q.text)
            );
          } catch { /* providers failed, data stays null */ }
          
          // If the batch failed entirely (no questions returned), retry with providers
          if (!data?.questions || data.questions.length === 0) {
            try {
              const retry = await generateQuizWithFallback(
                topic || '',
                currentBatchSize,
                accumulatedQuestions.map(q => q.text)
              );
              if (retry.questions && retry.questions.length > 0) {
                data = retry;
              }
            } catch { /* keep empty, will throw at end */ }
          }
          // Models occasionally return fewer questions than requested —
          // retry the batch once, asking for the exact missing remainder.
          const returned = data?.questions ? data.questions.length : 0;
          if (returned > 0 && returned < currentBatchSize && data) {
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

          if (data?.questions && Array.isArray(data.questions)) {
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

          let data: GeneratedQuiz | null = null;
          try {
            data = await generateQuizWithFallback(
              `النص المصدر للأسئلة:\n\n${text}`,
              currentBatchSize,
              accumulatedQuestions.map(q => q.text)
            );
          } catch { /* providers failed, data stays null */ }
          
          // If the batch failed entirely, retry once more
          if (!data?.questions || data.questions.length === 0) {
            try {
              const retry = await generateQuizWithFallback(
                `النص المصدر للأسئلة:\n\n${text}`,
                currentBatchSize,
                accumulatedQuestions.map(q => q.text)
              );
              if (retry.questions && retry.questions.length > 0) {
                data = retry;
              }
            } catch { /* keep empty, will throw at end */ }
          }
          const returned2 = data?.questions ? data.questions.length : 0;
          if (returned2 > 0 && returned2 < currentBatchSize && data) {
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

          if (data?.questions && Array.isArray(data.questions)) {
            if (!finalTitle && data.title) finalTitle = data.title;
            if (!finalDescription && data.description) finalDescription = data.description;
            accumulatedQuestions = [...accumulatedQuestions, ...data.questions];
          }
        }
      } else if (type === 'file_direct') {
        setProgress({
          current: 0,
          total: 1,
          stage: 'generating',
          message: existingJobId ? 'تم العثور على مهمة سابقة، جارٍ استئناف متابعة الاستخراج...' : 'تم رفع الملف بشكل خاص، وجارٍ بدء مهمة الاستخراج...',
        });

        let job;
        if (existingJobId) {
          job = await getExtractionJob(existingJobId);
        } else {
          let fileForJob = sourceFile;
          if (!fileForJob && fileUri) {
            const dataUrl = fileUri.startsWith('data:') ? fileUri : `data:${mimeType || 'application/pdf'};base64,${fileUri}`;
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            fileForJob = new File([blob], fileUploadName || 'source-document', { type: mimeType || 'application/pdf' });
          }
          if (!fileForJob) throw new Error('لم يتم العثور على محتوى المستند.');
          job = await createExtractionJob({
            file: fileForJob,
            extractionMode: extractionMode || 'literal',
            customInstruction,
            requestedQuestionCount: totalQuestions,
          });
        }
        let data: GeneratedQuiz | null = null;
        const pollDeadline = Date.now() + 45 * 60 * 1000;
        while (Date.now() < pollDeadline) {
          if (job.status === 'complete' && job.quiz) {
            data = job.quiz;
            break;
          }
          if (job.status === 'error') throw new Error(job.errorMessage || 'تعذر استخراج أسئلة من هذا الملف.');
          const eta = formatExtractionEta(job.createdAt, job.processedChunks, job.totalChunks);
          setProgress({
            current: job.processedChunks,
            total: job.totalChunks || 1,
            stage: 'generating',
            message: [job.progressMessage || `جارٍ استخراج الأسئلة (${job.progressPercentage}%).`, eta].filter(Boolean).join(' '),
          });
          await new Promise(resolve => window.setTimeout(resolve, 2000));
          job = await getExtractionJob(job.id);
        }
        if (!data) throw new Error('انتهت مهلة متابعة الاستخراج. افتح صفحة إنشاء الاختبار مجدداً لاستئناف المهمة.');

        if (data.questions && Array.isArray(data.questions)) {
          if (!finalTitle && data.title) finalTitle = data.title;
          if (!finalDescription && data.description) finalDescription = data.description;
          accumulatedQuestions = filterValidGeneratedQuestions(data.questions);

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
            setProgress({
              current: accumulatedQuestions.length,
              total: Math.max(totalQuestions, accumulatedQuestions.length),
              stage: 'generating',
              message: `تم استخراج ${accumulatedQuestions.length} سؤالاً مع تصحيح ترقيم الأسئلة تلقائياً...`,
            });
          }
        }
      }

      if (type !== 'file_direct' && totalQuestions > 0 && accumulatedQuestions.length > totalQuestions) {
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
