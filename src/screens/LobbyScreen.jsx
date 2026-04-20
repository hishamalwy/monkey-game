import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { listenToRoom, setReady, startGame, leaveRoom, updateRoomSettings, kickPlayer } from '../firebase/rooms';
import { startDrawGame } from '../firebase/drawRooms';
import { startSurvivalGame } from '../firebase/survivalRooms';
import { startCharadesGame } from '../firebase/charadesRooms';
import { blockUser } from '../firebase/blocklist';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';
import UserAvatar from '../components/ui/UserAvatar';
import ReportModal from '../components/shared/ReportModal';
import Toast from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

const SLOT_PLACEHOLDERS = ['🦉', '🦊', '🐢', '🐸', '🦋', '🐬', '🦚'];

function PlayerRow({ player, isHost, isMe, canKick, onKick, onReport, onBlock }) {
  const ready = player.isReady;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '16px',
      background: '#FFF',
      border: '4px solid #000',
      marginBottom: 10,
      boxSizing: 'border-box',
      width: '100%',
      borderRadius: 0,
      boxShadow: '4px 4px 0 rgba(0,0,0,0.1)'
    }}>
      <UserAvatar avatarId={player.avatarId ?? 1} size={56} border="2px solid #000" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 900, color: '#000',
          display: 'flex', alignItems: 'center', gap: 6,
          direction: 'ltr', textAlign: 'left',
        }}>
          {player.username}
          {isMe && <span style={{ fontSize: 9, background: 'var(--neo-pink)', color: '#000', padding: '1px 6px', border: '1.5px solid #000', fontWeight: 900 }}>أنت</span>}
          {isHost && <span style={{ fontSize: 9, background: '#000', color: 'var(--neo-yellow)', padding: '1px 6px', border: '1.5px solid #000', fontWeight: 900 }}>مضيف</span>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {canKick && !isMe && (
          <button
            onClick={() => onKick(player.uid)}
            style={{
              background: 'var(--neo-pink)', border: '2.5px solid #000',
              color: '#000', padding: '4px 10px', fontSize: 10, fontWeight: 900,
              borderRadius: 0, cursor: 'pointer', boxShadow: '3px 3px 0 #000',
            }}
          >
            طرد 👟
          </button>
        )}
        {!isMe && (
          <button
            onClick={() => onReport(player)}
            style={{
              background: '#FFF', border: '2px solid #000',
              color: '#000', padding: '4px 8px', fontSize: 10, fontWeight: 900,
              borderRadius: 0, cursor: 'pointer',
            }}
          >
            ⚠️
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 12, height: 12, borderRadius: 0,
            background: ready ? 'var(--neo-green)' : '#DDD',
            border: '2.5px solid #000',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 900,
            color: ready ? 'var(--neo-green)' : '#999',
          }}>
            {ready ? 'جاهز ✓' : '...'}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptySlotRow({ index }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '16px',
      background: '#FFF',
      border: '4px dashed #DDD',
      marginBottom: 10,
      opacity: 0.8,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 0, flexShrink: 0,
        background: '#EEE',
        border: '3.5px solid #DDD',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, filter: 'grayscale(1)',
      }}>
        {SLOT_PLACEHOLDERS[index % SLOT_PLACEHOLDERS.length]}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#AAA' }}>
          في انتظار لاعب...
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: 0, background: '#DDD', border: '2px solid #EEE', display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 900, color: '#AAA' }}>فارغ</span>
      </div>
    </div>
  );
}

export default function LobbyScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playClick, playJoin } = useAudio();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [starting, setStarting] = useState(false);
  const prevPlayerCountRef = useRef(0);
  const [reportTarget, setReportTarget] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { nav.toHome(); return; }
      setRoom(data);
      if (data.status === 'playing') {
        if (data.mode === 'draw') nav.toDrawGame();
        else if (data.mode === 'survival') nav.toSurvivalGame();
        else if (data.mode === 'charades') nav.toCharadesGame();
        else nav.toGame();
      }
    });
    return unsub;
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const players = room ? (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean) : [];
  const maxPlayers = room?.maxPlayers || 5;

  useEffect(() => {
    const count = players.length;
    if (count > prevPlayerCountRef.current && prevPlayerCountRef.current > 0) {
      playJoin();
    }
    prevPlayerCountRef.current = count;
  }, [players.length, playJoin]);

  const isHost = room?.hostUid === userProfile?.uid;
  const myPlayer = room?.players?.[userProfile?.uid];
  const allReady = players.length >= 2 && players.every(p => p.isReady);
  const isActivelyPlaying = room?.status === 'playing';

  useEffect(() => {
    if (isHost && myPlayer && !myPlayer.isReady) {
      setReady(roomCode, userProfile.uid, true).catch(() => { });
    }
  }, [isHost, myPlayer?.isReady, roomCode, userProfile?.uid]);

  if (!room) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const emptyCount = Math.max(0, maxPlayers - players.length);

  const handleReady = async () => { playClick(); await setReady(roomCode, userProfile.uid, !myPlayer?.isReady); };
  const handleStart = async () => {
    playClick();
    setStarting(true);
    try {
      if (room.mode === 'draw') await startDrawGame(roomCode, userProfile.uid);
      else if (room.mode === 'survival') await startSurvivalGame(roomCode, userProfile.uid);
      else if (room.mode === 'charades') await startCharadesGame(roomCode, userProfile.uid);
      else await startGame(roomCode);
    }
    catch (e) { setToast(e.message); setStarting(false); }
  };
  const handleLeave = async () => {
    playClick();
    await leaveRoom(roomCode, userProfile.uid);
    nav.toHome();
  };
  const handleKick = async (targetUid) => {
    playClick();
    if (isHost) {
      try {
        await kickPlayer(roomCode, userProfile.uid, targetUid);
        setToast('تم طرد اللاعب');
      } catch (e) { setToast(e.message); }
    }
  };
  const handleReport = (player) => {
    setReportTarget(player);
  };
  const handleBlock = async (targetUid) => {
    try {
      await blockUser(userProfile.uid, targetUid);
      setToast('تم حظر اللاعب');
    } catch { setToast('حدث خطأ'); }
  };

  const shareRoom = async () => {
    playClick();
    const url = `${window.location.origin}${window.location.pathname}#/lobby/${roomCode}?join=${roomCode}`;
    const inviteMessage = `انضم لغرفتي في لعبة كلكس! 🐵\nكود الغرفة: ${roomCode}\nاضغط الرابط للانضمام مباشرة:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'كلكس - دعوة لعب',
          text: inviteMessage,
          url: url,
        });
      } catch (e) {
        // User cancelled or failed
      }
    } else {
      navigator.clipboard?.writeText(`${inviteMessage}\nالرابط: ${url}`).catch(() => { });
      setToast('تم نسخ رابط الدعوة!');
    }
  };

  return (
    <div className="brutal-bg" style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{ background: '#FFF', borderBottom: '5px solid #000', position: 'relative', zIndex: 2 }}>

        {/* Top Bar */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--neo-yellow)', borderBottom: '4px solid #000' }}>
          <button
            onClick={() => { playClick(); setShowExitConfirm(true); }}
            className="pop"
            style={{
              background: '#FFF', border: '3.5px solid #000',
              padding: '6px 16px', fontSize: 14, fontWeight: 900, cursor: 'pointer',
              boxShadow: '4px 4px 0 #000', borderRadius: 0, transition: 'none'
            }}
          >
            ← خروج
          </button>

          <button
            onClick={shareRoom}
            className="pop"
            style={{
              background: 'var(--neo-cyan)', border: '3px solid #000',
              boxShadow: '4px 4px 0 #000',
              padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              color: '#000', transform: 'rotate(-1deg)', borderRadius: 0
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 900 }}>الكود:</span>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, direction: 'ltr', display: 'inline-block' }}>{roomCode}</span>
          </button>
        </div>

        {/* Mode Info */}
        <div style={{ padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: settingsOpen ? 16 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                fontSize: 28, background: 'var(--neo-yellow)', width: 52, height: 52,
                borderRadius: 0, border: '4px solid #000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '4px 4px 0 #000'
              }}>
                {room.mode === 'draw' ? '🎨' : room.mode === 'survival' ? '⚔️' : room.mode === 'charades' ? '🎭' : '🔊'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--neo-black)', margin: '0 0 4px' }}>
                  {room.mode === 'draw' ? 'ارسم وخمن 🎨' : room.mode === 'survival' ? 'البقاء للأقوى ⚔️' : room.mode === 'charades' ? 'بدون كلام 🎭' : 'كلكس 🔊'}
                </h1>
                <span style={{
                  fontSize: 10, background: 'var(--neo-pink)', color: '#000',
                  padding: '2px 10px', fontWeight: 900, borderRadius: 0,
                  boxShadow: '3px 3px 0 #000', border: '2px solid #000'
                }}>
                  {room.mode === 'survival' ? 'مستوى صعوبة: عالٍ' :
                    room.mode === 'charades' ? 'تمثيل صامت' :
                      ((room.mode === 'draw' ? drawCategories : appCategories).find(c => c.id === room.category)?.name || room.category)
                  }
                </span>
              </div>
            </div>

            {isHost && !isActivelyPlaying && (
              <button
                onClick={() => { playClick(); setSettingsOpen(!settingsOpen); }}
                className="pop"
                style={{
                  width: 44, height: 44, borderRadius: 0, background: settingsOpen ? 'var(--neo-black)' : '#FFF',
                  color: settingsOpen ? '#FFF' : 'var(--neo-black)',
                  border: '4px solid #000', fontSize: 20, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '4px 4px 0 var(--neo-pink)', cursor: 'pointer', transition: 'all 0.1s',
                  transform: settingsOpen ? 'rotate(90deg)' : 'none'
                }}
              >
                ⚙️
              </button>
            )}
          </div>

          {/* Settings Panel */}
          {isHost && !isActivelyPlaying && settingsOpen && (
            <div className="slide-up" style={{
              background: '#FFF', border: '3px solid #000',
              padding: '16px', borderRadius: 0, marginTop: 12, boxShadow: '6px 6px 0 #000'
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 900, color: 'var(--neo-black)', margin: '0 0 10px', fontStyle: 'italic' }}>إعداد وضع اللعب</h3>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: room.mode !== 'survival' ? 16 : 0 }}>
                {[
                  { id: 'monkey', emoji: '🔊', label: 'كلكس' },
                  { id: 'draw', emoji: '🎨', label: 'رسم' },
                  { id: 'survival', emoji: '⚔️', label: 'بقاء' },
                  { id: 'charades', emoji: '🎭', label: 'تمثيل' }
                ].map(m => {
                  const active = room.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        const defaultCat = (m.id === 'draw' ? drawCategories : appCategories)[0].id;
                        updateRoomSettings(roomCode, userProfile.uid, { mode: m.id, category: defaultCat });
                      }}
                      style={{
                        flex: 1, padding: '12px 4px', fontSize: 12, fontWeight: 900,
                        background: active ? 'var(--neo-yellow)' : '#FFF',
                        color: '#000',
                        border: '3px solid #000',
                        boxShadow: active ? '4px 4px 0 #000' : 'none',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        borderRadius: 0, cursor: 'pointer', transition: 'none',
                        transform: active ? 'translate(-2px, -2px)' : 'none',
                        zIndex: active ? 2 : 1
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{m.emoji}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {room.mode !== 'survival' && room.mode !== 'charades' && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 900, color: '#000', margin: '0 0 10px' }}>اختيار الفئة</h3>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 4px 8px', scrollbarWidth: 'none' }}>
                    {(room.mode === 'draw' ? drawCategories : appCategories).map(cat => {
                      const active = room.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => updateRoomSettings(roomCode, userProfile.uid, { category: cat.id })}
                          style={{
                            whiteSpace: 'nowrap', padding: '6px 12px', fontSize: 11, fontWeight: 900,
                            background: active ? 'var(--neo-pink)' : '#FFF',
                            color: '#000',
                            border: '2px solid #000',
                            boxShadow: active ? '3px 3px 0 #000' : 'none',
                            borderRadius: 0, cursor: 'pointer', transition: 'none'
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

      {/* Exit Confirm */}
      {showExitConfirm && (
        <div role="dialog" aria-label="تأكيد المغادرة" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card slide-up" style={{ padding: 32, width: '100%', maxWidth: 360, textAlign: 'center', borderRadius: 0, border: '6px solid #000', background: '#FFF', boxShadow: '12px 12px 0 var(--neo-pink)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🚪</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: '#000', margin: '0 0 12px' }}>هل تريد المغادرة؟</h3>
            <p style={{ fontSize: 14, color: '#666', fontWeight: 900, marginBottom: 24 }}>ستخسر تقدمك في الغرفة.</p>
            <div style={{ display: 'flex', gap: 14 }}>
              <button onClick={() => setShowExitConfirm(false)} className="btn btn-white" style={{ flex: 1, padding: 18, borderRadius: 0, border: '4px solid #000', fontWeight: 900 }}>لا</button>
              <button onClick={handleLeave} className="btn btn-pink" style={{ flex: 1, padding: 18, borderRadius: 0, border: '4px solid #000', fontWeight: 900 }}>نعم</button>
            </div>
          </div>
        </div>
      )}

      {/* Players Header */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--neo-black)', margin: 0 }}>
          اللاعبون في الغرفة
        </h2>
        <span style={{ fontSize: 12, fontWeight: 900, background: 'var(--neo-black)', color: 'var(--neo-yellow)', padding: '2px 10px', boxShadow: '3px 3px 0 var(--neo-pink)', border: '2px solid #000' }}>
          {players.length}/{maxPlayers}
        </span>
      </div>

      {/* Player List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {players.map(p => (
          <PlayerRow
            key={p.uid}
            player={p}
            isHost={p.uid === room.hostUid}
            isMe={p.uid === userProfile?.uid}
            canKick={isHost}
            onKick={handleKick}
            onReport={handleReport}
            onBlock={handleBlock}
          />
        ))}
        {Array.from({ length: emptyCount }, (_, i) => (
          <EmptySlotRow key={`slot-${i}`} index={players.length + i} />
        ))}
        <div style={{ height: 4 }} />
      </div>

      {/* Action Button */}
      <div style={{ padding: '16px 20px 24px', background: 'var(--neo-white)', borderTop: '6px solid #000' }}>
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!allReady || starting}
            className={allReady && !starting ? "btn-yellow pop" : ""}
            style={{
              width: '100%', padding: '20px', fontSize: 20, fontWeight: 900,
              background: allReady ? 'var(--neo-yellow)' : '#DDD',
              color: '#000',
              border: '5px solid #000',
              boxShadow: allReady ? '8px 8px 0 #000' : 'none',
              cursor: allReady ? 'pointer' : 'not-allowed',
              transform: allReady ? 'rotate(-1deg)' : 'none',
              transition: 'none',
              borderRadius: 0
            }}
          >
            {starting
              ? <LoadingSpinner size={24} color="#000" />
              : allReady
                ? 'ابدأ اللعبة 🚀'
                : 'انتظار جاهزية الكل ⏳'}
          </button>
        ) : (
          <button
            onClick={handleReady}
            className="pop"
            style={{
              width: '100%', padding: '20px', fontSize: 20, fontWeight: 900,
              background: myPlayer?.isReady ? 'var(--neo-green)' : 'var(--neo-pink)',
              color: '#000',
              border: '5px solid #000',
              boxShadow: '8px 8px 0 #000',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transform: myPlayer?.isReady ? 'rotate(1deg)' : 'rotate(-1deg)',
              borderRadius: 0
            }}
          >
            {myPlayer?.isReady ? 'جاهز للعب 🦍' : 'أنا جاهز ⚡'}
          </button>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      {reportTarget && (
        <ReportModal
          targetUid={reportTarget.uid}
          targetUsername={reportTarget.username}
          roomCode={roomCode}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
