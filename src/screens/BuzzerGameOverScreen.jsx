import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { listenToRoom, leaveRoom, resetRoomToLobby, createRoom } from '../firebase/rooms';
import { recordWin, recordLoss } from '../firebase/leaderboard';
import { awardCoins } from '../firebase/store';
import { recordMatch } from '../firebase/stats';
import { incrementDailyStat } from '../firebase/retention';
import { recordRecentPlayers } from '../firebase/recentPlayers';
import { trackModePlayed } from '../firebase/achievements';
import { COIN_REWARDS } from '../utils/store';
import { XP_REWARDS } from '../utils/xp';
import { logEvent, EVENTS } from '../firebase/analytics';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

export default function BuzzerGameOverScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playWin, playLose, playClick } = useAudio();
  const [room, setRoom] = useState(null);
  const [coinsAwarded, setCoinsAwarded] = useState(false);
  const soundPlayedRef = useRef(false);
  const [toast, setToast] = useState('');
  const [rematching, setRematching] = useState(false);

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { nav.toHome(); return; }
      setRoom(data);
      if (data.status === 'lobby') nav.toLobby(roomCode);
    });
    return unsub;
  }, [roomCode]);

  if (!room?.buzzerState) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const bs = room.buzzerState;
  const isHost = room.hostUid === userProfile?.uid;
  const scores = bs.scores || {};
  const players = room.playerOrder || [];
  const sorted = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  const winnerUid = bs.winnerUid || sorted[0];
  const winner = room.players?.[winnerUid];
  const isWinner = winnerUid === userProfile?.uid;

  if (!coinsAwarded && userProfile) {
    setCoinsAwarded(true);
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      if (isWinner) playWin(); else playLose();
    }
    if (isWinner) {
      recordWin(userProfile.uid, 'buzzer').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.CHARADES_WIN).catch(() => {});
    } else {
      recordLoss(userProfile.uid, 'buzzer').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.LOSS).catch(() => {});
    }
    incrementDailyStat(userProfile.uid, 'games').catch(() => {});
    if (isWinner) incrementDailyStat(userProfile.uid, 'wins').catch(() => {});
    incrementDailyStat(userProfile.uid, 'xp', isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS).catch(() => {});
    recordMatch(userProfile.uid, { mode: 'buzzer', won: isWinner, players: players.length }).catch(() => {});
    recordRecentPlayers(userProfile.uid, players).catch(() => {});
    trackModePlayed(userProfile.uid, 'buzzer').catch(() => {});
    logEvent(EVENTS.GAME_COMPLETED, { uid: userProfile.uid, mode: 'buzzer', won: isWinner, players: players.length });
  }

  const handleReturnHome = async () => {
    playClick();
    await leaveRoom(roomCode, userProfile?.uid);
    nav.toHome();
  };

  const handleResetToLobby = async () => {
    if (isHost) { playClick(); await resetRoomToLobby(roomCode, userProfile?.uid); }
  };

  const handleQuickRematch = async () => {
    if (rematching) return;
    playClick();
    setRematching(true);
    try {
      await leaveRoom(roomCode, userProfile?.uid);
      const settings = { mode: 'buzzer', maxPlayers: room?.maxPlayers || 5, scoreTarget: room?.scoreTarget || 10, isPublic: true };
      const code = await createRoom(userProfile, settings);
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'فشل إنشاء غرفة جديدة');
      setRematching(false);
    }
  };

  const shareResult = async () => {
    playClick();
    const text = isWinner
      ? `فزت في لعبة البازر ضد ${players.length - 1} لاعبين! 🔔🏆\nمن يتحداك في كلكس؟ 🐒`
      : `فاز ${winner?.username} في لعبة البازر، بس المرة الجاية! 🔔`;
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) {
      try { await navigator.share({ title: 'نتيجة كلكس', text, url }); } catch {}
    } else {
      navigator.clipboard?.writeText(`${text}\nالرابط: ${url}`).catch(() => {});
      setToast('تم نسخ النتيجة!');
    }
  };

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <div style={{
        background: isWinner ? 'var(--neo-yellow)' : 'var(--neo-pink)',
        borderBottom: '5px solid #000',
        padding: '24px 16px 20px', textAlign: 'center', flexShrink: 0,
      }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 8 }}>{isWinner ? '🏆' : '🔔'}</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#000', lineHeight: 1.1 }}>
          {isWinner ? 'بطل البازر! 👑' : 'انتهت اللعبة'}
        </h1>
      </div>

      <div style={{ padding: '20px 16px 0', flexShrink: 0 }}>
        <div className="card" style={{
          background: '#FFF', border: '4px solid #000', borderRadius: 0,
          boxShadow: '8px 8px 0 var(--neo-pink)', padding: '20px',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ position: 'absolute', top: -14, left: 16, background: '#000', color: 'var(--neo-yellow)', padding: '2px 12px', borderRadius: 0, fontWeight: 900, fontSize: 11, border: '2px solid #000' }}>
            🏆 الفائز
          </div>
          <div style={{ border: '3px solid #000', borderRadius: 0, boxShadow: '4px 4px 0 #000', flexShrink: 0 }}>
            <UserAvatar avatarId={winner?.avatarId ?? 1} size={60} border="1.5px solid #000" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#000', lineHeight: 1.1 }}>{winner?.username || '?'}</div>
            <div style={{ display: 'inline-block', background: 'var(--neo-green)', color: '#000', border: '2px solid #000', padding: '2px 10px', borderRadius: 0, fontWeight: 900, fontSize: 10, marginTop: 6 }}>
              {scores[winnerUid] || 0} نقطة
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((uid, i) => {
          const p = room.players?.[uid];
          const isMe = uid === userProfile?.uid;
          return (
            <div key={uid} className="card" style={{
              background: isMe ? 'var(--neo-yellow)' : '#FFF',
              border: '3px solid #000', borderRadius: 0,
              boxShadow: isMe ? '4px 4px 0 #000' : 'none',
              padding: 12, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontWeight: 900, fontSize: 14, color: '#000', width: 28, textAlign: 'center' }}>
                {i === 0 ? '🥇' : `#${i + 1}`}
              </span>
              <div style={{ border: '2px solid #000', borderRadius: 0, flexShrink: 0 }}>
                <UserAvatar avatarId={p?.avatarId ?? 1} size={38} border="1.5px solid #000" />
              </div>
              <span style={{ flex: 1, fontWeight: 900, fontSize: 14, color: '#000', direction: 'rtl' }}>
                {p?.username}
                {isMe && <span style={{ fontSize: 9, marginRight: 6, opacity: 0.7 }}>(أنت)</span>}
              </span>
              <div style={{ background: '#000', color: 'var(--neo-yellow)', padding: '4px 12px', fontWeight: 900, fontSize: 14, border: '2px solid #000', borderRadius: 0 }}>
                {scores[uid] || 0}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ margin: '0 16px 12px', background: isWinner ? 'var(--neo-green)' : '#000', border: '3px solid #000', borderRadius: 0, boxShadow: '4px 4px 0 #000', padding: 10, textAlign: 'center', color: isWinner ? '#000' : 'var(--neo-yellow)', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
        +{isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS} نقطة {isWinner ? '🏆' : '📚'}
      </div>

      <div style={{ background: '#FFF', borderTop: '5px solid #000', padding: '16px 20px env(safe-area-inset-bottom)', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        {isHost ? (
          <button onClick={handleResetToLobby} className="btn btn-yellow" style={{ padding: '18px', fontSize: 18, borderRadius: 0, border: '4.5px solid #000', boxShadow: '6px 6px 0 #000', fontWeight: 900 }}>
            العودة للقاعدة 🔄
          </button>
        ) : (
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 13, color: '#000', opacity: 0.7, background: '#EEE', padding: 10, border: '2px dashed #000', direction: 'rtl' }}>
            في انتظار المضيف...
          </div>
        )}
        <button onClick={handleReturnHome} className="btn btn-white" style={{ padding: '14px', fontSize: 15, border: '3.5px solid #000', borderRadius: 0, fontWeight: 900 }}>
          العودة للرئيسية 🏠
        </button>
        <button onClick={handleQuickRematch} disabled={rematching} className="btn btn-green" style={{ padding: '14px', fontSize: 15, border: '3.5px solid #000', borderRadius: 0, fontWeight: 900, boxShadow: '4px 4px 0 #000', opacity: rematching ? 0.6 : 1 }}>
          {rematching ? <LoadingSpinner size={20} color="#000" /> : 'لعبة جديدة سريعة ⚡'}
        </button>
        <button onClick={shareResult} className="btn" style={{ padding: '14px', fontSize: 15, borderRadius: 0, background: 'var(--neo-cyan)', border: '3px solid #000', fontWeight: 900, boxShadow: '4px 4px 0 #000' }}>
          شارك النتيجة ↗️
        </button>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
