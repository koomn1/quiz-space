import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const splitter = readFileSync(new URL('./pdfSplitter.ts', import.meta.url), 'utf8');
const creator = readFileSync(new URL('../pages/QuizCreator.tsx', import.meta.url), 'utf8');

describe('PDF memory lifecycle contracts', () => {
  it('cleans each rendered page and document in the splitter', () => {
    expect(splitter).toContain('page.cleanup();');
    expect(splitter).toContain('pdf.cleanup();');
    expect(splitter).toContain('await pdf.destroy();');
    expect(splitter).toContain('canvas.width = 0;');
    expect(splitter).toContain('canvas.height = 0;');
  });

  it('cleans text and hybrid extraction resources in QuizCreator', () => {
    expect(creator).toContain('page.cleanup();');
    expect(creator).toContain('pdf.cleanup();');
    expect(creator).toContain('await pdf.destroy();');
  });
});
