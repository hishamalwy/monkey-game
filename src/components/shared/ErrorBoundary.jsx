import { Component } from 'react';
import { logEvent, EVENTS } from '../../firebase/analytics';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logEvent(EVENTS.ERROR, {
      message: error?.message?.slice(0, 200) || 'Unknown error',
      stack: error?.stack?.slice(0, 500) || '',
      componentStack: info?.componentStack?.slice(0, 500) || '',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--neo-yellow)',
          textAlign: 'center', gap: 20,
        }}>
          <div style={{ fontSize: 64 }}>💥</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#000', margin: 0 }}>حدث خطأ!</h1>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#000', maxWidth: 300, lineHeight: 1.5, opacity: 0.8 }}>
            حدث خطأ غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '16px 32px', fontSize: 16, fontWeight: 900,
              background: '#FFF', border: '4px solid #000', borderRadius: 0,
              boxShadow: '6px 6px 0 #000', cursor: 'pointer',
            }}
          >
            تحديث الصفحة 🔄
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
