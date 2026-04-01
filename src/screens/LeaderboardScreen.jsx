import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../firebase/leaderboard';
import UserAvatar from '../components/ui/UserAvatar';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function LeaderboardScreen({ nav }) {
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
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '16px 20px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0 }}>
          🏆 المتصدرون
        </h1>
        
        {/* Mode Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => setMode('monkey')} 
            className={`btn ${mode === 'monkey' ? 'btn-pink' : 'btn-white'}`}
            style={{ flex: 1, padding: '8px', fontSize: 13 }}
          >
            🔊 القرد بيتكلم
          </button>
          <button 
            onClick={() => setMode('draw')} 
            className={`btn ${mode === 'draw' ? 'btn-pink' : 'btn-white'}`}
            style={{ flex: 1, padding: '8px', fontSize: 13 }}
          >
            🎨 خمن وارسم
          </button>
        </div>
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {loading ? (
          <div style={{ paddingTop: 60, display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((u, i) => {
              const isMe = u.uid === userProfile?.uid;
              return (
                <div key={u.uid} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 16,
                  background: isMe ? 'rgba(233,30,140,0.1)' : 'var(--color-card)',
                  border: isMe ? '2px solid var(--color-primary)' : '2px solid transparent',
                  boxShadow: '0 2px 10px rgba(28,16,64,0.07)',
                }}>
                  {/* Rank */}
                  <div style={{
                    width: 28, textAlign: 'center', fontWeight: 900,
                    fontSize: i < 3 ? 20 : 14,
                    color: ['#FFD700','#C0C0C0','#CD7F32'][i] || 'var(--color-muted)',
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>

                  {/* Avatar */}
                  <UserAvatar avatarId={u.avatarId ?? 0} size={40} />

                  {/* Name */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-header)' }}>
                      {u.username} {isMe && <span style={{ fontSize: 11, color: 'var(--color-primary)' }}>(أنت)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{u.gamesPlayed} مباراة</div>
                  </div>

                  {/* Wins */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--bg-pink)' }}>
                      {mode === 'draw' ? (u.wins_draw || 0) : (u.wins || 0)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 700 }}>فوز</div>
                  </div>
                </div>
              );
            })}

            {list.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-muted)', fontSize: 15 }}>
                لا يوجد لاعبون بعد
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav active="leaderboard" onNavigate={(key) => {
        if (key === 'home') nav.toHome();
        else if (key === 'settings') nav.toSettings();
      }} />
    </div>
  );
}

