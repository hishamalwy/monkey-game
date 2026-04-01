import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/ui/UserAvatar';
import { useState, useEffect } from 'react';
import { listenToRoom, leaveRoom } from '../firebase/rooms';

function useConfetti() {
  return useMemo(() => {
    const colors = ['#FF006E', '#FF6B00', '#FFE300', '#1C1040', '#FFFFFF', '#39FF14'];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${(i * 3.6) % 100}%`,
      delay: `${(i * 0.07) % 1.4}s`,
      duration: `${1.4 + (i * 0.07) % 1.4}s`,
      color: colors[i % colors.length],
      width: `${8 + (i * 3) % 8}px`,
      height: `${6 + (i * 2) % 6}px`,
    }));
  }, []);
}

export default function DrawGameOverScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const confetti = useConfetti();

  useEffect(() => {
    const unsub = listenToRoom(roomCode, data => {
      if (data) setRoom(data);
    });
    return unsub;
  }, [roomCode]);

  const handleLeave = async () => {
    if (!room || !userProfile) { nav.toHome(); return; }
    await leaveRoom(roomCode, userProfile.uid, room.hostUid === userProfile.uid, room.playerOrder);
    nav.toHome();
  };

  if (!room?.drawState) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
        🎨
      </div>
    );
  }

  const ds = room.drawState;
  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const sorted = [...players].sort((a, b) => (ds.scores?.[b.uid] || 0) - (ds.scores?.[a.uid] || 0));
  const winner = sorted[0];
  const iWon = winner?.uid === userProfile?.uid;

  // Stats
  const drawerCounts = {};
  // (simplified: we don't track per-drawer history here)

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
      <div className="slide-up card" style={{
        padding: '32px 24px', width: '100%', maxWidth: 400,
        textAlign: 'center', position: 'relative', zIndex: 10,
      }}>
        <UserAvatar avatarId={winner?.avatarId ?? 0} size={80} style={{ margin: '0 auto 10px' }} />
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 4px' }}>
          {winner?.username}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--bg-pink)', fontWeight: 900, margin: '0 0 20px' }}>
          🏆 فاز باللعبة!
        </p>

        {iWon && (
          <div style={{
            border: 'var(--brutal-border)', background: 'var(--bg-yellow)',
            padding: '10px', marginBottom: 16,
            fontSize: 15, fontWeight: 900, color: 'var(--bg-dark-purple)',
          }}>
            🎉 أنت الفائز!
          </div>
        )}

        {/* Rankings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
          {sorted.map((p, i) => (
            <div key={p.uid} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: i === 0 ? 'var(--bg-yellow)' : '#FFF',
              border: 'var(--brutal-border)', marginBottom: -4,
            }}>
              <span style={{ fontWeight: 900, color: 'var(--color-muted)', width: 22, fontSize: 14 }}>
                #{i + 1}
              </span>
              <UserAvatar avatarId={p.avatarId ?? 0} size={36} />
              <span style={{ flex: 1, fontWeight: 900, color: 'var(--bg-dark-purple)', textAlign: 'right', fontSize: 14 }}>
                {p.username}
              </span>
              <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>
                {ds.scores?.[p.uid] || 0}
              </span>
            </div>
          ))}
          <div style={{ height: 4 }} />
        </div>

        <button onClick={handleLeave} className="btn btn-pink" style={{ width: '100%', padding: '15px', fontSize: 17 }}>
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
}
