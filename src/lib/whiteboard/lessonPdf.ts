/**
 * Export a lesson as a PDF handout: one landscape page per step with the fully drawn board,
 * the step title, and the narration text. Text is rasterized on a canvas (the browser shapes
 * Arabic correctly; jsPDF does not), so every page is one image.
 */
import { createElement, type ReactElement } from 'react';
import { BoardNode } from '../../components/whiteboard/WhiteboardPlayer';
import { captureBoardPng } from './boardSnapshot';
import { stripDiacritics, type WhiteboardLesson } from './lessonSchema';

const PAGE_W = 1600;
const PAGE_H = Math.round((PAGE_W * 210) / 297); // A4 landscape ratio
const MARGIN = 56;

function stepBoardMarkup(lesson: WhiteboardLesson, stepIndex: number): ReactElement {
  const carried: number[] = [];
  for (let i = stepIndex; i > 0 && lesson.steps[i].continues; i--) carried.unshift(i - 1);
  return createElement(
    'g',
    null,
    createElement('rect', { width: lesson.canvas.width, height: lesson.canvas.height, fill: 'none' }),
    ...carried.map(ci =>
      createElement(
        'g',
        { key: `c${ci}` },
        lesson.steps[ci].nodes.map(n =>
          createElement(BoardNode, { key: n.id, node: n, progress: 1, rtl: (lesson.steps[ci].lang ?? lesson.lang) === 'ar' }),
        ),
      ),
    ),
    ...lesson.steps[stepIndex].nodes.map(n =>
      createElement(BoardNode, { key: n.id, node: n, progress: 1, rtl: (lesson.steps[stepIndex].lang ?? lesson.lang) === 'ar' }),
    ),
  );
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (ctx.measureText(trial).width <= maxWidth) { line = trial; continue; }
    if (lines.length === maxLines - 1) {
      lines.push(`${line || w.slice(0, 40)} …`);
      return lines;
    }
    if (line) lines.push(line);
    line = w;
  }
  if (line) lines.push(line);
  return lines;
}

async function boardPngForStep(lesson: WhiteboardLesson, stepIndex: number): Promise<HTMLImageElement> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${lesson.canvas.width} ${lesson.canvas.height}`);
  svg.style.fontFamily = "'Molhim', 'Aref Ruqaa', 'Cairo', serif";
  svg.innerHTML = renderToStaticMarkup(stepBoardMarkup(lesson, stepIndex));
  const dataUrl = await captureBoardPng(svg as unknown as SVGSVGElement, { width: 1280, height: 720 });
  const img = new Image();
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('board image failed')); img.src = dataUrl; });
  return img;
}

export async function exportLessonPdf(lesson: WhiteboardLesson): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isAr = lesson.lang === 'ar';
  const boardW = PAGE_W - MARGIN * 2;
  const boardH = Math.round((boardW * lesson.canvas.height) / lesson.canvas.width);
  for (let i = 0; i < lesson.steps.length; i++) {
    if (i > 0) pdf.addPage('a4', 'landscape');
    const step = lesson.steps[i];
    const img = await boardPngForStep(lesson, i);
    const c = document.createElement('canvas');
    c.width = PAGE_W;
    c.height = PAGE_H;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.direction = isAr ? 'rtl' : 'ltr';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.textBaseline = 'top';
    const tx = isAr ? PAGE_W - MARGIN : MARGIN;
    // Header: lesson title (page 1 also shows it larger) + step title
    ctx.fillStyle = '#0f766e';
    ctx.font = "700 40px 'Aref Ruqaa', 'Molhim', serif";
    ctx.fillText(i === 0 ? stripDiacritics(lesson.title) : stripDiacritics(step.title ?? lesson.title), tx, MARGIN - 10);
    if (i === 0 && step.title) {
      ctx.fillStyle = '#334155';
      ctx.font = "700 30px 'Molhim', serif";
      ctx.fillText(stripDiacritics(step.title), tx, MARGIN + 44);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = "700 22px 'Molhim', serif";
    ctx.textAlign = isAr ? 'left' : 'right';
    ctx.fillText(`${i + 1} / ${lesson.steps.length}`, isAr ? MARGIN : PAGE_W - MARGIN, MARGIN - 4);
    ctx.textAlign = isAr ? 'right' : 'left';
    // Board image with a soft frame
    const by = MARGIN + (i === 0 && step.title ? 96 : 56);
    const bh = Math.min(boardH, PAGE_H - by - MARGIN - 90);
    const bw = Math.round((bh * lesson.canvas.width) / lesson.canvas.height);
    const bx = Math.round((PAGE_W - bw) / 2);
    ctx.fillStyle = '#fdfcf8';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx - 6, by - 6, bw + 12, bh + 12, 14);
    ctx.fill();
    ctx.stroke();
    ctx.drawImage(img, bx, by, bw, bh);
    // Narration (diacritics stripped like the captions)
    ctx.fillStyle = '#334155';
    ctx.font = "400 25px 'Molhim', sans-serif";
    const lines = wrapCanvasText(ctx, stripDiacritics(step.narration), PAGE_W - MARGIN * 2, 3);
    lines.forEach((ln, li) => ctx.fillText(ln, tx, by + bh + 22 + li * 36));
    pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 297, 210);
    if (i % 2 === 1) await new Promise(r => setTimeout(r, 0)); // let the tab breathe on long lessons
  }
  pdf.save(`${stripDiacritics(lesson.title).slice(0, 60) || 'lesson'}.pdf`);
}
