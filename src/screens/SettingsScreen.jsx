import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AvatarPicker, { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import BottomNav from '../components/BottomNav';
import { doc, updateDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/ui/Toast';
import { HORN_TYPES, getHornType, setHornType, previewHorn } from '../utils/audio';

export default function SettingsScreen({ nav }) {
  const { userProfile, logout } = useAuth();
  const [avatarId, setAvatarId] = useState(userProfile?.avatarId ?? 0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [hornId, setHornId] = useState(getHornType());
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('darkMode', next ? 'true' : 'false');
  };
  const [globalRank, setGlobalRank] = useState('--');

  useEffect(() => {
    if (userProfile?.wins !== undefined) {
      const fetchRank = async () => {
        try {
          const q = query(collection(db, 'users'), where('wins', '>', userProfile.wins));
          const snapshot = await getCountFromServer(q);
          setGlobalRank(snapshot.data().count + 1);
        } catch {
          setGlobalRank('--');
        }
      };
      fetchRank();
    }
  }, [userProfile?.wins]);

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

  const handlePickHorn = (id) => {
    setHornId(id);
    setHornType(id);
    previewHorn(id);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        padding: '16px 20px', textAlign: 'center',
        borderBottom: 'var(--brutal-border)',
        background: 'var(--bg-yellow)',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0 }}>
          ⚙️ الإعدادات
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Profile Card */}
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>
            {AVATAR_EMOJIS[userProfile?.avatarId ?? 0]}
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--bg-dark-purple)', marginBottom: 12 }}>
            {userProfile?.username}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-pink)' }}>
                {userProfile?.wins || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 700 }}>انتصارات</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>
                {userProfile?.gamesPlayed || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 700 }}>مباريات</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-green)' }}>
                {userProfile?.coins || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 700 }}>عملة</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-orange)' }}>
                #{globalRank}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 700 }}>المركز</div>
            </div>
          </div>
        </div>

        {/* Visual Settings */}
        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>الوضع الليلي 🌙</span>
          <button onClick={toggleDarkMode} className={`btn ${isDarkMode ? 'btn-pink' : 'btn-white'}`} style={{ padding: '8px 24px', fontSize: 14 }}>
            {isDarkMode ? 'مفعل' : 'معطل'}
          </button>
        </div>

        {/* Avatar Picker */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 12px', textAlign: 'center' }}>
            تغيير الأفاتار
          </h3>
          <AvatarPicker selected={avatarId} onChange={setAvatarId} />
          <button
            onClick={handleSaveAvatar}
            disabled={saving || avatarId === userProfile?.avatarId}
            className="btn btn-pink"
            style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 14, opacity: (saving || avatarId === userProfile?.avatarId) ? 0.5 : 1 }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>

        {/* Horn Picker */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 14px', textAlign: 'center' }}>
            تعديل صوت الكلاكس
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            {HORN_TYPES.map(horn => {
              const active = hornId === horn.id;
              return (
                <button
                  key={horn.id}
                  onClick={() => handlePickHorn(horn.id)}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    fontSize: 32,
                    background: active ? 'var(--bg-pink)' : '#FFF',
                    border: active ? '4px solid var(--bg-dark-purple)' : '4px solid var(--bg-dark-purple)',
                    boxShadow: active ? '4px 4px 0px var(--bg-dark-purple)' : '3px 3px 0px rgba(45,27,78,0.3)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: active ? 'translate(2px, 2px)' : 'none',
                    transition: 'all 0.08s ease',
                  }}
                  title={horn.label}
                >
                  {horn.emoji}
                </button>
              );
            })}
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-muted)', margin: '10px 0 0', fontWeight: 700 }}>
            {HORN_TYPES.find(h => h.id === hornId)?.label}
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="btn btn-dark"
          style={{ width: '100%', padding: '14px', fontSize: 15 }}
        >
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
