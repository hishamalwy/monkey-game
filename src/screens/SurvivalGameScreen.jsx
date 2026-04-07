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
    const correctIdx = currentQ.correct;
    const newAlivePlayers = { ...survivalState.alivePlayers };
    const eliminatedThisRound = [];
    Object.keys(survivalState.alivePlayers).forEach(uid => {
      const cur = survivalState.alivePlayers[uid];
      if (cur <= 0) return;
      const ans = survivalState.answers[uid]?.answer;
      if (ans === undefined || ans !== correctIdx) {
        newAlivePlayers[uid] = cur - 1;
        if (newAlivePlayers[uid] <= 0) eliminatedThisRound.push(uid);
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

  const Heart = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill={filled ? '#FF1F8E' : 'rgba(28,16,64,0.15)'} stroke={filled ? '#C0006E' : 'rgba(28,16,64,0.25)'} strokeWidth="1">
      <path d="M10 17s-7-5.25-7-9.5A4.5 4.5 0 0 1 10 4.16 4.5 4.5 0 0 1 17 7.5C17 11.75 10 17 10 17z" />
    </svg>
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
        borderBottom: '4px solid var(--bg-dark-purple)',
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
          style={{ width: 38, height: 38, fontSize: 15, borderRadius: '10px', padding: 0, flexShrink: 0 }}
        >✕</button>

        <div style={{
          background: 'var(--bg-dark-purple)', color: 'var(--bg-yellow)',
          padding: '5px 14px', borderRadius: '100px', fontWeight: 950, fontSize: 13,
          border: '3px solid var(--bg-dark-purple)', boxShadow: '3px 3px 0 var(--bg-pink)',
        }}>
          ⚔️ {totalAlive} ناجٍ  •  س{survivalState.currentQuestionIndex + 1}
        </div>

        <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
          <svg width="42" height="42" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="21" cy="21" r="17" fill="none" stroke="#EEE" strokeWidth="4" />
            <circle
              cx="21" cy="21" r="17" fill="none"
              stroke={timerDanger ? 'var(--bg-pink)' : 'var(--bg-green)'}
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 17}`}
              strokeDashoffset={`${2 * Math.PI * 17 * (1 - timerPct / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 950, fontSize: 14,
            color: timerDanger ? 'var(--bg-pink)' : 'var(--bg-dark-purple)',
            animation: timerDanger ? 'pulse 0.5s infinite' : 'none',
          }}>
            {timer}
          </div>
        </div>
      </div>

      {/* PLAYER STRIP */}
      <div style={{
        background: 'rgba(255,255,255,0.7)',
        borderBottom: '4px solid var(--bg-dark-purple)',
        padding: '8px 12px',
        display: 'flex',
        gap: 8,
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
                minWidth: 52, gap: 4,
                opacity: dead ? 0.4 : 1,
                filter: dead ? 'grayscale(1)' : 'none',
                transition: 'opacity 0.4s',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{
                  borderRadius: '50%',
                  border: isMe ? '3px solid var(--bg-pink)' : '3px solid var(--bg-dark-purple)',
                  boxShadow: isMe ? '0 0 0 2px #FFF, 3px 3px 0 var(--bg-pink)' : 'none',
                }}>
                  <UserAvatar avatarId={p.avatarId ?? 1} size={34} />
                </div>
                {dead && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.35)',
                  }}>💀</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 1 }}>
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
          background: 'var(--bg-dark-purple)',
          border: '4px solid var(--bg-dark-purple)',
          borderRadius: '18px',
          boxShadow: '6px 6px 0 var(--bg-pink)',
          padding: '20px 18px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-yellow)', color: 'var(--bg-dark-purple)',
            padding: '2px 12px', borderRadius: '100px',
            fontWeight: 950, fontSize: 11,
            border: '3px solid var(--bg-dark-purple)',
            whiteSpace: 'nowrap',
          }}>
            سؤال {survivalState.currentQuestionIndex + 1}
          </div>
          <p style={{
            color: '#FFF', fontWeight: 950,
            fontSize: currentQ.q.length > 80 ? 15 : currentQ.q.length > 50 ? 17 : 19,
            lineHeight: 1.5, margin: 0, marginTop: 4,
          }}>
            {currentQ.q}
          </p>
        </div>

        {/* Answer grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, width: '100%', maxWidth: 420,
        }}>
          {currentQ.a.map((ans, i) => {
            const isSelected = selectedAnswer === i || myAns === i;
            const isCorrect = status === 'reveal' && i === currentQ.correct;
            const isWrong = status === 'reveal' && isSelected && i !== currentQ.correct;

            let bg = '#FFF';
            let color = 'var(--bg-dark-purple)';
            let shadow = isSelected ? 'none' : '4px 4px 0 var(--bg-dark-purple)';
            let transform = isSelected && !isCorrect && !isWrong ? 'translate(4px,4px)' : 'none';
            let border = '3.5px solid var(--bg-dark-purple)';

            if (isSelected && !isCorrect && !isWrong) { bg = 'var(--bg-pink)'; color = '#FFF'; }
            if (isCorrect) { bg = 'var(--bg-green)'; color = '#FFF'; shadow = '4px 4px 0 var(--bg-dark-purple)'; transform = 'none'; }
            if (isWrong) { bg = '#FF4D4D'; color = '#FFF'; shadow = '4px 4px 0 var(--bg-dark-purple)'; transform = 'none'; }

            return (
              <button
                key={i}
                disabled={!isAlive || status !== 'question' || hasAnswered}
                onClick={() => handleAnswer(i)}
                className="pop"
                style={{
                  background: bg, color, border, borderRadius: '14px',
                  padding: '12px 8px',
                  fontWeight: 950, fontSize: 14,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  boxShadow: shadow, transform, transition: 'all 0.1s',
                  cursor: isAlive && status === 'question' && !hasAnswered ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: isSelected || isCorrect || isWrong
                    ? 'rgba(255,255,255,0.25)' : 'rgba(28,16,64,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 950, fontSize: 12,
                }}>
                  {labels[i]}
                </div>
                <span style={{
                  textAlign: 'center', lineHeight: 1.3,
                  fontSize: ans.length > 80 ? 10 : ans.length > 45 ? 11 : 13,
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
            background: 'var(--bg-dark-purple)', color: 'var(--bg-yellow)',
            border: '4px solid var(--bg-pink)', borderRadius: '14px',
            padding: '12px', textAlign: 'center', fontWeight: 950, fontSize: 14,
            boxShadow: '4px 4px 0 var(--bg-pink)',
          }}>
            💀 خسرت كل قلوبك!<br />
            <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>انتظر انتهاء الجولة...</span>
          </div>
        )}

        {/* Answer received banner for non-host */}
        {!isHost && hasAnswered && status === 'question' && (
          <div style={{
            background: 'var(--bg-green)', color: 'var(--bg-dark-purple)',
            border: '3px solid var(--bg-dark-purple)', borderRadius: '12px',
            padding: '8px 20px', fontWeight: 950, fontSize: 13,
            boxShadow: '3px 3px 0 var(--bg-dark-purple)',
          }}>
            👍 تم استلام إجابتك!
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        background: '#FFF', borderTop: '4px solid var(--bg-dark-purple)',
        padding: '12px 16px env(safe-area-inset-bottom)',
        zIndex: 10, flexShrink: 0,
      }}>
        {isHost && status === 'question' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 950, fontSize: 12, color: 'var(--bg-dark-purple)' }}>تقدّم الإجابات</span>
              <span style={{ fontWeight: 950, fontSize: 12, color: 'var(--bg-pink)' }}>{answeredCount} / {totalAlive}</span>
            </div>
            <div style={{
              width: '100%', height: 12, background: '#EEE',
              borderRadius: 20, overflow: 'hidden',
              border: '3px solid var(--bg-dark-purple)',
            }}>
              <div style={{
                width: `${(answeredCount / (totalAlive || 1)) * 100}%`,
                height: '100%', background: 'var(--bg-green)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {isHost && status === 'reveal' && (
          <button
            onClick={handleNext}
            className="btn btn-green"
            style={{
              width: '100%', padding: '15px', fontSize: 17,
              borderRadius: '14px', boxShadow: '4px 4px 0 var(--bg-dark-purple)',
              fontWeight: 950,
            }}
          >
            {totalAlive <= 1 ? '🏁 نهاية المسابقة' : '➡️ السؤال التالي'}
          </button>
        )}

        {!isHost && status === 'question' && !hasAnswered && (
          <div style={{ textAlign: 'center', fontWeight: 950, fontSize: 13, color: 'var(--bg-dark-purple)' }}>
            ⚡ اختر أسرع إجابة!
          </div>
        )}

        {!isHost && status === 'reveal' && (
          <div style={{ textAlign: 'center', fontWeight: 950, fontSize: 13, color: 'var(--bg-dark-purple)', opacity: 0.7 }}>
            ⏳ بانتظار الهوست...
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
