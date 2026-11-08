import { jsPDF } from 'jspdf';
import type { Question, Quiz } from '../types';
import { cairoArabicFonts } from './pdfFonts/cairoArabicFonts';

const MARGIN = 36;
function pageWidth(pdf: PdfDocument) { return pdf.internal.pageSize.getWidth(); }
function pageHeight(pdf: PdfDocument) { return pdf.internal.pageSize.getHeight(); }
function contentWidth(pdf: PdfDocument) { return pageWidth(pdf) - MARGIN * 2; }
function contentRight(pdf: PdfDocument) { return pageWidth(pdf) - MARGIN; }
function pageBottom(pdf: PdfDocument) { return pageHeight(pdf) - 45; }
const SECTION_GAP = 14;
const IMAGE_MAX_DIMENSION = 1200;
const IMAGE_QUALITY = 0.76;

type EmbeddedImage = {
  dataUrl: string;
  width: number;
  height: number;
};

type PdfDocument = jsPDF;

export interface QuizPdfBranding {
  institutionName: string;
  pdfTitle?: string | null;
  pdfDescription?: string | null;
  primaryColor?: string | null;
  studentName?: string | null;
  examDate?: string | null;
  score?: number | null;
  /** Answer writing area in PDF points. Clamped to 56–320 for page safety. */
  essayAnswerHeight?: number | null;
  pageFormat?: 'a4' | 'letter' | null;
  orientation?: 'portrait' | 'landscape' | null;
  showAnswers?: boolean | null;
}

const OPTION_PREFIXES_AR = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'];

function registerArabicFont(pdf: PdfDocument) {
  pdf.addFileToVFS('Cairo-Regular.ttf', cairoArabicFonts.regular);
  pdf.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
  pdf.addFileToVFS('Cairo-Bold.ttf', cairoArabicFonts.bold);
  pdf.addFont('Cairo-Bold.ttf', 'Cairo', 'bold');
  pdf.setFont('Cairo', 'normal');
  // Keep jsPDF's visual RTL mode enabled: Android/Samsung PDF readers expect
  // the Arabic glyph stream in this order and otherwise render it backwards.
  pdf.setR2L(true);
}

function sanitizeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|\n\r]+/g, '_').replace(/\s+/g, '_').slice(0, 90) || 'quiz';
}

export function getQuizPdfFileName(quiz: Quiz, branding?: QuizPdfBranding | null) {
  const prefix = branding?.institutionName ? sanitizeFilePart(branding.institutionName) : 'اختبار';
  return `${prefix}_${sanitizeFilePart(branding?.pdfTitle || quiz.title)}.pdf`;
}

function normaliseText(value: unknown) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

function getOptions(question: Question) {
  if (question.type === 'essay') return [];
  if (question.type === 'tf') {
    if (question.options?.length) return question.options;
    return /[A-Za-z]/.test(question.text) && !/[\u0600-\u06ff]/u.test(question.text) ? ['True', 'False'] : ['صح', 'خطأ'];
  }
  return question.options || [];
}

function getBrandColor(branding?: QuizPdfBranding | null): [number, number, number] {
  const value = branding?.primaryColor;
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) return [109, 40, 217]; // #6d28d9
  return [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
}

function getEssayAnswerHeight(branding?: QuizPdfBranding | null) {
  const requested = Number(branding?.essayAnswerHeight);
  if (!Number.isFinite(requested)) return 120;
  return Math.min(320, Math.max(56, Math.round(requested)));
}

function addPageHeader(pdf: PdfDocument, pageNumber: number, branding?: QuizPdfBranding | null) {
  pdf.setFont('Cairo', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(148, 163, 184); // slate-400
  const publisher = branding?.institutionName || 'Quiz Space — نموذج اختبار رسمي';
  pdf.text(publisher, contentRight(pdf), 22, {
    align: 'right',
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });
  pdf.setDrawColor(241, 245, 249);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, 28, contentRight(pdf), 28);
}

function addPageFooters(pdf: PdfDocument, totalPages: number) {
  for (let i = 1; i <= totalPages; i += 1) {
    pdf.setPage(i);
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.6);
    pdf.line(MARGIN, pageHeight(pdf) - 28, contentRight(pdf), pageHeight(pdf) - 28);
    
    pdf.setFont('Cairo', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(148, 163, 184);
    
    // Left: Platform tag
    pdf.text('تم إنشاؤه بواسطة Quiz Space', MARGIN, pageHeight(pdf) - 16, {
      align: 'left',
      isInputVisual: true,
      isInputRtl: true,
      isOutputRtl: true,
    });

    // Right: Page counter
    pdf.text(`صفحة ${i} من ${totalPages}`, contentRight(pdf), pageHeight(pdf) - 16, {
      align: 'right',
      isInputVisual: true,
      isInputRtl: true,
      isOutputRtl: true,
    });
  }
}

async function imageToJpeg(imageUrl: string): Promise<EmbeddedImage | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = objectUrl;
      await image.decode();

      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      if (!sourceWidth || !sourceHeight) return null;

      const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      return {
        dataUrl: canvas.toDataURL('image/jpeg', IMAGE_QUALITY),
        width,
        height,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    console.warn('Quiz PDF image could not be embedded:', error);
    return null;
  }
}

async function loadQuestionImages(questions: Question[]) {
  const entries = await Promise.all(
    questions.map(async (question) => {
      if (!question.imageUrl) return [question.id, null] as const;
      return [question.id, await imageToJpeg(question.imageUrl)] as const;
    }),
  );
  return new Map(entries);
}

export async function createQuizPdfDocument(quiz: Quiz, branding?: QuizPdfBranding | null): Promise<PdfDocument> {
  const pdf = new jsPDF({
    orientation: branding?.orientation === 'landscape' ? 'l' : 'p',
    unit: 'pt',
    format: branding?.pageFormat === 'letter' ? 'letter' : 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });
  registerArabicFont(pdf);

  const imageMap = await loadQuestionImages(quiz.questions);
  let pageNumber = 1;
  let y = MARGIN + 10;

  const newPage = () => {
    pdf.addPage();
    pageNumber += 1;
    addPageHeader(pdf, pageNumber, branding);
    y = MARGIN + 12;
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageBottom(pdf)) newPage();
  };

  const brandColor = getBrandColor(branding);
  const essayAnswerHeight = getEssayAnswerHeight(branding);
  const showAnswers = branding?.showAnswers === true;
  addPageHeader(pdf, pageNumber, branding);

  // Institution Banner / Title Header
  pdf.setFont('Cairo', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...brandColor);
  pdf.text(branding?.institutionName || 'منصة Quiz Space التعليمية', contentRight(pdf), y + 14, {
    align: 'right',
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });
  y += 24;

  pdf.setFont('Cairo', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(branding?.institutionName ? 'ورقة أسئلة نموذجية وموثقة' : 'ورقة أسئلة واختبار تفاعلي — بدون إجابات', contentRight(pdf), y, {
    align: 'right',
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });

  pdf.setDrawColor(...brandColor);
  pdf.setLineWidth(1.8);
  pdf.line(MARGIN, y + 8, contentRight(pdf), y + 8);
  y += 24;

  // Quiz Header Box
  const title = normaliseText(branding?.pdfTitle || quiz.title) || 'اختبار تقييمي';
  const description = normaliseText(branding?.pdfDescription ?? quiz.description);
  const studentLabel = branding?.studentName?.trim() || '____________________________';
  const examDate = branding?.examDate?.trim() || '____________________________';
  const scoreLabel = typeof branding?.score === 'number' ? `${branding.score} / ${quiz.questions.length}` : '____ / ' + quiz.questions.length;
  
  const titleLines = pdf.splitTextToSize(title, contentWidth(pdf) - 24) as string[];
  const descriptionLines = description ? (pdf.splitTextToSize(description, contentWidth(pdf) - 24) as string[]) : [];
  const infoHeight = 36 + titleLines.length * 22 + descriptionLines.length * 16 + 58;
  ensureSpace(infoHeight);

  // Styled Container Box for Quiz Details & Student Metadata
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.setLineWidth(0.8);
  pdf.roundedRect(MARGIN, y, contentWidth(pdf), infoHeight, 8, 8, 'FD');

  // Decorative Accent Strip on Left of Title Box
  pdf.setFillColor(...brandColor);
  pdf.roundedRect(MARGIN, y, 5, infoHeight, 2, 2, 'F');

  pdf.setFont('Cairo', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text(titleLines, contentRight(pdf) - 14, y + 22, {
    align: 'right',
    lineHeightFactor: 1.4,
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });

  let infoY = y + 22 + titleLines.length * 22;
  if (descriptionLines.length) {
    pdf.setFont('Cairo', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(descriptionLines, contentRight(pdf) - 14, infoY, {
      align: 'right',
      lineHeightFactor: 1.5,
      isInputVisual: true,
      isInputRtl: true,
      isOutputRtl: true,
    });
    infoY += descriptionLines.length * 16;
  }

  // Metadata separator line
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN + 14, infoY + 6, contentRight(pdf) - 14, infoY + 6);

  // Metadata fields: labels are above the writing lines so students can fill
  // them in by hand without the label being trapped inside the blank.
  pdf.setFont('Cairo', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text('اسم الطالب', contentRight(pdf) - 14, infoY + 20, {
    align: 'right',
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });

  pdf.setFont('Cairo', 'normal');
  pdf.setFontSize(9.5);
  pdf.text(studentLabel, contentRight(pdf) - 14, infoY + 38, {
    align: 'right',
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });

  pdf.setFont('Cairo', 'bold');
  pdf.text(`الدرجة: ${scoreLabel}`, MARGIN + 20, infoY + 30, {
    align: 'right',
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });

  pdf.text(`التاريخ: ${examDate}`, MARGIN + 150, infoY + 30, {
    align: 'left',
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });

  pdf.text(`عدد الأسئلة: ${quiz.questions.length}`, MARGIN + 310, infoY + 30, {
    align: 'right',
    isInputVisual: true,
    isInputRtl: true,
    isOutputRtl: true,
  });

  y += infoHeight + SECTION_GAP + 4;

  // Render Questions
  for (let index = 0; index < quiz.questions.length; index += 1) {
    const question = quiz.questions[index];
    const image = imageMap.get(question.id) || null;
    const questionText = normaliseText(question.text) || 'بدون نص';

    pdf.setFont('Cairo', 'bold');
    pdf.setFontSize(11.5);
    const questionLines = pdf.splitTextToSize(questionText, contentWidth(pdf) - 32) as string[];
    const questionTextHeight = questionLines.length * 18;
    const imageHeight = image ? Math.min(180, (image.height / image.width) * (contentWidth(pdf) - 32)) + 16 : 0;
    const options = getOptions(question);

    let optionHeight = 0;
    if (question.type === 'essay') {
      optionHeight = essayAnswerHeight + 16;
    } else if (options.length) {
      pdf.setFont('Cairo', 'normal');
      pdf.setFontSize(10);
      const optionWidth = (contentWidth(pdf) - 18) / 2 - 32;
      const rowHeights: number[] = [];
      for (let row = 0; row < Math.ceil(options.length / 2); row += 1) {
        const first = options[row * 2] || '';
        const second = options[row * 2 + 1] || '';
        const firstLines = pdf.splitTextToSize(normaliseText(first) || '—', optionWidth) as string[];
        const secondLines = pdf.splitTextToSize(normaliseText(second) || '—', optionWidth) as string[];
        rowHeights.push(Math.max(32, Math.max(firstLines.length, secondLines.length) * 14 + 14));
      }
      optionHeight = rowHeights.reduce((sum, value) => sum + value + 6, 0);
    }
    const correctAnswer = question.type === 'essay'
      ? normaliseText(question.correctAnswer || '')
      : normaliseText(options[question.correctIndex] || '');
    const answerHeight = showAnswers ? 24 : 0;

    const headerHeight = 26;
    const totalCardHeight = headerHeight + 12 + questionTextHeight + imageHeight + optionHeight + answerHeight + 18;

    // Check space before drawing card
    ensureSpace(totalCardHeight);

    const cardTop = y;

    // Main Card Outer Background & Border
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(MARGIN, cardTop, contentWidth(pdf), totalCardHeight, 8, 8, 'FD');

    // Header Pill Bar
    pdf.setFillColor(...brandColor);
    pdf.roundedRect(MARGIN, cardTop, contentWidth(pdf), headerHeight, 8, 8, 'F');
    pdf.rect(MARGIN, cardTop + headerHeight - 8, contentWidth(pdf), 8, 'F'); // square bottom corners of header fill

    // Question Number Label
    pdf.setFont('Cairo', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`السؤال ${index + 1} من ${quiz.questions.length}`, contentRight(pdf) - 12, cardTop + 17, {
      align: 'right',
      isInputVisual: true,
      isInputRtl: true,
      isOutputRtl: true,
    });

    // Optional Question Points/Type Tag
    const typeTag = question.type === 'essay' ? 'سؤال مقالي' : question.type === 'tf' ? 'صح / خطأ' : 'اختيار من متعدد';
    pdf.setFont('Cairo', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(238, 242, 255);
    pdf.text(typeTag, MARGIN + 12, cardTop + 17, {
      align: 'left',
      isInputVisual: true,
      isInputRtl: true,
      isOutputRtl: true,
    });

    // Question Body Text
    y = cardTop + headerHeight + 16;
    pdf.setFont('Cairo', 'bold');
    pdf.setFontSize(11.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(questionLines, contentRight(pdf) - 14, y, {
      align: 'right',
      lineHeightFactor: 1.45,
      isInputVisual: true,
      isInputRtl: true,
      isOutputRtl: true,
    });
    y += questionTextHeight + 10;

    // Question Image if available
    if (image) {
      const displayWidth = Math.min(contentWidth(pdf) - 32, 340);
      const displayHeight = Math.min(180, (image.height / image.width) * displayWidth);
      const imageX = contentRight(pdf) - 14 - displayWidth;
      pdf.addImage(image.dataUrl, 'JPEG', imageX, y, displayWidth, displayHeight, undefined, 'FAST');
      y += displayHeight + 12;
    }

    // Options or Essay Box
    if (question.type === 'essay') {
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(MARGIN + 12, y, contentWidth(pdf) - 24, essayAnswerHeight, 6, 6, 'FD');
      pdf.setFont('Cairo', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text('إجابة الطالب:', contentRight(pdf) - 24, y + 18, {
        align: 'right',
        isInputVisual: true,
        isInputRtl: true,
        isOutputRtl: true,
      });
      y += essayAnswerHeight + 10;
    } else {
      const optionWidth = (contentWidth(pdf) - 18) / 2;
      const cellTextWidth = optionWidth - 36;
      const rowCount = Math.ceil(options.length / 2);
      pdf.setFont('Cairo', 'normal');
      pdf.setFontSize(10);

      for (let row = 0; row < rowCount; row += 1) {
        const cells = [options[row * 2], options[row * 2 + 1]].filter((value): value is string => typeof value === 'string');
        const cellLines = cells.map((value) => pdf.splitTextToSize(normaliseText(value) || '—', cellTextWidth) as string[]);
        const rowHeight = Math.max(32, Math.max(...cellLines.map((lines) => lines.length), 1) * 14 + 14);

        cells.forEach((value, cellIndex) => {
          const optIndex = row * 2 + cellIndex;
          const prefix = OPTION_PREFIXES_AR[optIndex] || `${optIndex + 1}`;
          const x = contentRight(pdf) - 12 - cellIndex * (optionWidth + 6) - optionWidth;

          // Option Box Background
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(x, y, optionWidth, rowHeight, 6, 6, 'FD');

          // Option Letter Badge Circle
          pdf.setFillColor(238, 242, 255);
          pdf.setDrawColor(...brandColor);
          pdf.setLineWidth(0.6);
          pdf.circle(x + optionWidth - 14, y + rowHeight / 2, 8, 'FD');

          pdf.setFont('Cairo', 'bold');
          pdf.setFontSize(8.5);
          pdf.setTextColor(...brandColor);
          pdf.text(prefix, x + optionWidth - 14, y + rowHeight / 2 + 3, {
            align: 'center',
            isInputVisual: true,
            isInputRtl: true,
            isOutputRtl: true,
          });

          // Option Text
          pdf.setFont('Cairo', 'normal');
          pdf.setFontSize(9.5);
          pdf.setTextColor(51, 65, 85);
          pdf.text(cellLines[cellIndex], x + optionWidth - 28, y + 15, {
            align: 'right',
            lineHeightFactor: 1.4,
            isInputVisual: true,
            isInputRtl: true,
            isOutputRtl: true,
          });
        });
        y += rowHeight + 6;
      }
    }
    if (showAnswers) {
      pdf.setFont('Cairo', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...brandColor);
      pdf.text(`الإجابة الصحيحة: ${correctAnswer || '—'}`, contentRight(pdf) - 14, y + 12, {
        align: 'right',
        isInputVisual: true,
        isInputRtl: true,
        isOutputRtl: true,
      });
      y += answerHeight;
    }

    y = cardTop + totalCardHeight + SECTION_GAP;
  }

  // Add Footers across all generated pages
  addPageFooters(pdf, pageNumber);

  return pdf;
}

export function downloadQuizPdfBytes(bytes: Uint8Array, fileName: string) {
  const pdfBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(pdfBuffer).set(bytes);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadQuizPdf(quiz: Quiz, branding?: QuizPdfBranding | null) {
  const bytes = await createQuizPdfBytes(quiz, branding);
  downloadQuizPdfBytes(bytes, getQuizPdfFileName(quiz, branding));
}

export async function createQuizPdfBytes(quiz: Quiz, branding?: QuizPdfBranding | null) {
  const pdf = await createQuizPdfDocument(quiz, branding);
  return new Uint8Array(pdf.output('arraybuffer'));
}
