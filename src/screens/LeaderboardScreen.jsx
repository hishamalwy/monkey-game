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
        <div style={{ position: 'absolute', top: '20%', right: '5%', fontSize: 32, transform: 'rotate(15deg)' }}>🏆</div>
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', fontSize: 40, transform: 'rotate(-20deg)' }}>👑</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0 }}>🏆 المتصدرون</h1>
      </div>

      <div style={{ padding: '16px 20px', background: '#FFF', borderBottom: 'var(--brutal-border)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {['monkey', 'draw'].map(m => (
            <button key={m} onClick={() => setMode(m)} className={`btn ${mode === m ? 'btn-pink' : 'btn-white'}`} style={{ flex: 1, padding: '12px', fontSize: 14, fontWeight: 950, borderRadius: '12px', border: '3px solid var(--bg-dark-purple)', boxShadow: mode === m ? 'none' : '4px 4px 0 var(--bg-dark-purple)', transform: mode === m ? 'translate(4px, 4px)' : 'none', transition: 'all 0.1s ease' }}>
              {m === 'monkey' ? '🔊 كلكس!' : '🎨 خمن وارسم'}
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
                <div key={u.uid} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: '16px', background: isMe ? '#FFFBE6' : '#FFF', borderColor: isMe ? 'var(--bg-pink)' : 'var(--bg-dark-purple)', boxShadow: isMe ? '4px 4px 0 var(--bg-pink)' : '6px 6px 0 var(--bg-dark-purple)', border: '4px solid var(--bg-dark-purple)' }}>
                  <div style={{ minWidth: 40, textAlign: 'center', fontWeight: 950, fontSize: i < 3 ? 24 : 16, color: i === 0 ? '#FAB005' : i === 1 ? '#ADB5BD' : i === 2 ? '#E67E22' : 'var(--bg-dark-purple)', opacity: i < 3 ? 1 : 0.6 }}>
                    {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <UserAvatar avatarId={u.avatarId ?? 0} size={48} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 950, color: 'var(--bg-dark-purple)', lineHeight: 1.1 }}>
                      {u.username}{isMe && <span style={{ fontSize: 10, color: 'var(--bg-pink)', marginRight: 4 }}> (أنت)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--bg-dark-purple)', opacity: 0.7, fontWeight: 900, marginTop: 4 }}>{getLevelEmoji(u.xp || 0)} لفل {getLevel(u.xp || 0)} • {u.gamesPlayed || 0} مباراة</div>
                  </div>
                  <div className="card" style={{ padding: '6px 12px', background: 'var(--bg-dark-purple)', color: '#FFE300', borderRadius: '10px', minWidth: 50, textAlign: 'center', boxShadow: 'none', border: 'none' }}>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>{mode === 'draw' ? (u.wins_draw || 0) : (u.wins || 0)}</div>
                    <div style={{ fontSize: 8, fontWeight: 950, opacity: 0.8 }}>فوز</div>
                  </div>
                </div>
              );
            })}
            {list.length === 0 && <div className="card" style={{ textAlign: 'center', padding: 40, background: '#FFF', border: '3px solid var(--bg-dark-purple)' }}>لا يوجد لاعبون بعد 🐒</div>}
          </div>
        )}
      </div>

      <BottomNav active="leaderboard" onNavigate={(key) => { if (key === 'home') nav.toHome(); else if (key === 'settings') nav.toSettings(); else if (key === 'store') nav.toStore(); }} />
    </div>
  );
}
