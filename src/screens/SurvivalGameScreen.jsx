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
  const [timer, setTimer] = useState(0);
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

  useEffect(() => {
    if (isHost && status === 'question') {
      if (answeredCount >= totalAlive && totalAlive > 0) {
        handleReveal();
      } else if (timer === 0 && room?.survivalState?.roundStartTime) { // only if timer actually reached 0 and not just starting
        handleReveal();
      }
    }
  }, [isHost, status, answeredCount, totalAlive, timer]);

  if (!room || !room.survivalState) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const { survivalState } = room;
  const isHost = room.hostUid === userProfile.uid;
  const isAlive = survivalState.alivePlayers[userProfile.uid];
  const currentQ = survivalState.questions[survivalState.currentQuestionIndex];
  const status = survivalState.status; // 'question' or 'reveal' or 'finished'

  const answeredCount = Object.keys(survivalState.answers || {}).length;
  const totalAlive = Object.values(survivalState.alivePlayers).filter(v => v).length;
  const labels = ['أ', 'ب', 'ج', 'د'];
  
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
      if (!survivalState.alivePlayers[uid]) return;
      
      const playerAnswer = survivalState.answers[uid]?.answer;
      if (playerAnswer === undefined || playerAnswer !== correctIdx) {
        newAlivePlayers[uid] = false;
        eliminatedThisRound.push(uid);
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
    
    const aliveCount = Object.values(survivalState.alivePlayers).filter(v => v).length;
    
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

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative', zIndex: 5 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ 
            display: 'inline-block', background: 'var(--bg-dark-purple)', color: '#FFF', 
            padding: '4px 14px', fontSize: 12, fontWeight: 950, borderRadius: '6px',
            marginBottom: 10, transform: 'rotate(-1deg)'
          }}>
            السؤال {survivalState.currentQuestionIndex + 1}
          </div>
          
          <div className="card slide-up" style={{ padding: '24px 20px', borderRadius: '20px', border: '4px solid var(--bg-dark-purple)', boxShadow: '8px 8px 0 var(--bg-pink)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 950, color: 'var(--bg-dark-purple)', lineHeight: 1.4, margin: 0 }}>
                {currentQ.q}
            </h2>
          </div>
        </div>

        {/* Answers Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {currentQ.a.map((ans, i) => {
            const isSelected = selectedAnswer === i || survivalState.answers[userProfile.uid]?.answer === i;
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
                disabled={!isAlive || status !== 'question' || selectedAnswer !== null}
                onClick={() => handleAnswer(i)}
                className="pop"
                style={{ 
                  background: bgColor,
                  color: textColor,
                  border: `3px solid ${borderColor}`,
                  padding: '16px 10px',
                  borderRadius: '12px',
                  fontWeight: 950,
                  fontSize: 16,
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
                  width: 28, height: 28, borderRadius: '50%', 
                  background: isSelected || isCorrect || isWrong ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13
                }}>
                  {labels[i]}
                </div>
                <span style={{ textAlign: 'center', fontSize: 14 }}>{ans}</span>
              </button>
            );
          })}
        </div>

        {!isAlive && status === 'question' && (
          <div className="pop" style={{ 
            textAlign: 'center', padding: '12px', background: 'var(--bg-dark-purple)', 
            color: 'var(--bg-yellow)', fontWeight: 950, borderRadius: '12px', border: '3px solid var(--bg-pink)' 
          }}>
             لقد خرجت من المسابقة! 💀<br/><span style={{fontSize: 11, opacity: 0.8}}>انتظر انتهاء الجولة...</span>
          </div>
        )}

      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div style={{ background: '#FFF', borderTop: '5px solid var(--bg-dark-purple)', padding: '16px 20px env(safe-area-inset-bottom)', position: 'relative', zIndex: 10 }}>
        
        {/* Progress Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
           <span style={{ fontSize: 13, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>تقدّم الإجابات:</span>
           <span style={{ fontSize: 13, fontWeight: 950, color: 'var(--bg-pink)' }}>{answeredCount} / {totalAlive}</span>
        </div>
        <div style={{ width: '100%', height: 14, background: '#EEE', borderRadius: 20, overflow: 'hidden', border: '3px solid var(--bg-dark-purple)', marginBottom: 20 }}>
           <div style={{ width: `${(answeredCount / (totalAlive || 1)) * 100}%`, height: '100%', background: 'var(--bg-green)', transition: 'width 0.4s ease' }} />
        </div>

        {isHost && (
          <div style={{ display: 'flex', gap: 12 }}>
            {status === 'question' ? (
              <button 
                onClick={handleReveal}
                className="btn btn-pink" 
                style={{ flex: 1, padding: '16px', fontSize: 18, borderRadius: '16px', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}
              >
                  اكشف الإجابة 🔍
              </button>
            ) : (
              <button 
                onClick={handleNext}
                className="btn btn-green" 
                style={{ flex: 1, padding: '16px', fontSize: 18, borderRadius: '16px', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}
              >
                  {totalAlive <= 1 ? 'نهاية المسابقة 🏁' : 'السؤال التالي ➡️'}
              </button>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
