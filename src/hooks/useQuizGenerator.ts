import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { createQuiz } from '../lib/db';
import { Question } from '../types';
import { generateQuizWithFallback } from './useQuizzes';
import { generateQuizFromFile } from '../services/aiWorkerClient';
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
        const isPdf = (mimeType || '').includes('pdf');

        if (isPdf && sourceFile) {
          // Split the PDF into one image per page, then process pages in
          // parallel batches (up to 3 at a time) to cut total wait time
          // without blasting the API with too many simultaneous requests.
          setProgress({
            current: 0,
            total: 1,
            stage: 'scanning',
            message: 'جاري تقسيم ملف الـ PDF إلى صفحات مستقلة...',
          });

          const pages = await splitPdfIntoPageImages(sourceFile, (current, total) => {
            setProgress({
              current,
              total,
              stage: 'scanning',
              message: `جاري تجهيز الصفحة ${current} من ${total}...`,
            });
          });

          if (pages.length === 0) {
            throw new Error('تعذّر قراءة أي صفحات من ملف الـ PDF المرفوع.');
          }

          const numPages = pages.length;
          const perPageAmount = totalQuestions === 0 ? 0 : Math.max(1, Math.ceil(totalQuestions / numPages));
          const seenQuestionKeys = new Set<string>();

          // Process pages in parallel batches of up to 3
          const BATCH_CONCURRENCY = 3;
          let processedPages = 0;

          for (let batchStart = 0; batchStart < pages.length; batchStart += BATCH_CONCURRENCY) {
            const batch = pages.slice(batchStart, batchStart + BATCH_CONCURRENCY);

            setProgress({
              current: processedPages,
              total: numPages,
              stage: 'generating',
              message: `جاري تحليل الصفحات ${batchStart + 1}–${Math.min(batchStart + BATCH_CONCURRENCY, numPages)} من ${numPages}...`,
            });

            const batchResults = await Promise.allSettled(
              batch.map(page => generateQuizFromFile(page.base64, 'image/jpeg', perPageAmount, customInstruction, extractionMode))
            );

            for (const result of batchResults) {
              processedPages++;
              if (result.status === 'fulfilled') {
                const data = result.value;
                if (data.questions && Array.isArray(data.questions)) {
                  if (!finalTitle && data.title) finalTitle = data.title;
                  if (!finalDescription && data.description) finalDescription = data.description;
                  for (const q of data.questions) {
                    const key = String(q.text || '').trim().toLowerCase();
                    if (key && !seenQuestionKeys.has(key)) {
                      seenQuestionKeys.add(key);
                      accumulatedQuestions.push(q);
                    }
                  }
                }
              } else {
                console.warn('Failed to process a PDF page batch member:', result.reason);
              }
            }

            setProgress({
              current: processedPages,
              total: numPages,
              stage: 'generating',
              message: `تم معالجة ${processedPages} من ${numPages} صفحة...`,
            });

            if (totalQuestions > 0 && accumulatedQuestions.length >= totalQuestions) break;
          }

        } else {
          setProgress({
            current: 0,
            total: totalQuestions,
            stage: 'generating',
            message: 'جاري مسح المستند وتحليله بالذكاء الاصطناعي متعدد الوسائط...',
          });

          if (!fileUri) throw new Error('لم يتم العثور على محتوى المستند.');
          const data = await generateQuizFromFile(fileUri, mimeType || 'image/png', totalQuestions, customInstruction, extractionMode);

          if (data.questions && Array.isArray(data.questions)) {
            if (!finalTitle && data.title) finalTitle = data.title;
            if (!finalDescription && data.description) finalDescription = data.description;
            accumulatedQuestions = data.questions;
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
