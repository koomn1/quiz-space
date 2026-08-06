import * as pdfjsLib from 'pdfjs-dist';
// Vite-native way to point pdf.js at its worker bundle without needing a
// separate copy-to-public-folder step.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export interface PdfPageImage {
  pageNumber: number;
  /** Base64-encoded JPEG data, without the "data:image/jpeg;base64," prefix. */
  base64: string;
}

/**
 * Renders every page of a PDF to its own JPEG image. Each page is then sent
 * to the AI as an independent request (see useQuizGenerator's file_direct
 * branch) — one dedicated pass per page means the model never has to skim
 * or summarize across dozens of pages in a single giant call, which is what
 * was causing questions on later pages to get dropped or merged together.
 */
export async function splitPdfIntoPageImages(
  file: File,
  onProgress?: (current: number, total: number) => void,
  maxDimensionPx = 1700,
): Promise<PdfPageImage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPageImage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    // Render at a resolution sharp enough for the model to read small
    // exam-paper text, capped so we don't ship an enormous image per page.
    const scale = Math.min(2.5, Math.max(1, maxDimensionPx / Math.max(baseViewport.width, baseViewport.height)));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('تعذّر إنشاء سطح رسم لمعالجة صفحات الملف في هذا المتصفح.');

    // White background first — scanned pages with transparency would
    // otherwise render as black once flattened to JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    pages.push({ pageNumber, base64: dataUrl.split(',')[1] || '' });

    // Release the canvas memory immediately — large multi-page documents
    // would otherwise pile up a lot of retained pixel data.
    canvas.width = 0;
    canvas.height = 0;

    onProgress?.(pageNumber, pdf.numPages);
  }

  return pages;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}
