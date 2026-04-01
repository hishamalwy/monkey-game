import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function RoundResultScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const { room, players, isHost, confirmNextRound } = useRoom(roomCode);

  const navRef = useRef(nav);
  useEffect(() => { navRef.current = nav; });

  useEffect(() => {
    if (!room) return;
    if (room.status === 'playing') navRef.current.toGame();
    if (room.status === 'game_over') navRef.current.toGameOver();
    if (room.status === 'lobby') navRef.current.toLobby(roomCode);
  }, [room?.status]);

  if (!room) {
    return (
      <div style={{
        width: '100%', height: '100%', background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  const result = room.lastResult;
  const isWin = result?.type === 'word_complete';
  const loser = result?.loserUid ? room.players[result.loserUid] : null;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="slide-up" style={{
        background: 'var(--color-card)', borderRadius: 24,
        padding: '36px 24px', width: '100%', maxWidth: 400,
        textAlign: 'center', boxShadow: '0 12px 48px rgba(28,16,64,0.15)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>
          {isWin ? '🎉' : '🙈'}
        </div>

        <h2 style={{
          fontSize: 26, fontWeight: 900, marginBottom: 12,
          color: isWin ? 'var(--color-success)' : 'var(--color-danger)',
        }}>
          {isWin ? 'اكتملت الكلمة!' : 'خسارة!'}
        </h2>

        <p style={{ fontSize: 15, color: 'var(--color-header)', marginBottom: 24, lineHeight: 1.6 }}>
          {result?.reason}
        </p>

        {/* Scoreboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {players.map(p => {
            const qm = p.quarterMonkeys || 0;
            const full = Math.floor(qm / 4);
            const frac = ['', '¼', '½', '¾'][qm % 4];
            const label = full > 0 ? `${'🐒'.repeat(full)}${frac}` : frac || '—';
            const isLoser = p.uid === result?.loserUid;

            return (
              <div key={p.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: isLoser ? 'rgba(233,30,140,0.08)' : 'rgba(28,16,64,0.04)',
                border: isLoser ? '2px solid var(--color-primary)' : '2px solid transparent',
              }}>
                <UserAvatar avatarId={p.avatarId ?? 0} size={36} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--color-header)', textAlign: 'right' }}>
                  {p.username}
                </span>
                <span style={{ fontSize: 14, color: 'var(--color-secondary)', fontWeight: 700 }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {isHost ? (
          <button onClick={confirmNextRound} className="btn btn-primary"
            style={{ width: '100%', padding: '15px', fontSize: 17 }}>
            الجولة التالية 🔄
          </button>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--color-muted)', fontWeight: 600 }}>
            بانتظار المضيف...
          </p>
        )}
      </div>
    </div>
  );
}

