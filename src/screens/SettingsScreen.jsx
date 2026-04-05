import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AvatarPicker from '../components/ui/AvatarPicker';
import UserAvatar from '../components/ui/UserAvatar';
import BottomNav from '../components/BottomNav';
import { doc, updateDoc, collection, query, where, getCountFromServer, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/ui/Toast';
import { HORN_TYPES, getHornType, setHornType, previewHorn } from '../utils/audio';
import { useNavigation } from '../hooks/useNavigation';
import { getLevel, getLevelProgress, getLevelTitle, getLevelEmoji, xpForNextLevel } from '../utils/xp';
import { getOwnedHorns } from '../utils/store';

export default function SettingsScreen() {
  const nav = useNavigation();
  const { userProfile, logout } = useAuth();
  const [avatarId, setAvatarId] = useState(userProfile?.avatarId ?? 1);
  const [newUsername, setNewUsername] = useState(userProfile?.username || '');
  const [saving, setSaving] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [toast, setToast] = useState('');
  const [hornId, setHornId] = useState(getHornType());
  const [activeWizard, setActiveWizard] = useState(null); // 'avatar' | 'horn' | null
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
      const nameRef = doc(db, 'usernames', name.toLowerCase());
      const nameSnap = await getDoc(nameRef);
      if (nameSnap.exists()) {
        setToast('اسم المستخدم محجوز بالفعل');
        return;
      }
      const oldNameRef = doc(db, 'usernames', userProfile.username.toLowerCase());
      await deleteDoc(oldNameRef);
      await setDoc(nameRef, { uid: userProfile.uid });
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

  const ownedHorns = getOwnedHorns(userProfile?.purchases || []);

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Background Decor */}
      <div className="bg-stickers">
        <div style={{ position: 'absolute', top: '15%', right: '10%', fontSize: 32, transform: 'rotate(20deg)' }}>⚙️</div>
        <div style={{ position: 'absolute', bottom: '15%', left: '10%', fontSize: 40, transform: 'rotate(-15deg)' }}>🐵</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', position: 'relative', zIndex: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0 }}>⚙️ الإعدادات</h1>
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 5 }}>

        {/* Profile Card */}
        <div className="card" style={{ padding: '24px', background: '#FFF', borderRadius: 'var(--brutal-radius-lg)', border: '4px solid var(--bg-dark-purple)', boxShadow: '8px 8px 0 var(--bg-dark-purple)' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
            <div onClick={() => setActiveWizard('avatar')} style={{ position: 'relative', cursor: 'pointer' }}>
              <UserAvatar avatarId={userProfile?.avatarId ?? 1} size={84} />
              <div style={{ 
                position: 'absolute', bottom: -5, right: -5, background: 'var(--bg-pink)', 
                borderRadius: '8px', width: 34, height: 34, display: 'flex', alignItems: 'center', 
                justifyContent: 'center', border: '3px solid var(--bg-dark-purple)', fontSize: 16,
                boxShadow: '2px 2px 0 var(--bg-dark-purple)'
              }}>✏️</div>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: '0 0 4px' }}>{userProfile?.username}</h2>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--bg-pink)' }}>
                 {getLevelEmoji(userProfile?.xp ?? 0)} لفل {getLevel(userProfile?.xp ?? 0)} — {getLevelTitle(getLevel(userProfile?.xp ?? 0))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'فوز', val: userProfile?.wins || 0, c: 'var(--bg-pink)' },
              { label: 'لعبة', val: userProfile?.gamesPlayed || 0, c: 'var(--bg-dark-purple)' },
              { label: 'عملة', val: userProfile?.coins || 0, c: 'var(--bg-green)' },
              { label: 'ترتيب', val: globalRank === '--' ? '--' : `#${globalRank}`, c: 'var(--bg-blue)' }
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '10px 4px', textAlign: 'center', borderRadius: '12px', background: '#F8F9FA' }}>
                <div style={{ fontSize: 18, fontWeight: 950, color: s.c }}>{s.val}</div>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#666' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Details */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, background: '#FFF', border: '4px solid var(--bg-dark-purple)', boxShadow: '6px 6px 0 var(--bg-dark-purple)' }}>
           <h3 style={{ fontSize: 16, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0 }}>⚙️ اسم اللاعب</h3>
           <div style={{ display: 'flex', gap: 10 }}>
             <input className="input-field" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="ادخل اسم جديد" style={{ flex: 1, padding: '14px' }} />
             <button onClick={handleSaveUsername} disabled={savingUser || newUsername === userProfile?.username} className="btn btn-yellow" style={{ padding: '0 20px', borderRadius: '12px', opacity: (savingUser || newUsername === userProfile?.username) ? 0.5 : 1 }}>{savingUser ? '...' : 'حفظ'}</button>
           </div>
           
           <div style={{ borderTop: '3px solid #EEE', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>صوت الكلاكس 🔊</span>
              <button onClick={() => setActiveWizard('horn')} className="btn btn-blue" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: 14, color: '#FFF', background: 'var(--bg-blue)' }}>تغيير</button>
           </div>
        </div>

        <button onClick={() => logout()} className="btn btn-pink" style={{ padding: '18px', fontSize: 18, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '6px 6px 0 var(--bg-dark-purple)' }}>🚪 تسجيل خروج</button>

      </div>

      {/* Avatar Wizard */}
      {activeWizard === 'avatar' && (
        <div className="brutal-bg" style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <header className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between' }}>
            <button onClick={() => setActiveWizard(null)} className="btn btn-white" style={{ padding: '10px 20px', borderRadius: '12px' }}>إلغاء</button>
            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 950 }}>اختر صورتك</h2>
            <button onClick={handleSaveAvatar} disabled={saving} className="btn btn-pink" style={{ padding: '10px 24px', opacity: saving ? 0.5 : 1, borderRadius: '12px' }}>{saving ? '...' : 'حفظ'}</button>
          </header>
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 5 }}>
             <AvatarPicker purchases={userProfile?.purchases || []} selected={avatarId} onChange={setAvatarId} onLockedClick={() => setToast('لازم تشتري الأفاتار ده من المتجر أولاً! 🛒')} />
          </div>
        </div>
      )}

      {/* Horn Wizard */}
      {activeWizard === 'horn' && (
        <div className="brutal-bg" style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <header className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between' }}>
            <button onClick={() => setActiveWizard(null)} className="btn btn-white" style={{ padding: '10px 20px', borderRadius: '12px' }}>إغلاق</button>
            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 950 }}>صوت الكلاكس</h2>
            <div style={{ width: 80 }} />
          </header>
          <div style={{ flex: 1, overflowY: 'auto', padding: '30px 24px', position: 'relative', zIndex: 5 }}>
             <div className="card" style={{ padding: 16, background: '#FFF', textAlign: 'center', marginBottom: 30, borderRadius: '14px', border: '3px solid var(--bg-dark-purple)' }}>
                <p style={{ margin: 0, color: 'var(--bg-dark-purple)', fontWeight: 950, fontSize: 16 }}>اختر الصوت اللي هيسمعه منافسينك! 🔊</p>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px 16px' }}>
                {HORN_TYPES.map(horn => {
                  const isOwned = ownedHorns.includes(horn.id);
                  const active = hornId === horn.id;
                  return (
                    <div key={horn.id} style={{ textAlign: 'center' }}>
                      <button onClick={() => isOwned ? handlePickHorn(horn.id) : setToast('اشتري الصوت ده من المتجر أولاً! 🛒')} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '14px', background: active ? 'var(--bg-pink)' : '#FFF', border: '4px solid var(--bg-dark-purple)', boxShadow: active ? 'none' : '4px 4px 0 var(--bg-dark-purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: active ? 'translate(4px, 4px)' : 'none', transition: 'all 0.1s ease', position: 'relative', overflow: 'hidden' }}>
                        {horn.src ? <img src={`${import.meta.env.BASE_URL}icons/${horn.src}`} alt={horn.label} style={{ width: '80%', height: '80%', objectFit: 'contain', filter: (!isOwned) ? 'grayscale(1) opacity(0.3)' : (active ? 'brightness(0) invert(1)' : 'none') }} /> : <span style={{ fontSize: 32, opacity: isOwned ? 1 : 0.3 }}>{horn.emoji}</span>}
                        {!isOwned && <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔒</span>}
                      </button>
                      <div style={{ fontSize: 11, fontWeight: 950, marginTop: 10, color: 'var(--bg-dark-purple)', lineHeight: 1.2 }}>{horn.label}</div>
                    </div>
                  );
                })}
             </div>
          </div>
          <div style={{ padding: 24, borderTop: 'var(--brutal-border)', background: 'white' }}>
             <button onClick={() => setActiveWizard(null)} className="btn btn-dark" style={{ width: '100%', padding: '18px', borderRadius: '16px', fontSize: 18 }}>تأكيد الصوت</button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <BottomNav active="settings" onNavigate={(key) => { if (key === 'home') nav.toHome(); else if (key === 'leaderboard') nav.toLeaderboard(); else if (key === 'store') nav.toStore(); }} />
    </div>
  );
}
