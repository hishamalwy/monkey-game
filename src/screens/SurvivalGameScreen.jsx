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

  if (!room || !room.survivalState) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const { survivalState } = room;
  const isHost = room.hostUid === userProfile.uid;
  const isAlive = survivalState.alivePlayers[userProfile.uid];
  const currentQ = survivalState.questions[survivalState.currentQuestionIndex];
  const status = survivalState.status; // 'question' or 'reveal' or 'finished'
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

  const answeredCount = Object.keys(survivalState.answers || {}).length;
  const totalAlive = Object.values(survivalState.alivePlayers).filter(v => v).length;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
      
      <style>{`
        .survival-header {
           background: var(--bg-dark-purple);
           color: #FFF;
           border: 4px solid var(--bg-dark-purple);
           box-shadow: 4px 4px 0 #FFF;
           padding: 6px 16px;
           font-weight: 900;
           font-size: 14px;
        }
        .survival-timer {
           font-size: 38px;
           font-weight: 950;
           color: var(--bg-dark-purple);
           text-shadow: 3px 3px 0 #FFF, -3px -3px 0 #FFF, 3px -3px 0 #FFF, -3px 3px 0 #FFF;
        }
        .q-card {
           background: #FFF;
           border: 6px solid var(--bg-dark-purple);
           box-shadow: 10px 10px 0 var(--bg-pink);
           padding: 32px 20px;
           margin-bottom: 30px;
           text-align: center;
        }
        .ans-btn {
           background: #FFF;
           border: 4px solid var(--bg-dark-purple);
           padding: 18px 12px;
           font-weight: 900;
           font-size: 17px;
           text-align: right;
           display: flex;
           align-items: center;
           gap: 12px;
           transition: all 0.1s;
        }
        .ans-btn.selected {
           background: var(--bg-pink);
           color: #FFF;
           transform: translate(4px, 4px);
           box-shadow: none !important;
        }
        .ans-btn.correct {
           background: var(--bg-green);
           color: #FFF;
        }
        .ans-btn.wrong {
           background: #FF4D4D;
           color: #FFF;
        }
      `}</style>

      {/* Screen Reader Header */}
      <h1 className="sr-only">لعبة البقاء للأقوى - {currentQ.q}</h1>

      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="survival-header pop">
              السؤال {survivalState.currentQuestionIndex + 1}
          </div>
          <div className={`survival-timer ${timer <= 5 ? 'pulse' : ''}`}>
              {timer}
          </div>
          <div className="survival-header pop" style={{ background: 'var(--bg-green)' }}>
              {totalAlive} ناجي
          </div>
      </div>

      {/* Question */}
      <div className="q-card slide-up">
          <div style={{ fontSize: 13, fontWeight: 900, background: 'var(--bg-pink)', color: '#FFF', padding: '2px 10px', display: 'inline-block', marginBottom: 12, transform: 'rotate(-2deg)' }}>
             جاوب صح أو انسحب! 💀
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 950, color: 'var(--bg-dark-purple)', lineHeight: 1.4, margin: 0 }}>
              {currentQ.q}
          </h2>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          {currentQ.a.map((ans, i) => {
              const isSelected = selectedAnswer === i || survivalState.answers[userProfile.uid]?.answer === i;
              const isCorrect = status === 'reveal' && i === currentQ.correct;
              const isWrong = status === 'reveal' && isSelected && i !== currentQ.correct;
              
              let classNames = 'ans-btn pop';
              if (isSelected) classNames += ' selected';
              if (isCorrect) classNames += ' correct';
              if (isWrong) classNames += ' wrong';

              return (
                  <button
                      key={i}
                      disabled={!isAlive || status !== 'question' || selectedAnswer !== null}
                      onClick={() => handleAnswer(i)}
                      className={classNames}
                      style={{ 
                        boxShadow: isSelected ? 'none' : '5px 5px 0 var(--bg-dark-purple)',
                        animationDelay: `${i * 80}ms`
                      }}
                  >
                      <div style={{ 
                        width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 
                      }}>
                        {labels[i]}
                      </div>
                      <span style={{ flex: 1 }}>{ans}</span>
                  </button>
              );
          })}
      </div>

      {!isAlive && status === 'question' && (
          <div style={{ textAlign: 'center', padding: 10, background: 'rgba(231,76,60,0.1)', color: 'var(--bg-pink)', fontWeight: 900, marginBottom: 10 }}>
              لقد خرجت من المسابقة! انتظر انتهاء الجولة... 💀
          </div>
      )}

      {/* Stats and Controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div className="card" style={{ background: '#FFF', border: 'var(--brutal-border)', padding: 16, marginBottom: 16, borderRadius: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, marginBottom: 8, color: 'var(--bg-dark-purple)' }}>
                  <span>تقدم جولة الإجابات</span>
                  <span>{answeredCount} / {totalAlive}</span>
              </div>
              <div style={{ width: '100%', height: 16, background: 'var(--bg-dark-purple)', padding: 3, border: '2px solid var(--bg-dark-purple)' }}>
                  <div style={{ width: `${(answeredCount / (totalAlive || 1)) * 100}%`, height: '100%', background: 'var(--bg-yellow)', transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)' }} />
              </div>
          </div>

          {isHost && (
              <div style={{ display: 'flex', gap: 12 }}>
                  {status === 'question' ? (
                      <button 
                        onClick={handleReveal}
                        className="btn btn-pink" 
                        style={{ flex: 1, padding: '18px 24px', fontSize: 20, boxShadow: '6px 6px 0 var(--bg-dark-purple)' }}
                      >
                          اكشف الإجابة 🔍
                      </button>
                  ) : (
                      <button 
                        onClick={handleNext}
                        className="btn btn-green" 
                        style={{ flex: 1, padding: '18px 24px', fontSize: 20, boxShadow: '6px 6px 0 var(--bg-dark-purple)' }}
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
