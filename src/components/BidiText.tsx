import React from 'react';

const RTL_STRONG = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;
const LTR_STRONG = /[A-Za-z]/;
const LTR_RUN = /([A-Za-z0-9]+(?:[\s./:_#%+&()\[\]{}'"\-–—]*[A-Za-z0-9]+)*)/g;

export function getTextDirection(value: unknown): 'rtl' | 'ltr' {
  const text = String(value ?? '');
  for (const character of text) {
    if (RTL_STRONG.test(character)) return 'rtl';
    if (LTR_STRONG.test(character)) return 'ltr';
  }
  return 'rtl';
}

export interface BidiTextProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Keeps Arabic as the base direction while isolating embedded Latin, numbers,
 * URLs, and common mixed-content punctuation so the browser cannot reorder the
 * complete sentence around those runs.
 */
export function BidiText({ children, as: Tag = 'span', ...props }: BidiTextProps) {
  const text = React.Children.toArray(children).map(child => typeof child === 'string' || typeof child === 'number' ? String(child) : '').join('');
  const direction = getTextDirection(text);
  const parts = text.split(LTR_RUN);
  const Element = Tag as any;

  return (
    <Element {...props} dir={direction} style={{ unicodeBidi: 'isolate', ...props.style }}>
      {parts.map((part, index) => {
        if (!part) return null;
        const isLtr = /^[A-Za-z0-9]/.test(part);
        return isLtr ? <bdi key={index} dir="ltr">{part}</bdi> : <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </Element>
  );
}

export default BidiText;
