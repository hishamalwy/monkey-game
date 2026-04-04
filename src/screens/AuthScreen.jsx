import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AvatarPicker from '../components/ui/AvatarPicker';
import hero from '../assets/hero.webp';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarId, setAvatarId] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setError('');
    if (!username.trim() || !password) { setError('يرجى تعبئة جميع الحقول'); return; }
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, avatarId);
      }
    } catch (e) {
      const code = e.code || '';
      const msg = e.message || '';
      console.error('Auth error:', code, msg);

      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else if (code === 'auth/email-already-in-use' || msg.includes('محجوز')) {
        setError('اسم المستخدم محجوز، جرب اسم آخر');
      } else if (code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول بالإيميل غير مفعّل في Firebase، فعّله من Console');
      } else if (code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة، استخدم 6 أحرف أو أكثر');
      } else if (code === 'auth/network-request-failed') {
        setError('مشكلة في الاتصال بالإنترنت');
      } else {
        setError(`خطأ: ${code || msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src={hero} alt="monkey" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-header)', margin: '8px 0 0' }}>
          كلكس!
        </h1>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--color-card)',
        padding: '28px 24px', width: '100%', maxWidth: 400,
        boxShadow: '0 8px 40px rgba(28,16,64,0.12)',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, overflow: 'hidden', border: 'var(--brutal-border)' }}>
          {[['login', 'تسجيل دخول'], ['register', 'حساب جديد']].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError(''); }}
              style={{
                flex: 1, padding: '10px', fontFamily: 'Cairo, sans-serif',
                fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
                background: tab === key ? 'var(--color-primary)' : 'transparent',
                color: tab === key ? 'white' : 'var(--color-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input-field"
            placeholder="اسم المستخدم"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            className="input-field"
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={e => e.key === 'Enter' && handle()}
          />

          {tab === 'register' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 10, textAlign: 'center' }}>
                اختر أفاتار
              </p>
              <AvatarPicker selected={avatarId} onChange={setAvatarId} />
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--color-danger)', fontSize: 13, textAlign: 'center', margin: 0, fontWeight: 600 }}>
              {error}
            </p>
          )}

          <button
            onClick={handle}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 16, marginTop: 4, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '...' : tab === 'login' ? 'دخول' : 'إنشاء حساب'}
          </button>
        </div>
      </div>
    </div>
  );
}

