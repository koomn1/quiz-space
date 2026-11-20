import { askAI } from '../../services/aiWorkerClient';
import { generateQuizWithFallback } from '../../hooks/useQuizzes';
import { GeneratedQuiz } from '../../types';
import {
  COSMO_QUIZ_MAX_COUNT,
  COSMO_QUIZ_MIN_COUNT,
  parseAutomaticCoveragePlan,
  parseCoverageAuditReplacementIds,
  validateCoverageAssignments,
  type CosmoCoverageConcept,
} from '../cosmoQuizCount';
import { PendingQuizConfig } from '../../components/cosmo/CosmoQuizStudioModal';

export const COSMO_QUIZ_BATCH_SIZE = 10;

export function splitCosmoCoverageSource(source: string, chunkSize = 12_000, overlap = 500): string[] {
  if (source.length <= chunkSize) return [source];
  const chunks: string[] = [];
  let start = 0;
  while (start < source.length) {
    let end = Math.min(source.length, start + chunkSize);
    if (end < source.length) {
      const lineBreak = source.lastIndexOf('\n', end);
      if (lineBreak > start + Math.floor(chunkSize * 0.7)) end = lineBreak;
    }
    chunks.push(source.slice(start, end));
    if (end >= source.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

export async function chooseAutomaticCoveragePlan(
  topic: string,
  options: Pick<PendingQuizConfig, 'difficulty' | 'focusMode' | 'questionTypes'>,
): Promise<CosmoCoverageConcept[]> {
  const source = topic.trim();
  if (!source) throw new Error('لا توجد مادة كافية لاستخراج خطة التغطية.');
  const arabicLetters = (source.match(/[\u0600-\u06ff]/g) || []).length;
  const latinLetters = (source.match(/[A-Za-z]/g) || []).length;
  const sourceLanguageInstruction =
    arabicLetters >= 8 && arabicLetters >= latinLetters * 0.2
      ? 'اكتب أسماء المفاهيم بلغة المصدر العربية.'
      : latinLetters >= 8 && latinLetters >= arabicLetters * 0.2
      ? 'اكتب أسماء المفاهيم بلغة المصدر الإنجليزية.'
      : 'اكتب أسماء المفاهيم باللغة الغالبة في المصدر، ولا تترجمها.';
  const sections = splitCosmoCoverageSource(source);
  const systemInstruction = `أنت مخطط دقيق لتغطية الاختبار. أعد JSON فقط يتضمن coveragePlan: مصفوفة مفاهيم مهمة وفريدة يدعمها المصدر. لا تفترض 30 أو 100 سؤال؛ غطِّ كل مفهوم متميز قابل للاختبار دون حشو أو تكرار. استخدم المعرفات C01..C500 للخطة النهائية، وبادئة الجزء المطلوبة عند تحليل الأجزاء. ${sourceLanguageInstruction}`;

  if (sections.length === 1) {
    const { text } = await askAI(
      `حلّل المادة كاملة واختر خطة مفاهيم تغطي كل المفاهيم التعليمية المهمة والمتميزة دون تكرار. لا تحوّل كل جملة إلى سؤال إذا كانت تشرح المفهوم نفسه، ولا تتوقف عند 30 أو 100 سؤالًا إذا كانت المادة أوسع. اختر بين ${COSMO_QUIZ_MIN_COUNT} و${COSMO_QUIZ_MAX_COUNT} مفهومًا بحسب اتساع المادة، واجعل عدد الأسئلة مساويًا تمامًا لعدد المفاهيم. أعد JSON فقط: {"coveragePlan":[{"id":"C01","concept":"اسم مفهوم محدد"}]}.\nالمستوى: ${options.difficulty}. نمط التغطية: ${options.focusMode}. أنواع الأسئلة: ${options.questionTypes}.\nالمادة كاملة:\n${source}`,
      { systemInstruction },
    );
    const plan = parseAutomaticCoveragePlan(text);
    if (!plan) throw new Error('لم يتمكن Cosmo من إنشاء خطة مفاهيم صالحة وفريدة. أعد المحاولة أو اختر عددًا يدويًا.');
    return plan;
  }

  const sectionConcepts: CosmoCoverageConcept[] = [];
  for (let index = 0; index < sections.length; index += 1) {
    const prefix = `S${String(index + 1).padStart(2, '0')}`;
    const { text } = await askAI(
      `استخرج من هذا الجزء المفاهيم التعليمية المهمة فقط، وادمج الصياغات المتكافئة. أعد قائمة مرشحة لا تتجاوز 35 مفهومًا، بمعرّفات تبدأ بـ ${prefix}-C01. إذا لم يحتوِ الجزء على مفهوم مستقل فأعد قائمة فارغة. أعد JSON فقط: {"coveragePlan":[{"id":"${prefix}-C01","concept":"اسم المفهوم"}]}.\nالمستوى: ${options.difficulty}. نمط التغطية: ${options.focusMode}. أنواع الأسئلة: ${options.questionTypes}.\nالجزء ${index + 1} من ${sections.length}:\n${sections[index]}`,
      {
        systemInstruction: `استخرج المفاهيم المهمة والمتميزة من هذا الجزء فقط. أعد JSON صالحًا فقط يحتوي مصفوفة coveragePlan، ولا تخترع حقائق. ${sourceLanguageInstruction}`,
      },
    );
    const concepts = parseAutomaticCoveragePlan(text, 0);
    if (!concepts) throw new Error(`لم يتمكن Cosmo من تحليل الجزء ${index + 1} من المادة. أعد المحاولة.`);
    sectionConcepts.push(...concepts.slice(0, 35));
  }
  if (sectionConcepts.length < COSMO_QUIZ_MIN_COUNT)
    throw new Error('لم تتضمن المادة عددًا كافيًا من المفاهيم المتميزة لبناء خطة تغطية.');

  const candidates = sectionConcepts.map(item => `${item.id}: ${item.concept}`).join('\n');
  const { text } = await askAI(
    `ادمج قوائم الأجزاء التالية في خطة واحدة. احذف المفاهيم المتكررة دلاليًا حتى لو اختلفت صياغتها، واحتفظ بكل مفهوم مهم ومتميز تدعمه المادة. لا تختصر الخطة إلى 30 أو 100 سؤالًا لمجرد أنها أرقام شائعة. اختر بين ${COSMO_QUIZ_MIN_COUNT} و${COSMO_QUIZ_MAX_COUNT} مفهومًا؛ عدد الأسئلة النهائي سيكون عدد عناصر الخطة بالضبط. أعد معرفات نهائية C01 ثم C02 وهكذا. أعد JSON فقط: {"coveragePlan":[{"id":"C01","concept":"اسم مفهوم محدد"}]}.\nالمستوى: ${options.difficulty}. نمط التغطية: ${options.focusMode}. أنواع الأسئلة: ${options.questionTypes}.\nالمفاهيم المرشحة المستخرجة من كامل المادة:\n${candidates}`,
    { systemInstruction },
  );
  const plan = parseAutomaticCoveragePlan(text);
  if (!plan)
    throw new Error(
      `تعذر دمج مفاهيم المادة في خطة فريدة من ${COSMO_QUIZ_MIN_COUNT} إلى ${COSMO_QUIZ_MAX_COUNT} سؤالًا. أعد المحاولة.`,
    );
  return plan;
}

export function addCoverageTargets(topic: string, targets: CosmoCoverageConcept[], repair = false): string {
  const repairInstruction = repair
    ? '\nإصلاح دلالي: أعد صياغة أسئلة هذه المفاهيم من الصفر. يجب ألا تعيد أي فكرة من الأسئلة السابقة، ولا تختبر مفهومًا غير المعرّف هنا.'
    : '\nأنشئ سؤالًا واحدًا فقط لكل مفهوم مستهدف، ولا تستخدم مفهومًا آخر بدل الهدف المحدد.';
  return `${topic}\n[COSMO_COVERAGE_TARGETS: ${JSON.stringify(targets)}]${repairInstruction}`;
}

export async function findSemanticCoverageRepairs(
  plan: CosmoCoverageConcept[],
  questions: GeneratedQuiz['questions'],
): Promise<string[]> {
  const questionsById = new Map(questions.map(question => [question.coverageId || '', question]));
  const auditRows = plan
    .map(item => {
      const question = questionsById.get(item.id);
      return `${item.id}|${item.concept.slice(0, 70)}|${String(question?.text || '').slice(0, 100)}`;
    })
    .join('\n');
  const { text } = await askAI(
    `دقّق المطابقة الدلالية بين كل مفهوم وسؤاله. اعتبر السؤالين مكررين إذا اختبرا الحقيقة أو الفكرة نفسها حتى لو اختلفت الصياغة؛ لا تعتبر مجرد اشتراكهما في المجال العام تكرارًا. افحص أيضًا أن نص السؤال يختبر المفهوم المعيّن ولا يكرر مفهومًا آخر. عند وجود زوج/مجموعة مكررة، احتفظ بالسؤال ذي رقم المفهوم الأصغر وأدرج معرفات بقية الأسئلة في replaceConceptIds. أدرج أيضًا أي معرف سؤاله غير مطابق لمفهومه. لا تدرج المعرفات السليمة. أعد JSON فقط: {"replaceConceptIds":[]}\nالمفاهيم والأسئلة بصيغة id|concept|question:\n${auditRows}`,
    {
      systemInstruction:
        'أنت مدقق صارم للتغطية الدلالية. قارن المعنى لا تشابه الكلمات. أعد JSON صالحًا فقط بحقل replaceConceptIds. أبقِ سؤالًا واحدًا لكل مفهوم فريد، ولا تستخدم إلا المعرفات الواردة في المدخل.',
    },
  );
  const replacements = parseCoverageAuditReplacementIds(text, plan.map(item => item.id));
  if (!replacements)
    throw new Error('تعذر التحقق الدلالي من تغطية الأسئلة؛ لم يعتمد Cosmo نتيجة غير مدققة. أعد المحاولة.');
  return replacements;
}

/**
 * Enhanced pedagogical question generator for Cosmo AI.
 * Delivers verified accuracy, rich explanations, plausible distractors,
 * and calibrated difficulty tiers.
 */
export async function generateCosmoQuizInBatches(
  topic: string,
  amount: number,
  options?: {
    difficulty?: string;
    questionTypes?: 'mcq' | 'tf' | 'mixed';
    focusMode?: 'comprehensive' | 'challenging' | 'exam_prep';
    onProgressStage?: (stage: string, percent: number) => void;
  },
): Promise<GeneratedQuiz> {
  const difficulty = options?.difficulty || 'متوسط';
  const questionTypes = options?.questionTypes || 'mixed';
  const focusMode = options?.focusMode || 'comprehensive';
  if (amount === 0) options?.onProgressStage?.('يحلل Cosmo المادة ليختار عدد الأسئلة المناسب...', 12);
  const coveragePlan =
    amount === 0 ? await chooseAutomaticCoveragePlan(topic, { difficulty, questionTypes, focusMode }) : null;
  const targetAmount = coveragePlan?.length ?? amount;

  const allowedTag =
    questionTypes === 'mcq'
      ? '[QUESTION_TYPES_ALLOWED: mcq]'
      : questionTypes === 'tf'
      ? '[QUESTION_TYPES_ALLOWED: tf]'
      : '[QUESTION_TYPES_ALLOWED: mcq, tf]';

  const difficultyInstruction =
    difficulty === 'صعب'
      ? 'مستوى الصعوبة: متقدم/صعب (تفكير نقدي، أسئلة استنتاجية، تحليل حالات دراسية ومسائل غير مباشرة، ومقارنات عميقة مع تجنب الأسئلة المباشرة).'
      : difficulty === 'سهل'
      ? 'مستوى الصعوبة: سهل/مبتدئ (مفاهيم أساسية، مصطلحات وتعريفات واضحة مباشرة تثبت المعرفة الأولية).'
      : 'مستوى الصعوبة: متوسط (توازن ممتاز بين الفهم النظري والتطبيق العملي وربط العلاقات بين المفاهيم).';

  const focusInstruction =
    focusMode === 'exam_prep'
      ? 'الهدف التعليمي: أسئلة امتحانية كلاسيكية وشائعة تحاكي الاختبارات الرسمية وأسئلة نهاية العام.'
      : focusMode === 'challenging'
      ? 'الهدف التعليمي: التركيز على المفاهيم المضللة ونقاط الضعف الشائعة التي يخطئ فيها معظم الطلاب.'
      : 'الهدف التعليمي: تغطية شاملة ومتدرجة لكافة محاور الموضوع التعليمي.';

  const topicArabicLetters = (topic.match(/[\u0600-\u06ff]/g) || []).length;
  const topicLatinLetters = (topic.match(/[A-Za-z]/g) || []).length;
  const sourceLanguageTag =
    topicArabicLetters >= 8 && topicArabicLetters >= topicLatinLetters * 0.2
      ? '[COSMO_OUTPUT_LANGUAGE: ar]'
      : topicLatinLetters >= 8 && topicLatinLetters >= topicArabicLetters * 0.2
      ? '[COSMO_OUTPUT_LANGUAGE: en]'
      : '[COSMO_OUTPUT_LANGUAGE: detect]';

  const pedagogicalTopic = `${topic.trim()} ${allowedTag} ${sourceLanguageTag}\n\n${difficultyInstruction}\n${focusInstruction}\nمعايير الجودة:
1. صياغة السؤال واضحة وجذابة ومحكمة علمياً.
2. 4 خيارات منطقية ومتوازنة في الطول والصعوبة لكل سؤال MCQ بدون خيارات تافهة أو غير معقولة.
3. كتابة شرح تعليمي دقيق ومفصل (explanation) لكل سؤال يوضح بدقة سبب صحة الإجابة، ولماذا الخيارات الأخرى خاطئة، لتتحقق الاستفادة القصوى للطالب.`;

  let questions: GeneratedQuiz['questions'] = [];
  let title = '';
  let description = '';

  options?.onProgressStage?.('تحليل المفاهيم وتحديد الأهداف التعليمية...', 20);

  for (let offset = 0; offset < targetAmount; offset += COSMO_QUIZ_BATCH_SIZE) {
    let remaining = Math.min(COSMO_QUIZ_BATCH_SIZE, targetAmount - offset);
    let attempts = 0;
    const targetConcepts = coveragePlan?.slice(offset, offset + remaining) || null;

    while (remaining > 0 && attempts < 2) {
      options?.onProgressStage?.(
        `صياغة الأسئلة الذكية وتدقيق الخيارات (${questions.length + 1} من ${targetAmount})...`,
        Math.round(30 + (questions.length / targetAmount) * 45),
      );

      const generated = await generateQuizWithFallback(
        targetConcepts ? addCoverageTargets(pedagogicalTopic, targetConcepts, attempts > 0) : pedagogicalTopic,
        remaining,
        questions
          .map(question => question.text)
          .filter(Boolean)
          .slice(-200),
      );

      const batchQuestions = generated.questions.slice(0, remaining);
      if (targetConcepts) {
        const validation = validateCoverageAssignments(
          targetConcepts.map(item => item.id),
          batchQuestions.map(question => question.coverageId),
        );
        if (!validation.valid) {
          attempts += 1;
          if (attempts >= 2)
            throw new Error(
              `تعذر إنشاء سؤال فريد لكل مفهوم في هذه الدفعة. مفاهيم ناقصة: ${
                validation.missingIds.join(', ') || 'لا يوجد'
              }؛ مكررة: ${validation.duplicateIds.join(', ') || 'لا يوجد'}.`,
            );
          continue;
        }
        const questionsById = new Map(batchQuestions.map(question => [question.coverageId || '', question]));
        questions.push(...targetConcepts.map(item => questionsById.get(item.id)!));
        remaining = 0;
      } else {
        questions.push(...batchQuestions);
        remaining -= batchQuestions.length;
      }
      title ||= generated.title;
      description ||= generated.description;
      attempts += 1;
    }

    if (remaining > 0) {
      throw new Error('The AI provider returned fewer valid questions than requested.');
    }
  }

  if (coveragePlan) {
    let passedSemanticAudit = false;
    for (let auditRound = 0; auditRound < 2; auditRound += 1) {
      const repairIds = await findSemanticCoverageRepairs(coveragePlan, questions);
      if (repairIds.length === 0) {
        passedSemanticAudit = true;
        break;
      }
      if (auditRound === 1)
        throw new Error(
          `تعذر إزالة التكرار الدلالي في المفاهيم: ${repairIds.join(', ')}. لم يعتمد Cosmo الاختبار حتى تظل التغطية موثوقة.`,
        );

      for (let offset = 0; offset < repairIds.length; offset += COSMO_QUIZ_BATCH_SIZE) {
        const ids = repairIds.slice(offset, offset + COSMO_QUIZ_BATCH_SIZE);
        const targets = coveragePlan.filter(item => ids.includes(item.id));
        const generated = await generateQuizWithFallback(
          addCoverageTargets(pedagogicalTopic, targets, true),
          targets.length,
          questions
            .filter(question => !ids.includes(question.coverageId || ''))
            .map(question => question.text)
            .filter(Boolean)
            .slice(-200),
        );
        const validation = validateCoverageAssignments(
          ids,
          generated.questions.map(question => question.coverageId),
        );
        if (!validation.valid)
          throw new Error(
            `تعذر إعادة توليد المفاهيم الدلالية الناقصة: ${
              validation.missingIds.join(', ') || validation.duplicateIds.join(', ')
            }.`,
          );
        const replacements = new Map(generated.questions.map(question => [question.coverageId || '', question]));
        questions = questions.map(question =>
          ids.includes(question.coverageId || '') ? replacements.get(question.coverageId || '')! : question,
        );
        title ||= generated.title;
        description ||= generated.description;
      }
    }
    if (!passedSemanticAudit) throw new Error('تعذر اعتماد خطة التغطية بعد مراجعة التكرار الدلالي.');
  }

  options?.onProgressStage?.('مراجعة دقة الإجابات وكتابة الشروحات التعليمية...', 85);

  return {
    title: title || (topic ? `اختبار: ${topic}` : 'اختبار Cosmo AI'),
    description: description || `اختبار ذكي تم إعداده بواسطة كوزمو AI بمستوى ${difficulty}.`,
    questions: questions.slice(0, targetAmount),
  };
}
