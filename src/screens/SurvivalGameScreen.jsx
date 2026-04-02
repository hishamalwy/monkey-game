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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-pink)', padding: '5px 12px', border: 'var(--brutal-border)', fontWeight: 900, color: '#FFF' }}>
              السؤال {survivalState.currentQuestionIndex + 1}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: timer <= 5 ? 'var(--bg-pink)' : 'var(--bg-dark-purple)' }}>
              {timer}s ⏱️
          </div>
          <div style={{ background: 'var(--bg-green)', padding: '5px 12px', border: 'var(--brutal-border)', fontWeight: 900, color: '#FFF' }}>
              {totalAlive} ناجي
          </div>
      </div>

      {/* Question Card */}
      <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'center', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0 }}>
              {currentQ.q}
          </h2>
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
              
              if (isCorrect) {
                  bgColor = 'var(--bg-green)';
                  textColor = '#FFF';
                  borderColor = 'var(--bg-dark-purple)';
              } else if (isWrong) {
                  bgColor = 'var(--bg-pink)';
                  textColor = '#FFF';
                  borderColor = 'var(--bg-dark-purple)';
              } else if (isSelected) {
                  bgColor = 'var(--bg-yellow)';
              }

              return (
                  <button
                      key={i}
                      disabled={!isAlive || status !== 'question' || selectedAnswer !== null}
                      onClick={() => handleAnswer(i)}
                      style={{
                          padding: '16px 12px',
                          border: `4px solid ${borderColor}`,
                          background: bgColor,
                          color: textColor,
                          borderRadius: 0,
                          fontWeight: 900,
                          fontSize: 16,
                          boxShadow: isSelected ? 'none' : 'var(--brutal-shadow)',
                          transform: isSelected ? 'translate(4px, 4px)' : 'none',
                          transition: 'all 0.1s',
                          cursor: (!isAlive || status !== 'question' || selectedAnswer !== null) ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          position: 'relative'
                      }}
                  >
                      <span style={{ opacity: 0.5 }}>{labels[i]}.</span>
                      <span style={{ flex: 1 }}>{ans}</span>
                      {isCorrect && <span style={{ position: 'absolute', top: -10, right: -10, fontSize: 20 }}>✅</span>}
                      {isWrong && <span style={{ position: 'absolute', top: -10, right: -10, fontSize: 20 }}>❌</span>}
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
          <div style={{ background: '#FFF', border: 'var(--brutal-border)', padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 900, marginBottom: 4 }}>
                  <span>تقدم الإجابات</span>
                  <span>{answeredCount} / {totalAlive}</span>
              </div>
              <div style={{ width: '100%', height: 12, background: 'var(--bg-dark-purple)', padding: 2 }}>
                  <div style={{ width: `${(answeredCount / (totalAlive || 1)) * 100}%`, height: '100%', background: 'var(--bg-yellow)', transition: 'width 0.3s' }} />
              </div>
          </div>

          {isHost && (
              <div style={{ display: 'flex', gap: 10 }}>
                  {status === 'question' ? (
                      <button 
                        onClick={handleReveal}
                        className="btn btn-pink" 
                        style={{ flex: 1, padding: 16, fontSize: 18 }}
                      >
                          اكشف الإجابة 🔍
                      </button>
                  ) : (
                      <button 
                        onClick={handleNext}
                        className="btn btn-green" 
                        style={{ flex: 1, padding: 16, fontSize: 18 }}
                      >
                          {totalAlive <= 1 ? 'نهاية اللعبة 🏁' : 'السؤال القادم ➡️'}
                      </button>
                  )}
              </div>
          )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
