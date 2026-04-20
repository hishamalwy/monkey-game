import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import UserAvatar from '../components/ui/UserAvatar';
import Toast from '../components/ui/Toast';
import { listenToRoom, leaveRoom, resetRoomToLobby } from '../firebase/rooms';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';
import { useConfetti } from '../components/shared/Confetti';
import { recordWin, recordLoss } from '../firebase/leaderboard';
import { awardCoins } from '../firebase/store';
import { recordMatch } from '../firebase/stats';
import { incrementDailyStat } from '../firebase/retention';
import { recordRecentPlayers } from '../firebase/recentPlayers';
import { COIN_REWARDS } from '../utils/store';
import { XP_REWARDS } from '../utils/xp';

export default function DrawGameOverScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playWin, playLose, playClick } = useAudio();
  const [room, setRoom] = useState(null);
  const confetti = useConfetti();
  const soundPlayedRef = useRef(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const unsub = listenToRoom(roomCode, data => {
      if (data) {
        setRoom(data);
        if (data.status === 'lobby') nav.toLobby(roomCode);
      }
    });
    return unsub;
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const isHost = room?.hostUid === userProfile?.uid;

  useEffect(() => {
    if (!room?.drawState || !userProfile) return;
    const ds = room.drawState;
    const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
    const sorted = [...players].sort((a, b) => (ds.scores?.[b.uid] || 0) - (ds.scores?.[a.uid] || 0));
    const w = sorted[0];
    if (!w) return;
    const won = w.uid === userProfile.uid;
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      if (won) playWin(); else playLose();
    }
    if (won) {
      recordWin(userProfile.uid, 'draw').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.DRAW_WIN).catch(() => {});
    } else {
      recordLoss(userProfile.uid, 'draw').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.LOSS).catch(() => {});
    }
    incrementDailyStat(userProfile.uid, 'games').catch(() => {});
    incrementDailyStat(userProfile.uid, 'draw').catch(() => {});
    if (won) incrementDailyStat(userProfile.uid, 'wins').catch(() => {});
    incrementDailyStat(userProfile.uid, 'xp', won ? XP_REWARDS.WIN : XP_REWARDS.LOSS).catch(() => {});
    recordMatch(userProfile.uid, { mode: 'draw', won: won, players: (room.playerOrder || []).length }).catch(() => {});
    recordRecentPlayers(userProfile.uid, room.playerOrder || []).catch(() => {});
  }, [!!room?.drawState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResetToLobby = async () => {
    if (!isHost) return;
    playClick();
    try {
      await resetRoomToLobby(roomCode, userProfile.uid);
    } catch (e) { console.error(e); }
  };

  const handleLeave = async () => {
    playClick();
    if (!room || !userProfile) { nav.toHome(); return; }
    await leaveRoom(roomCode, userProfile.uid);
    nav.toHome();
  };

  const shareResult = async () => {
    playClick();
    const text = iWon
      ? `فزت للتو في لعبة ارسم وخمن ضد ${sorted.length - 1} لاعبين! 🎨🏆\nمن يتحداك في كلكس؟ 🐒`
      : `فاز ${winner?.username} في لعبة ارسم وخمن، بس أنتشر في المرة الجاية! 🐒`;
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) {
      try { await navigator.share({ title: 'نتيجة كلكس', text, url }); } catch {}
    } else {
      navigator.clipboard?.writeText(`${text}\nالرابط: ${url}`).catch(() => {});
      setToast('تم نسخ النتيجة!');
    }
  };

  if (!room?.drawState) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
        🎨
      </div>
    );
  }

  const ds = room.drawState;
  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const sorted = [...players].sort((a, b) => (ds.scores?.[b.uid] || 0) - (ds.scores?.[a.uid] || 0));
  const winner = sorted[0];
  const iWon = winner?.uid === userProfile?.uid;

  return (
    <div className="brutal-bg" style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Confetti */}
      {confetti.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: p.left,
          animationDelay: p.delay,
          animationDuration: p.duration,
          background: p.color,
          width: p.width,
          height: p.height,
        }} />
      ))}

      {/* Card */}
      <div className="slide-up card" style={{
        padding: '36px 24px', width: '100%', maxWidth: 420,
        textAlign: 'center', position: 'relative', zIndex: 10,
        background: '#FFF', border: '6px solid #000', borderRadius: 0,
        boxShadow: '12px 12px 0px #000'
      }}>
        <UserAvatar avatarId={winner?.avatarId ?? 0} size={88} border="3px solid #000" style={{ margin: '0 auto 14px' }} />
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#000', margin: '0 0 10px' }}>
          {winner?.username}
        </h1>
        <div style={{ display: 'inline-block', background: 'var(--neo-green)', border: '3.5px solid #000', padding: '6px 16px', fontSize: 16, fontWeight: 900, marginBottom: 28, boxShadow: '4px 4px 0 #000' }}>
          🏆 الرسام الأفضل!
        </div>

        {iWon && (
          <div style={{
            border: '3px solid #000', background: 'var(--neo-yellow)',
            padding: '10px', marginBottom: 24,
            fontSize: 14, fontWeight: 900, color: '#000',
            boxShadow: '4px 4px 0 #000'
          }}>
            مكافأة: +{XP_REWARDS.WIN} نقطة 🏆
          </div>
        )}

        {/* Rankings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {sorted.map((p, i) => (
            <div key={p.uid} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: i === 0 ? 'var(--neo-yellow)' : '#FFF',
              border: '3px solid #000',
              boxShadow: i === 0 ? '4px 4px 0 #000' : 'none',
              borderRadius: 0
            }}>
              <span style={{ fontWeight: 900, color: '#000', width: 28, fontSize: 13 }}>
                #{i + 1}
              </span>
              <UserAvatar avatarId={p.avatarId ?? 0} size={42} border="2px solid #000" />
              <span style={{ flex: 1, fontWeight: 900, color: '#000', textAlign: 'right', fontSize: 14, direction: 'rtl' }}>
                {p.username}
              </span>
              <div className="card" style={{ padding: '4px 10px', background: i === 0 ? 'var(--neo-green)' : '#000', color: i === 0 ? '#000' : '#FFF', fontWeight: 900, border: '2px solid #000', borderRadius: 0, boxShadow: 'none' }}>
                {ds.scores?.[p.uid] || 0}
              </div>
            </div>
          ))}
        </div>

        {isHost ? (
          <button onClick={handleResetToLobby} className="btn btn-yellow" style={{ width: '100%', padding: '15px', fontSize: 17, marginBottom: 12, border: '3px solid #000', borderRadius: 0, fontWeight: 900 }}>
            🔄 العودة للقاعدة
          </button>
        ) : (
          <p style={{ fontSize: 13, color: '#000', fontWeight: 900, marginBottom: 12, direction: 'rtl' }}>
            في انتظار المضيف...
          </p>
        )}

        <button onClick={handleLeave} className="btn btn-pink" style={{ width: '100%', padding: '15px', fontSize: 17, opacity: 0.8 }}>
           🚪 مغادرة الغرفة
        </button>

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button onClick={shareResult} className="btn" style={{ flex: 1, padding: '14px', fontSize: 14, borderRadius: 0, background: 'var(--neo-cyan)', border: '3px solid #000', fontWeight: 900, boxShadow: '4px 4px 0 #000' }}>
            شارك النتيجة ↗️
          </button>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
