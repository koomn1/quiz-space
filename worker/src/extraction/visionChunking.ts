import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { extractPdfTextContent } from '../documentExtraction';
import type { ExtractionJobRow, VisionChunkPlan } from './types';

export const LARGE_PDF_PAGE_THRESHOLD = 20;
export const PDF_TEXT_SAMPLE_PAGES = 3;
export const VISION_CHUNK_PAGE_COUNT = 4;
export const MIN_VISION_CHUNK_PAGE_COUNT = 3;
export const SINGLE_PAGE_VISION_CHUNK_PAGE_COUNT = 1;
export const MAX_VISION_CHUNK_DELIVERY_ATTEMPTS = 3;

export function visionChunkRetryDelaySeconds(deliveryAttempts: number): number {
  const attempts = Number.isInteger(deliveryAttempts) && deliveryAttempts > 0 ? deliveryAttempts : 1;
  return Math.min(60, Math.pow(2, attempts) * 5);
}

export async function extractPowerPointText(source: Uint8Array): Promise<string> {
  const archive = await JSZip.loadAsync(source);
  const slideFiles = Object.keys(archive.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
  const clean = (xml: string) => xml
    .replace(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi, '$1\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ').trim();
  const slides: string[] = [];
  for (const name of slideFiles) {
    const file = archive.file(name);
    if (!file) continue;
    const text = clean(await file.async('text'));
    if (text) slides.push(text);
  }
  return slides.map((text, index) => `الشريحة ${index + 1}:\n${text}`).join('\n\n');
}

export async function extractExcelText(source: Uint8Array): Promise<string> {
  const archive = await JSZip.loadAsync(source);
  const decode = (value: string) => value
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const sharedStrings: string[] = [];
  const shared = archive.file('xl/sharedStrings.xml');
  if (shared) {
    const xml = await shared.async('text');
    for (const item of xml.matchAll(/<si[\s\S]*?<\/si>/gi)) {
      sharedStrings.push(decode([...item[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map(match => match[1]).join('')));
    }
  }
  const sheetNames = Object.keys(archive.files).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).sort();
  const sheets: string[] = [];
  for (const name of sheetNames) {
    const file = archive.file(name);
    if (!file) continue;
    const xml = await file.async('text');
    const rows: string[] = [];
    for (const row of xml.matchAll(/<row[\s\S]*?<\/row>/gi)) {
      const cells: string[] = [];
      for (const cell of row[0].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
        const type = cell[1].match(/\bt="([^"]+)"/i)?.[1] || '';
        const value = cell[2].match(/<v[^>]*>([\s\S]*?)<\/v>/i)?.[1] || cell[2].match(/<t[^>]*>([\s\S]*?)<\/t>/i)?.[1] || '';
        if (!value) continue;
        cells.push(decode(type === 's' ? (sharedStrings[Number(value)] || '') : value));
      }
      if (cells.length) rows.push(cells.join(' | '));
    }
    if (rows.length) sheets.push(rows.join('\n'));
  }
  return sheets.join('\n\n');
}

export function selectVisionChunkPlan(pageCount: number, sourceBytes = 0, pageByPage = false): VisionChunkPlan {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return { pageCountPerChunk: pageByPage ? SINGLE_PAGE_VISION_CHUNK_PAGE_COUNT : VISION_CHUNK_PAGE_COUNT, concurrency: pageByPage ? 2 : 3, estimatedChunkCount: 0, reason: 'standard' };
  }
  if (pageByPage) return { pageCountPerChunk: SINGLE_PAGE_VISION_CHUNK_PAGE_COUNT, concurrency: 2, estimatedChunkCount: pageCount, reason: 'standard' };

  const averagePageBytes = sourceBytes > 0 ? sourceBytes / pageCount : 0;
  const rasterHeavy = averagePageBytes >= 800 * 1024;
  const largeDocument = pageCount >= 50 || averagePageBytes >= 450 * 1024;
  const pageCountPerChunk = rasterHeavy ? MIN_VISION_CHUNK_PAGE_COUNT : largeDocument ? 4 : VISION_CHUNK_PAGE_COUNT;
  const concurrency = rasterHeavy ? 3 : largeDocument ? 4 : 3;
  const reason = rasterHeavy ? 'raster-heavy' : largeDocument ? 'large-document' : 'standard';

  return {
    pageCountPerChunk,
    concurrency,
    estimatedChunkCount: Math.ceil(pageCount / pageCountPerChunk),
    reason,
  };
}

export function buildVisionChunkRanges(pageCount: number, pageCountPerChunk = VISION_CHUNK_PAGE_COUNT): Array<{ chunkIndex: number; pageStart: number; pageEnd: number }> {
  if (!Number.isInteger(pageCount) || pageCount < 1 || !Number.isInteger(pageCountPerChunk) || pageCountPerChunk < SINGLE_PAGE_VISION_CHUNK_PAGE_COUNT || pageCountPerChunk > VISION_CHUNK_PAGE_COUNT) return [];
  return Array.from({ length: Math.ceil(pageCount / pageCountPerChunk) }, (_, chunkIndex) => ({
    chunkIndex,
    pageStart: chunkIndex * pageCountPerChunk + 1,
    pageEnd: Math.min((chunkIndex + 1) * pageCountPerChunk, pageCount),
  }));
}

export function shouldUseVisionForLargeScannedPdf(pageCount: number, sampledText: string): boolean {
  return pageCount >= LARGE_PDF_PAGE_THRESHOLD && shouldUseVisionForScannedPdf(pageCount, sampledText);
}

export function shouldUseVisionForScannedPdf(pageCount: number, sampledText: string): boolean {
  return pageCount > 0 && sampledText.trim().length <= 40;
}

/**
 * Fast routing decision for layout-sensitive tables. Only a real header/row
 * structure sends the complete PDF to the xKiro vision path; ordinary numbered
 * MCQ banks that merely contain the words Question and Answer stay on the
 * lossless text parser.
 */
export function shouldAttemptStructuredTableExtraction(sourceText = ''): boolean {
  const text = String(sourceText || '');
  const tableHeader = text.split(/\r?\n/).some(line => {
    const cells = line.trim().split(/\s{2,}|\|\t?/).map(cell => cell.trim()).filter(Boolean);
    const normalized = cells.join(' ').toLowerCase();
    const hasQuestion = /\bquestion\b/.test(normalized);
    const hasAnswer = /\b(?:correct|answer)\b/.test(normalized);
    const optionHeaders = ['a', 'b', 'c', 'd'].filter(label => cells.some(cell => cell.toLowerCase() === label)).length;
    return hasQuestion && hasAnswer && optionHeaders >= 2;
  });
  const delimitedRows = text.split(/\r?\n/).filter(line => {
    const trimmed = line.trim();
    return (trimmed.split('|').length >= 3 || trimmed.split(/\t+/).length >= 3) && trimmed.length >= 12;
  }).length >= 2;
  const repeatedColumns = text.split(/\r?\n/).filter(line => {
    const trimmed = line.trim();
    const cells = trimmed.split(/\s{3,}/).filter(Boolean);
    return /^\d{1,4}\s/.test(trimmed) && cells.length >= 4;
  }).length >= 2;
  return tableHeader || delimitedRows || repeatedColumns;
}

export async function samplePdfText(source: Uint8Array, pageCount: number): Promise<string> {
  const sourcePdf = await PDFDocument.load(source);
  const samplePdf = await PDFDocument.create();
  const sampleCount = Math.min(PDF_TEXT_SAMPLE_PAGES, pageCount);
  const pages = await samplePdf.copyPages(sourcePdf, Array.from({ length: sampleCount }, (_, index) => index));
  pages.forEach(page => samplePdf.addPage(page));
  return extractPdfTextContent(new Uint8Array(await samplePdf.save()));
}

export async function getScannedPdfPageCount(source: Uint8Array, job: ExtractionJobRow): Promise<number | null> {
  if (job.file_mime_type !== 'application/pdf') return null;
  const pageCount = (await PDFDocument.load(source)).getPageCount();
  // Small text-based PDFs do not need the expensive PDF-lib copy/save/sample
  // pass. Running it for every upload could leave a job stuck after the 5%
  // "opened file" update before the real text/table extractor starts.
  if (pageCount < LARGE_PDF_PAGE_THRESHOLD) return null;
  const sampledText = await samplePdfText(source, pageCount);
  return shouldUseVisionForScannedPdf(pageCount, sampledText) ? pageCount : null;
}

export function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.byteLength; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}
