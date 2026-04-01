import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom, setReady, startGame, leaveRoom, updateRoomSettings } from '../firebase/rooms';
import { startDrawGame } from '../firebase/drawRooms';
import { appCategories } from '../data/categories';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import UserAvatar from '../components/ui/UserAvatar';
import Toast from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Placeholder avatars for empty slots (animals not in AVATAR_EMOJIS)
const SLOT_PLACEHOLDERS = ['🦉', '🦊', '🐢', '🐸', '🦋', '🐬', '🦚'];



function PlayerRow({ player, isHost, isMe }) {
  const ready = player.isReady;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: '#FFF',
      border: 'var(--brutal-border)',
      marginBottom: -4, // overlap borders for seamless list
    }}>
      {/* Avatar circle */}
      <UserAvatar avatarId={player.avatarId ?? 0} size={54} />

      {/* Name + host badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 900, color: 'var(--bg-dark-purple)',
          display: 'flex', alignItems: 'center', gap: 6,
          direction: 'ltr', textAlign: 'left',
        }}>
          {player.username}
          {isMe && <span style={{ fontSize: 10, background: 'var(--bg-pink)', color: '#FFF', padding: '1px 5px', fontFamily: 'Cairo, sans-serif' }}>أنت</span>}
          {isHost && <span style={{ fontSize: 10, background: 'var(--bg-dark-purple)', color: 'var(--bg-yellow)', padding: '1px 5px', fontFamily: 'Cairo, sans-serif' }}>مضيف</span>}
        </div>
      </div>

      {/* Ready status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: ready ? '#22C55E' : '#9CA3AF',
          border: '2px solid rgba(0,0,0,0.15)',
          display: 'inline-block',
        }} />
        <span style={{
          fontSize: 13, fontWeight: 900,
          color: ready ? '#22C55E' : '#9CA3AF',
        }}>
          {ready ? 'جاهز' : 'انتظار...'}
        </span>
      </div>
    </div>
  );
}

function EmptySlotRow({ index }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: '#FFF',
      border: 'var(--brutal-border)',
      marginBottom: -4,
      opacity: 0.6,
    }}>
      {/* Gray avatar circle */}
      <div style={{
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        background: '#E5E7EB',
        border: '3px solid #D1D5DB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, filter: 'grayscale(0.3)',
      }}>
        {SLOT_PLACEHOLDERS[index % SLOT_PLACEHOLDERS.length]}
      </div>

      {/* Placeholder name */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#9CA3AF' }}>
          لاعب ينتظر...
        </div>
      </div>

      {/* Waiting status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D1D5DB', border: '2px solid rgba(0,0,0,0.1)', display: 'inline-block' }} />
        <span style={{ fontSize: 13, fontWeight: 900, color: '#9CA3AF' }}>انتظار...</span>
      </div>
    </div>
  );
}

export default function LobbyScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [starting, setStarting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const navRef = useRef(nav);
  useEffect(() => { navRef.current = nav; });

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { navRef.current.toHome(); return; }
      setRoom(data);
      if (data.status === 'playing') {
        if (data.mode === 'draw') navRef.current.toDrawGame?.();
        else navRef.current.toGame();
      }
    });
    return unsub;
  }, [roomCode]);

  if (!room) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const players    = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const maxPlayers = room.maxPlayers || 5;
  const emptyCount = Math.max(0, maxPlayers - players.length);
  const isHost     = room.hostUid === userProfile?.uid;
  const myPlayer   = room.players[userProfile?.uid];
  const allReady   = players.length >= 2 && players.every(p => p.isReady);
  // If a game was previously started (gameState exists), lock mode/category
  const gameStarted = !!(room.gameState || (room.drawState && room.drawState.roundStatus !== 'none'));

  const handleReady  = async () => { await setReady(roomCode, userProfile.uid, !myPlayer?.isReady); };
  const handleStart  = async () => {
    setStarting(true);
    try {
      if (room.mode === 'draw') await startDrawGame(roomCode);
      else await startGame(roomCode);
    }
    catch (e) { setToast(e.message); setStarting(false); }
  };
  const handleLeave  = async () => {
    await leaveRoom(roomCode, userProfile.uid, isHost, room.playerOrder);
    nav.toHome();
  };
  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setToast('تم نسخ الكود!');
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* placeholder for visual balance */}
        <div style={{ width: 90 }} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0, lineHeight: 1.2 }}>
            {room.mode === 'draw' ? 'الرسّام الفنان' : 'قرد الكلكس'}
          </h1>
          {isHost && !gameStarted ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'center' }}>
              <select
                value={room.mode}
                onChange={(e) => updateRoomSettings(roomCode, { mode: e.target.value })}
                style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, border: '2px solid var(--bg-dark-purple)', fontWeight: 700 }}
              >
                <option value="monkey">قرد</option>
                <option value="draw">رسم</option>
              </select>
              <select
                value={room.category}
                onChange={(e) => updateRoomSettings(roomCode, { category: e.target.value })}
                style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, border: '2px solid var(--bg-dark-purple)', fontWeight: 700 }}
              >
                {appCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          ) : (
             <span style={{ fontSize: 13, background: 'var(--bg-pink)', color: '#FFF', padding: '1px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
               {appCategories.find(c => c.id === room.category)?.name || room.category}
             </span>
          )}
        </div>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="btn btn-yellow"
          style={{ padding: '8px 14px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          خروج ←
        </button>
      </div>

      {showExitConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(28,16,63,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card slide-up" style={{ padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 12px' }}>تغادر الغرفة؟</h3>
            <p style={{ fontSize: 14, color: 'var(--bg-dark-purple)', opacity: 0.7, marginBottom: 20 }}>سيتم فصلك من هذه الجولة.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowExitConfirm(false)} className="btn btn-white" style={{ flex: 1, padding: 14 }}>لأ</button>
              <button onClick={handleLeave} className="btn btn-pink" style={{ flex: 1, padding: 14 }}>اخرج</button>
            </div>
          </div>
        </div>
      )}

      {/* Room code pill */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <button
          onClick={copyCode}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#FFF', border: 'var(--brutal-border)',
            boxShadow: 'var(--brutal-shadow)',
            padding: '8px 20px', cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 700 }}>رمز الفرقة:</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-dark-purple)', letterSpacing: 4, fontVariantNumeric: 'tabular-nums' }}>
            {roomCode}
          </span>
          <span>📋</span>
        </button>
      </div>

      {/* Section heading */}
      <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--bg-dark-purple)', textAlign: 'center', margin: '8px 0 12px' }}>
        اللاعبون في الغرفة
      </h2>

      {/* Player list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {players.map(p => (
          <PlayerRow
            key={p.uid}
            player={p}
            isHost={p.uid === room.hostUid}
            isMe={p.uid === userProfile?.uid}
          />
        ))}
        {Array.from({ length: emptyCount }, (_, i) => (
          <EmptySlotRow key={`slot-${i}`} index={players.length + i} />
        ))}
        {/* Fix the last border overlap */}
        <div style={{ height: 4 }} />
      </div>

      {/* Action button */}
      <div style={{ padding: '16px 20px 24px' }}>
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!allReady || starting}
            className="btn"
            style={{
              width: '100%', padding: '18px', fontSize: 17,
              background: allReady ? 'var(--bg-orange)' : '#9CA3AF',
              color: '#FFF',
              cursor: allReady ? 'pointer' : 'not-allowed',
            }}
          >
            {starting
              ? <LoadingSpinner size={22} />
              : allReady
                ? 'ابدأ اللعبة 🚀'
                : `ابدأ اللعبة (بانتظار الجميع)`}
          </button>
        ) : (
          <button
            onClick={handleReady}
            className="btn"
            style={{
              width: '100%', padding: '18px', fontSize: 17,
              background: myPlayer?.isReady ? '#22C55E' : '#FFF',
              color: myPlayer?.isReady ? '#FFF' : 'var(--bg-dark-purple)',
            }}
          >
            {myPlayer?.isReady ? '✓ أنا جاهز!' : 'اضغط للتجهيز'}
          </button>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
