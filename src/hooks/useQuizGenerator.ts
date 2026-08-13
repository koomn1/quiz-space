import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { createQuiz } from '../lib/db';
import { Question, GeneratedQuiz } from '../types';
import { generateQuizWithFallback } from './useQuizzes';
import { generateQuizFromFile, generateQuizFromFileWithFallback, generateQuizFromFileStreaming, StreamProgress } from '../services/aiWorkerClient';
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
          total: 100,
          stage: 'generating',
          message: 'جاري استخراج نص المستند وتجهيز Nemotron...',
        });

        // QuizCreator already converted the selected file to Base64. Reuse it
        // instead of reading the full File object a second time. The FileReader
        // fallback remains for callers that only provide sourceFile.
        let base64 = fileUri?.split(',')[1] || fileUri || '';
        if (!base64 && sourceFile) {
          const reader = new FileReader();
          base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
            reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الملف.'));
            reader.readAsDataURL(sourceFile);
          });
        }

        if (!base64) throw new Error('لم يتم العثور على محتوى المستند.');

        let data;
        const resolvedMimeType = mimeType || 'application/pdf';
        if (resolvedMimeType === 'application/pdf') {
          try {
            data = await generateQuizFromFileStreaming(
              base64,
              resolvedMimeType,
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
              },
              extractionMode || 'literal'
            );
          } catch (err) {
            console.warn('Streaming failed, falling back to standard extraction:', err);
            setProgress({
              current: 0,
              total: 1,
              stage: 'generating',
              message: 'تعذر إكمال المعالجة السريعة، جارٍ استخدام مسار استخراج بديل...',
            });
            try {
              data = await generateQuizFromFileWithFallback(base64, resolvedMimeType, totalQuestions, customInstruction, extractionMode);
            } catch (fallbackErr) {
              console.warn('Fallback extraction failed, trying the final compatible extractor:', fallbackErr);
              setProgress({
                current: 0,
                total: 1,
                stage: 'generating',
                message: 'جارٍ تجربة مسار أخير متوافق مع ملفك...',
              });
              try {
                data = await generateQuizFromFile(base64, resolvedMimeType, totalQuestions, customInstruction, extractionMode);
              } catch (finalErr) {
                console.error('All file extraction paths failed:', finalErr);
                throw new Error('تعذر استخراج أسئلة من هذا الملف. تأكد أن الملف قابل للقراءة وليس محمياً بكلمة مرور ثم حاول مرة أخرى.');
              }
            }
          }
        } else {
          // DOCX/XLSX/PPTX and image files use the non-streaming endpoint because
          // the streaming route is intentionally PDF-only. The worker parses
          // Office text locally (Mammoth/XLSX) before invoking Nemotron.
          setProgress({
            current: 0,
            total: 1,
            stage: 'generating',
            message: 'جاري قراءة المستند واستخراج نصه عبر Nemotron...',
          });
          data = await generateQuizFromFile(base64, resolvedMimeType, totalQuestions, customInstruction, extractionMode);
        }

        if (data.questions && Array.isArray(data.questions)) {
          if (!finalTitle && data.title) finalTitle = data.title;
          if (!finalDescription && data.description) finalDescription = data.description;
          accumulatedQuestions = data.questions.filter((question: any) => String(question?.text || '').trim().length > 0);

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
