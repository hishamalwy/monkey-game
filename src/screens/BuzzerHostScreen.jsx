import { useState, useEffect } from 'react';
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
  const { playClick, playWin, playLose, playPenalty, playJoin } = useAudio();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [showScores, setShowScores] = useState(false);

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
  const isHost = room?.hostUid === myUid;
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

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <div style={{ background: 'var(--neo-yellow)', borderBottom: '5px solid #000', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 24, background: '#FFF', width: 40, height: 40, borderRadius: 0, border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>لوحة الحكم</div>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#000', opacity: 0.7 }}>الجولة {bs?.roundNumber || 0}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowScores(!showScores)}
            style={{
              padding: '8px 12px', background: showScores ? 'var(--neo-green)' : '#FFF',
              border: '3px solid #000', borderRadius: 0, fontWeight: 900, fontSize: 11, cursor: 'pointer'
            }}
          >
            {showScores ? 'إخفاء النتائج 📊' : 'النتائج 📊'}
          </button>
          <button onClick={handleEndGame} style={{ padding: '8px 12px', background: '#000', color: '#FFF', border: '3px solid #000', borderRadius: 0, fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
            إنهاء 🏁
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {(phase === 'category_select' || phase === 'round_result') && !showScores && (
          <div className="card slide-up" style={{ padding: 16, background: '#FFF', border: '5px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#000', marginBottom: 12, textAlign: 'center' }}>
              اختر الفئة للجولة القادمة 👇
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {buzzerCategories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => handleSelectCategory(cat.id)} 
                  style={{ 
                    padding: '12px 6px', textAlign: 'center', cursor: 'pointer', 
                    background: bs?.currentCategory === cat.id ? 'var(--neo-yellow)' : '#FFF', 
                    border: '3px solid #000', borderRadius: 0, position: 'relative'
                  }}
                >
                  <div style={{ fontSize: 24 }}>{cat.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#000', marginTop: 4 }}>{cat.name}</div>
                </button>
              ))}
            </div>
            {phase === 'round_result' && bs?.lastResult && (
              <div 
                style={{ 
                  marginTop: 16, padding: '10px', textAlign: 'center', 
                  background: bs.lastResult === 'correct' ? 'var(--neo-green)' : bs.lastResult === 'wrong' ? 'var(--neo-pink)' : '#EEE', 
                  border: '3px solid #000', fontWeight: 900, fontSize: 14 
                }}
              >
                {bs.lastResult === 'correct' ? '✅ إجابة صحيحة!' : bs.lastResult === 'wrong' ? '❌ إجابة خاطئة' : '⏭️ تم تخطي السؤال'}
              </div>
            )}
          </div>
        )}

        {(phase === 'ready' || phase === 'revealed' || phase === 'buzzer_open' || phase === 'answering') && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div className="card" style={{ padding: 20, background: '#FFF', border: '5px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '2px solid #EEE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{currentCat?.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#000' }}>{currentCat?.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 900, background: '#F5F5F5', padding: '2px 8px', border: '1px solid #000' }}>الجولة {bs.roundNumber + 1}</span>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#999', marginBottom: 6 }}>السؤال 👑</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#000', lineHeight: 1.4, marginBottom: 16 }}>{currentItem?.question}</div>
                
                <div style={{ background: 'var(--neo-green)', color: '#000', padding: '10px 16px', border: '3px solid #000', display: 'inline-block', fontWeight: 900, fontSize: 15 }}>
                  الإجابة: {currentItem?.answer}
                </div>
                
                {currentCat?.type === 'visual' && currentItem?.image && (
                  <div style={{ marginTop: 16, fontSize: 72, lineHeight: 1 }}>{currentItem.image}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleChangeQuestion}
                disabled={phase === 'answering'}
                className="btn btn-white"
                style={{ flex: 1, padding: 12, fontSize: 12, fontWeight: 900, borderRadius: 0, border: '3px solid #000', opacity: phase === 'answering' ? 0.4 : 1 }}
              >
                تغيير السؤال 🔄
              </button>
              {currentCat?.type === 'visual' && !bs?.revealed && (
                <button
                  onClick={handleReveal}
                  className="btn btn-yellow"
                  style={{ flex: 1, padding: 12, fontSize: 12, fontWeight: 900, borderRadius: 0, border: '3px solid #000', boxShadow: '3px 3px 0 #000' }}
                >
                  كشف 👁️
                </button>
              )}
            </div>

            {phase === 'buzzer_open' && (
              <div className="card" style={{ padding: 20, background: 'var(--neo-green)', border: '4px solid #000', borderRadius: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#000', animation: 'pulse 0.5s infinite' }}>⏳ بانتظار اللاعبين...</div>
              </div>
            )}

            {phase === 'answering' && buzzedPlayer && (
              <div className="card slide-up" style={{ padding: 20, background: 'var(--neo-yellow)', border: '5px solid #000', borderRadius: 0, boxShadow: '6px 6px 0 #000', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#000', marginBottom: 12 }}>🔔 اللاعب:</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                  <UserAvatar avatarId={buzzedPlayer.avatarId ?? 1} size={48} border="3px solid #000" />
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#000' }}>{buzzedPlayer.username}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleJudgeCorrect} className="btn btn-green" style={{ flex: 1, padding: 16, fontSize: 16, fontWeight: 900, borderRadius: 0, border: '4px solid #000', boxShadow: '4px 4px 0 #000' }}>
                    ✅ صحيح
                  </button>
                  <button onClick={handleJudgeWrong} className="btn btn-pink" style={{ flex: 1, padding: 16, fontSize: 16, fontWeight: 900, borderRadius: 0, border: '4px solid #000', boxShadow: '4px 4px 0 #000' }}>
                    ❌ خطأ
                  </button>
                </div>
              </div>
            )}

            {(phase === 'buzzer_open' || phase === 'answering') && (
              <button onClick={handleSkip} className="btn btn-white" style={{ width: '100%', padding: 14, fontSize: 13, fontWeight: 900, borderRadius: 0, border: '3px solid #000' }}>
                تخطي ⏭️
              </button>
            )}
          </div>
        )}

        {showScores && (
          <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#000', background: 'var(--neo-yellow)', padding: '4px 12px', border: '3px solid #000', display: 'inline-block', alignSelf: 'flex-start' }}>
              النتائج (الهدف: {scoreTarget})
            </div>
            {sortedPlayers.map(uid => {
              const p = room.players[uid];
              const score = scores[uid] || 0;
              return (
                <div key={uid} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 0, border: '3px solid #000', background: score >= scoreTarget ? 'var(--neo-yellow)' : '#FFF' }}>
                  <UserAvatar avatarId={p?.avatarId ?? 1} size={36} border="2px solid #000" />
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: '#000' }}>{p?.username}</span>
                  <div style={{ minWidth: 60, textAlign: 'center', background: '#000', color: 'var(--neo-yellow)', padding: '4px 10px', fontWeight: 900, fontSize: 16, border: '2px solid #000', borderRadius: 0 }}>
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
