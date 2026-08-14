import { describe, expect, it } from 'vitest';
import { canReportWebVital, getDeviceClass } from './performanceTelemetry';

describe('performance telemetry helpers', () => {
  it('classifies device sizes without collecting a user agent fingerprint', () => {
    expect(getDeviceClass(390)).toBe('mobile');
    expect(getDeviceClass(768)).toBe('tablet');
    expect(getDeviceClass(1280)).toBe('desktop');
  });

  it('accepts bounded metric values only', () => {
    expect(canReportWebVital('lcp', 1250.5)).toBe(true);
    expect(canReportWebVital('cls', -0.01)).toBe(false);
    expect(canReportWebVital('fcp', 700000)).toBe(false);
  });
});
