import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import UserAvatar from '../components/ui/UserAvatar';
import GameScreen from '../components/GameScreen';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { stopHorn, startHorn, getHornType, HORN_TYPES, warmAudio } from '../utils/audio';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { connectSocket, disconnectSocket, emitSound } from '../services/socket';
import { appCategories } from '../data/categories';
import { normalizeArabic } from '../utils/textUtils';

export default function OnlineGameScreen({ nav, roomCode }) {
  const { user } = useAuth(); // keeps auth context alive
  const {
    room, players, isMyTurn, computedTimer, isHost,
    pressLetter, pressDelete, pressChallenge, leaveRoom, submitSuspectWord, resolveSuspect,
    triggerHorn,
  } = useRoom(roomCode);
  const vh = useVisualViewport();

  const navRef = useRef(nav);
  useEffect(() => { navRef.current = nav; });

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isHonking, setIsHonking] = useState(false);
  const [suspectWord, setSuspectWord] = useState('');

  // Sound Server connection
  useEffect(() => {
    if (roomCode) {
      connectSocket(roomCode);
    }
    return () => disconnectSocket();
  }, [roomCode]);

  const MONKEY_LIMIT = 4;

  // Color ramp: empty → yellow → orange → red → skull
  const QM_COLORS = ['#D1D5DB', '#FCD34D', '#F97316', '#EF4444', '#1C1040'];

  const MonkeySVG = ({ qm }) => {
    const pct = Math.min((qm / 4) * 100, 100);
    const fillColor = QM_COLORS[Math.min(qm, 4)];
    const strokeColor = qm >= 4 ? '#fff' : 'var(--bg-dark-purple)';
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
            width: 10, height: 10, borderRadius: '20%',
            background: filled ? (isLoser ? '#FFF' : 'var(--bg-pink)') : '#E5E7EB',
            border: '1.5px solid var(--bg-dark-purple)'
          }} />
        );
      })}
      {Array.from({ length: Math.floor(qm / 4) }).map((_, i) => <span key={i} style={{ fontSize: 14 }}>🐒</span>)}
    </div>
  );

  useEffect(() => {
    if (!room) return;
    if (room.status === 'round_result') navRef.current.toRoundResult();
    if (room.status === 'game_over') navRef.current.toGameOver();
    if (room.status === 'lobby') navRef.current.toLobby(roomCode);
  }, [room?.status]);

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
  
  const handleHornEnd = () => { 
    setIsHonking(false); 
    emitSound(roomCode, getHornType(), false);
    triggerHorn(false);
    // Stop locally
    stopHorn();
  };

  const handleExit = async () => {
    await leaveRoom();
    navRef.current.toHome();
  };

  if (!room?.gameState) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;

  const currentPlayerUid = room.gameState.currentPlayerUid;
  const currentPlayerData = room.players[currentPlayerUid];
  const currentPlayer = {
    name: currentPlayerData?.username || '...',
    avatarId: currentPlayerData?.avatarId ?? 0,
  };

  const userId = user?.uid;
  const isSuspected = room.status === 'suspect_question' && room.gameState.suspectedUid === userId;
  const isChallenger = room.status === 'suspect_question' && room.gameState.challengerUid === userId;

  const currentCategoryWords = (() => {
    if (!room?.category) return [];
    const cat = appCategories.find(c => c.id === room.category);
    return cat ? cat.words : [];
  })();

  const suspectAnswerValid = (() => {
     if (!room?.gameState?.suspectAnswer) return false;
     const ans = normalizeArabic(room.gameState.suspectAnswer);
     const challenging = normalizeArabic(room.gameState.challengingWord || '');
     const usedWords = room.gameState.usedWords || [];
     
     const isMatch = currentCategoryWords.some(w => normalizeArabic(w) === ans);
     const startsWithPrefix = ans.startsWith(challenging);
     const isNotUsed = !usedWords.includes(ans); // check norm vs norm

     return isMatch && startsWithPrefix && isNotUsed;
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
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--bg-pink)' }}>
             قرد الـ {room.category === 'objects' ? 'أشياء' : room.category === 'clubs' ? 'أندية' : room.category === 'countries' ? 'بلاد' : room.category || 'عام' }
          </div>
        </div>
        <button onClick={() => setShowExitConfirm(true)} className="btn btn-white" style={{ padding: '8px 16px', fontSize: 14 }}>✕ خروج</button>
      </header>

      <div style={{ padding: '16px 20px', display: 'flex', gap: 12, overflowX: 'auto', flexShrink: 0, position: 'relative' }}>
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <mask id="global-monkey-mask">
              <circle cx="50" cy="32" r="20" fill="white" /><circle cx="26" cy="36" r="10" fill="white" /><circle cx="74" cy="36" r="10" fill="white" />
              <path d="M 32 47 h 36 v 32 q 0 10 -18 10 q -18 0 -18 -10 Z" fill="white" />
              <path d="M 68 80 Q 95 95 90 60 Q 90 40 75 60" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" />
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
              padding: '10px 10px 8px', minWidth: 76, flexShrink: 0,
              background: isActive ? 'var(--bg-pink)' : eliminated ? '#F3F4F6' : '#FFF',
              border: `3px solid ${isActive ? 'var(--bg-dark-purple)' : eliminated ? '#D1D5DB' : 'var(--bg-dark-purple)'}`,
              borderRadius: 4,
              boxShadow: isActive ? '4px 4px 0px var(--bg-dark-purple)' : '2px 2px 0px rgba(0,0,0,0.08)',
              transform: isActive ? 'translateY(-5px) scale(1.04)' : 'none',
              opacity: eliminated ? 0.5 : 1,
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <div style={{ position: 'relative', marginBottom: 4 }}>
                <UserAvatar avatarId={p.avatarId ?? 0} size={40} />
                {eliminated && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(28,16,64,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>💀</div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 900, lineHeight: 1.2, marginBottom: 5,
                color: isActive ? '#FFF' : 'var(--bg-dark-purple)',
                maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.username}
              </span>
              <MonkeySVG qm={qm} />
              <QuarterPips qm={qm} />
            </div>
          );
        })}
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 8, borderTopLeftRadius: 32, borderTopRightRadius: 32, background: 'var(--color-card)', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
        <GameScreen
          currentWord={room.gameState.currentWord || ''}
          timeRemaining={computedTimer ?? room.timeLimit}
          timeLimit={room.timeLimit}
          currentPlayer={currentPlayer}
          isAiTurn={!isMyTurn}
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
          <button onMouseDown={handleHornStart} onMouseUp={handleHornEnd} onTouchStart={(e) => { e.preventDefault(); handleHornStart(); }} onTouchEnd={(e) => { e.preventDefault(); handleHornEnd(); }}
            className={`btn ${isHonking ? 'btn-pink' : 'btn-yellow'}`}
            style={{ position: 'absolute', bottom: 24, left: 24, width: 72, height: 72, borderRadius: '50%', padding: 12, zIndex: 100, boxShadow: 'var(--brutal-shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {horn.src ? (
              <img src={`${import.meta.env.BASE_URL}icons/${horn.src}`} alt={horn.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 34 }}>{horn.emoji}</span>
            )}
          </button>
        );
      })()}

      {room.status === 'suspect_question' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(28,16,63,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card slide-up" style={{ padding: 28, width: '100%', maxWidth: 360, textAlign: 'center', border: '5px solid var(--bg-dark-purple)', boxShadow: '8px 8px 0 var(--bg-dark-purple)' }}>
             <div style={{ fontSize: 56, marginBottom: 16 }}>🧐</div>
             <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 8px' }}>تحدي شاكك!</h3>
             
             {(isSuspected && !room.gameState.suspectAnswer) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: 'var(--bg-dark-purple)' }}>انت كنت بتفكر في دولة إيه؟ 🐒</p>
                  <input 
                     type="text" 
                     placeholder="اكتب اسم الدولة هنا..."
                     className="input-field"
                     style={{ fontSize: 18, padding: 12, textAlign: 'center' }}
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
                  }} className="btn btn-pink" style={{ padding: 16, fontSize: 18 }}>إرسال 🚀</button>
                </div>
              ) : (
                <div>
                   {isHost && !room.gameState.suspectAnswer && (
                     <div style={{ padding: '8px 16px', background: 'var(--bg-yellow)', border: '2px solid var(--bg-dark-purple)', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 900 }}>
                        ⏳ بانتظار المشتبه به يكتب كلمته...
                     </div>
                   )}

                   {room.gameState.suspectAnswer && (
                     <div style={{ padding: 16, background: '#FFF7ED', borderRadius: 0, border: '4px solid var(--bg-dark-purple)', boxShadow: '6px 6px 0 var(--bg-dark-purple)', marginBottom: 20 }}>
                        <div style={{ fontSize: 13, color: 'var(--bg-dark-purple)', fontWeight: 900, marginBottom: 4, textAlign: 'right' }}>الكلمة التي فكر بها:</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: suspectAnswerValid ? 'var(--bg-green)' : 'var(--bg-pink)', textDecoration: suspectAnswerValid ? 'none' : 'line-through' }}>
                         {room.gameState.suspectAnswer}
                         {suspectAnswerValid ? ' ✅' : ' ❓'}
                        </div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 4, fontWeight: 700 }}>
                          {suspectAnswerValid 
                            ? '(موجودة ومتاحة وتبدأ بنفس الحروف)' 
                            : '(غير موجودة أو تم استخدامها سابقاً أو لا تبدأ بمقطع التحدي)'}
                        </div>
                     </div>
                   )}

                   {isHost && room.gameState.suspectAnswer && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--bg-pink)', marginBottom: 4, animation: 'pulse 1s infinite' }}>
                           ⚠️ مطلوب قرارك كحكم!
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                           <button onClick={() => resolveSuspect(false)} className="btn btn-white" style={{ flex: 1, padding: 14, color: '#EF4444', border: '3px solid #EF4444' }}>❌ غلط</button>
                           <button onClick={() => resolveSuspect(true)} className="btn btn-primary" style={{ flex: 1, padding: 14, border: '3px solid var(--bg-dark-purple)' }}>✅ صح</button>
                        </div>
                     </div>
                   )}
                   
                   {!isHost && (
                      <div style={{ fontSize: 14, color: 'var(--bg-dark-purple)', fontWeight: 900, padding: 10, background: '#f3f4f6', border: '2px solid var(--bg-dark-purple)' }}>
                         {room.gameState.suspectAnswer ? '⏳ بانتظار قرار الهوست...' : `⏳ ${room.players[room.gameState.suspectedUid]?.username} بيكتب...`}
                      </div>
                   )}
                </div>
              )}
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(28,16,63,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 12px' }}>تخرج من اللعبة؟</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowExitConfirm(false)} className="btn btn-white" style={{ flex: 1, padding: 14 }}>لأ</button>
              <button onClick={handleExit} className="btn btn-pink" style={{ flex: 1, padding: 14 }}>اخرج</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
