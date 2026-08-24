import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./LandingPage.tsx', import.meta.url), 'utf8');

describe('LandingPage delete quiz dialog contract', () => {
  it('renders the delete confirmation through document.body portal', () => {
    expect(source).toContain("import { createPortal } from 'react-dom';");
    expect(source).toContain('return createPortal(');
    expect(source).toContain('document.body,');
  });

  it('keeps the dialog reachable regardless of the quiz card scroll position', () => {
    expect(source).toContain('fixed inset-0 z-[10000]');
    expect(source).toContain('overflow-y-auto overscroll-contain');
    expect(source).toContain('max-h-[min(640px,90dvh)]');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
  });

  it('preserves keyboard and explicit confirm/cancel actions', () => {
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain("if (onDeleteQuiz) onDeleteQuiz(quizToDelete);");
    expect(source).toContain('onCancel={() => setQuizToDelete(null)}');
    expect(source).toContain('min-h-11');
  });
});
