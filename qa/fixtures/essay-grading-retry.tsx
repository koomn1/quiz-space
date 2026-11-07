import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import EssayGradingStatus from '../../src/components/EssayGradingStatus';

function EssayRetryHarness() {
  const permanentFailure = new URLSearchParams(window.location.search).has('failure');
  const [loading, setLoading] = useState(!permanentFailure);
  const [assessed, setAssessed] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(1);

  useEffect(() => {
    if (permanentFailure) {
      setError('تعذر إكمال التصحيح الآلي. لم تُحتسب إجابتك خطأ.');
      return;
    }

    // Simulate a transient failure followed by an internal automatic retry.
    let successTimer: number | undefined;
    const retryTimer = window.setTimeout(() => {
      setAttempts(2);
      successTimer = window.setTimeout(() => {
        setLoading(false);
        setAssessed(true);
      }, 80);
    }, 50);
    return () => {
      window.clearTimeout(retryTimer);
      if (successTimer !== undefined) window.clearTimeout(successTimer);
    };
  }, [permanentFailure]);

  return (
    <section>
      <EssayGradingStatus isArabic isLoading={loading} isAssessed={assessed} error={error} />
      <output aria-label="محاولات التصحيح الآلية">{attempts}</output>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<EssayRetryHarness />);
