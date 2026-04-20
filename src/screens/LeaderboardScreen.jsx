import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../firebase/leaderboard';
import UserAvatar from '../components/ui/UserAvatar';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useNavigation } from '../hooks/useNavigation';
import { getLevel, getLevelEmoji } from '../utils/xp';

export default function LeaderboardScreen() {
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('monkey');

  useEffect(() => {
    setLoading(true);
    getLeaderboard(50, mode)
      .then(setList)
      .finally(() => setLoading(false));
  }, [mode]);

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Background Decor */}
      <div className="bg-stickers">
        <div style={{ position: 'absolute', top: '20%', right: '5%', fontSize: 32, opacity: 0.08, transform: 'rotate(15deg)' }}>🏆</div>
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', fontSize: 40, opacity: 0.08, transform: 'rotate(-20deg)' }}>👑</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'center', position: 'relative', zIndex: 10, borderBottom: '5px solid #000' }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#000' }}>المتصدرون 🏆</h1>
      </div>

      {/* Mode Tabs */}
      <div style={{ padding: '16px 20px', background: '#FFF', borderBottom: '4px solid #000', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {['monkey', 'draw'].map(m => (
            <button key={m} onClick={() => setMode(m)} className={`btn ${mode === m ? 'btn-yellow' : 'btn-white'}`} style={{
              flex: 1, padding: '14px', fontSize: 13, fontWeight: 900, borderRadius: 0,
              border: '3.5px solid #000',
              boxShadow: mode === m ? 'none' : '4px 4px 0 #000',
              transform: mode === m ? 'translate(4px, 4px)' : 'none',
              transition: 'none'
            }}>
              {m === 'monkey' ? '🔊 كلكس' : '🎨 الرسم'}
            </button>
          ))}
        </div>
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', position: 'relative', zIndex: 5 }}>
        {loading ? (
          <div style={{ paddingTop: 60, display: 'flex', justifyContent: 'center' }}><LoadingSpinner /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {list.map((u, i) => {
              const isMe = u.uid === userProfile?.uid;
              return (
                <div key={u.uid} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 0,
                  background: isMe ? 'var(--neo-yellow)' : '#FFF',
                  borderColor: '#000',
                  boxShadow: isMe ? '4px 4px 0 var(--neo-pink)' : '8px 8px 0 #000',
                  border: '4px solid #000'
                }}>
                  <div style={{ minWidth: 40, textAlign: 'center', fontWeight: 900, fontSize: i < 3 ? 24 : 16, color: '#000' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <UserAvatar avatarId={u.avatarId ?? 0} size={48} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#000', lineHeight: 1.1 }}>
                      {u.username}{isMe && <span style={{ fontSize: 10, color: 'var(--neo-pink)', marginRight: 4 }}> (أنت)</span>}
                    </div>
                    <div style={{ fontSize: 10, color: '#555', fontWeight: 900, marginTop: 4 }}>
                      {getLevelEmoji(u.xp || 0)} مستوى {getLevel(u.xp || 0)} • {u.gamesPlayed || 0} مباريات
                    </div>
                  </div>
                  <div className="card" style={{ padding: '6px 12px', background: '#000', color: 'var(--neo-yellow)', borderRadius: 0, minWidth: 50, textAlign: 'center', boxShadow: 'none', border: 'none' }}>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{mode === 'draw' ? (u.wins_draw || 0) : (u.wins || 0)}</div>
                    <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.8 }}>فوز</div>
                  </div>
                </div>
              );
            })}
            {list.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: 40, background: '#FFF', border: '4px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000' }}>
                لا توجد بيانات بعد 🐒
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav active="leaderboard" onNavigate={(key) => {
        if (key === 'home') nav.toHome();
        else if (key === 'settings') nav.toSettings();
        else if (key === 'store') nav.toStore();
      }} />
    </div>
  );
}
