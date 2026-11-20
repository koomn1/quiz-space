import { describe, it, expect } from 'vitest';
import React from 'react';
import Waves from './Waves';

describe('Waves Background Component', () => {
  it('exports Waves as a valid React component function', () => {
    expect(typeof Waves).toBe('function');
  });

  it('instantiates Waves React element with expected props', () => {
    const element = React.createElement(Waves, {
      lineColor: '#007472',
      accentColor: '#2AC3BB',
      backgroundColor: 'transparent',
      className: 'cosmo-waves',
      paused: true,
    });
    expect(element).toBeDefined();
    expect(element.type).toBe(Waves);
    expect(element.props.lineColor).toBe('#007472');
    expect(element.props.accentColor).toBe('#2AC3BB');
    expect(element.props.className).toBe('cosmo-waves');
    expect(element.props.paused).toBe(true);
  });
});
