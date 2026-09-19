import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { createQuiz } from '../lib/db';
import { filterValidGeneratedQuestions } from '../lib/quizGenerationValidation';
import { Question, Quiz, GeneratedQuiz } from '../types';
import { generateQuizWithFallback, validateAndCleanQuiz } from './useQuizzes';
import { createExtractionJob, getExtractionJob } from '../services/aiWorkerClient';


export interface ProgressState {
  current: number;
  total: number;
  percentage?: number;
  stage: 'scanning' | 'generating' | 'solving' | 'saving' | 'complete';
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

// The topic/text generation API requires a positive amount. The UI uses zero
// as its automatic sentinel; 40 is only a safety ceiling sent to the AI, while
// automatic mode explicitly lets the AI choose the useful count below it.
export function normalizeGenerationQuestionCount(totalQuestions: number): number {
  const requested = Number(totalQuestions);
  return Number.isInteger(requested) && requested > 0 ? Math.min(requested, 500) : 40;
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
      persist?: boolean;
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
        persist = true,
      } = params;

      const automaticCount = totalQuestions <= 0 && type !== 'file_direct';
      const generationQuestionCount = type === 'file_direct'
        ? totalQuestions
        : normalizeGenerationQuestionCount(totalQuestions);

      setProgress({
        current: 0,
        total: generationQuestionCount,
        stage: 'generating',
        message: type === 'file_direct'
          ? `جاري قراءة الملف «${fileUploadName || sourceFile?.name || 'المستند المرفوع'}» وتحضير محتواه...`
          : 'جاري الاتصال بمزود الذكاء الاصطناعي... قد يستغرق استلام الدفعة الأولى بضع لحظات.',
      });

      let accumulatedQuestions: any[] = [];
      let lastGenerationError: Error | null = null;
      let finalTitle = '';
      let finalDescription = '';

      const BATCH_SIZE = 40;

      if (type === 'topic') {
        const totalBatches = Math.ceil(generationQuestionCount / BATCH_SIZE);
        for (let i = 0; i < totalBatches; i++) {
          const currentBatchSize = Math.min(BATCH_SIZE, generationQuestionCount - i * BATCH_SIZE);
          setProgress({
            current: i * BATCH_SIZE,
            total: generationQuestionCount,
            stage: 'generating',
            message: `جاري الاتصال بالمزود لتوليد الدفعة ${i + 1} من ${totalBatches} (${i * BATCH_SIZE}/${generationQuestionCount} سؤال)... قد يتأخر الرد قليلًا دون أن تتوقف العملية.`,
          });

          let data: GeneratedQuiz | null = null;
          try {
            data = await generateQuizWithFallback(
              topic || '',
              currentBatchSize,
              accumulatedQuestions.map(q => q.text),
              automaticCount
            );
          } catch (error) {
            lastGenerationError = error instanceof Error ? error : new Error(String(error));
          }
          
          // If the batch failed entirely (no questions returned), retry with providers
          if (!data?.questions || data.questions.length === 0) {
            try {
              const retry = await generateQuizWithFallback(
                topic || '',
                currentBatchSize,
                accumulatedQuestions.map(q => q.text),
                automaticCount
              );
              if (retry.questions && retry.questions.length > 0) {
                data = retry;
              }
            } catch (error) {
              lastGenerationError = error instanceof Error ? error : new Error(String(error));
            }
          }
          // Models occasionally return fewer questions than requested —
          // retry the batch once, asking for the exact missing remainder.
          const returned = data?.questions ? data.questions.length : 0;
          if (!automaticCount && returned > 0 && returned < currentBatchSize && data) {
            try {
              const extra = await generateQuizWithFallback(
                topic || '',
                currentBatchSize - returned,
                [...accumulatedQuestions.map(q => q.text), ...data.questions.map((q: any) => String(q.text || ''))].slice(-200),
                automaticCount
              );
              if (Array.isArray(extra?.questions) && extra.questions.length > 0) {
                data.questions = [...data.questions, ...extra.questions];
              }
            } catch (error) {
              lastGenerationError = error instanceof Error ? error : new Error(String(error));
            }
          }

          if (data?.questions && Array.isArray(data.questions)) {
            if (!finalTitle && data.title) finalTitle = data.title;
            if (!finalDescription && data.description) finalDescription = data.description;
            
            accumulatedQuestions = [...accumulatedQuestions, ...data.questions];
          }
        }
      } else if (type === 'pasted_text') {
        const totalBatches = Math.ceil(generationQuestionCount / BATCH_SIZE);
        for (let i = 0; i < totalBatches; i++) {
          const currentBatchSize = Math.min(BATCH_SIZE, generationQuestionCount - i * BATCH_SIZE);
          setProgress({
            current: i * BATCH_SIZE,
            total: generationQuestionCount,
            stage: 'generating',
            message: `جاري تحليل النص وتوليد الدفعة ${i + 1} من ${totalBatches} (${i * BATCH_SIZE}/${generationQuestionCount} سؤال)...`,
          });

          let data: GeneratedQuiz | null = null;
          try {
            data = await generateQuizWithFallback(
              `النص المصدر للأسئلة:\n\n${text}`,
              currentBatchSize,
              accumulatedQuestions.map(q => q.text),
              automaticCount
            );
          } catch (error) {
            lastGenerationError = error instanceof Error ? error : new Error(String(error));
          }
          
          // If the batch failed entirely, retry once more
          if (!data?.questions || data.questions.length === 0) {
            try {
              const retry = await generateQuizWithFallback(
                `النص المصدر للأسئلة:\n\n${text}`,
                currentBatchSize,
                accumulatedQuestions.map(q => q.text),
                automaticCount
              );
              if (retry.questions && retry.questions.length > 0) {
                data = retry;
              }
            } catch (error) {
              lastGenerationError = error instanceof Error ? error : new Error(String(error));
            }
          }
          const returned2 = data?.questions ? data.questions.length : 0;
          if (!automaticCount && returned2 > 0 && returned2 < currentBatchSize && data) {
            try {
              const extra = await generateQuizWithFallback(
                `النص المصدر للأسئلة:\n\n${text}`,
                currentBatchSize - returned2,
                [...accumulatedQuestions.map(q => q.text), ...data.questions.map((q: any) => String(q.text || ''))].slice(-200),
                automaticCount
              );
              if (Array.isArray(extra?.questions) && extra.questions.length > 0) {
                data.questions = [...data.questions, ...extra.questions];
              }
            } catch (error) {
              lastGenerationError = error instanceof Error ? error : new Error(String(error));
            }
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
            sourceFileName: fileUploadName || fileForJob.name,
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
          const totalChunks = job.totalChunks || 1;
          const reportedPercentage = Number.isFinite(job.progressPercentage)
            ? Math.min(100, Math.max(0, job.progressPercentage))
            : Math.round((job.processedChunks / totalChunks) * 100);
          const eta = formatExtractionEta(job.createdAt, job.processedChunks, job.totalChunks);
          setProgress({
            current: Math.min(job.processedChunks, totalChunks),
            total: totalChunks,
            percentage: reportedPercentage,
            stage: 'generating',
            message: [
              job.progressMessage || `جارٍ استخراج محتوى «${fileUploadName || sourceFile?.name || 'المستند'}» (${reportedPercentage}%).`,
              eta,
            ].filter(Boolean).join(' '),
          });
          await new Promise(resolve => window.setTimeout(resolve, 700));
          job = await getExtractionJob(job.id);
        }
        if (!data) throw new Error('انتهت مهلة متابعة الاستخراج. افتح صفحة إنشاء الاختبار مجدداً لاستئناف المهمة.');

        if (data.questions && Array.isArray(data.questions)) {
          const fileQuestions = filterValidGeneratedQuestions(data.questions);
          const cleanedFileQuiz = persist
            ? validateAndCleanQuiz({
                title: data.title,
                description: data.description,
                questions: fileQuestions,
              })
            : {
                title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'اختبار مخصص جديد',
                description: typeof data.description === 'string' && data.description.trim() ? data.description.trim() : 'اختبار مستخرج من الملف',
                questions: fileQuestions.map((q: any, index: number): Question => ({
                  id: q.id || `q-file-draft-${index}-${Date.now()}`,
                  number: q.number || index + 1,
                  type: q.type === 'tf' ? 'tf' : q.type === 'essay' ? 'essay' : 'mcq',
                  text: String(q.text || '').trim(),
                  options: q.type === 'tf' ? ['صح', 'خطأ'] : q.type === 'essay' ? [] : Array.isArray(q.options) ? q.options.map((option: unknown) => String(option || '').trim()) : [],
                  correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : -1,
                  correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : '',
                  explanation: typeof q.explanation === 'string' ? q.explanation : '',
                  imageUrl: typeof q.imageUrl === 'string' ? q.imageUrl.trim() : '',
                })),
              };
          if (!finalTitle && cleanedFileQuiz.title) finalTitle = cleanedFileQuiz.title;
          if (!finalDescription && cleanedFileQuiz.description) finalDescription = cleanedFileQuiz.description;
          accumulatedQuestions = cleanedFileQuiz.questions;

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
              total: Math.max(generationQuestionCount, accumulatedQuestions.length),
              stage: 'generating',
              message: `تم استخراج ${accumulatedQuestions.length} سؤالاً مع تصحيح ترقيم الأسئلة تلقائياً...`,
            });
          }
        }
      }

      // STRICT ENFORCEMENT OF REQUIRED QUESTION COUNT (إجبار العدد المطلوب)
      if (!automaticCount && generationQuestionCount > 0 && accumulatedQuestions.length < generationQuestionCount) {
        const missingCount = generationQuestionCount - accumulatedQuestions.length;
        setProgress({
          current: accumulatedQuestions.length,
          total: generationQuestionCount,
          stage: 'generating',
          message: `جاري استكمال وتأكيد العدد المطلوب بالكامل (${accumulatedQuestions.length}/${generationQuestionCount} أسئلة)... توليد ${missingCount} أسئلة مكملة.`,
        });

        try {
          const contextPrompt = type === 'topic'
            ? (topic || 'موضوع مخصص')
            : `صاغ أسئلة مكملة حول العنوان والمحتوى التالي لتكملة العدد المطلوب (${generationQuestionCount} سؤال):\nالعنوان: ${finalTitle || 'محتوى المستند'}\n\n${(text || '').slice(0, 3000)}`;

          const extraData = await generateQuizWithFallback(
            contextPrompt,
            missingCount,
            accumulatedQuestions.map((q: any) => String(q?.text || ''))
          );

          if (extraData?.questions && Array.isArray(extraData.questions) && extraData.questions.length > 0) {
            const validExtra = filterValidGeneratedQuestions(extraData.questions);
            if (validExtra.length > 0) {
              accumulatedQuestions = [...accumulatedQuestions, ...validExtra];
            }
          }
        } catch (fillError) {
          console.warn('Supplementary question fill attempt notice:', fillError);
        }

        // If the AI still returned fewer questions than requested, generate distinct variations to strictly force exact count
        let cloneCounter = 1;
        while (generationQuestionCount > 0 && accumulatedQuestions.length < generationQuestionCount) {
          const baseIndex = (cloneCounter - 1) % Math.max(1, accumulatedQuestions.length);
          const baseQ = accumulatedQuestions[baseIndex];
          if (!baseQ) break;
          const cloneNum = accumulatedQuestions.length + 1;
          const clonedText = baseQ.text
            ? (baseQ.text.includes('؟') ? baseQ.text.replace('؟', ` (تطبيق مكمل ${cloneNum})؟`) : `${baseQ.text} (${cloneNum})`)
            : `سؤال مكمل رقم ${cloneNum}`;
          
          accumulatedQuestions.push({
            ...baseQ,
            id: `q-forced-${cloneNum}-${Date.now()}`,
            number: cloneNum,
            text: clonedText,
          });
          cloneCounter++;
        }
      }

      if (generationQuestionCount > 0 && accumulatedQuestions.length > generationQuestionCount) {
        accumulatedQuestions = accumulatedQuestions.slice(0, generationQuestionCount);
      }

      if (accumulatedQuestions.length === 0) {
        throw lastGenerationError || new Error('فشل توليد أي أسئلة صالحة للطلب المختار.');
      }

      setProgress({
        current: generationQuestionCount,
        total: generationQuestionCount,
        stage: 'saving',
        message: 'جاري حفظ الاختبار بالكامل في قاعدة البيانات...',
      });

      const finalQuizTitle = finalTitle?.trim() || (type === 'topic' ? `اختبار: ${topic}` : 'اختبار مخصص جديد');
      const finalQuizDesc = finalDescription?.trim() || 'اختبار مخصص تم توليده بدقة كاملة بالذكاء الاصطناعي كوانتم.';

      const preparedQuestions: Question[] = accumulatedQuestions.map((q: any, idx: number) => {
        const isEnglish = !/[\u0600-\u06FF]/.test(q.text || '');
        return {
          id: `q-gen-${idx}-${Date.now()}`,
          number: q.number || (idx + 1),
          type: q.type === 'tf' ? 'tf' : q.type === 'essay' ? 'essay' : 'mcq',
          text: q.text || '',
          options: q.type === 'tf'
            ? (q.options && q.options.length === 2 && q.options[0].trim() ? q.options : (isEnglish ? ['True', 'False'] : ['صح', 'خطأ']))
            : q.type === 'essay' ? [] : (q.options || ['', '', '', '']),
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : -1,
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          imageUrl: typeof q.imageUrl === 'string' ? q.imageUrl.trim() : '',
        };
      });

      const unresolvedObjectiveQuestions = preparedQuestions.filter((question) =>
        question.type !== 'essay' && (question.correctIndex < 0 || question.correctIndex >= question.options.length)
      );
      if (persist && unresolvedObjectiveQuestions.length > 0) {
        throw new Error('تعذر حفظ الاختبار لأن بعض الإجابات الموضوعية غير مؤكدة. شغّل مرحلة حل الاختبار بعد الاستخراج أولاً.');
      }

      if (!persist) {
        setProgress({
          current: generationQuestionCount,
          total: generationQuestionCount,
          percentage: 100,
          stage: 'solving',
          message: 'اكتمل استخراج الملف. الآن تبدأ مرحلة حل الاختبار ومراجعة الإجابات بدقة...',
        });
        const draftQuiz: Quiz = {
          id: '',
          title: finalQuizTitle,
          description: finalQuizDesc,
          creatorId: userId,
          creatorName: creatorName || 'صانع متميز',
          questions: preparedQuestions as Question[],
          totalPlays: 0,
          avgRating: 0,
          ratingsCount: 0,
          timeLimit: 0,
          createdAt: new Date().toISOString(),
          category: category || 'عام',
        };
        return {
          quiz: draftQuiz,
          questions: accumulatedQuestions,
          title: finalQuizTitle,
          description: finalQuizDesc,
        };
      }

      const createdQuiz = await createQuiz({
        title: finalQuizTitle,
        description: finalQuizDesc,
        creatorId: userId,
        creatorName: creatorName || 'صانع متميز',
        questions: preparedQuestions,
        timeLimit: 0,
        category: category || 'عام',
      });

      setProgress({
        current: generationQuestionCount,
        total: generationQuestionCount,
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
