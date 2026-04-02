import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom, setReady, startGame, leaveRoom, updateRoomSettings } from '../firebase/rooms';
import { startDrawGame } from '../firebase/drawRooms';
import { startSurvivalGame } from '../firebase/survivalRooms';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navRef = useRef(nav);
  useEffect(() => { navRef.current = nav; });

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { navRef.current.toHome(); return; }
      setRoom(data);
      if (data.status === 'playing') {
        if (data.mode === 'draw') navRef.current.toDrawGame?.();
        else if (data.mode === 'survival') navRef.current.toSurvivalGame?.();
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

  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const maxPlayers = room.maxPlayers || 5;
  const emptyCount = Math.max(0, maxPlayers - players.length);
  const isHost = room.hostUid === userProfile?.uid;
  const myPlayer = room.players[userProfile?.uid];
  const allReady = players.length >= 2 && players.every(p => p.isReady);
  // Lock settings if game is actively running. If we are in lobby, host can change settings.
  const isActivelyPlaying = room.status === 'playing';

  const handleReady = async () => { await setReady(roomCode, userProfile.uid, !myPlayer?.isReady); };
  const handleStart = async () => {
    setStarting(true);
    try {
      if (room.mode === 'draw') await startDrawGame(roomCode);
      else if (room.mode === 'survival') await startSurvivalGame(roomCode);
      else await startGame(roomCode);
    }
    catch (e) { setToast(e.message); setStarting(false); }
  };
  const handleLeave = async () => {
    await leaveRoom(roomCode, userProfile.uid, isHost, room.playerOrder);
    nav.toHome();
  };
  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode).catch(() => { });
    setToast('تم نسخ الكود!');
  };

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: '#FAFAFA',
      backgroundImage: 'radial-gradient(rgba(28, 16, 63, 0.15) 2px, transparent 2px)',
      backgroundSize: '24px 24px'
    }}>

      {/* Header & Settings Panel */}
      <div style={{ background: '#FFF', borderBottom: '5px solid var(--bg-dark-purple)', position: 'relative', zIndex: 2 }}>

        {/* Top Control Bar */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-yellow)', borderBottom: '3px solid var(--bg-dark-purple)' }}>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="pop"
            style={{
              background: '#FFF', border: '3px solid var(--bg-dark-purple)',
              padding: '6px 14px', fontSize: 14, fontWeight: 900, cursor: 'pointer',
              boxShadow: '3px 3px 0 var(--bg-dark-purple)'
            }}
          >
            ← خروج
          </button>

          <button
            onClick={copyCode}
            className="pop"
            style={{
              background: 'var(--bg-pink)', border: '3px solid var(--bg-dark-purple)',
              boxShadow: '3px 3px 0 var(--bg-dark-purple)',
              padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              color: '#FFF', transform: 'rotate(-2deg)'
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 900 }}>الكود:</span>
            <span style={{ fontSize: 18, fontWeight: 950, letterSpacing: 2 }}>{roomCode}</span>
            <span style={{ fontSize: 16 }}>📋</span>
          </button>
        </div>

        {/* Dashboard Title & Settings Accordion */}
        <div style={{ padding: '16px 20px', position: 'relative' }}>

          {/* Top Row: Mode Info + Settings Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: settingsOpen ? 16 : 0 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                fontSize: 28, background: 'var(--bg-yellow)', width: 52, height: 52,
                borderRadius: 12, border: '3px solid var(--bg-dark-purple)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '3px 3px 0 var(--bg-dark-purple)'
              }}>
                {room.mode === 'draw' ? '🎨' : room.mode === 'survival' ? '⚔️' : '🔊'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <h1 style={{ fontSize: 18, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: '0 0 4px', textTransform: 'uppercase' }}>
                  {room.mode === 'draw' ? 'خمن و ارسم' : room.mode === 'survival' ? 'البقاء للأقوى' : 'القرد بيتكلم'}
                </h1>
                <span style={{
                  fontSize: 11, background: 'var(--bg-pink)', color: '#FFF',
                  padding: '2px 10px', fontWeight: 950, borderRadius: 12,
                  boxShadow: '2px 2px 0 var(--bg-dark-purple)'
                }}>
                  {room.mode === 'survival' ? 'تحدي المعلومات السريع' :
                    ((room.mode === 'draw' ? drawCategories : appCategories).find(c => c.id === room.category)?.name || room.category)
                  }
                </span>
              </div>
            </div>

            {isHost && !isActivelyPlaying && (
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="pop"
                style={{
                  width: 44, height: 44, borderRadius: '50%', background: settingsOpen ? 'var(--bg-dark-purple)' : '#FFF',
                  color: settingsOpen ? '#FFF' : 'var(--bg-dark-purple)',
                  border: '3px solid var(--bg-dark-purple)', fontSize: 20, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '3px 3px 0 var(--bg-pink)', cursor: 'pointer', transition: 'all 0.2s',
                  transform: settingsOpen ? 'rotate(90deg)' : 'none'
                }}
              >
                ⚙️
              </button>
            )}
          </div>

          {/* Settings Expansion */}
          {isHost && !isActivelyPlaying && settingsOpen && (
            <div className="slide-up" style={{
              background: '#FAFAFA', border: '3px dashed var(--bg-dark-purple)',
              padding: '16px', borderRadius: 12, marginTop: 12
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: '0 0 10px', textTransform: 'uppercase' }}>أسلوب اللعب 🎮</h3>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: room.mode !== 'survival' ? 16 : 0 }}>
                {[
                  { id: 'monkey', emoji: '🔊', label: 'قرد' },
                  { id: 'draw', emoji: '🎨', label: 'رسم' },
                  { id: 'survival', emoji: '⚔️', label: 'بقاء' }
                ].map(m => {
                  const active = room.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => updateRoomSettings(roomCode, { mode: m.id, category: (m.id === 'draw' ? drawCategories : appCategories)[0].id })}
                      style={{
                        flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 950,
                        background: active ? 'var(--bg-dark-purple)' : '#FFF',
                        color: active ? '#FFF' : 'var(--bg-dark-purple)',
                        border: '3px solid var(--bg-dark-purple)',
                        boxShadow: active ? '3px 3px 0 var(--bg-pink)' : '2px 2px 0 rgba(0,0,0,0.1)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s'
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{m.emoji}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {room.mode !== 'survival' && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: '0 0 8px', textTransform: 'uppercase' }}>نوع الأسئلة 📦</h3>
                  <div style={{
                    display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 4px 8px',
                    scrollbarWidth: 'none', msOverflowStyle: 'none'
                  }}>
                    {(room.mode === 'draw' ? drawCategories : appCategories).map(cat => {
                      const active = room.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => updateRoomSettings(roomCode, { category: cat.id })}
                          style={{
                            whiteSpace: 'nowrap', padding: '6px 12px', fontSize: 12, fontWeight: 950,
                            background: active ? 'var(--bg-pink)' : '#FFF',
                            color: active ? '#FFF' : 'var(--bg-dark-purple)',
                            border: '2px solid var(--bg-dark-purple)',
                            boxShadow: active ? '2px 2px 0 var(--bg-dark-purple)' : '2px 2px 0 rgba(0,0,0,0.1)',
                            borderRadius: 20, cursor: 'pointer', transition: 'all 0.1s'
                          }}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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

      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0 }}>
          مين جاهز للمطحنة؟ 🔥
        </h2>
        <span style={{ fontSize: 12, fontWeight: 950, background: 'var(--bg-dark-purple)', color: '#FFF', padding: '2px 8px' }}>
          {players.length}/{maxPlayers}
        </span>
      </div>

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

      {/* Action button container */}
      <div style={{ padding: '16px 20px 24px', background: '#FFF', borderTop: '5px solid var(--bg-dark-purple)' }}>
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!allReady || starting}
            className={allReady && !starting ? "btn-yellow pop" : ""}
            style={{
              width: '100%', padding: '18px', fontSize: 20, fontWeight: 950,
              background: allReady ? 'var(--bg-yellow)' : '#FAFAFA',
              color: allReady ? 'var(--bg-dark-purple)' : '#6B7280',
              border: allReady ? '5px solid var(--bg-dark-purple)' : '4px dashed #9CA3AF',
              boxShadow: allReady ? '6px 6px 0 var(--bg-dark-purple)' : 'none',
              cursor: allReady ? 'pointer' : 'not-allowed',
              transform: allReady ? 'rotate(-1deg)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {starting
              ? <LoadingSpinner size={24} color="var(--bg-dark-purple)" />
              : allReady
                ? 'دوس يا هوست! 🚀'
                : 'حد يصحيهم عشان نبدأ! ⏳'}
          </button>
        ) : (
          <button
            onClick={handleReady}
            className="pop"
            style={{
              width: '100%', padding: '18px', fontSize: 20, fontWeight: 950,
              background: myPlayer?.isReady ? 'var(--bg-green)' : 'var(--bg-pink)',
              color: '#FFF',
              border: '5px solid var(--bg-dark-purple)',
              boxShadow: '6px 6px 0 var(--bg-dark-purple)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transform: myPlayer?.isReady ? 'rotate(1deg)' : 'rotate(-1deg)'
            }}
          >
            {myPlayer?.isReady ? 'أنا وحش وجاهز! 🦍' : 'دوس عشان تبقى جاهز! ⚡'}
          </button>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
