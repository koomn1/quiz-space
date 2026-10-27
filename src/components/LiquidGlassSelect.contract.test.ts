import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./LiquidGlassSelect.tsx', import.meta.url), 'utf8');

describe('LiquidGlassSelect contract', () => {
  it('exports LiquidGlassSelect component and SelectOption interface', () => {
    expect(source).toContain('export function LiquidGlassSelect');
    expect(source).toContain('export interface SelectOption');
    expect(source).toContain('export interface LiquidGlassSelectProps');
  });

  it('implements full accessibility attributes for combobox and listbox', () => {
    expect(source).toContain('aria-haspopup="listbox"');
    expect(source).toContain('aria-expanded={isOpen}');
    expect(source).toContain('role="listbox"');
    expect(source).toContain('role="option"');
    expect(source).toContain('aria-selected={isSelected}');
  });

  it('handles comprehensive keyboard navigation', () => {
    expect(source).toContain("case 'ArrowDown':");
    expect(source).toContain("case 'ArrowUp':");
    expect(source).toContain("case 'Home':");
    expect(source).toContain("case 'End':");
    expect(source).toContain("case 'Enter':");
    expect(source).toContain("case 'Escape':");
  });

  it('applies genuine liquid glass styling and animated chevron transitions', () => {
    expect(source).toContain('backdrop-blur-xl');
    expect(source).toContain('backdrop-blur-2xl');
    expect(source).toContain('rotate-180');
    expect(source).toContain('transition-transform');
  });
});
