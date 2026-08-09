import { PDFDocument } from 'pdf-lib';

export interface ExtractionResult {
  questions: any[];
}

export async function splitPdf(pdfBase64: string, chunkSize: number = 3): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(pdfBase64);
  const pageCount = pdfDoc.getPageCount();
  const chunks: string[] = [];

  for (let i = 0; i < pageCount; i += chunkSize) {
    const newDoc = await PDFDocument.create();
    const end = Math.min(i + chunkSize, pageCount);
    const pages = await newDoc.copyPages(pdfDoc, Array.from({ length: end - i }, (_, k) => i + k));
    pages.forEach(page => newDoc.addPage(page));
    const pdfBytes = await newDoc.save();
    let binary = '';
    for (const byte of pdfBytes) binary += String.fromCharCode(byte);
    chunks.push(btoa(binary));
  }

  return chunks;
}

export function mergeResults(results: ExtractionResult[]): ExtractionResult {
  const merged: ExtractionResult = { questions: [] };
  let currentNumber = 1;

  for (const res of results) {
    if (res && res.questions) {
      for (const q of res.questions) {
        // We might need to handle numbering here or let the LLM do it
        // But the user wants us to validate numbering
        merged.questions.push(q);
      }
    }
  }
  
  return merged;
}

export function validateNumbering(questions: any[]): number[] {
  const missing: number[] = [];
  if (questions.length === 0) return [];
  
  // Sort by number if available
  const sorted = [...questions].sort((a, b) => (a.number || 0) - (b.number || 0));
  
  let expected = 1;
  for (const q of sorted) {
    if (q.number && q.number !== expected) {
      for (let m = expected; m < q.number; m++) {
        missing.push(m);
      }
      expected = q.number + 1;
    } else {
      expected++;
    }
  }
  
  return missing;
}
