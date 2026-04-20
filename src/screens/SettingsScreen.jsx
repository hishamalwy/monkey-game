import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import AvatarPicker from '../components/ui/AvatarPicker';
import UserAvatar from '../components/ui/UserAvatar';
import BottomNav from '../components/BottomNav';
import { doc, updateDoc, collection, query, where, getCountFromServer, runTransaction, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/ui/Toast';
import { HORN_TYPES, getHornType, setHornType, previewHorn } from '../utils/audio';
import { useNavigation } from '../hooks/useNavigation';
import { getLevel, getLevelProgress, getLevelTitle, getLevelEmoji, xpForNextLevel } from '../utils/xp';
import { getOwnedHorns } from '../utils/store';
import settingsGearIcon from '../assets/icons/settings_gear.png';

export default function SettingsScreen() {
  const nav = useNavigation();
  const { userProfile, logout, deleteMe, changePass } = useAuth();
  const { musicVolume, sfxVolume, setMusicVolume, setSfxVolume, playClick } = useAudio();
  const [avatarId, setAvatarId] = useState(userProfile?.avatarId ?? 1);
  const [newUsername, setNewUsername] = useState(userProfile?.username || '');
  const [saving, setSaving] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [toast, setToast] = useState('');
  const [hornId, setHornId] = useState(getHornType());
  const [activeWizard, setActiveWizard] = useState(null);
  const [globalRank, setGlobalRank] = useState('--');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

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
      setToast('تم حفظ الصورة!');
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
      await runTransaction(db, async (txn) => {
        const newNameRef = doc(db, 'usernames', name.toLowerCase());
        const newNameSnap = await txn.get(newNameRef);
        if (newNameSnap.exists()) throw new Error('اسم المستخدم محجوز بالفعل');

        const oldNameRef = doc(db, 'usernames', userProfile.username.toLowerCase());
        txn.delete(oldNameRef);
        txn.set(newNameRef, { uid: userProfile.uid });
        txn.update(doc(db, 'users', userProfile.uid), { username: name });
      });
      setToast('تم تغيير الاسم بنجاح!');
    } catch (e) {
      if (e.message === 'اسم المستخدم محجوز بالفعل') {
        setToast('اسم المستخدم محجوز بالفعل');
      } else {
        setToast('حدث خطأ أثناء تغيير الاسم');
      }
    } finally {
      setSavingUser(false);
    }
  };

  const handlePickHorn = (id) => {
    setHornId(id);
    setHornType(id);
    previewHorn(id);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'حذف') return;
    setDeleting(true);
    try {
      await deleteMe();
      setToast('تم حذف الحساب بنجاح');
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        setToast('سجل دخولك مرة أخرى ثم حاول');
      } else {
        setToast('حدث خطأ أثناء حذف الحساب');
      }
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } finally {
      setDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPass || !newPass || newPass.length < 6) {
      setToast('كلمة السر لازم تكون 6 حروف على الأقل');
      return;
    }
    setChangingPass(true);
    try {
      await changePass(currentPass, newPass);
      setToast('تم تغيير كلمة السر بنجاح!');
      setShowPasswordChange(false);
      setCurrentPass('');
      setNewPass('');
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setToast('كلمة السر الحالية غير صحيحة');
      } else if (e.code === 'auth/requires-recent-login') {
        setToast('سجل دخولك مرة أخرى ثم حاول');
      } else {
        setToast('حدث خطأ أثناء تغيير كلمة السر');
      }
    } finally {
      setChangingPass(false);
    }
  };

  const ownedHorns = getOwnedHorns(userProfile?.purchases || []);

  const STATS = [
    { label: 'فوز', val: userProfile?.wins || 0, c: 'var(--neo-yellow)' },
    { label: 'مباريات', val: userProfile?.gamesPlayed || 0, c: '#000' },
    { label: 'عملات', val: userProfile?.coins || 0, c: 'var(--neo-green)' },
    { label: 'ترتيب', val: globalRank === '--' ? '--' : `#${globalRank}`, c: 'var(--neo-cyan)' },
  ];

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      <div className="bg-stickers">
        <div style={{ position: 'absolute', top: '15%', right: '10%', opacity: 0.5 }}>
          <img src={settingsGearIcon} style={{ width: 48, height: 48, transform: 'rotate(20deg)' }} />
        </div>
        <div style={{ position: 'absolute', bottom: '15%', left: '10%', fontSize: 40, opacity: 0.08, transform: 'rotate(-15deg)' }}>🐵</div>
      </div>

      <div className="top-nav-brutal" style={{ background: '#FFF', position: 'relative', zIndex: 10, gap: 10, borderBottom: '5px solid #000' }}>
        <img src={settingsGearIcon} style={{ width: 32, height: 32 }} />
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#000' }}>الإعدادات ⚙️</h1>
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 5 }}>

        {/* Profile Card */}
        <div className="card" style={{ padding: '24px', background: '#FFF', borderRadius: 0, border: '5px solid #000', boxShadow: '10px 10px 0 #000' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
            <div onClick={() => setActiveWizard('avatar')} style={{ position: 'relative', cursor: 'pointer' }}>
              <UserAvatar avatarId={userProfile?.avatarId ?? 1} size={84} />
              <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--neo-pink)', borderRadius: 0, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #000', fontSize: 16, boxShadow: '4px 4px 0 #000' }}>✏️</div>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#000', margin: '0 0 4px' }}>{userProfile?.username}</h2>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#000', background: 'var(--neo-yellow)', display: 'inline-block', padding: '2px 10px', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}>
                {getLevelEmoji(userProfile?.xp ?? 0)} مستوى {getLevel(userProfile?.xp ?? 0)} — {getLevelTitle(getLevel(userProfile?.xp ?? 0))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {STATS.map((s, i) => (
              <div key={i} className="card" style={{ padding: '12px 4px', textAlign: 'center', borderRadius: 0, background: '#FFF', border: '2px solid #000' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: s.c, textShadow: s.c !== '#000' ? '1px 1px 0 #000' : 'none' }}>{s.val}</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#000' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#000' }}>XP</span>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#000' }}>{userProfile?.xp ?? 0} / {xpForNextLevel(getLevel(userProfile?.xp ?? 0))}</span>
            </div>
            <div style={{ width: '100%', height: 14, background: '#DDD', borderRadius: 0, border: '3px solid #000', overflow: 'hidden' }}>
              <div style={{
                width: `${getLevelProgress(userProfile?.xp ?? 0) * 100}%`,
                height: '100%',
                background: 'var(--neo-yellow)',
                transition: 'width 0.5s',
              }} />
            </div>
          </div>
        </div>

        {/* Audio Card */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, background: '#FFF', border: '5px solid #000', boxShadow: '6px 6px 0 #000', borderRadius: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#000', margin: 0, borderBottom: '3px solid #000', paddingBottom: 8 }}>الصوتيات 🎵</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>مستوى الموسيقى (BGM)</span>
              <span style={{ fontSize: 14, fontWeight: 900 }}>{Math.round(musicVolume * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={e => {
              setMusicVolume(parseFloat(e.target.value));
            }} style={{ width: '100%', accentColor: 'var(--neo-pink)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>تأثيرات الأزرار (SFX)</span>
              <span style={{ fontSize: 14, fontWeight: 900 }}>{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={e => {
              setSfxVolume(parseFloat(e.target.value));
            }} onMouseUp={playClick} onTouchEnd={playClick} style={{ width: '100%', accentColor: 'var(--neo-yellow)' }} />
          </div>
        </div>

        {/* Account Card */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, background: '#FFF', border: '5px solid #000', boxShadow: '6px 6px 0 #000', borderRadius: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={settingsGearIcon} style={{ width: 22, height: 22 }} />
            <h3 style={{ fontSize: 15, fontWeight: 900, color: '#000', margin: 0 }}>اسم المستخدم</h3>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="input-field" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="أدخل اسماً جديداً" style={{ flex: 1, padding: '14px', borderRadius: 0 }} />
            <button onClick={handleSaveUsername} disabled={savingUser || newUsername === userProfile?.username} className="btn btn-yellow" style={{ padding: '0 20px', borderRadius: 0, border: '3px solid #000', opacity: (savingUser || newUsername === userProfile?.username) ? 0.5 : 1, transition: 'none' }}>
              {savingUser ? '...' : 'تحديث'}
            </button>
          </div>

          <div style={{ borderTop: '3px solid #000', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#000' }}>البوق 🔊</span>
            <button onClick={() => { playClick(); setActiveWizard('horn'); }} className="btn btn-cyan" style={{ padding: '10px 24px', borderRadius: 0, border: '3px solid #000', fontSize: 13, fontWeight: 900, boxShadow: '4px 4px 0 #000', transition: 'none' }}>تعديل</button>
          </div>

          <div style={{ borderTop: '3px solid #000', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#000' }}>كلمة السر 🔑</span>
              <button onClick={() => { playClick(); setShowPasswordChange(!showPasswordChange); }} className="btn btn-white" style={{ padding: '10px 24px', borderRadius: 0, border: '3px solid #000', fontSize: 13, fontWeight: 900, boxShadow: '4px 4px 0 #000', transition: 'none' }}>تغيير</button>
            </div>
            {showPasswordChange && (
              <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="كلمة السر الحالية" className="input-field" style={{ padding: 14, borderRadius: 0, border: '3px solid #000' }} />
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="كلمة السر الجديدة (6+ حروف)" className="input-field" style={{ padding: 14, borderRadius: 0, border: '3px solid #000' }} />
                <button onClick={handleChangePassword} disabled={changingPass || newPass.length < 6} className="btn btn-yellow" style={{ padding: 14, borderRadius: 0, border: '3px solid #000', fontWeight: 900, opacity: (changingPass || newPass.length < 6) ? 0.5 : 1 }}>
                  {changingPass ? '...' : 'تحديث كلمة السر'}
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => { playClick(); logout(); }} className="btn btn-white" style={{ padding: '20px', fontSize: 18, fontWeight: 900, borderRadius: 0, border: '5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '8px 8px 0 #000', transition: 'none' }}>
          تسجيل الخروج 🚪
        </button>

        <button onClick={() => { playClick(); setShowDeleteConfirm(true); }} className="btn btn-pink" style={{ padding: '16px', fontSize: 15, fontWeight: 900, borderRadius: 0, border: '4px solid #000', background: '#FF4444', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '4px 4px 0 #000', transition: 'none', marginBottom: 40 }}>
          حذف الحساب نهائياً 🗑️
        </button>

      </div>

      {/* Avatar Wizard */}
      {activeWizard === 'avatar' && (
        <div className="brutal-bg" style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <header className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between', borderBottom: '5px solid #000' }}>
            <button onClick={() => setActiveWizard(null)} className="btn btn-white" style={{ padding: '10px 20px', borderRadius: 0, border: '3px solid #000', fontWeight: 900, fontSize: 13 }}>إلغاء</button>
            <h2 style={{ fontSize: 18, margin: 0, fontWeight: 900 }}>تغيير الصورة</h2>
            <button onClick={handleSaveAvatar} disabled={saving} className="btn btn-pink" style={{ padding: '10px 24px', border: '3px solid #000', borderRadius: 0, fontWeight: 900, fontSize: 13, opacity: saving ? 0.5 : 1 }}>
              {saving ? '...' : 'حفظ'}
            </button>
          </header>
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 5 }}>
            <AvatarPicker purchases={userProfile?.purchases || []} selected={avatarId} onChange={setAvatarId} onLockedClick={() => setToast('لازم تشتري الصورة دي من المتجر أولاً! 🛒')} />
          </div>
        </div>
      )}

      {/* Horn Wizard */}
      {activeWizard === 'horn' && (
        <div className="brutal-bg" style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <header className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between', borderBottom: '5px solid #000' }}>
            <button onClick={() => setActiveWizard(null)} className="btn btn-white" style={{ padding: '10px 20px', borderRadius: 0, border: '3px solid #000', fontWeight: 900, fontSize: 13 }}>إلغاء</button>
            <h2 style={{ fontSize: 18, margin: 0, fontWeight: 900 }}>اختيار البوق</h2>
            <div style={{ width: 88 }} />
          </header>
          <div style={{ flex: 1, overflowY: 'auto', padding: '30px 24px', position: 'relative', zIndex: 5 }}>
            <div className="card" style={{ padding: 16, background: '#FFF', textAlign: 'center', marginBottom: 30, borderRadius: 0, border: '4px solid #000', boxShadow: '6px 6px 0 var(--neo-cyan)' }}>
              <p style={{ margin: 0, color: '#000', fontWeight: 900, fontSize: 15 }}>اختر البوق المفضل لديك 🔊</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px 16px' }}>
              {HORN_TYPES.map(horn => {
                const isOwned = ownedHorns.includes(horn.id);
                const active = hornId === horn.id;
                return (
                  <div key={horn.id} style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => isOwned ? handlePickHorn(horn.id) : setToast('يجب شراء البوق من المتجر أولاً! 🛒')}
                      style={{ width: '100%', aspectRatio: '1/1', borderRadius: 0, background: active ? 'var(--neo-pink)' : '#FFF', border: '4px solid #000', boxShadow: active ? 'none' : '4px 4px 0 #000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: active ? 'translate(4px, 4px)' : 'none', transition: 'none', position: 'relative', overflow: 'hidden' }}
                    >
                      {horn.src
                        ? <img src={`${import.meta.env.BASE_URL}icons/${horn.src}`} alt={horn.label} style={{ width: '80%', height: '80%', objectFit: 'contain', filter: (!isOwned) ? 'grayscale(1) opacity(0.3)' : 'none' }} />
                        : <span style={{ fontSize: 32, opacity: isOwned ? 1 : 0.3, filter: active ? 'drop-shadow(2px 2px 0 rgba(0,0,0,0.2))' : 'none' }}>{horn.emoji}</span>
                      }
                      {!isOwned && <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔒</span>}
                    </button>
                    <div style={{ fontSize: 10, fontWeight: 900, marginTop: 10, color: '#000', lineHeight: 1.2 }}>{horn.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: 24, borderTop: '5px solid #000', background: 'white' }}>
            <button onClick={() => setActiveWizard(null)} className="btn btn-yellow" style={{ width: '100%', padding: '20px', borderRadius: 0, border: '4px solid #000', fontSize: 18, fontWeight: 900, boxShadow: '8px 8px 0 #000' }}>
              تأكيد الاختيار 🚀
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {/* Delete Account Confirmation */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card slide-up" style={{ padding: 32, width: '100%', maxWidth: 380, textAlign: 'center', borderRadius: 0, border: '5px solid #000', background: '#FFF', boxShadow: '12px 12px 0 #FF4444' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#FF4444', margin: '0 0 12px' }}>حذف الحساب نهائياً</h3>
            <p style={{ fontSize: 14, color: '#444', fontWeight: 900, marginBottom: 8 }}>هذا الإجراء لا يمكن التراجع عنه!</p>
            <p style={{ fontSize: 13, color: '#666', fontWeight: 900, marginBottom: 24 }}>ستفقد كل بياناتك: الكوينز، الإحصائيات، المشتريات، والمستوى.</p>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 900, color: '#000', marginBottom: 8 }}>اكتب "حذف" للتأكيد:</p>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="حذف"
                style={{ width: '100%', padding: '14px', textAlign: 'center', fontSize: 18, fontWeight: 900, border: '4px solid #000', borderRadius: 0, background: '#FFF', direction: 'rtl', outline: 'none' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="btn btn-white" style={{ flex: 1, padding: 16, borderRadius: 0, border: '4px solid #000', fontWeight: 900 }}>إلغاء</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'حذف' || deleting}
                style={{
                  flex: 1, padding: 16, borderRadius: 0, fontWeight: 900, fontSize: 16,
                  background: deleteConfirmText === 'حذف' ? '#FF4444' : '#DDD',
                  color: deleteConfirmText === 'حذف' ? '#FFF' : '#999',
                  border: '4px solid #000', cursor: deleteConfirmText === 'حذف' ? 'pointer' : 'not-allowed',
                  boxShadow: deleteConfirmText === 'حذف' ? '4px 4px 0 #000' : 'none',
                }}
              >
                {deleting ? '...' : 'حذف نهائي 🗑️'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="settings" onNavigate={(key) => {
        if (key === 'home') nav.toHome();
        else if (key === 'leaderboard') nav.toLeaderboard();
        else if (key === 'store') nav.toStore();
      }} />
    </div>
  );
}
