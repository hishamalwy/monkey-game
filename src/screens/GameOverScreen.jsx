import { useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import UserAvatar from '../components/ui/UserAvatar';
import { recordWin, recordLoss } from '../firebase/leaderboard';

// Generate confetti pieces with stable values
function useConfetti() {
  return useMemo(() => {
    const colors = ['#E91E8C', '#FF6B35', '#FFD700', '#1C1040', 'var(--color-card)', '#4CAF50'];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${(i * 3.4) % 100}%`,
      delay: `${(i * 0.07) % 1.5}s`,
      duration: `${1.5 + (i * 0.06) % 1.5}s`,
      color: colors[i % colors.length],
      width: `${8 + (i * 3) % 8}px`,
      height: `${6 + (i * 2) % 6}px`,
    }));
  }, []);
}

export default function GameOverScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const { room, players, isHost, leaveRoom, resetToLobby } = useRoom(roomCode);
  const confetti = useConfetti();

  // Determine winner = player with fewest quarterMonkeys
  const winner = players.length > 0
    ? players.reduce((a, b) => (a.quarterMonkeys || 0) <= (b.quarterMonkeys || 0) ? a : b)
    : null;

  const iWon = winner?.uid === userProfile?.uid;

  // Record win/loss once
  useEffect(() => {
    if (!winner || !userProfile) return;
    const mode = room?.mode || 'monkey';
    if (iWon) {
      recordWin(userProfile.uid, mode).catch(() => {});
    } else {
      recordLoss(userProfile.uid).catch(() => {});
    }
  }, [!!winner]);

  // Sync lobby redirect
  useEffect(() => {
    if (room?.status === 'lobby') nav.toLobby(roomCode);
  }, [room?.status]);

  const handleLeave = async () => {
    await leaveRoom();
    nav.toHome();
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Confetti */}
      {confetti.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: p.left,
          animationDelay: p.delay,
          animationDuration: p.duration,
          background: p.color,
          width: p.width,
          height: p.height,
        }} />
      ))}

      {/* Card */}
      <div className="slide-up" style={{
        background: 'var(--color-card)', borderRadius: 28,
        padding: '40px 28px', width: '100%', maxWidth: 400,
        textAlign: 'center', boxShadow: '0 16px 60px rgba(28,16,64,0.2)',
        position: 'relative', zIndex: 10,
      }}>
        <UserAvatar avatarId={winner?.avatarId ?? 0} size={80} style={{ margin: '0 auto 12px' }} />

        <h1 style={{ fontSize: 30, fontWeight: 900, color: 'var(--color-header)', margin: '0 0 8px' }}>
          {winner?.username}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--color-primary)', fontWeight: 700, marginBottom: 24 }}>
          🏆 فاز باللعبة!
        </p>

        {iWon && (
          <div style={{
            background: 'rgba(233,30,140,0.08)', border: '2px solid var(--color-primary)',
            borderRadius: 14, padding: '12px', marginBottom: 20,
            fontSize: 15, color: 'var(--color-primary)', fontWeight: 700,
          }}>
            🎉 أنت الفائز!
          </div>
        )}

        {/* Final scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {players
            .sort((a, b) => (a.quarterMonkeys || 0) - (b.quarterMonkeys || 0))
            .map((p, i) => (
              <div key={p.uid} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: i === 0 ? 'rgba(76,175,80,0.08)' : 'rgba(28,16,64,0.04)',
                border: i === 0 ? '2px solid var(--color-success)' : '2px solid transparent',
              }}>
                <span style={{ fontWeight: 900, color: 'var(--color-muted)', width: 20 }}>#{i + 1}</span>
                <UserAvatar avatarId={p.avatarId ?? 0} size={36} />
                <span style={{ flex: 1, fontWeight: 700, color: 'var(--color-header)', textAlign: 'right' }}>
                  {p.username}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-secondary)', fontWeight: 700 }}>
                  {p.quarterMonkeys || 0} أرباع
                </span>
              </div>
            ))}
        </div>

        {isHost ? (
          <button onClick={resetToLobby} className="btn btn-yellow"
            style={{ width: '100%', padding: '15px', fontSize: 17, marginBottom: 12 }}>
            🔄 العودة للروم
          </button>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700, marginBottom: 12 }}>
             بانتظار الهوست للعودة للغرفة...
          </p>
        )}

        <button onClick={handleLeave} className="btn btn-primary"
          style={{ width: '100%', padding: '15px', fontSize: 17, opacity: 0.8 }}>
          🚪 مغادرة الغرفة
        </button>
      </div>
    </div>
  );
}

