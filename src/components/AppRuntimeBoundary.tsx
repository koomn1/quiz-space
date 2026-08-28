import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; errorMessage: string };

function safeRuntimeErrorCode(message: string): string {
  const normalized = message.trim().replace(/\s+/g, ' ').slice(0, 180);
  return normalized || 'UNKNOWN_RUNTIME_ERROR';
}

export class AppRuntimeBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: safeRuntimeErrorCode(error?.message || '') };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const errorCode = safeRuntimeErrorCode(error?.message || '');
    try {
      window.localStorage.setItem('quizspace_last_runtime_error', JSON.stringify({ errorCode, at: new Date().toISOString() }));
    } catch {
      // Diagnostics must never create a second runtime failure.
    }
    console.error('QuizSpace runtime error', errorCode, info.componentStack);
  }

  private retry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const base = import.meta.env.BASE_URL || '/';
    return (
      <main
        dir="rtl"
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#080d1c',
          color: '#f8fafc',
          fontFamily: 'Cairo, sans-serif',
          textAlign: 'center',
        }}
      >
        <section style={{ maxWidth: 420, display: 'grid', gap: 16, justifyItems: 'center' }}>
          <img src={`${base}brand/quizspace-icon-192.webp`} alt="QuizSpace" width={76} height={76} style={{ borderRadius: 22 }} />
          <h1 style={{ margin: 0, fontSize: 24 }}>حصل عطل مؤقت</h1>
          <p style={{ margin: 0, lineHeight: 1.8, color: '#cbd5e1' }}>
            التطبيق لسه بيحاول يجهز البيانات. اضغط إعادة المحاولة، وتأكد إن الإنترنت شغال.
          </p>
          <p dir="ltr" style={{ margin: 0, maxWidth: 380, overflowWrap: 'anywhere', fontSize: 12, lineHeight: 1.6, color: '#94a3b8' }}>
            {this.state.errorMessage || 'UNKNOWN_RUNTIME_ERROR'}
          </p>
          <button
            type="button"
            onClick={this.retry}
            style={{
              minHeight: 48,
              padding: '0 24px',
              border: 0,
              borderRadius: 14,
              background: '#6d5dfc',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </section>
      </main>
    );
  }
}
