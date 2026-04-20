import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AvatarPicker from '../components/ui/AvatarPicker';
import hero from '../assets/hero.webp';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login');
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

      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else if (code === 'auth/email-already-in-use' || msg.includes('محجوز')) {
        setError('اسم المستخدم محجوز، جرب اسم آخر');
      } else if (code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول بالإيميل غير مفعّل في Firebase');
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
      <div style={{ textAlign: 'center', marginBottom: 28, transform: 'rotate(-2deg)' }}>
        <div className="card" style={{ display: 'inline-block', padding: 12, background: '#FFF', borderRadius: 0, border: '4px solid #000', boxShadow: '8px 8px 0 #000' }}>
          <img src={hero} alt="monkey" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        </div>
        <h1 className="title-glitch" style={{ fontSize: 36, marginTop: 16 }}>
          كلكس!
        </h1>
        <div style={{ display: 'inline-block', background: 'var(--neo-cyan)', border: '2px solid #000', padding: '2px 10px', fontSize: '10px', fontWeight: 900, transform: 'rotate(2deg)', boxShadow: '2px 2px 0 #000' }}>
          الإصدار 2.0
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{
        padding: '28px 24px', width: '100%', maxWidth: 400,
        boxShadow: '10px 10px 0px rgba(0,0,0,1)',
        borderRadius: 0,
        background: '#FFF'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, overflow: 'hidden', border: '3px solid #000', borderRadius: 0 }}>
          {[['login', 'تسجيل دخول'], ['register', 'حساب جديد']].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError(''); }}
              style={{
                flex: 1, padding: '12px', fontFamily: '"Cairo", sans-serif',
                fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer',
                background: tab === key ? 'var(--neo-yellow)' : 'transparent',
                color: '#000',
                borderLeft: key === 'register' ? '3px solid #000' : 'none',
                transition: 'none',
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
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'inline-block', background: 'var(--neo-green)', border: '2px solid #000', padding: '2px 8px', fontSize: '10px', fontWeight: 900, marginBottom: 8 }}>
                اختر صورتك
              </div>
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
            className="btn btn-pink"
            style={{ width: '100%', padding: '16px', fontSize: 18, marginTop: 12, opacity: loading ? 0.7 : 1, borderRadius: 0, boxShadow: '5px 5px 0 #000' }}
          >
            {loading ? 'جاري...' : tab === 'login' ? 'دخول' : 'إنشاء حساب'}
          </button>
        </div>
      </div>
    </div>
  );
}
