import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('icon library consistency', () => {
  it('uses lucide-react only (no hugeicons) in the migrated components', () => {
    for (const f of ['CardNav.jsx', 'PromptBar.jsx', 'SwipeRow.jsx', 'SwipeToast.jsx', '../pages/AIChat.tsx']) {
      const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
      expect(src).not.toContain('hugeicons');
    }
  });
});
