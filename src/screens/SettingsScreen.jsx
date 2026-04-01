import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AvatarPicker from '../components/ui/AvatarPicker';
import UserAvatar from '../components/ui/UserAvatar';
import BottomNav from '../components/BottomNav';
import { doc, updateDoc, collection, query, where, getCountFromServer, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/ui/Toast';
import { HORN_TYPES, getHornType, setHornType, previewHorn } from '../utils/audio';

export default function SettingsScreen({ nav }) {
  const { userProfile, logout } = useAuth();
  const [avatarId, setAvatarId] = useState(userProfile?.avatarId ?? 0);
  const [newUsername, setNewUsername] = useState(userProfile?.username || '');
  const [saving, setSaving] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [toast, setToast] = useState('');
  const [hornId, setHornId] = useState(getHornType());
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [activeWizard, setActiveWizard] = useState(null); // 'avatar' | 'horn' | null

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
      setActiveWizard(null);
    } catch {
      setToast('حدث خطأ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!userProfile || !newUsername.trim()) return;
    const name = newUsername.trim();
    if (name === userProfile.username) return;
    
    setSavingUser(true);
    try {
      // Check uniqueness
      const nameRef = doc(db, 'usernames', name.toLowerCase());
      const nameSnap = await getDoc(nameRef);
      
      if (nameSnap.exists()) {
        setToast('اسم المستخدم محجوز بالفعل');
        return;
      }

      // 1. Delete old reservation
      const oldNameRef = doc(db, 'usernames', userProfile.username.toLowerCase());
      await deleteDoc(oldNameRef);

      // 2. Set new reservation
      await setDoc(nameRef, { uid: userProfile.uid });

      // 3. Update user profile
      await updateDoc(doc(db, 'users', userProfile.uid), { username: name });
      
      setToast('تم تغيير الاسم بنجاح!');
    } catch (e) {
      console.error(e);
      setToast('حدث خطأ أثناء تغيير الاسم');
    } finally {
      setSavingUser(false);
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

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

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Profile Card */}
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div 
            onClick={() => setActiveWizard('avatar')}
            style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 10px', cursor: 'pointer' }}
          >
            <UserAvatar avatarId={userProfile?.avatarId ?? 0} size={84} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0, 
              background: 'var(--bg-pink)', borderRadius: '50%', 
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white', fontSize: 14
            }}>✏️</div>
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

        {/* Account Settings */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0 }}>إعدادات الحساب</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              className="input-field"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="اسم لاعب جديد"
              style={{ flex: 1, padding: '10px' }}
            />
            <button 
              onClick={handleSaveUsername}
              disabled={savingUser || newUsername === userProfile?.username}
              className="btn btn-yellow"
              style={{ padding: '0 20px', fontSize: 13, opacity: (savingUser || newUsername === userProfile?.username) ? 0.5 : 1 }}
            >
              {savingUser ? '...' : 'تحديث'}
            </button>
          </div>
        </div>

        {/* Visual Settings */}
        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>الوضع الليلي 🌙</span>
          <button onClick={toggleDarkMode} className={`btn ${isDarkMode ? 'btn-pink' : 'btn-white'}`} style={{ padding: '8px 24px', fontSize: 14 }}>
            {isDarkMode ? 'مفعل' : 'معطل'}
          </button>
        </div>

        {/* Horn Selection Button */}
        <button 
          onClick={() => setActiveWizard('horn')}
          className="card" 
          style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'right', border: 'none', cursor: 'pointer', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-yellow)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-dark-purple)'
            }}>
              {(() => {
                const horn = HORN_TYPES.find(h => h.id === hornId) || HORN_TYPES[0];
                return horn.src ? (
                  <img src={`${import.meta.env.BASE_URL}icons/${horn.src}`} alt={horn.label} style={{ width: 24, height: 24, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 20 }}>{horn.emoji}</span>
                );
              })()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>صوت الكلاكس</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 700 }}>{HORN_TYPES.find(h => h.id === hornId)?.label}</div>
            </div>
          </div>
          <span style={{ fontSize: 20, opacity: 0.3 }}>●</span>
        </button>



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
      
      {/* Avatar Wizard Overlay */}
      {activeWizard === 'avatar' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'var(--bg-yellow)', display: 'flex', flexDirection: 'column' }}>
          <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--brutal-border)' }}>
            <button onClick={() => setActiveWizard(null)} className="btn btn-white" style={{ padding: '8px 16px' }}>إلغاء</button>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>اختر الأفاتار</h2>
            <button 
              onClick={handleSaveAvatar} 
              disabled={saving}
              className="btn btn-pink" 
              style={{ padding: '8px 24px', opacity: saving ? 0.5 : 1 }}
            >
              {saving ? '...' : 'حفظ'}
            </button>
          </header>
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: 30 }}>
              <UserAvatar avatarId={avatarId} size={120} />
            </div>
            <AvatarPicker selected={avatarId} onChange={setAvatarId} />
          </div>
        </div>
      )}

      {/* Horn Wizard Overlay */}
      {activeWizard === 'horn' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'var(--bg-yellow)', display: 'flex', flexDirection: 'column' }}>
          <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--brutal-border)' }}>
            <button onClick={() => setActiveWizard(null)} className="btn btn-white" style={{ padding: '8px 16px' }}>إغلاق</button>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>اختر الصوت</h2>
            <div style={{ width: 80 }} /> {/* spacer */}
          </header>
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
             <p style={{ textAlign: 'center', color: 'var(--color-muted)', marginBottom: 20, fontWeight: 700 }}>اضغط على الصوت لتجربته واختياره</p>
             <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px 16px' }}>
                {HORN_TYPES.map(horn => {
                  const active = hornId === horn.id;
                  return (
                    <div key={horn.id} style={{ textAlign: 'center', width: 80 }}>
                      <button
                        onClick={() => handlePickHorn(horn.id)}
                        style={{
                          width: 80, height: 80, borderRadius: '50%',
                          background: active ? 'var(--bg-pink)' : '#FFF',
                          border: '4px solid var(--bg-dark-purple)',
                          boxShadow: active ? '4px 4px 0px var(--bg-dark-purple)' : '3px 3px 0px rgba(45,27,78,0.3)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transform: active ? 'translate(2px, 2px)' : 'none',
                          transition: 'all 0.1s ease',
                          overflow: 'hidden', padding: 10
                        }}
                      >
                        {horn.src ? (
                          <img src={`${import.meta.env.BASE_URL}icons/${horn.src}`} alt={horn.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 36 }}>{horn.emoji}</span>
                        )}
                      </button>
                      <div style={{ fontSize: 11, fontWeight: 900, marginTop: 8, color: 'var(--bg-dark-purple)', lineHeight: 1.2 }}>{horn.label}</div>
                    </div>
                  );
                })}
             </div>
          </div>
          <div style={{ padding: 20, borderTop: 'var(--brutal-border)', background: 'white' }}>
             <button onClick={() => setActiveWizard(null)} className="btn btn-dark" style={{ width: '100%', padding: 16 }}>تم</button>
          </div>
        </div>
      )}

      <BottomNav active="settings" onNavigate={(key) => {
        if (key === 'home') nav.toHome();
        else if (key === 'leaderboard') nav.toLeaderboard();
      }} />
    </div>

  );
}
