import { describe, it, expect } from 'vitest';
import React from 'react';
import { CosmoTypewriter, useTypewriterBuffer } from './CosmoTypewriter';
import { LIGHT_THEME } from './CosmoPalette';

describe('CosmoTypewriter Component', () => {
  it('exports CosmoTypewriter as a valid component function', () => {
    expect(typeof CosmoTypewriter).toBe('function');
  });

  it('exports useTypewriterBuffer hook', () => {
    expect(typeof useTypewriterBuffer).toBe('function');
  });

  it('instantiates CosmoTypewriter React element with streaming flag', () => {
    const element = React.createElement(CosmoTypewriter, {
      fullText: 'مرحباً بك في كوزمو الذكي',
      theme: LIGHT_THEME,
      isStreaming: true,
      speedMs: 12,
    });
    expect(element).toBeDefined();
    expect(element.type).toBe(CosmoTypewriter);
    expect(element.props.fullText).toBe('مرحباً بك في كوزمو الذكي');
    expect(element.props.isStreaming).toBe(true);
  });
});
