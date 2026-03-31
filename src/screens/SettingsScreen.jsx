import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AvatarPicker, { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import BottomNav from '../components/BottomNav';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/ui/Toast';

export default function SettingsScreen({ nav }) {
  const { userProfile, logout } = useAuth();
  const [avatarId, setAvatarId] = useState(userProfile?.avatarId ?? 0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const handleSaveAvatar = async () => {
    if (!userProfile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), { avatarId });
      setToast('تم حفظ الأفاتار!');
    } catch {
      setToast('حدث خطأ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    // AuthContext will update and App router will redirect to auth
  };

  return (
    <div style={{
      width: '100vw', height: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '16px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-header)', margin: 0 }}>
          ⚙️ الإعدادات
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Profile Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: 20, padding: '20px',
          boxShadow: '0 4px 16px rgba(28,16,64,0.08)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{AVATAR_EMOJIS[userProfile?.avatarId ?? 0]}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-header)' }}>
            {userProfile?.username}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-primary)' }}>{userProfile?.wins || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>انتصارات</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-secondary)' }}>{userProfile?.gamesPlayed || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>مباريات</div>
            </div>
          </div>
        </div>

        {/* Avatar Picker */}
        <div style={{
          background: '#FFFFFF', borderRadius: 20, padding: '20px',
          boxShadow: '0 4px 16px rgba(28,16,64,0.08)',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-header)', margin: '0 0 14px', textAlign: 'center' }}>
            تغيير الأفاتار
          </h3>
          <AvatarPicker selected={avatarId} onChange={setAvatarId} />
          <button
            onClick={handleSaveAvatar}
            disabled={saving || avatarId === userProfile?.avatarId}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 14, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>

        {/* Local Game */}
        <button onClick={nav.toLocalGame} className="btn btn-ghost"
          style={{ width: '100%', padding: '14px', fontSize: 16, borderRadius: 16 }}>
          🎮 اللعب المحلي (ضد الكمبيوتر)
        </button>

        {/* Logout */}
        <button onClick={handleLogout} className="btn"
          style={{
            width: '100%', padding: '14px', fontSize: 16, borderRadius: 16,
            background: 'rgba(233,30,140,0.08)', color: 'var(--color-primary)',
            border: '2px solid rgba(233,30,140,0.2)', fontFamily: 'Cairo, sans-serif',
            fontWeight: 700, cursor: 'pointer',
          }}>
          تسجيل الخروج
        </button>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <BottomNav active="settings" onNavigate={(key) => {
        if (key === 'home') nav.toHome();
        else if (key === 'leaderboard') nav.toLeaderboard();
      }} />
    </div>
  );
}
