import { jsPDF } from 'jspdf';
import type { Question, Quiz } from '../types';
import { cairoArabicFonts } from './pdfFonts/cairoArabicFonts';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
const PAGE_BOTTOM = PAGE_HEIGHT - MARGIN;
const BODY_LINE_HEIGHT = 16;
const SECTION_GAP = 14;
const IMAGE_MAX_DIMENSION = 1200;
const IMAGE_QUALITY = 0.76;

type EmbeddedImage = {
  dataUrl: string;
  width: number;
  height: number;
};

type PdfDocument = jsPDF;

function registerArabicFont(pdf: PdfDocument) {
  pdf.addFileToVFS('Cairo-Regular.ttf', cairoArabicFonts.regular);
  pdf.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
  pdf.addFileToVFS('Cairo-Bold.ttf', cairoArabicFonts.bold);
  pdf.addFont('Cairo-Bold.ttf', 'Cairo', 'bold');
  pdf.setFont('Cairo', 'normal');
  pdf.setR2L(true);
}

function sanitizeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|\n\r]+/g, '_').replace(/\s+/g, '_').slice(0, 90) || 'quiz';
}

export function getQuizPdfFileName(quiz: Quiz) {
  return `اختبار_${sanitizeFilePart(quiz.title)}.pdf`;
}

function normaliseText(value: unknown) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

function getOptions(question: Question) {
  if (question.type === 'essay') return [];
  if (question.type === 'tf') return question.options?.length ? question.options : ['صح', 'خطأ'];
  return question.options || [];
}

function addPageHeader(pdf: PdfDocument, pageNumber: number) {
  pdf.setFont('Cairo', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Quiz Space  •  ${pageNumber}`, CONTENT_RIGHT, 24, {
    align: 'right',
    isInputRtl: true,
    isOutputRtl: true,
  });
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, 31, CONTENT_RIGHT, 31);
}

function addWrappedText(
  pdf: PdfDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  color: [number, number, number],
  lineHeight = Math.max(BODY_LINE_HEIGHT, fontSize * 1.45),
) {
  const lines = pdf.splitTextToSize(text || '—', width) as string[];
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...color);
  pdf.text(lines, x, y, {
    align: 'right',
    lineHeightFactor: lineHeight / fontSize,
    isInputRtl: true,
    isOutputRtl: true,
  });
  return y + Math.max(1, lines.length) * lineHeight;
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

export async function createQuizPdfDocument(quiz: Quiz): Promise<PdfDocument> {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });
  registerArabicFont(pdf);

  const imageMap = await loadQuestionImages(quiz.questions);
  let pageNumber = 1;
  let y = MARGIN + 22;

  const newPage = () => {
    pdf.addPage();
    pageNumber += 1;
    addPageHeader(pdf, pageNumber);
    y = MARGIN + 24;
  };

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_BOTTOM) newPage();
  };

  addPageHeader(pdf, pageNumber);
  pdf.setFont('Cairo', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(109, 40, 217);
  pdf.text('منصة Quiz Space', CONTENT_RIGHT, y, {
    align: 'right',
    isInputRtl: true,
    isOutputRtl: true,
  });
  y += 14;
  pdf.setFont('Cairo', 'normal');
  y = addWrappedText(pdf, 'ورقة أسئلة للاختبار — بدون حلول أو إجابات', CONTENT_RIGHT, y + 4, CONTENT_WIDTH, 10, [100, 116, 139], 14);
  pdf.setDrawColor(124, 58, 237);
  pdf.setLineWidth(1.5);
  pdf.line(MARGIN, y + 8, CONTENT_RIGHT, y + 8);
  y += 28;

  const title = normaliseText(quiz.title) || 'اختبار جديد';
  const description = normaliseText(quiz.description);
  const metadata = `عدد الأسئلة: ${quiz.questions.length}  |  الاسم: ____________________`;
  const titleLines = pdf.splitTextToSize(title, CONTENT_WIDTH - 28) as string[];
  const descriptionLines = description ? (pdf.splitTextToSize(description, CONTENT_WIDTH - 28) as string[]) : [];
  const infoHeight = 22 + titleLines.length * 24 + descriptionLines.length * 18 + 30;
  ensureSpace(infoHeight);

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, infoHeight, 8, 8, 'FD');
  pdf.setFont('Cairo', 'bold');
  pdf.setFontSize(17);
  pdf.setTextColor(15, 23, 42);
  pdf.text(titleLines, CONTENT_RIGHT - 14, y + 25, {
    align: 'right',
    lineHeightFactor: 1.45,
    isInputRtl: true,
    isOutputRtl: true,
  });
  let infoY = y + 25 + titleLines.length * 24;
  if (descriptionLines.length) {
    pdf.setFont('Cairo', 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(descriptionLines, CONTENT_RIGHT - 14, infoY, {
      align: 'right',
      lineHeightFactor: 1.55,
      isInputRtl: true,
      isOutputRtl: true,
    });
    infoY += descriptionLines.length * 18;
  }
  pdf.setFontSize(9.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(metadata, CONTENT_RIGHT - 14, infoY + 10, {
    align: 'right',
    isInputRtl: true,
    isOutputRtl: true,
  });
  y += infoHeight + SECTION_GAP;

  for (let index = 0; index < quiz.questions.length; index += 1) {
    const question = quiz.questions[index];
    const image = imageMap.get(question.id) || null;
    const questionText = `السؤال رقم ${index + 1}: ${normaliseText(question.text) || '—'}`;

    pdf.setFont('Cairo', 'bold');
    pdf.setFontSize(13);
    const questionLines = pdf.splitTextToSize(questionText, CONTENT_WIDTH - 28) as string[];
    const questionHeight = Math.max(34, questionLines.length * 19 + 22);
    const imageHeight = image ? Math.min(190, (image.height / image.width) * (CONTENT_WIDTH - 28)) + 18 : 0;
    const options = getOptions(question);
    let optionHeight = 78;
    if (question.type === 'essay') {
      optionHeight = 84;
    } else if (options.length) {
      pdf.setFont('Cairo', 'normal');
      pdf.setFontSize(10.5);
      const optionWidth = (CONTENT_WIDTH - 9) / 2 - 34;
      const rowHeights: number[] = [];
      for (let row = 0; row < Math.ceil(options.length / 2); row += 1) {
        const first = options[row * 2] || '';
        const second = options[row * 2 + 1] || '';
        const firstLines = pdf.splitTextToSize(normaliseText(first) || '—', optionWidth) as string[];
        const secondLines = pdf.splitTextToSize(normaliseText(second) || '—', optionWidth) as string[];
        rowHeights.push(Math.max(36, Math.max(firstLines.length, secondLines.length) * 15 + 18));
      }
      optionHeight = rowHeights.reduce((sum, value) => sum + value + 8, 0);
    }

    ensureSpace(questionHeight + imageHeight + optionHeight + 12);
    const cardTop = y;
    const cardHeight = questionHeight + imageHeight + optionHeight + 18;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(MARGIN, cardTop, CONTENT_WIDTH, cardHeight, 8, 8, 'FD');

    y = cardTop + 24;
    pdf.setFont('Cairo', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text(questionLines, CONTENT_RIGHT - 14, y, {
      align: 'right',
      lineHeightFactor: 1.45,
      isInputRtl: true,
      isOutputRtl: true,
    });
    y += questionLines.length * 19 + 8;

    if (image) {
      const displayWidth = Math.min(CONTENT_WIDTH - 28, 360);
      const displayHeight = Math.min(190, (image.height / image.width) * displayWidth);
      const imageX = CONTENT_RIGHT - 14 - displayWidth;
      pdf.addImage(image.dataUrl, 'JPEG', imageX, y, displayWidth, displayHeight, undefined, 'FAST');
      y += displayHeight + 12;
    }

    if (question.type === 'essay') {
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(MARGIN + 14, y, CONTENT_WIDTH - 28, 64, 6, 6, 'FD');
      pdf.setFont('Cairo', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('مساحة الإجابة:', CONTENT_RIGHT - 26, y + 20, {
        align: 'right',
        isInputRtl: true,
        isOutputRtl: true,
      });
      y += 74;
    } else {
      const optionWidth = (CONTENT_WIDTH - 9) / 2;
      const cellTextWidth = optionWidth - 34;
      const rowCount = Math.ceil(options.length / 2);
      pdf.setFont('Cairo', 'normal');
      pdf.setFontSize(10.5);
      for (let row = 0; row < rowCount; row += 1) {
        const cells = [options[row * 2], options[row * 2 + 1]].filter((value): value is string => typeof value === 'string');
        const cellLines = cells.map((value) => pdf.splitTextToSize(normaliseText(value) || '—', cellTextWidth) as string[]);
        const rowHeight = Math.max(36, Math.max(...cellLines.map((lines) => lines.length), 1) * 15 + 18);
        cells.forEach((value, cellIndex) => {
          const x = CONTENT_RIGHT - 14 - cellIndex * (optionWidth + 9) - optionWidth;
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(203, 213, 225);
          pdf.roundedRect(x, y, optionWidth, rowHeight, 6, 6, 'FD');
          pdf.setDrawColor(100, 116, 139);
          pdf.circle(x + optionWidth - 15, y + rowHeight / 2, 5.5, 'S');
          pdf.setTextColor(51, 65, 85);
          pdf.text(cellLines[cellIndex], x + optionWidth - 29, y + 17, {
            align: 'right',
            lineHeightFactor: 1.42,
            isInputRtl: true,
            isOutputRtl: true,
          });
        });
        y += rowHeight + 8;
      }
    }

    y = cardTop + cardHeight + SECTION_GAP;
  }

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

export async function downloadQuizPdf(quiz: Quiz) {
  const bytes = await createQuizPdfBytes(quiz);
  downloadQuizPdfBytes(bytes, getQuizPdfFileName(quiz));
}

export async function createQuizPdfBytes(quiz: Quiz) {
  const pdf = await createQuizPdfDocument(quiz);
  return new Uint8Array(pdf.output('arraybuffer'));
}
