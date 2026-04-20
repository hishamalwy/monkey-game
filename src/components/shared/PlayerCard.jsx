import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { sendFriendRequest, removeFriend } from '../../firebase/friends';
import { getLevel, getLevelTitle, getLevelEmoji, getLevelProgress, xpForNextLevel } from '../../utils/xp';
import UserAvatar from '../ui/UserAvatar';
import Toast from '../ui/Toast';

export default function PlayerCard({ uid, onClose }) {
  const { userProfile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) setData(snap.data());
      setLoading(false);
    });
  }, [uid]);

  useEffect(() => {
    if (userProfile?.friends?.includes(uid)) setIsFriend(true);
  }, [userProfile?.friends, uid]);

  const isMe = uid === userProfile?.uid;

  const handleAddFriend = async () => {
    try {
      await sendFriendRequest(userProfile.uid, uid);
      setRequestSent(true);
      setToast('تم إرسال طلب الصداقة!');
    } catch { setToast('حدث خطأ'); }
  };

  const handleRemoveFriend = async () => {
    try {
      await removeFriend(userProfile.uid, uid);
      setIsFriend(false);
      setToast('تم إزالة الصديق');
    } catch { setToast('حدث خطأ'); }
  };

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#FFF', padding: 40, border: '5px solid #000', borderRadius: 0 }}>...</div>
    </div>
  );

  if (!data) return null;

  const level = getLevel(data.xp || 0);
  const winRate = (data.gamesPlayed || 0) > 0 ? Math.round(((data.wins || 0) / data.gamesPlayed) * 100) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card slide-up" style={{ width: '100%', maxWidth: 360, borderRadius: 0, border: '5px solid #000', background: '#FFF', boxShadow: '12px 12px 0 #000' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
          <button onClick={onClose} style={{ background: '#FFF', border: '3px solid #000', borderRadius: 0, width: 36, height: 36, fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}>✕</button>
        </div>

        <div style={{ padding: '8px 24px 24px', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            <UserAvatar avatarId={data.avatarId ?? 1} size={80} border="4px solid #000" />
            <div style={{ position: 'absolute', bottom: -6, right: -6, background: 'var(--neo-yellow)', borderRadius: 0, padding: '2px 8px', border: '2.5px solid #000', fontWeight: 900, fontSize: 10 }}>
              {getLevelEmoji(data.xp || 0)} Lv.{level}
            </div>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#000', margin: '0 0 4px' }}>{data.username}</h2>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#000', background: 'var(--neo-cyan)', display: 'inline-block', padding: '2px 12px', border: '2px solid #000', marginBottom: 16 }}>
            {getLevelTitle(level)}
          </div>

          <div style={{ width: '100%', height: 12, background: '#DDD', border: '2.5px solid #000', overflow: 'hidden', marginBottom: 4, borderRadius: 0 }}>
            <div style={{ height: '100%', width: `${getLevelProgress(data.xp || 0)}%`, background: 'var(--neo-yellow)', transition: 'none' }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#666', marginBottom: 16 }}>
            {data.xp || 0} / {xpForNextLevel(level)} XP
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { val: data.gamesPlayed || 0, label: 'مباريات', c: '#000' },
              { val: data.wins || 0, label: 'فوز', c: 'var(--neo-green)' },
              { val: `${winRate}%`, label: 'معدل', c: 'var(--neo-pink)' },
              { val: data.coins || 0, label: 'عملات', c: 'var(--neo-yellow)' },
            ].map(s => (
              <div key={s.label} style={{ padding: '8px 2px', textAlign: 'center', background: '#FFF', border: '2px solid #000', borderRadius: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: s.c }}>{s.val}</div>
                <div style={{ fontSize: 8, fontWeight: 900, color: '#666' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {!isMe && (
            <div style={{ display: 'flex', gap: 10 }}>
              {isFriend ? (
                <button onClick={handleRemoveFriend} style={{ flex: 1, padding: 14, borderRadius: 0, border: '3px solid #000', background: '#FF4444', color: '#FFF', fontWeight: 900, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #000' }}>
                  إزالة الصديق ✕
                </button>
              ) : requestSent ? (
                <div style={{ flex: 1, padding: 14, borderRadius: 0, border: '3px solid #000', background: '#EEE', fontWeight: 900, fontSize: 13, textAlign: 'center' }}>
                  تم الإرسال ✓
                </div>
              ) : (
                <button onClick={handleAddFriend} style={{ flex: 1, padding: 14, borderRadius: 0, border: '3px solid #000', background: 'var(--neo-green)', color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #000' }}>
                  إضافة صديق 🤝
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
