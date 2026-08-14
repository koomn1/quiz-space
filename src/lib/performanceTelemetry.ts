import { recordWebVital } from './db';

export type WebVitalName = 'lcp' | 'fcp' | 'cls' | 'ttfb';

export function getDeviceClass(viewportWidth: number): 'mobile' | 'tablet' | 'desktop' {
  if (viewportWidth < 640) return 'mobile';
  if (viewportWidth < 1024) return 'tablet';
  return 'desktop';
}

export function canReportWebVital(metric: WebVitalName, value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 600000 && ['lcp', 'fcp', 'cls', 'ttfb'].includes(metric);
}

export function startWebVitalsReporting(): void {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return;
  const sessionKey = `quizspace:web-vitals:${window.location.pathname}`;
  if (window.sessionStorage.getItem(sessionKey)) return;
  window.sessionStorage.setItem(sessionKey, 'reported');

  const path = window.location.pathname.slice(0, 200) || '/';
  const deviceClass = getDeviceClass(window.innerWidth);
  const reported = new Set<WebVitalName>();
  const report = (metric: WebVitalName, value: number) => {
    if (reported.has(metric) || !canReportWebVital(metric, value)) return;
    reported.add(metric);
    void recordWebVital(metric, Number(value.toFixed(3)), path, deviceClass).catch(() => undefined);
  };

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation) report('ttfb', navigation.responseStart - navigation.requestStart);

  if ('PerformanceObserver' in window) {
    try {
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-contentful-paint') report('fcp', entry.startTime);
        });
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch { /* Paint observation is unavailable in some browsers. */ }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const entry = entries[entries.length - 1] as PerformanceEntry | undefined;
        if (entry) report('lcp', entry.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* LCP observation is unavailable in some browsers. */ }

    try {
      let cumulativeShift = 0;
      const layoutObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) cumulativeShift += Number(entry.value || 0);
        });
      });
      layoutObserver.observe({ type: 'layout-shift', buffered: true });
      window.addEventListener('pagehide', () => report('cls', cumulativeShift), { once: true });
    } catch { /* CLS observation is unavailable in some browsers. */ }
  }
}
