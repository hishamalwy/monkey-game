import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center',
          background: 'var(--bg-yellow)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😵</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 8px' }}>
            أوه no! حدث خطأ
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)', margin: '0 0 24px', maxWidth: 300 }}>
            شيء ما انقطع، لكن لا تقلق — جرب تحديث الصفحة
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-pink"
            style={{ padding: '14px 32px', fontSize: 16 }}
          >
            🔄 تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
