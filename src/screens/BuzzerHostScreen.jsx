import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { listenToRoom } from '../firebase/rooms';
import {
  startBuzzerGame, buzzerSelectCategory, buzzerChangeQuestion,
  buzzerReveal, buzzerOpenBuzzer, buzzerJudgeCorrect,
  buzzerJudgeWrong, buzzerSkipRound, buzzerEndGame,
} from '../firebase/buzzerRooms';
import { getBuzzerCategoryById, buzzerCategories } from '../data/buzzerCategories';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

export default function BuzzerHostScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playClick, playWin, playLose, playBuzzer } = useAudio();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const catScrollRef = useRef(null);

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { nav.toHome(); return; }
      setRoom(data);
      if (data.status === 'buzzer_over') nav.toBuzzerGameOver();
    });
    return unsub;
  }, [roomCode]);

  const bs = room?.buzzerState;
  const myUid = userProfile?.uid;
  const players = room?.playerOrder || [];
  const phase = bs?.phase;
  const currentCat = bs?.currentCategory ? getBuzzerCategoryById(bs.currentCategory) : null;
  const currentItem = bs?.currentItem;
  const buzzedPlayer = bs?.buzzedUid ? room?.players?.[bs.buzzedUid] : null;

  const handleStart = async () => {
    playClick();
    try {
      await startBuzzerGame(roomCode, myUid);
      setGameStarted(true);
    } catch (e) { setToast(e.message); }
  };

  const handleSelectCategory = async (catId) => {
    playClick();
    try { await buzzerSelectCategory(roomCode, myUid, catId); }
    catch (e) { setToast(e.message); }
  };

  const handleChangeQuestion = async () => {
    playClick();
    await buzzerChangeQuestion(roomCode, myUid);
  };

  const handleReveal = async () => {
    playClick();
    await buzzerReveal(roomCode, myUid);
  };

  const handleOpenBuzzer = async () => {
    playClick();
    await buzzerOpenBuzzer(roomCode, myUid);
  };

  const handleJudgeCorrect = async () => {
    playWin();
    await buzzerJudgeCorrect(roomCode, myUid);
  };

  const handleJudgeWrong = async () => {
    playLose();
    await buzzerJudgeWrong(roomCode, myUid);
  };

  const handleSkip = async () => {
    playClick();
    await buzzerSkipRound(roomCode, myUid);
  };

  const handleEndGame = async () => {
    playClick();
    await buzzerEndGame(roomCode, myUid);
  };

  if (!room) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;

  if (!gameStarted && !bs) {
    return (
      <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card slide-up" style={{ padding: 24, width: '100%', maxWidth: 360, textAlign: 'center', background: '#FFF', border: '5px solid #000', boxShadow: '10px 10px 0 var(--neo-pink)', borderRadius: 0 }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🔔</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#000', margin: '0 0 4px' }}>لعبة البازر</h1>
          <p style={{ fontSize: 12, fontWeight: 900, color: '#666', margin: '0 0 20px' }}>أنت الحكم! اختر الفئة وإدارة الجولات</p>

          <div style={{ background: '#F5F5F5', padding: 12, border: '3px solid #000', marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#000', marginBottom: 8, opacity: 0.6 }}>اللاعبون المتصلون:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {players.map(uid => (
                <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFF', padding: '4px 8px', border: '2px solid #000' }}>
                  <UserAvatar avatarId={room.players[uid]?.avatarId ?? 1} size={20} border="1px solid #000" />
                  <span style={{ fontWeight: 900, fontSize: 10, color: '#000' }}>{room.players[uid]?.username}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleStart} className="btn btn-pink" style={{ width: '100%', padding: 16, fontSize: 18, borderRadius: 0, border: '4px solid #000', boxShadow: '5px 5px 0 #000', fontWeight: 900 }}>
            ابدأ اللعبة 🚀
          </button>
        </div>
        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </div>
    );
  }

  const scores = bs?.scores || {};
  const sortedPlayers = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  const scoreTarget = bs?.scoreTarget || 10;
  const isActivePhase = phase === 'buzzer_open' || phase === 'answering' || phase === 'revealed';
  const canSelectCategory = phase === 'category_select' || phase === 'round_result';

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: 'var(--neo-yellow)', borderBottom: '4px solid #000', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 20, background: '#FFF', width: 34, height: 34, borderRadius: 0, border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#000' }}>لوحة الحكم</div>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#000', opacity: 0.7 }}>الجولة {bs?.roundNumber || 0}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowScores(!showScores)}
            style={{
              padding: '6px 10px', background: showScores ? 'var(--neo-green)' : '#FFF',
              border: '2.5px solid #000', borderRadius: 0, fontWeight: 900, fontSize: 10, cursor: 'pointer'
            }}
          >
            📊
          </button>
          <button onClick={handleEndGame} style={{ padding: '6px 10px', background: '#000', color: '#FFF', border: '2.5px solid #000', borderRadius: 0, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>
            إنهاء 🏁
          </button>
        </div>
      </div>

      {/* Category Bar - always visible */}
      <div style={{ background: '#FFF', borderBottom: '3px solid #000', padding: '8px 0', flexShrink: 0 }}>
        <div
          ref={catScrollRef}
          style={{
            display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none',
            padding: '0 12px', WebkitOverflowScrolling: 'touch',
          }}
        >
          {buzzerCategories.map(cat => {
            const selected = bs?.currentCategory === cat.id;
            const disabled = !canSelectCategory;
            return (
              <button
                key={cat.id}
                onClick={() => { if (canSelectCategory) handleSelectCategory(cat.id); }}
                style={{
                  flexShrink: 0, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
                  background: selected ? 'var(--neo-yellow)' : '#FFF',
                  border: selected ? '3px solid #000' : '2px solid #CCC',
                  boxShadow: selected ? '3px 3px 0 #000' : 'none',
                  transform: selected ? 'translate(-1px, -1px)' : 'none',
                  cursor: disabled ? 'default' : 'pointer',
                  borderRadius: 0, transition: 'none', opacity: disabled && !selected ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#000' }}>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Last result banner */}
        {phase === 'round_result' && bs?.lastResult && (
          <div className="slide-up" style={{
            padding: '10px 14px', textAlign: 'center',
            background: bs.lastResult === 'correct' ? 'var(--neo-green)' : bs.lastResult === 'wrong' ? 'var(--neo-pink)' : '#EEE',
            border: '3px solid #000', fontWeight: 900, fontSize: 13,
          }}>
            {bs.lastResult === 'correct' ? '✅ إجابة صحيحة!' : bs.lastResult === 'wrong' ? '❌ إجابة خاطئة' : '⏭️ تم التخطي'}
          </div>
        )}

        {/* Category select prompt */}
        {canSelectCategory && !showScores && (
          <div className="card" style={{ padding: 14, background: 'var(--neo-yellow)', border: '4px solid #000', borderRadius: 0, boxShadow: '4px 4px 0 #000', textAlign: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>اختر الفئة من الشريط أعلاه 👆</span>
          </div>
        )}

        {/* Question card - always visible when question exists */}
        {currentItem && (phase === 'buzzer_open' || phase === 'answering' || phase === 'revealed' || phase === 'round_result') && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            <div className="card" style={{ padding: 16, background: '#FFF', border: '5px solid #000', borderRadius: 0, boxShadow: '6px 6px 0 #000' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '2px solid #EEE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 20 }}>{currentCat?.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#000' }}>{currentCat?.name}</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 900, background: '#F5F5F5', padding: '2px 6px', border: '1px solid #000' }}>ج{bs.roundNumber + 1}</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#999', marginBottom: 4 }}>السؤال 👑</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#000', lineHeight: 1.4, marginBottom: 12 }}>{currentItem.question}</div>

                <div style={{ background: 'var(--neo-green)', color: '#000', padding: '8px 14px', border: '3px solid #000', display: 'inline-block', fontWeight: 900, fontSize: 14 }}>
                  الإجابة: {currentItem.answer}
                </div>

                {currentCat?.type === 'visual' && currentItem?.image && (
                  <div style={{ marginTop: 12, fontSize: 64, lineHeight: 1 }}>{currentItem.image}</div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {phase !== 'answering' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleChangeQuestion}
                  className="btn btn-white"
                  style={{ flex: 1, padding: 10, fontSize: 11, fontWeight: 900, borderRadius: 0, border: '3px solid #000' }}
                >
                  سؤال جديد 🔄
                </button>
                {currentCat?.type === 'visual' && !bs?.revealed && (
                  <button
                    onClick={handleReveal}
                    className="btn btn-yellow"
                    style={{ flex: 1, padding: 10, fontSize: 11, fontWeight: 900, borderRadius: 0, border: '3px solid #000', boxShadow: '3px 3px 0 #000' }}
                  >
                    كشف 👁️
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Buzzer waiting */}
        {phase === 'buzzer_open' && (
          <div className="card" style={{ padding: 16, background: 'var(--neo-green)', border: '4px solid #000', borderRadius: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#000' }}>⏳ البازر مفتوح - بانتظار اللاعبين</div>
          </div>
        )}

        {/* Answering - player buzzed in */}
        {phase === 'answering' && buzzedPlayer && (
          <div className="card slide-up" style={{ padding: 16, background: 'var(--neo-yellow)', border: '5px solid #000', borderRadius: 0, boxShadow: '6px 6px 0 #000', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#000', marginBottom: 10 }}>🔔 اللاعب:</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
              <UserAvatar avatarId={buzzedPlayer.avatarId ?? 1} size={40} border="3px solid #000" />
              <span style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>{buzzedPlayer.username}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleJudgeCorrect} style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 900, borderRadius: 0, border: '4px solid #000', boxShadow: '4px 4px 0 #000', background: 'var(--neo-green)', color: '#000', cursor: 'pointer' }}>
                ✅ صحيح
              </button>
              <button onClick={handleJudgeWrong} style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 900, borderRadius: 0, border: '4px solid #000', boxShadow: '4px 4px 0 #000', background: 'var(--neo-pink)', color: '#000', cursor: 'pointer' }}>
                ❌ خطأ
              </button>
            </div>
          </div>
        )}

        {/* Skip button */}
        {(phase === 'buzzer_open' || phase === 'answering') && (
          <button onClick={handleSkip} style={{ width: '100%', padding: 12, fontSize: 12, fontWeight: 900, borderRadius: 0, border: '3px solid #000', background: '#FFF', cursor: 'pointer' }}>
            تخطي ⏭️
          </button>
        )}

        {/* Scoreboard */}
        {showScores && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#000', background: 'var(--neo-yellow)', padding: '4px 10px', border: '3px solid #000', display: 'inline-block', alignSelf: 'flex-start' }}>
              النتائج (الهدف: {scoreTarget})
            </div>
            {sortedPlayers.map(uid => {
              const p = room.players[uid];
              const score = scores[uid] || 0;
              return (
                <div key={uid} className="card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 0, border: '3px solid #000', background: score >= scoreTarget ? 'var(--neo-yellow)' : '#FFF' }}>
                  <UserAvatar avatarId={p?.avatarId ?? 1} size={32} border="2px solid #000" />
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 12, color: '#000' }}>{p?.username}</span>
                  <div style={{ minWidth: 50, textAlign: 'center', background: '#000', color: 'var(--neo-yellow)', padding: '3px 8px', fontWeight: 900, fontSize: 14, border: '2px solid #000', borderRadius: 0 }}>
                    {score}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
