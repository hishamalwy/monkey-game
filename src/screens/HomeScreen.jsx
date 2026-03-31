import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import Toast from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { createRoom, joinRoom } from '../firebase/rooms';
import hero from '../assets/hero.png';

export default function HomeScreen({ nav }) {
  const { userProfile } = useAuth();
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    try {
      const code = await createRoom(userProfile);
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) { setToast('أدخل كود الغرفة المكون من 4 أحرف'); return; }
    setLoading(true);
    try {
      await joinRoom(code, userProfile);
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const avatar = AVATAR_EMOJIS[userProfile?.avatarId ?? 0];

  return (
    <div style={{
      width: '100vw', height: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={hero} alt="monkey" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-header)' }}>القرد بيتكلم!</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.6)', borderRadius: 50,
          padding: '6px 12px',
        }}>
          <span style={{ fontSize: 20 }}>{avatar}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-header)' }}>
            {userProfile?.username}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        padding: '0 20px 20px', gap: 14,
        alignItems: 'center',
      }}>
        {/* Hero */}
        <div style={{
          background: '#FFFFFF', borderRadius: 20, padding: '20px',
          width: '100%', maxWidth: 400, textAlign: 'center',
          boxShadow: '0 4px 20px rgba(28,16,64,0.08)',
          marginBottom: 4,
        }}>
          <div style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 700, marginBottom: 4 }}>
            هلا والله!
          </div>
          <img src={hero} alt="monkey" style={{ width: 90, height: 90, objectFit: 'contain' }} />
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-header)', margin: '8px 0 4px' }}>
            هل أنت مستعد للبدء؟
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            تحدى أصدقاءك في أغرب لعبة توصل!
          </p>
        </div>

        {/* Main Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400 }}>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: 18, borderRadius: 16 }}
          >
            {loading ? <LoadingSpinner size={22} /> : 'ابدأ لعبة'}
          </button>

          {/* Join Room */}
          {joining ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-field"
                placeholder="أدخل كود الغرفة"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 900, letterSpacing: 4 }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="btn btn-secondary"
                style={{ padding: '12px 18px', fontSize: 15, borderRadius: 14 }}
              >
                انضم
              </button>
            </div>
          ) : (
            <button
              onClick={() => setJoining(true)}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '16px', fontSize: 18, borderRadius: 16 }}
            >
              الانضمام لغرفة
            </button>
          )}

          <button
            onClick={nav.toLocalGame}
            className="btn btn-ghost"
            style={{ width: '100%', padding: '14px', fontSize: 16, borderRadius: 16 }}
          >
            ⚙️ الإعدادات
          </button>
        </div>

        {/* Stats */}
        {userProfile && (
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: '14px 20px',
            width: '100%', maxWidth: 400,
            display: 'flex', justifyContent: 'space-around',
            boxShadow: '0 4px 16px rgba(28,16,64,0.07)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-primary)' }}>
                {userProfile.wins}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>انتصارات</div>
            </div>
            <div style={{ width: 1, background: 'rgba(28,16,64,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-secondary)' }}>
                {userProfile.gamesPlayed}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>مباريات</div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <BottomNav active="home" onNavigate={(key) => {
        if (key === 'leaderboard') nav.toLeaderboard();
        else if (key === 'settings') nav.toSettings();
      }} />
    </div>
  );
}
