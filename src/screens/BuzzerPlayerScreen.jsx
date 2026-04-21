import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { listenToRoom } from '../firebase/rooms';
import { buzzerPress } from '../firebase/buzzerRooms';
import { getBuzzerCategoryById } from '../data/buzzerCategories';
import UserAvatar from '../components/ui/UserAvatar';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

export default function BuzzerPlayerScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playClick, playPenalty, playCorrect, playJoin } = useAudio();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [pressing, setPressing] = useState(false);
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
  const scoreTarget = bs?.scoreTarget || 10;

  useEffect(() => {
    if (phase === 'buzzer_open' && prevPhaseRef.current !== 'buzzer_open') {
      playJoin();
    }
    if (buzzedUid && prevBuzzedRef.current !== buzzedUid) {
      if (buzzedUid === myUid) playCorrect();
      else playPenalty();
    }
    prevPhaseRef.current = phase;
    prevBuzzedRef.current = buzzedUid;
  }, [phase, buzzedUid, myUid, playJoin, playCorrect, playPenalty]);

  const handleBuzz = async () => {
    if (pressing || !bs?.buzzerOpen || bs?.buzzLocked) return;
    playClick();
    setPressing(true);
    try {
      await buzzerPress(roomCode, myUid);
    } catch {
      setToast('فشل الضغط');
    } finally {
      setPressing(false);
    }
  };

  if (isHost) {
    return (
      <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card" style={{ padding: 24, width: '100%', maxWidth: 360, textAlign: 'center', background: 'var(--neo-yellow)', border: '5px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#000', margin: '0 0 8px' }}>أنت الحكم!</h2>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#000', opacity: 0.7, margin: '0 0 20px' }}>استخدم لوحة التحكم لإدارة اللعبة</p>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#000', marginBottom: 8 }}>السؤال: {currentItem?.question}</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--neo-green)', background: '#FFF', padding: '8px 14px', border: '3px solid #000', borderRadius: 0, display: 'inline-block', marginBottom: 16 }}>
            الإجابة: {currentItem?.answer}
          </div>
        </div>
      </div>
    );
  }

  if (!bs || phase === 'category_select' || phase === 'preparing') {
    return (
      <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card slide-up" style={{ padding: 32, width: '100%', maxWidth: 360, textAlign: 'center', background: '#FFF', border: '5px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#000', margin: '0 0 8px' }}>بانتظار الحكم...</h2>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#666', margin: 0 }}>الحكم يختار الفئة ويحضر السؤال</p>
        </div>
      </div>
    );
  }

  const canBuzz = phase === 'buzzer_open' && !buzzedUid;

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <div style={{ background: '#FFF', borderBottom: '5px solid #000', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {currentCat && (
            <>
              <span style={{ fontSize: 20 }}>{currentCat.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#000' }}>{currentCat.name}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#000' }}>نقاطي:</span>
          <span style={{ fontSize: 16, fontWeight: 900, background: 'var(--neo-yellow)', padding: '2px 10px', border: '2px solid #000' }}>{scores[myUid] || 0}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 20 }}>

        {currentCat?.type === 'visual' && bs?.revealed && currentItem?.image && (
          <div className="card slide-up" style={{ padding: 24, background: '#FFF', border: '5px solid #000', borderRadius: 0, boxShadow: '8px 8px 0 #000', textAlign: 'center' }}>
            <div style={{ fontSize: 80, lineHeight: 1 }}>{currentItem.image}</div>
          </div>
        )}

        {currentCat?.type === 'voice' && (phase === 'ready' || phase === 'revealed' || phase === 'buzzer_open') && (
          <div className="card" style={{ padding: 20, background: 'var(--neo-cyan)', border: '4px solid #000', borderRadius: 0, textAlign: 'center', boxShadow: '4px 4px 0 #000' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>🎤 استمع للحكم!</div>
          </div>
        )}

        {phase === 'ready' && (
          <div style={{ fontSize: 18, fontWeight: 900, color: '#000', textAlign: 'center' }}>
            استعد... 🎯
          </div>
        )}

        {(phase === 'answering' || phase === 'round_result') && buzzedUid && (
          <div className="card slide-up" style={{ padding: 20, background: isMeBuzzed ? 'var(--neo-green)' : 'var(--neo-pink)', border: '5px solid #000', borderRadius: 0, boxShadow: '6px 6px 0 #000', textAlign: 'center', width: '100%', maxWidth: 340 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              <UserAvatar avatarId={room.players?.[buzzedUid]?.avatarId ?? 1} size={44} border="3px solid #000" />
              <span style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>
                {isMeBuzzed ? 'أنت ضغطت أولاً! 🎉' : `${room.players?.[buzzedUid]?.username} ضغط أولاً`}
              </span>
            </div>
            {phase === 'answering' && (
              <div style={{ fontSize: 13, fontWeight: 900, color: '#000', opacity: 0.7 }}>بانتظار حكم الحكم...</div>
            )}
            {phase === 'round_result' && (
              <div style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>
                {bs.lastResult === 'correct' ? '✅ إجابة صحيحة!' : bs.lastResult === 'wrong' ? '❌ إجابة خاطئة' : '⏭️ تم التخطي'}
              </div>
            )}
          </div>
        )}

        {(phase === 'buzzer_open' || phase === 'ready' || phase === 'revealed') && !buzzedUid && (
          <button
            onClick={handleBuzz}
            disabled={!canBuzz || pressing}
            style={{
              width: Math.min(240, '70vw'),
              height: Math.min(240, '70vw'),
              borderRadius: '50%',
              border: '8px solid #000',
              background: canBuzz
                ? 'radial-gradient(circle at 35% 35%, var(--neo-pink), #CC0088)'
                : '#888',
              color: '#FFF',
              fontSize: 36,
              fontWeight: 900,
              cursor: canBuzz ? 'pointer' : 'not-allowed',
              boxShadow: canBuzz
                ? '8px 8px 0 #000, inset 0 -8px 20px rgba(0,0,0,0.3), inset 0 8px 20px rgba(255,255,255,0.2)'
                : '4px 4px 0 #444',
              transition: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 4,
              opacity: pressing ? 0.7 : 1,
              position: 'relative',
              overflow: 'hidden',
            }}
            aria-label="اضغط البازر"
          >
            {canBuzz && (
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                boxShadow: '0 0 40px rgba(255,65,187,0.6)',
                pointerEvents: 'none',
                animation: 'pulse 0.8s infinite',
              }} />
            )}
            <span style={{ position: 'relative', zIndex: 2 }}>🔔</span>
            <span style={{ position: 'relative', zIndex: 2, fontSize: 14 }}>BUZZ!</span>
          </button>
        )}

        {phase === 'round_result' && !buzzedUid && bs?.lastResult === 'skipped' && (
          <div className="card" style={{ padding: 16, background: '#EEE', border: '3px solid #000', borderRadius: 0, textAlign: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: 14, color: '#000' }}>⏭️ تم تخطي السؤال</span>
          </div>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
