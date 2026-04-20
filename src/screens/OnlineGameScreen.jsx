import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';
import UserAvatar from '../components/ui/UserAvatar';
import GameScreen from '../components/GameScreen';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { stopHorn, startHorn, getHornType, HORN_TYPES, warmAudio, playSound } from '../utils/audio';
import { useAudio } from '../context/AudioContext';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { connectSocket, disconnectSocket, emitSound, togglePlayerMute, isPlayerMuted } from '../services/socket';
import { appCategories } from '../data/categories';
import { normalizeArabic } from '../utils/textUtils';

export default function OnlineGameScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { user } = useAuth();
  const {
    room, players, isMyTurn, computedTimer, isHost,
    pressLetter, pressDelete, pressChallenge, leaveRoom, submitSuspectWord, resolveSuspect,
    triggerHorn, resetToLobby,
  } = useRoom(roomCode);
  const { playTension, stopTension } = useAudio();
  const vh = useVisualViewport();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isHonking, setIsHonking] = useState(false);
  const [, setTick] = useState(0); // For forcing re-renders on mute
  const [suspectWord, setSuspectWord] = useState('');

  // Tension music logic
  useEffect(() => {
    if (room?.status === 'playing' && computedTimer <= 5 && computedTimer > 0) {
      playTension();
    } else {
      stopTension();
    }
  }, [computedTimer, room?.status, playTension, stopTension]);

  useEffect(() => {
    return () => stopTension();
  }, [stopTension]);

  // Sound Server connection
  useEffect(() => {
    if (roomCode) {
      connectSocket(roomCode);
    }
    return () => disconnectSocket();
  }, [roomCode]);

  const MONKEY_LIMIT = 4;

  // Color ramp: empty → yellow → orange → red → skull
  const QM_COLORS = ['#E5E7EB', 'var(--neo-yellow)', '#FF8C00', 'var(--neo-pink)', 'var(--neo-black)'];

  const MonkeySVG = ({ qm }) => {
    const pct = Math.min((qm / 4) * 100, 100);
    const fillColor = QM_COLORS[Math.min(qm, 4)];
    const strokeColor = qm >= 4 ? '#fff' : 'var(--neo-black)';
    return (
      <svg viewBox="0 0 100 100" width="38" height="38" style={{ overflow: 'visible', display: 'block' }}>
        {/* Background (empty monkey) */}
        <rect x="0" y="0" width="100" height="100" fill="#E5E7EB" mask="url(#global-monkey-mask)" />
        {/* Colored fill rising from bottom */}
        {qm > 0 && (
          <rect
            x="0" y={100 - pct} width="100" height="100"
            fill={fillColor}
            mask="url(#global-monkey-mask)"
            style={{ transition: 'y 0.4s cubic-bezier(0.34,1.56,0.64,1), fill 0.3s ease' }}
          />
        )}
        {/* Outline */}
        <g fill="none" stroke={strokeColor} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M 68 80 Q 95 95 90 60 Q 90 40 75 60" />
          <circle cx="26" cy="36" r="10" />
          <circle cx="74" cy="36" r="10" />
          <path d="M 32 47 h 36 v 32 q 0 10 -18 10 q -18 0 -18 -10 Z" />
          <circle cx="50" cy="32" r="20" />
        </g>
      </svg>
    );
  };

  // Quarter-pip indicator  (●●●●)
  const QuarterPips = ({ qm, isLoser }) => (
    <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      {[0, 1, 2, 3].map(i => {
        const filled = i < (qm % 4) || (qm > 0 && i < 4 && qm % 4 === 0);
        return (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: 0,
            background: filled ? (isLoser ? '#FFF' : 'var(--neo-pink)') : '#DDD',
            border: '2px solid var(--neo-black)'
          }} />
        );
      })}
      {Array.from({ length: Math.floor(qm / 4) }).map((_, i) => <span key={i} style={{ fontSize: 14 }}>🐒</span>)}
    </div>
  );

  const mountedRef = useRef(false);
  useEffect(() => {
    // If explicitly null from Firestore, the room is gone
    if (room === null) { nav.toHome(); return; }
    if (room === undefined) return;
    
    if (room.status === 'round_result') nav.toRoundResult();
    if (room.status === 'game_over') nav.toGameOver();
    
    if (room.status === 'lobby' && mountedRef.current) {
      nav.toLobby(roomCode);
    }
    
    if (room.status === 'playing' || room.status === 'suspect_question') {
      mountedRef.current = true;
    }
  }, [room?.status, room === null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isMyTurn) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); pressDelete(); return; }
      const arabicRegex = /^[\u0600-\u06FF\s]$/;
      if (arabicRegex.test(e.key)) { e.preventDefault(); pressLetter(e.key); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, pressLetter, pressDelete]);

  useEffect(() => () => stopHorn(), []);

  const handleHornStart = () => { 
    warmAudio(); 
    setIsHonking(true); 
    // Both Socket and Firebase for maximum compatibility
    emitSound(roomCode, getHornType(), true);
    triggerHorn(true);
    // Play locally immediately
    startHorn(getHornType());
  };

  // Alert player when it's their turn
  const prevTurnRef = useRef(isMyTurn);
  useEffect(() => {
    if (isMyTurn && !prevTurnRef.current && room?.status === 'playing') {
      playSound('alert');
      // Gentle vibration if supported
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
    prevTurnRef.current = isMyTurn;
  }, [isMyTurn, room?.status]);
  
  const handleHornEnd = () => { 
    setIsHonking(false); 
    emitSound(roomCode, getHornType(), false);
    triggerHorn(false);
    // Stop locally
    stopHorn();
  };

  const handleExit = async () => {
    await leaveRoom();
    nav.toHome();
  };

  if (!room?.gameState) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;

  const currentPlayerUid = room.gameState.currentPlayerUid;

  const userId = user?.uid;
  const isSuspected = room.status === 'suspect_question' && room.gameState.suspectedUid === userId;

  const currentCategoryWords = (() => {
    if (!room?.category) return [];
    const cat = appCategories.find(c => c.id === room.category);
    return cat ? cat.words : [];
  })();

  const { suspectAnswerValid, isDuplicate, isInJSON } = (() => {
     if (!room?.gameState?.suspectAnswer) return { suspectAnswerValid: false, isDuplicate: false, isInJSON: false };
     const ans = normalizeArabic(room.gameState.suspectAnswer);
     const challenging = normalizeArabic(room.gameState.challengingWord || '');
     const usedWords = room.gameState.usedWords || [];
     
     const match = currentCategoryWords.some(w => normalizeArabic(w) === ans);
     const startsWithPrefix = ans.startsWith(challenging);
     const duplicated = usedWords.includes(ans); 

     return {
       suspectAnswerValid: match && startsWithPrefix && !duplicated,
       isDuplicate: duplicated,
       isInJSON: match && startsWithPrefix
     };
  })();

  return (
    <div 
      onClick={() => warmAudio()}
      onTouchStart={() => warmAudio()}
      style={{ width: '100%', height: `${vh}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
    >
      <header style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h2 className="title-glitch" style={{ margin: 0, fontSize: 24, transform: 'none', lineHeight: 1 }}>كلكس!</h2>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--neo-black)', background: 'var(--neo-pink)', padding: '2px 8px', display: 'inline-block', border: '2px solid #000', marginTop: 4, boxShadow: '2px 2px 0 #000' }}>
            الفئة: {room.category === 'objects' ? 'أشياء' : room.category === 'clubs' ? 'أندية' : room.category === 'countries' ? 'بلاد' : room.category || 'عام'}
          </div>
        </div>
        <button onClick={() => setShowExitConfirm(true)} className="btn btn-white" style={{ padding: '8px 16px', fontSize: 14 }}>✕ خروج</button>
      </header>

      <div style={{ padding: '16px 20px', display: 'flex', gap: 12, overflowX: 'auto', flexShrink: 0, position: 'relative' }}>
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <mask id="global-monkey-mask">
              <rect x="0" y="0" width="100" height="100" fill="white" />
              <circle cx="50" cy="32" r="22" fill="black" />
            </mask>
          </defs>
        </svg>

        {players.map((p) => {
          const qm = p.quarterMonkeys || 0;
          const eliminated = qm >= MONKEY_LIMIT;
          const isActive = p.uid === currentPlayerUid && !eliminated;
          return (
            <div key={p.uid} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '12px 10px 10px', minWidth: 84, flexShrink: 0,
              background: isActive ? 'var(--neo-yellow)' : eliminated ? '#DDD' : '#FFF',
              border: `4px solid #000`,
              borderRadius: 0,
              boxShadow: isActive ? '6px 6px 0px #000' : 'none',
              transform: isActive ? 'translateY(-4px)' : 'none',
              opacity: eliminated ? 0.7 : 1,
              transition: 'none',
              zIndex: isActive ? 10 : 1
            }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <UserAvatar avatarId={p.avatarId ?? 0} size={44} border="2px solid #000" />
                {eliminated && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, border: '2px solid #000'
                  }}>💀</div>
                )}
                
                {/* Individual Mute Icon */}
                {p.uid !== userId && (
                  <button 
                    onClick={(e) => {
                       e.stopPropagation();
                       togglePlayerMute(p.uid);
                       setTick(t => t+1);
                    }}
                    style={{
                      position: 'absolute', bottom: -6, right: -6,
                      background: isPlayerMuted(p.uid) ? 'var(--neo-pink)' : '#FFF',
                      border: '2.5px solid #000',
                      width: 28, height: 28, borderRadius: 0, padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, zIndex: 5, cursor: 'pointer',
                      boxShadow: '3px 3px 0 rgba(0,0,0,0.1)'
                    }}
                  >
                    {isPlayerMuted(p.uid) ? '🔇' : '🔊'}
                  </button>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 900, lineHeight: 1.2, marginBottom: 8,
                color: '#000',
                maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.username}
              </span>
              <MonkeySVG qm={qm} />
              <QuarterPips qm={qm} isLoser={eliminated} />
            </div>
          );
        })}
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 12, borderRadius: 0, background: '#FFF', borderTop: '5px solid #000' }}>
        <GameScreen
          currentWord={room.gameState.currentWord}
          timeRemaining={computedTimer}
          timeLimit={room.timeLimit}
          currentPlayer={room.players[room.gameState.currentPlayerUid]}
          isAiTurn={false}
          isMyTurn={isMyTurn}
          onKeyPress={pressLetter}
          onDelete={pressDelete}
          onChallenge={pressChallenge}
          isOnline={true}
        />
      </main>

      {(() => {
        const hornId = getHornType();
        const horn = HORN_TYPES.find(h => h.id === hornId) || HORN_TYPES[0];
        return (
          <div style={{ position: 'absolute', bottom: 32, left: 32, zIndex: 100 }}>
             <button onMouseDown={handleHornStart} onMouseUp={handleHornEnd} onTouchStart={(e) => { e.preventDefault(); handleHornStart(); }} onTouchEnd={(e) => { e.preventDefault(); handleHornEnd(); }}
               className={`btn ${isHonking ? 'btn-pink' : 'btn-yellow'} pop`}
               style={{ width: 80, height: 80, borderRadius: 0, padding: 14, boxShadow: '8px 8px 0 #000', border: '5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'none' }}>
               {horn.src ? (
                 <img src={`${import.meta.env.BASE_URL}icons/${horn.src}`} alt={horn.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
               ) : (
                 <span style={{ fontSize: 38 }}>{horn.emoji}</span>
               )}
             </button>
          </div>
        );
      })()}

      {room.status === 'suspect_question' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card slide-up" style={{ padding: 28, width: '100%', maxWidth: 360, textAlign: 'center', border: '5px solid #000', boxShadow: '12px 12px 0 #000', borderRadius: 0 }}>
             <div style={{ fontSize: 56, marginBottom: 16 }}>🧐</div>
             <h3 style={{ fontSize: 24, fontWeight: 900, color: '#000', margin: '0 0 8px' }}>تحدي! 🧐</h3>

              {(isSuspected && !room.gameState.suspectAnswer) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ fontSize: 16, fontWeight: 900, margin: '0 0 14px', color: '#000', direction: 'rtl' }}>ما هي الكلمة المقصودة؟ 🐒</p>
                  <input
                     type="text"
                     placeholder="اكتب الكلمة..."
                     className="input-field"
                     style={{ fontSize: 20, padding: 16, textAlign: 'center', borderRadius: 0, border: '4px solid #000', fontWeight: 900, background: '#FFF' }}
                     autoFocus
                     value={suspectWord}
                     onChange={(e) => setSuspectWord(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && suspectWord.trim()) {
                         submitSuspectWord(suspectWord);
                         setSuspectWord('');
                       }
                     }}
                  />
                  <button onClick={() => {
                     if (suspectWord.trim()) {
                       submitSuspectWord(suspectWord);
                       setSuspectWord('');
                     }
                  }} className="btn btn-pink" style={{ padding: 18, fontSize: 18, borderRadius: 0, border: '4px solid #000', boxShadow: '6px 6px 0 #000', fontWeight: 900 }}>إرسال 🚀</button>
                </div>
              ) : (
                <div>
                   {isHost && !room.gameState.suspectAnswer && (
                     <div style={{ padding: '12px 16px', background: 'var(--neo-yellow)', border: '3.5px solid #000', borderRadius: 0, marginBottom: 16, fontSize: 13, fontWeight: 900, direction: 'rtl' }}>
                        ⏳ في انتظار الرد...
                     </div>
                   )}
 
                   {room.gameState.suspectAnswer && (
                     <div style={{ padding: 20, background: '#FFF', borderRadius: 0, border: '5px solid #000', boxShadow: '8px 8px 0 #000', marginBottom: 24 }}>
                        <div style={{ fontSize: 12, color: '#666', fontWeight: 900, marginBottom: 8, textAlign: 'right', direction: 'rtl' }}>الكلمة:</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: suspectAnswerValid ? 'var(--neo-green)' : (isDuplicate ? 'var(--neo-pink)' : '#000'), textDecoration: (isDuplicate || !isInJSON) ? 'line-through' : 'none' }}>
                         {room.gameState.suspectAnswer}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 14, fontWeight: 900, color: '#000', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, direction: 'rtl' }}>
                          <span style={{ color: isInJSON ? 'var(--neo-green)' : 'var(--neo-pink)' }}>
                            {isInJSON ? '✅ موجودة في القاموس' : '❌ غير موجودة في القاموس'}
                          </span>
                          <span style={{ color: isDuplicate ? 'var(--neo-pink)' : 'var(--neo-green)' }}>
                            {isDuplicate ? '⚠️ مكررة' : '✅ جديدة'}
                          </span>
                        </div>
                     </div>
                   )}
 
                   {isHost && room.gameState.suspectAnswer && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--neo-pink)', marginBottom: 6, direction: 'rtl' }}>
                          ⚠️ حدد النتيجة!
                        </div>
                        <div style={{ display: 'flex', gap: 14 }}>
                           <button onClick={() => resolveSuspect(false)} className="btn btn-white" style={{ flex: 1, padding: 18, border: '4px solid #000', borderRadius: 0, fontWeight: 900 }}>خطأ ❌</button>
                           <button onClick={() => resolveSuspect(true)} className="btn btn-yellow" style={{ flex: 1, padding: 18, border: '4px solid #000', borderRadius: 0, fontWeight: 900 }}>صحيح ✅</button>
                        </div>
                     </div>
                   )}
                   
                   {!isHost && (
                      <div style={{ fontSize: 13, color: '#000', fontWeight: 900, padding: 14, background: '#EEE', border: '3.5px solid #000', borderRadius: 0, direction: 'rtl' }}>
                         {room.gameState.suspectAnswer ? '⏳ في انتظار قرار المضيف...' : `⏳ ${room.players[room.gameState.suspectedUid]?.username} يكتب...`}
                      </div>
                   )}
                </div>
               )}
           </div>
         </div>
       )}

       {showExitConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ padding: 24, width: '100%', maxWidth: 320, textAlign: 'center', borderRadius: 0, border: '5px solid #000', boxShadow: '10px 10px 0 #000' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: '#000', margin: '0 0 12px', direction: 'rtl' }}>هل تريد الخروج؟</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => {
                  if (isHost) {
                    resetToLobby();
                  } else {
                    handleExit();
                  }
                }}
                className="btn btn-yellow"
                style={{ padding: 14, fontSize: 18, borderRadius: 0, border: '3px solid #000', fontWeight: 900 }}
              >
                {isHost ? 'العودة للقاعدة 🏠' : 'خروج 🚪'}
              </button>

              {!isHost && (
                 <button onClick={handleExit} className="btn btn-pink" style={{ padding: 14, borderRadius: 0, border: '3px solid #000', fontWeight: 900 }}>مغادرة اللعبة 💨</button>
              )}

              <button onClick={() => setShowExitConfirm(false)} className="btn btn-white" style={{ padding: 14, borderRadius: 0, border: '3px solid #000', fontWeight: 900 }}>متابعة اللعب 🎮</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
