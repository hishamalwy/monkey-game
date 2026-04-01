import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../firebase/leaderboard';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function LeaderboardScreen({ nav }) {
  const { userProfile } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard(50)
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-header)', margin: 0 }}>
          🏆 المتصدرون
        </h1>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
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
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: 'var(--color-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {AVATAR_EMOJIS[u.avatarId ?? 0]}
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-header)' }}>
                      {u.username} {isMe && <span style={{ fontSize: 11, color: 'var(--color-primary)' }}>(أنت)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{u.gamesPlayed} مباراة</div>
                  </div>

                  {/* Wins */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-primary)' }}>{u.wins}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>فوز</div>
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

