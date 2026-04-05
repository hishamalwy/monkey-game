import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom } from '../firebase/rooms';
import { submitSurvivalAnswer, survivalReveal, survivalNextQuestion, endSurvivalGame } from '../firebase/survivalRooms';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

export default function SurvivalGameScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [toast, setToast] = useState('');
  const [timer, setTimer] = useState(15);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { nav.toHome(); return; }
      setRoom(data);
      
      if (data.survivalState?.status === 'finished') {
        nav.toSurvivalGameOver();
      }
    });
    return unsub;
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (room?.survivalState?.status === 'question' && room?.survivalState?.roundStartTime) {
      const startTime = room.survivalState.roundStartTime.toMillis ? room.survivalState.roundStartTime.toMillis() : Date.now();
      const limit = (room.survivalState.timeLimit || 15) * 1000;
      
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const left = Math.max(0, Math.ceil((limit - elapsed) / 1000));
        setTimer(left);
        
        if (left <= 0) {
          clearInterval(timerIntervalRef.current);
        }
      };
      
      updateTimer();
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAnswer(null);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    
    return () => clearInterval(timerIntervalRef.current);
  }, [room?.survivalState?.currentQuestionIndex, room?.survivalState?.status, room?.survivalState?.roundStartTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-reveal logic moved below declarations

  const survivalState = room?.survivalState;
  const isHost = room?.hostUid === userProfile?.uid;
  const lives = survivalState?.alivePlayers?.[userProfile.uid] || 0;
  const isAlive = lives > 0;
  const currentQ = survivalState?.questions?.[survivalState.currentQuestionIndex];
  const status = survivalState?.status; // 'question' or 'reveal' or 'finished'

  const answeredCount = Object.keys(survivalState?.answers || {}).length;
  const players = (room.playerOrder || []).map(uid => ({ ...room.players[uid], uid, lives: survivalState?.alivePlayers?.[uid] || 0 })).filter(p => !!p.uid);
  const totalAlive = players.filter(p => p.lives > 0).length;
  const labels = ['أ', 'ب', 'ج', 'د'];

  useEffect(() => {
    if (isHost && status === 'question') {
      if (answeredCount >= totalAlive && totalAlive > 0) {
        handleReveal();
      } else if (timer === 0 && survivalState?.roundStartTime) { 
        handleReveal();
      }
    }
  }, [isHost, status, answeredCount, totalAlive, timer, survivalState?.roundStartTime]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!room || !survivalState) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }
  
  const handleAnswer = async (idx) => {
    if (status !== 'question' || !isAlive || selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    try {
      await submitSurvivalAnswer(roomCode, userProfile.uid, idx);
    } catch (e) {
      setToast(e.message);
      setSelectedAnswer(null);
    }
  };

  const handleReveal = async () => {
    if (!isHost || status !== 'question') return;
    
    const correctIdx = currentQ.correct;
    const newAlivePlayers = { ...survivalState.alivePlayers };
    const eliminatedThisRound = [];
    
    Object.keys(survivalState.alivePlayers).forEach(uid => {
      const currentLives = survivalState.alivePlayers[uid];
      if (currentLives <= 0) return;
      
      const playerAnswer = survivalState.answers[uid]?.answer;
      if (playerAnswer === undefined || playerAnswer !== correctIdx) {
        newAlivePlayers[uid] = currentLives - 1;
        if (newAlivePlayers[uid] <= 0) {
           eliminatedThisRound.push(uid);
        }
      }
    });

    try {
      await survivalReveal(roomCode, newAlivePlayers, eliminatedThisRound);
    } catch (e) {
      setToast(e.message);
    }
  };

  const handleNext = async () => {
    if (!isHost || status !== 'reveal') return;
    
    const aliveCount = Object.values(survivalState.alivePlayers).filter(v => v > 0).length;
    
    // If only one (or zero) survives, it's Game Over
    if (aliveCount <= 1 || survivalState.currentQuestionIndex >= survivalState.questions.length - 1) {
      await endSurvivalGame(roomCode);
      return;
    }

    try {
      await survivalNextQuestion(roomCode, survivalState.currentQuestionIndex + 1);
    } catch (e) {
      setToast(e.message);
    }
  };


  const PixelHeart = ({ filled }) => (
    <div style={{ width: 14, height: 14, position: 'relative', display: 'inline-block' }}>
      <svg viewBox="0 0 8 8" fill={filled ? "#FF4D4D" : "#CCC"} stroke="none">
        <path d="M2,1 H3 M5,1 H6 M1,2 H4 M5,2 H8 M1,3 H8 M1,4 H8 M2,5 H7 M3,6 H6 M4,7 H5" />
      </svg>
    </div>
  );

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* ── HEADER ── */}
      <div className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between', padding: '10px 16px', position: 'relative', zIndex: 10 }}>
        <button onClick={() => nav.toHome()} className="btn btn-white" style={{ width: 40, height: 40, fontSize: 16, borderRadius: '10px' }}>✕</button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="card" style={{ background: 'var(--bg-yellow)', padding: '4px 12px', border: '3px solid var(--bg-dark-purple)', boxShadow: 'none' }}>
             <span style={{ fontSize: 13, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>{totalAlive} ناجي ⚔️</span>
          </div>
        </div>

        <div className="card" style={{ 
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', 
          background: timer <= 5 ? 'var(--bg-pink)' : 'var(--bg-dark-purple)', 
          color: timer <= 5 ? '#FFF' : '#FFE300', fontWeight: 950, 
          borderRadius: '12px', border: '3px solid var(--bg-dark-purple)', 
          boxShadow: timer <= 5 ? '4px 4px 0 var(--bg-dark-purple)' : 'none',
          animation: timer <= 3 ? 'pulse 0.5s infinite' : 'none'
        }}>
          {timer}
        </div>
      </div>

      {/* ── PLAYER LIST (SCROLLABLE STRIP) ── */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 10, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none', background: 'rgba(255,255,255,0.3)', borderBottom: '3px solid var(--bg-dark-purple)' }}>
         {players.map(p => (
           <div key={p.uid} style={{ 
             display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 50, 
             opacity: p.lives <= 0 ? 0.4 : 1, filter: p.lives <= 0 ? 'grayscale(1)' : 'none'
           }}>
             <div style={{ position: 'relative' }}>
                <UserAvatar avatarId={p.avatarId ?? 1} size={32} />
                {p.uid === userProfile.uid && <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--bg-pink)', width: 8, height: 8, borderRadius: '50%', border: '1px solid #FFF' }} />}
             </div>
             <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                <PixelHeart filled={p.lives >= 1} />
                <PixelHeart filled={p.lives >= 2} />
                <PixelHeart filled={p.lives >= 3} />
             </div>
           </div>
         ))}
      </div>

      {/* ── BOARD AREA ── */}
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative', overflow: 'hidden' }}>
        
        {/* The "Blackboard" wrapper */}
        <div className="card" style={{ 
          position: 'relative', width: 'min(90vw, 400px)', padding: '24px 20px', 
          background: 'var(--bg-dark-purple)', // Chalkboard style
          border: '10px solid #8d6e63', // Wooden frame
          borderRadius: '12px',
          boxShadow: '10px 10px 0 rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 180, textAlign: 'center'
        }}>
          <div style={{ 
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.1)', color: '#FFF', padding: '2px 10px', fontSize: 10, borderRadius: 20
          }}>
            AraSTEM • سؤال {survivalState.currentQuestionIndex + 1}
          </div>
          
          <h2 style={{ fontSize: 20, fontWeight: 950, color: '#FFF', lineHeight: 1.4, margin: 0, textShadow: '2px 2px 0 rgba(0,0,0,0.3)' }}>
              {currentQ.q}
          </h2>
          
          {/* Subtle chalk dust effect or decorative marks */}
          <div style={{ position: 'absolute', bottom: 10, right: 10, opacity: 0.2, fontSize: 32 }}>✏️</div>
        </div>

        {/* Answers Grid */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: 'min(90vw, 400px)', marginTop: 24
        }}>
          {currentQ.a.map((ans, i) => {
            const myAns = survivalState.answers[userProfile.uid]?.answer;
            const isSelected = selectedAnswer === i || myAns === i;
            const isCorrect = status === 'reveal' && i === currentQ.correct;
            const isWrong = status === 'reveal' && isSelected && i !== currentQ.correct;
            
            let bgColor = '#FFF';
            let textColor = 'var(--bg-dark-purple)';
            let borderColor = 'var(--bg-dark-purple)';
            let bShadow = isSelected ? 'none' : '4px 4px 0 var(--bg-dark-purple)';

            if (isSelected) {
               bgColor = 'var(--bg-pink)';
               textColor = '#FFF';
            }
            if (isCorrect) {
               bgColor = 'var(--bg-green)';
               textColor = '#FFF';
               bShadow = '4px 4px 0 var(--bg-dark-purple)';
            }
            if (isWrong) {
               bgColor = '#FF4D4D';
               textColor = '#FFF';
               bShadow = '4px 4px 0 var(--bg-dark-purple)';
            }

            return (
              <button
                key={i}
                disabled={!isAlive || status !== 'question' || selectedAnswer !== null || myAns !== undefined}
                onClick={() => handleAnswer(i)}
                className="pop"
                style={{ 
                  background: bgColor,
                  color: textColor,
                  border: `3px solid ${borderColor}`,
                  padding: '12px 8px',
                  borderRadius: '12px',
                  fontWeight: 950,
                  fontSize: 15,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  cursor: isAlive && status === 'question' ? 'pointer' : 'default',
                  boxShadow: bShadow,
                  transform: isSelected && !isCorrect && !isWrong ? 'translate(4px, 4px)' : 'none',
                  transition: 'all 0.1s'
                }}
              >
                <div style={{ 
                  width: 24, height: 24, borderRadius: '50%', 
                  background: isSelected || isCorrect || isWrong ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11
                }}>
                  {labels[i]}
                </div>
                <span style={{ textAlign: 'center', fontSize: 13 }}>{ans}</span>
              </button>
            );
          })}
        </div>

        {!isAlive && status === 'question' && (
          <div className="pop" style={{ 
            marginTop: 20, textAlign: 'center', padding: '12px', background: 'var(--bg-dark-purple)', 
            color: 'var(--bg-yellow)', fontWeight: 950, borderRadius: '12px', border: '3px solid var(--bg-pink)' 
          }}>
             لقد خسرت كل قلوبك! 💔<br/><span style={{fontSize: 11, opacity: 0.8}}>انتظر انتهاء الجولة...</span>
          </div>
        )}

      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div style={{ background: '#FFF', borderTop: '5px solid var(--bg-dark-purple)', padding: '16px 20px env(safe-area-inset-bottom)', position: 'relative', zIndex: 10 }}>
        
        {isHost && (
          <div style={{ display: 'flex', gap: 12 }}>
            {status === 'reveal' && (
              <button 
                onClick={handleNext}
                className="btn btn-green" 
                style={{ flex: 1, padding: '16px', fontSize: 18, borderRadius: '16px', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}
              >
                  {totalAlive <= 1 ? 'نهاية المسابقة 🏁' : 'السؤال التالي ➡️'}
              </button>
            )}
            {status === 'question' && (
               <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                     <span style={{ fontSize: 12, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>تقدّم الإجابات:</span>
                     <span style={{ fontSize: 12, fontWeight: 950, color: 'var(--bg-pink)' }}>{answeredCount} / {totalAlive}</span>
                  </div>
                  <div style={{ width: '100%', height: 10, background: '#EEE', borderRadius: 20, overflow: 'hidden', border: '2px solid var(--bg-dark-purple)' }}>
                     <div style={{ width: `${(answeredCount / (totalAlive || 1)) * 100}%`, height: '100%', background: 'var(--bg-green)', transition: 'width 0.4s ease' }} />
                  </div>
               </div>
            )}
          </div>
        )}
        {!isHost && status === 'question' && (
           <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>
             {selectedAnswer !== null || survivalState.answers[userProfile.uid] ? 'تم استلام إجابتك! 👍' : 'اختر أسرع إجابة! ⚡'}
           </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
