import { describe, expect, it } from 'vitest';
import { optionLabel } from './optionLabel';

describe('optionLabel', () => {
  it('uses أ ب ج د in Arabic', () => {
    expect([0, 1, 2, 3].map((i) => optionLabel(i, true))).toEqual(['أ', 'ب', 'ج', 'د']);
  });
  it('uses A B C D otherwise and falls back to numbers', () => {
    expect([0, 1, 2, 3].map((i) => optionLabel(i, false))).toEqual(['A', 'B', 'C', 'D']);
    expect(optionLabel(20, true)).toBe('21');
  });
});
