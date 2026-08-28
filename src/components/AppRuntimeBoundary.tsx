import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppRuntimeBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QuizSpace runtime error', error.message, info.componentStack);
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
