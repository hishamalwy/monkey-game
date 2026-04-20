import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
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
  const { playClick, playCorrect, playIncorrect, playTension, stopTension } = useAudio();
  const [room, setRoom] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [toast, setToast] = useState('');
  const [timer, setTimer] = useState(15);
  const timerIntervalRef = useRef(null);
  const revealCalledRef = useRef(false);

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
    const ss = room?.survivalState;
    if (ss?.status === 'question' && ss?.roundStartTime) {
      revealCalledRef.current = false;
      const startTime = ss.roundStartTime.toMillis ? ss.roundStartTime.toMillis() : null;
      if (startTime === null) return;
      const limit = (ss.timeLimit || 15) * 1000;

      const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        const left = Math.max(0, Math.ceil((limit - elapsed) / 1000));
        setTimer(left);
        if (left <= 0) clearInterval(timerIntervalRef.current);
      };

      updateTimer();
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      setSelectedAnswer(null);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [room?.survivalState?.currentQuestionIndex, room?.survivalState?.status, room?.survivalState?.roundStartTime]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === 'question' && timer <= 5 && timer > 0) {
      playTension();
    } else {
      stopTension();
    }
  }, [status, timer, playTension, stopTension]);

  useEffect(() => {
    return () => stopTension();
  }, [stopTension]);

  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === 'question' && status === 'reveal') {
      const myAns = survivalState?.answers?.[userProfile?.uid]?.answer;
      const correct = currentQ?.correct;
      if (myAns === correct) playCorrect();
      else if (myAns !== undefined) playIncorrect();
    }
    prevStatusRef.current = status;
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const survivalState = room?.survivalState;
  const isHost = room?.hostUid === userProfile?.uid;
  const lives = survivalState?.alivePlayers?.[userProfile?.uid] || 0;
  const isAlive = lives > 0;
  const currentQ = survivalState?.questions?.[survivalState.currentQuestionIndex];
  const status = survivalState?.status;
  const answeredCount = Object.keys(survivalState?.answers || {}).length;
  const players = (room?.playerOrder || []).map(uid => ({
    ...room?.players?.[uid], uid,
    lives: survivalState?.alivePlayers?.[uid] || 0
  })).filter(p => !!p.uid);
  const totalAlive = players.filter(p => p.lives > 0).length;
  const labels = ['أ', 'ب', 'ج', 'د'];
  const timeLimit = survivalState?.timeLimit || 15;
  const timerPct = (timer / timeLimit) * 100;

  useEffect(() => {
    if (!isHost || status !== 'question' || !survivalState?.roundStartTime) return;
    if (revealCalledRef.current) return;
    if (answeredCount >= totalAlive && totalAlive > 0) {
      revealCalledRef.current = true;
      handleReveal();
    } else if (timer === 0) {
      revealCalledRef.current = true;
      handleReveal();
    }
  }, [isHost, status, answeredCount, totalAlive, timer]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!room || !survivalState) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const handleAnswer = async (idx) => {
    if (status !== 'question' || !isAlive || selectedAnswer !== null) return;
    playClick();
    setSelectedAnswer(idx);
    try {
      await submitSurvivalAnswer(roomCode, userProfile?.uid, idx);
    } catch (e) {
      setToast(e.message);
      setSelectedAnswer(null);
    }
  };

  const handleReveal = async () => {
    if (!isHost || status !== 'question') return;
    try {
      await survivalReveal(roomCode, userProfile.uid);
    } catch (e) {
      setToast(e.message);
    }
  };

  const handleNext = async () => {
    if (!isHost || status !== 'reveal') return;
    const aliveCount = Object.values(survivalState.alivePlayers).filter(v => v > 0).length;
    if (aliveCount <= 1 || survivalState.currentQuestionIndex >= survivalState.questions.length - 1) {
      await endSurvivalGame(roomCode, userProfile.uid);
      return;
    }
    try {
      await survivalNextQuestion(roomCode, userProfile.uid);
    } catch (e) {
      setToast(e.message);
    }
  };

  const Heart = ({ filled }) => (
    <div style={{
      width: 18, height: 18, 
      background: filled ? 'var(--neo-pink)' : '#DDD',
      border: '1.5px solid #000',
      boxShadow: filled ? '1.5px 1.5px 0 #000' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 900
    }}>
      {filled ? '♥' : '♡'}
    </div>
  );

  const timerDanger = timer <= 5;
  const myAns = survivalState.answers[userProfile?.uid]?.answer;
  const hasAnswered = selectedAnswer !== null || myAns !== undefined;

  return (
    <div
      className="brutal-bg"
      style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* HEADER */}
      <div style={{
        background: '#FFF',
        borderBottom: '5px solid #000',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => nav.toHome()}
          className="btn btn-white"
          style={{ width: 44, height: 44, fontSize: 16, borderRadius: 0, border: '3.5px solid #000', padding: 0, flexShrink: 0 }}
        >✕</button>

        <div style={{
          background: '#000', color: 'var(--neo-yellow)',
          padding: '6px 14px', borderRadius: 0, fontWeight: 900, fontSize: 13,
          border: 'none', boxShadow: '4px 4px 0 var(--neo-pink)',
        }}>
          ⚔️ {totalAlive} ناجي  •  سؤال {survivalState.currentQuestionIndex + 1}
        </div>

        <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0, background: '#000', border: '3.5px solid #000', boxShadow: '3px 3px 0 #FFF' }}>
          <div style={{
            position: 'absolute', inset: 0, 
            background: timerDanger ? 'var(--neo-pink)' : 'var(--neo-green)',
            clipPath: `inset(${(1 - timerPct / 100) * 100}% 0 0 0)`,
            transition: 'clip-path 1s linear'
          }}></div>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 16,
            color: '#FFF', mixBlendMode: 'difference',
            zIndex: 1
          }}>
            {timer}
          </div>
        </div>
      </div>

      {/* PLAYER STRIP */}
      <div style={{
        background: '#FAFAFA',
        borderBottom: '5px solid #000',
        padding: '10px 12px',
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
        alignItems: 'center',
      }}>
        {players.map(p => {
          const isMe = p.uid === userProfile?.uid;
          const dead = p.lives <= 0;
          return (
            <div
              key={p.uid}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 54, gap: 6,
                opacity: dead ? 0.4 : 1,
                transition: 'none',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{
                  borderRadius: 0,
                  border: isMe ? '3.5px solid var(--neo-pink)' : '3.5px solid #000',
                  boxShadow: isMe ? '4px 4px 0 #000' : 'none',
                }}>
                  <UserAvatar avatarId={p.avatarId ?? 1} size={36} border="1.5px solid #fff" />
                </div>
                {dead && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 18, borderRadius: 0,
                    background: 'rgba(0,0,0,0.6)', color: '#FFF'
                  }}>💀</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <Heart filled={p.lives >= 1} />
                <Heart filled={p.lives >= 2} />
                <Heart filled={p.lives >= 3} />
              </div>
            </div>
          );
        })}
      </div>

      {/* BOARD AREA */}
      <div style={{
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 14px',
        gap: 14,
        overflow: 'hidden',
      }}>
        {/* Question card */}
        <div style={{
          width: '100%', maxWidth: 420,
          background: '#FFF',
          border: '5px solid #000',
          borderRadius: 0,
          boxShadow: '10px 10px 0 var(--neo-pink)',
          padding: '24px 20px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: 16,
            background: 'var(--neo-yellow)', color: '#000',
            padding: '2px 10px', borderRadius: 0,
            fontWeight: 900, fontSize: 10,
            border: '3px solid #000',
            whiteSpace: 'nowrap',
          }}>
            سؤال {survivalState.currentQuestionIndex + 1}
          </div>
          <p style={{
            color: '#000', fontWeight: 900,
            fontSize: currentQ.q.length > 80 ? 14 : currentQ.q.length > 50 ? 16 : 18,
            lineHeight: 1.4, margin: 0, marginTop: 4,
          }}>
            {currentQ.q}
          </p>
        </div>

        {/* Answer grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12, width: '100%', maxWidth: 420,
        }}>
          {currentQ.a.map((ans, i) => {
            const isSelected = selectedAnswer === i || myAns === i;
            const isCorrect = status === 'reveal' && i === currentQ.correct;
            const isWrong = status === 'reveal' && isSelected && i !== currentQ.correct;

            let bg = '#FFF';
            let color = '#000';
            let shadow = isSelected ? 'none' : '5px 5px 0 #000';
            let transform = isSelected && !isCorrect && !isWrong ? 'translate(4px,4px)' : 'none';
            let border = '3.5px solid #000';

            if (isSelected && !isCorrect && !isWrong) { bg = 'var(--neo-pink)'; color = '#000'; }
            if (isCorrect) { bg = 'var(--neo-green)'; shadow = '5px 5px 0 #000'; transform = 'none'; }
            if (isWrong) { bg = 'var(--neo-pink)'; shadow = '5px 5px 0 #000'; transform = 'none'; border = '4px dashed #000'; }

            return (
              <button
                key={i}
                disabled={!isAlive || status !== 'question' || hasAnswered}
                onClick={() => handleAnswer(i)}
                className="pop"
                style={{
                  background: bg, color, border, borderRadius: 0,
                  padding: '16px 10px',
                  fontWeight: 900, fontSize: 13,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  boxShadow: shadow, transform, transition: 'none',
                  cursor: isAlive && status === 'question' && !hasAnswered ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 0, flexShrink: 0,
                  background: isSelected || isCorrect || isWrong
                    ? '#000' : '#DDD',
                  color: isSelected || isCorrect || isWrong ? '#FFF' : '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 12, border: '2px solid #000'
                }}>
                  {labels[i]}
                </div>
                <span style={{
                  textAlign: 'center', lineHeight: 1.3,
                  fontSize: ans.length > 80 ? 10 : ans.length > 45 ? 11 : 12,
                }}>
                  {ans}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dead player message */}
        {!isAlive && status === 'question' && (
          <div style={{
            width: '100%', maxWidth: 420,
            background: '#000', color: 'var(--neo-yellow)',
            border: '4px solid var(--neo-pink)', borderRadius: 0,
            padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: 13,
            boxShadow: '6px 6px 0 var(--neo-pink)',
          }}>
            💀 خرجت من اللعبة!<br />
            <span style={{ fontSize: 9, fontWeight: 900, opacity: 0.8 }}>في انتظار نهاية الجولة...</span>
          </div>
        )}

        {/* Answer received banner for non-host */}
        {!isHost && hasAnswered && status === 'question' && (
          <div style={{
            background: 'var(--neo-green)', color: '#000',
            border: '3.5px solid #000', borderRadius: 0,
            padding: '10px 24px', fontWeight: 900, fontSize: 12,
            boxShadow: '4px 4px 0 #000',
          }}>
            👍 تم استلام إجابتك!
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        background: '#FFF', borderTop: '5px solid #000',
        padding: '16px 16px env(safe-area-inset-bottom)',
        zIndex: 10, flexShrink: 0,
      }}>
        {isHost && status === 'question' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, direction: 'ltr' }}>
              <span style={{ fontWeight: 900, fontSize: 11, color: '#000' }}>ردود اللاعبين</span>
              <span style={{ fontWeight: 900, fontSize: 11, color: '#000' }}>{answeredCount} / {totalAlive}</span>
            </div>
            <div style={{
              width: '100%', height: 16, background: '#DDD',
              borderRadius: 0, overflow: 'hidden',
              border: '3.5px solid #000',
            }}>
              <div style={{
                width: `${(answeredCount / (totalAlive || 1)) * 100}%`,
                height: '100%', background: 'var(--neo-green)',
                transition: 'none',
                borderRight: answeredCount > 0 ? '3.5px solid #000' : 'none'
              }} />
            </div>
          </div>
        )}

        {isHost && status === 'reveal' && (
          <button
            onClick={handleNext}
            className="btn btn-green"
            style={{
              width: '100%', padding: '16px', fontSize: 16,
              borderRadius: 0, border: '4.5px solid #000', boxShadow: '6px 6px 0 #000',
              fontWeight: 900
            }}
          >
            {totalAlive <= 1 ? '🏁 إنهاء اللعبة' : '➡️ السؤال التالي'}
          </button>
        )}

        {!isHost && status === 'question' && !hasAnswered && (
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 12, color: '#000' }}>
            ⚡ اختر إجابتك بسرعة!
          </div>
        )}

        {!isHost && status === 'reveal' && (
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 12, color: '#000', opacity: 0.7 }}>
            ⏳ في انتظار المضيف...
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
