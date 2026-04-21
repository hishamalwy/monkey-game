import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { listenToRoom, leaveRoom } from '../firebase/rooms';
import { buzzerPress } from '../firebase/buzzerRooms';
import { getBuzzerCategoryById } from '../data/buzzerCategories';
import UserAvatar from '../components/ui/UserAvatar';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

export default function BuzzerPlayerScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playClick, playPenalty, playCorrect, playBuzzer } = useAudio();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [pressing, setPressing] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const prevPhaseRef = useRef(null);
  const prevBuzzedRef = useRef(null);

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
  const phase = bs?.phase;
  const currentCat = bs?.currentCategory ? getBuzzerCategoryById(bs.currentCategory) : null;
  const currentItem = bs?.currentItem;
  const buzzedUid = bs?.buzzedUid;
  const isMeBuzzed = buzzedUid === myUid;
  const scores = bs?.scores || {};
  const players = room?.playerOrder || [];
  const myScore = scores[myUid] || 0;
  const scoreTarget = bs?.scoreTarget || 10;

  useEffect(() => {
    if (phase === 'buzzer_open' && prevPhaseRef.current !== 'buzzer_open') {
      playBuzzer();
    }
    if (buzzedUid && prevBuzzedRef.current !== buzzedUid) {
      if (buzzedUid === myUid) playCorrect();
      else playPenalty();
    }
    prevPhaseRef.current = phase;
    prevBuzzedRef.current = buzzedUid;
  }, [phase, buzzedUid, myUid, playBuzzer, playCorrect, playPenalty]);

  const handleBuzz = async () => {
    if (pressing || !bs?.buzzerOpen || bs?.buzzLocked) return;
    playBuzzer();
    setPressing(true);
    try {
      await buzzerPress(roomCode, myUid);
    } catch {
      setToast('فشل الضغط');
    } finally {
      setPressing(false);
    }
  };

  const handleLeave = async () => {
    playClick();
    await leaveRoom(roomCode, myUid);
    nav.toHome();
  };

  if (isHost) {
    return (
      <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card" style={{ padding: 24, width: '100%', maxWidth: 360, textAlign: 'center', background: 'var(--neo-yellow)', border: '5px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#000', margin: '0 0 8px' }}>أنت الحكم!</h2>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#000', opacity: 0.7, margin: '0 0 20px' }}>استخدم لوحة التحكم لإدارة اللعبة</p>
        </div>
      </div>
    );
  }

  const canBuzz = phase === 'buzzer_open' && !buzzedUid;

  const scoreBar = (
    <div style={{ background: '#FFF', borderBottom: '4px solid #000', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {currentCat ? (
          <>
            <span style={{ fontSize: 20 }}>{currentCat.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#000' }}>{currentCat.name}</span>
          </>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 900, color: '#000' }}>🔔 البازر</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#000' }}>نقاطي</span>
          <div style={{ fontSize: 16, fontWeight: 900, background: 'var(--neo-yellow)', padding: '2px 10px', border: '2px solid #000', minWidth: 40, textAlign: 'center' }}>
            {myScore}
          </div>
          <span style={{ fontSize: 9, fontWeight: 900, color: '#999' }}>/ {scoreTarget}</span>
        </div>
        <button
          onClick={() => { playClick(); setShowExitConfirm(true); }}
          style={{ background: '#000', color: '#FFF', border: '2px solid #000', padding: '4px 8px', fontSize: 10, fontWeight: 900, cursor: 'pointer', borderRadius: 0 }}
        >
          خروج ←
        </button>
      </div>
    </div>
  );

  if (!bs || phase === 'category_select' || phase === 'preparing') {
    return (
      <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {scoreBar}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card slide-up" style={{ padding: 32, width: '100%', maxWidth: 360, textAlign: 'center', background: '#FFF', border: '5px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#000', margin: '0 0 8px' }}>بانتظار الحكم...</h2>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#666', margin: 0 }}>الحكم يختار الفئة ويحضر السؤال</p>
          </div>
        </div>
        {showExitConfirm && _renderExitConfirm(setShowExitConfirm, handleLeave)}
        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </div>
    );
  }

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {scoreBar}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 }}>

        {currentCat?.type === 'visual' && bs?.revealed && currentItem?.image && (
          <div className="card slide-up" style={{ padding: 24, background: '#FFF', border: '5px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000', textAlign: 'center' }}>
            <div style={{ fontSize: 80, lineHeight: 1 }}>{currentItem.image}</div>
          </div>
        )}

        {currentCat?.type === 'voice' && (phase === 'buzzer_open' || phase === 'answering') && (
          <div className="card" style={{ padding: 16, background: 'var(--neo-cyan)', border: '4px solid #000', borderRadius: 0, textAlign: 'center', boxShadow: '4px 4px 0 #000' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>🎤 استمع للحكم!</div>
          </div>
        )}

        {phase === 'answering' && buzzedUid && (
          <div className="card slide-up" style={{ padding: 20, background: isMeBuzzed ? 'var(--neo-green)' : 'var(--neo-pink)', border: '5px solid #000', borderRadius: 0, boxShadow: '6px 6px 0 #000', textAlign: 'center', width: '100%', maxWidth: 340 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              <UserAvatar avatarId={room.players?.[buzzedUid]?.avatarId ?? 1} size={44} border="3px solid #000" />
              <span style={{ fontSize: 16, fontWeight: 900, color: '#000' }}>
                {isMeBuzzed ? 'أنت ضغطت أولاً! 🎉' : `${room.players?.[buzzedUid]?.username} ضغط أولاً`}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#000', opacity: 0.7 }}>بانتظار حكم الحكم...</div>
          </div>
        )}

        {phase === 'round_result' && bs?.lastResult && (
          <div className="card slide-up" style={{ padding: 16, background: bs.lastResult === 'correct' ? 'var(--neo-green)' : 'var(--neo-pink)', border: '4px solid #000', borderRadius: 0, textAlign: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: 16, color: '#000' }}>
              {bs.lastResult === 'correct' ? '✅ إجابة صحيحة!' : bs.lastResult === 'wrong' ? '❌ إجابة خاطئة' : '⏭️ تم التخطي'}
            </span>
          </div>
        )}

        {(phase === 'buzzer_open' || phase === 'answering') && !buzzedUid && (
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleBuzz}
              disabled={!canBuzz || pressing}
              style={{
                width: 260,
                height: 260,
                borderRadius: '50%',
                border: '10px solid #000',
                background: canBuzz
                  ? 'radial-gradient(circle at 35% 35%, #FF41BB, #B30070)'
                  : '#888',
                color: '#FFF',
                cursor: canBuzz ? 'pointer' : 'not-allowed',
                boxShadow: canBuzz
                  ? '0 15px 0 #800050, 0 20px 0 #000, 0 30px 40px rgba(0,0,0,0.4)'
                  : '0 10px 0 #555, 0 15px 0 #000',
                transition: 'all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                position: 'relative',
                transform: pressing ? 'translateY(15px)' : 'none',
              }}
              aria-label="اضغط البازر"
            >
              {canBuzz && (
                <div style={{
                  position: 'absolute', inset: -20,
                  borderRadius: '50%',
                  border: '4px solid rgba(255,65,187,0.4)',
                  animation: 'ripple 1.5s infinite',
                  pointerEvents: 'none',
                }} />
              )}

              <div style={{
                position: 'absolute',
                top: '12%',
                left: '25%',
                width: '50%',
                height: '30%',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
                borderRadius: '50% 50% 50% 50% / 100% 100% 0% 0%',
                pointerEvents: 'none',
              }} />

              <span style={{ fontSize: 64, marginBottom: -8, filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.3))' }}>🔔</span>
              <span style={{ fontSize: 36, fontWeight: 900, textShadow: '0 4px 0 rgba(0,0,0,0.5)', letterSpacing: 2 }}>اضغط</span>

              {canBuzz && (
                <div style={{
                  position: 'absolute', bottom: '15%',
                  fontSize: 10, fontWeight: 900, opacity: 0.8,
                  background: '#000', padding: '2px 8px', borderRadius: 4
                }}>
                  READY!
                </div>
              )}
            </button>

            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes ripple {
                0% { transform: scale(1); opacity: 0.8; }
                100% { transform: scale(1.4); opacity: 0; }
              }
            `}} />
          </div>
        )}

        {phase === 'answering' && buzzedUid && !isMeBuzzed && (
          <div style={{ fontSize: 12, fontWeight: 900, color: '#999', textAlign: 'center' }}>
            البازر مقفل - بانتظار الحكم
          </div>
        )}
      </div>

      {showExitConfirm && _renderExitConfirm(setShowExitConfirm, handleLeave)}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function _renderExitConfirm(setShowExitConfirm, handleLeave) {
  return (
    <div role="dialog" aria-label="تأكيد المغادرة" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card slide-up" style={{ padding: 28, width: '100%', maxWidth: 340, textAlign: 'center', borderRadius: 0, border: '6px solid #000', background: '#FFF', boxShadow: '12px 12px 0 var(--neo-pink)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚪</div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: '#000', margin: '0 0 10px' }}>هل تريد المغادرة؟</h3>
        <p style={{ fontSize: 13, color: '#666', fontWeight: 900, marginBottom: 20 }}>ستخسر تقدمك في اللعبة</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowExitConfirm(false)} style={{ flex: 1, padding: 16, borderRadius: 0, border: '4px solid #000', fontWeight: 900, fontSize: 14, background: '#FFF', cursor: 'pointer' }}>
            لا
          </button>
          <button onClick={handleLeave} style={{ flex: 1, padding: 16, borderRadius: 0, border: '4px solid #000', fontWeight: 900, fontSize: 14, background: 'var(--neo-pink)', color: '#000', cursor: 'pointer' }}>
            نعم
          </button>
        </div>
      </div>
    </div>
  );
}
