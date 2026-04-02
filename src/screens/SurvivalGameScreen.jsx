import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom, leaveRoom } from '../firebase/rooms';
import { submitSurvivalAnswer, survivalReveal, survivalNextQuestion, endSurvivalGame } from '../firebase/survivalRooms';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';

export default function SurvivalGameScreen({ nav, roomCode }) {
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
  }, [roomCode, nav]);

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
      
      setSelectedAnswer(null); // Reset selection for new question
    } else {
      clearInterval(timerIntervalRef.current);
    }
    
    return () => clearInterval(timerIntervalRef.current);
  }, [room?.survivalState?.currentQuestionIndex, room?.survivalState?.status, room?.survivalState?.roundStartTime]);

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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      {/* Screen Reader Header */}
      <h1 className="sr-only">لعبة البقاء للأقوى - {currentQ.q}</h1>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-pink)', padding: '6px 14px', border: 'var(--brutal-border)', fontWeight: 900, color: '#FFF', fontSize: 14 }}>
              السؤال {survivalState.currentQuestionIndex + 1}
          </div>
          <div className={timer <= 5 ? 'pulse' : ''} style={{ fontSize: 28, fontWeight: 900, color: timer <= 5 ? 'var(--bg-pink)' : 'var(--bg-dark-purple)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {timer}s <span style={{ fontSize: 20 }}>⏱️</span>
          </div>
          <div style={{ background: 'var(--bg-green)', padding: '6px 14px', border: 'var(--brutal-border)', fontWeight: 900, color: '#FFF', fontSize: 14 }}>
              {totalAlive} ناجي
          </div>
      </div>

      {/* Question Card */}
      <div className="card slide-up" style={{ padding: 24, marginBottom: 24, textAlign: 'center', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0, lineHeight: 1.4 }}>
              {currentQ.q}
          </h2>
      </div>

      {/* Answers Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
          {currentQ.a.map((ans, i) => {
              const isSelected = selectedAnswer === i || survivalState.answers[userProfile.uid]?.answer === i;
              const isCorrect = status === 'reveal' && i === currentQ.correct;
              const isWrong = status === 'reveal' && isSelected && i !== currentQ.correct;
              
              let bgColor = '#FFF';
              let textColor = 'var(--bg-dark-purple)';
              let borderColor = 'var(--bg-dark-purple)';
              
              if (isCorrect) {
                  bgColor = 'var(--bg-green)';
                  textColor = '#FFF';
              } else if (isWrong) {
                  bgColor = 'var(--bg-pink)';
                  textColor = '#FFF';
              } else if (isSelected) {
                  bgColor = 'var(--bg-yellow)';
              }

              return (
                  <button
                      key={i}
                      disabled={!isAlive || status !== 'question' || selectedAnswer !== null}
                      aria-label={`${labels[i]}. ${ans}`}
                      onClick={() => handleAnswer(i)}
                      className="pop"
                      style={{
                          padding: '20px 16px',
                          border: `4px solid ${borderColor}`,
                          background: bgColor,
                          color: textColor,
                          borderRadius: 0,
                          fontWeight: 900,
                          fontSize: 17,
                          boxShadow: isSelected ? 'none' : '6px 6px 0 var(--bg-dark-purple)',
                          transform: isSelected ? 'translate(4px, 4px)' : 'none',
                          transition: 'all 0.1s cubic-bezier(0.34,1.56,0.64,1)',
                          animationDelay: `${i * 100}ms`,
                          cursor: (!isAlive || status !== 'question' || selectedAnswer !== null) ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          position: 'relative'
                      }}
                  >
                      <span style={{ fontSize: 14, color: isSelected || isCorrect || isWrong ? 'rgba(255,255,255,0.7)' : 'rgba(28,16,64,0.45)' }}>{labels[i]}.</span>
                      <span style={{ flex: 1 }}>{ans}</span>
                      {status === 'reveal' && i === currentQ.correct && <span style={{ fontSize: 24 }}>✅</span>}
                      {status === 'reveal' && isSelected && i !== currentQ.correct && <span style={{ fontSize: 24 }}>❌</span>}
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
