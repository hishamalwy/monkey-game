import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom, setReady, startGame, leaveRoom } from '../firebase/rooms';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import Toast from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function LobbyScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { nav.toHome(); return; }
      setRoom(data);
      // Transition to game when host starts
      if (data.status === 'playing') nav.toGame();
    });
    return unsub;
  }, [roomCode]);

  if (!room) {
    return (
      <div style={{
        width: '100vw', height: '100dvh', background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const isHost = room.hostUid === userProfile?.uid;
  const myPlayer = room.players[userProfile?.uid];
  const readyCount = players.filter(p => p.isReady).length;
  const canStart = isHost && readyCount >= 2;

  const handleReady = async () => {
    await setReady(roomCode, userProfile.uid, !myPlayer?.isReady);
  };

  const handleStart = async () => {
    setStarting(true);
    try { await startGame(roomCode); }
    catch (e) { setToast(e.message); setStarting(false); }
  };

  const handleLeave = async () => {
    await leaveRoom(roomCode, userProfile.uid, isHost, room.playerOrder);
    nav.toHome();
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setToast('تم نسخ الكود!');
  };

  return (
    <div style={{
      width: '100vw', height: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={handleLeave} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
          ← خروج
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-header)', margin: 0 }}>
          غرفة الانتظار
        </h2>
        <div style={{ width: 60 }} />
      </div>

      {/* Room Code */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <button onClick={copyCode} style={{
          background: '#FFFFFF', border: 'none', borderRadius: 50,
          padding: '10px 24px', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(28,16,64,0.1)',
          display: 'inline-flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>رمز الغرفة:</span>
          <span style={{
            fontSize: 22, fontWeight: 900, color: 'var(--color-header)',
            letterSpacing: 4, fontFamily: 'monospace',
          }}>{roomCode}</span>
          <span style={{ fontSize: 14 }}>📋</span>
        </button>
      </div>

      {/* Players */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '0 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {players.map((p) => (
          <div key={p.uid} style={{
            background: '#FFFFFF', borderRadius: 16,
            padding: '14px 18px', display: 'flex',
            alignItems: 'center', gap: 14,
            boxShadow: '0 2px 12px rgba(28,16,64,0.07)',
          }}>
            {/* Avatar */}
            <div style={{
              width: 46, height: 46, borderRadius: '50%',
              background: 'var(--color-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, flexShrink: 0,
              border: p.uid === room.hostUid ? '2px solid var(--color-secondary)' : 'none',
            }}>
              {AVATAR_EMOJIS[p.avatarId ?? 0]}
            </div>

            {/* Name */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 16, fontWeight: 700, color: 'var(--color-header)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {p.username}
                {p.uid === room.hostUid && (
                  <span style={{ fontSize: 10, background: 'var(--color-secondary)', color: 'white', borderRadius: 20, padding: '2px 7px' }}>
                    مضيف
                  </span>
                )}
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: p.isReady ? 'var(--color-success)' : '#C8C8C8',
              }} />
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: p.isReady ? 'var(--color-success)' : 'var(--color-muted)',
              }}>
                {p.isReady ? 'جاهز' : 'ينتظر'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '16px', fontSize: 18,
              opacity: canStart ? 1 : 0.5,
            }}
          >
            {starting ? <LoadingSpinner size={22} /> : `ابدأ اللعبة (${readyCount}/${players.length} جاهز)`}
          </button>
        ) : (
          <button
            onClick={handleReady}
            className="btn"
            style={{
              width: '100%', padding: '16px', fontSize: 18,
              background: myPlayer?.isReady ? 'var(--color-success)' : '#C8C8C8',
              color: 'white',
            }}
          >
            {myPlayer?.isReady ? '✓ جاهز!' : 'اضغط للتجهيز'}
          </button>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
