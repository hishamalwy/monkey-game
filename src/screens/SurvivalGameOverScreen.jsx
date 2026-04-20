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
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

export default function SurvivalGameOverScreen() {
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
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!room || !room.survivalState) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const { survivalState } = room;
  const isHost = room.hostUid === userProfile?.uid;
  const aliveUids = Object.keys(survivalState.alivePlayers).filter(uid => survivalState.alivePlayers[uid] > 0);
  const isWinner = aliveUids.includes(userProfile?.uid);
  const winnerUid = aliveUids[0];
  const winner = room.players?.[winnerUid];

  // Sort all players: alive first, then by lives desc
  const allPlayers = (room.playerOrder || []).map(uid => ({
    ...room.players?.[uid], uid,
    lives: survivalState.alivePlayers?.[uid] || 0,
  })).sort((a, b) => b.lives - a.lives);

  if (!coinsAwarded && userProfile) {
    setCoinsAwarded(true);
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      if (isWinner) playWin(); else playLose();
    }
    if (isWinner) {
      recordWin(userProfile.uid, 'survival').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.SURVIVAL_WIN).catch(() => {});
    } else {
      recordLoss(userProfile.uid, 'survival').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.LOSS).catch(() => {});
    }
    incrementDailyStat(userProfile.uid, 'games').catch(() => {});
    incrementDailyStat(userProfile.uid, 'survival').catch(() => {});
    if (isWinner) incrementDailyStat(userProfile.uid, 'wins').catch(() => {});
    incrementDailyStat(userProfile.uid, 'xp', isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS).catch(() => {});
    recordMatch(userProfile.uid, { mode: 'survival', won: isWinner, rounds: survivalState?.currentQuestionIndex + 1 || 0 }).catch(() => {});
    recordRecentPlayers(userProfile.uid, room.playerOrder || []).catch(() => {});
    trackModePlayed(userProfile.uid, 'survival').catch(() => {});
  }

  const handleReturnAction = async () => {
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
      const settings = { mode: 'survival', maxPlayers: room?.maxPlayers || 5, isPublic: true };
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
      ? `فزت للتو في البقاء للأقوى بعد ${survivalState.currentQuestionIndex + 1} سؤال! ⚔️🏆\nمن يتحداك في كلكس؟ 🐒`
      : `خرجت من البقاء للأقوى بعد ${survivalState.currentQuestionIndex + 1} سؤال، بس راجع أقوى! ⚔️`;
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) {
      try { await navigator.share({ title: 'نتيجة كلكس', text, url }); } catch {}
    } else {
      navigator.clipboard?.writeText(`${text}\nالرابط: ${url}`).catch(() => {});
      setToast('تم نسخ النتيجة!');
    }
  };

  const Heart = ({ filled }) => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill={filled ? '#FF1F8E' : 'rgba(28,16,64,0.15)'} stroke={filled ? '#C0006E' : 'rgba(28,16,64,0.25)'} strokeWidth="1">
      <path d="M10 17s-7-5.25-7-9.5A4.5 4.5 0 0 1 10 4.16 4.5 4.5 0 0 1 17 7.5C17 11.75 10 17 10 17z" />
    </svg>
  );

  return (
    <div
      className="brutal-bg"
      style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── HEADER BANNER ── */}
      <div style={{
        background: isWinner ? 'var(--neo-yellow)' : 'var(--neo-pink)',
        borderBottom: '5px solid #000',
        padding: '24px 16px 20px',
        textAlign: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 8 }}>{isWinner ? '🏆' : '💀'}</div>
        <h1 style={{
          margin: 0,
          fontSize: 24, fontWeight: 900,
          color: '#000',
          lineHeight: 1.1,
        }}>
          {isWinner ? 'الناجي الأخير 👑' : 'خرجت من اللعبة 💔'}
        </h1>
      </div>

      {/* ── WINNER CARD ── */}
      <div style={{ padding: '20px 16px 0', flexShrink: 0 }}>
        <div className="card" style={{
          background: '#FFF',
          border: '4px solid #000',
          borderRadius: 0,
          boxShadow: '8px 8px 0 var(--neo-pink)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: 16,
            background: '#000', color: 'var(--neo-yellow)',
            padding: '2px 12px', borderRadius: 0,
            fontWeight: 900, fontSize: 11,
            border: '2px solid #000',
          }}>
            🏆 الفائز
          </div>
          <div style={{
            border: '3px solid #000',
            borderRadius: 0,
            boxShadow: '4px 4px 0 #000',
            flexShrink: 0,
          }}>
            <UserAvatar avatarId={winner?.avatarId ?? 1} size={60} border="1.5px solid #000" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#000', lineHeight: 1.1 }}>
              {winner?.username || 'لا يوجد فائز'}
            </div>
            <div style={{
              display: 'inline-block',
              background: 'var(--neo-green)', color: '#000',
              border: '2px solid #000',
              padding: '2px 10px', borderRadius: 0,
              fontWeight: 900, fontSize: 10, marginTop: 6,
            }}>
              نشط ✔️
            </div>
          </div>
          {/* Stats */}
          <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontWeight: 900, fontSize: 28, color: 'var(--neo-pink)', lineHeight: 1, textShadow: '2px 2px 0 #000' }}>
              {survivalState.currentQuestionIndex + 1}
            </div>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#000' }}>جولة</div>
          </div>
        </div>
      </div>

      {/* ── PLAYER LEADERBOARD ── */}
      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allPlayers.map((p, i) => {
          const isMe = p.uid === userProfile?.uid;
          const alive = p.lives > 0;
          return (
            <div
              key={p.uid}
              className="card"
              style={{
                background: isMe ? 'var(--neo-yellow)' : '#FFF',
                border: `3px solid #000`,
                borderRadius: 0,
                boxShadow: isMe ? '4px 4px 0 #000' : 'none',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: alive ? 1 : 0.6,
              }}
            >
              <span style={{ fontWeight: 900, fontSize: 14, color: '#000', width: 28, textAlign: 'center' }}>
                {alive ? (i === 0 ? '🥇' : `#${i + 1}`) : '💀'}
              </span>
              <div style={{
                borderRadius: 0,
                border: `2px solid #000`,
                filter: alive ? 'none' : 'grayscale(1)',
                flexShrink: 0,
              }}>
                <UserAvatar avatarId={p.avatarId ?? 1} size={38} border="1.5px solid #000" />
              </div>
              <span style={{ flex: 1, fontWeight: 900, fontSize: 14, color: '#000', direction: 'rtl' }}>
                {p.username}
                {isMe && <span style={{ fontSize: 9, marginRight: 6, opacity: 0.7 }}>(أنت)</span>}
              </span>
              {/* Hearts Replacement: Sharp pips */}
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3].map(bit => (
                   <div key={bit} style={{ 
                     width: 14, height: 14, border: '2px solid #000', 
                     background: p.lives >= bit ? 'var(--neo-pink)' : '#FFF',
                     borderRadius: 0 
                   }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── XP BANNER ── */}
      <div style={{
        margin: '0 16px 12px',
        background: isWinner ? 'var(--neo-green)' : '#000',
        border: '3px solid #000',
        borderRadius: 0,
        boxShadow: '4px 4px 0 #000',
        padding: '10px',
        textAlign: 'center',
        color: isWinner ? '#000' : 'var(--neo-yellow)',
        fontWeight: 900, fontSize: 14,
        flexShrink: 0,
      }}>
        +{isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS} نقطة {isWinner ? '🏆' : '📚'}
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div style={{
        background: '#FFF',
        borderTop: '5px solid #000',
        padding: '16px 20px env(safe-area-inset-bottom)',
        display: 'flex', flexDirection: 'column', gap: 12,
        flexShrink: 0,
      }}>
        {isHost ? (
          <button
            onClick={handleResetToLobby}
            className="btn btn-yellow"
            style={{ padding: '18px', fontSize: 18, boxShadow: '6px 6px 0 #000', borderRadius: 0, border: '4.5px solid #000', fontWeight: 900 }}
          >
            العودة للقاعدة 🔄
          </button>
        ) : (
          <div style={{
            textAlign: 'center', fontWeight: 900, fontSize: 13,
            color: '#000', opacity: 0.7,
            background: '#EEE', padding: '10px', border: '2px dashed #000', direction: 'rtl'
          }}>
            في انتظار المضيف...
          </div>
        )}
        <button
          onClick={handleReturnAction}
          className="btn btn-white"
          style={{ padding: '14px', fontSize: 15, border: '3.5px solid #000', borderRadius: 0, fontWeight: 900 }}
        >
          العودة للرئيسية 🏠
        </button>
        <button
          onClick={handleQuickRematch}
          disabled={rematching}
          className="btn btn-green"
          style={{ padding: '14px', fontSize: 15, border: '3.5px solid #000', borderRadius: 0, fontWeight: 900, boxShadow: '4px 4px 0 #000', opacity: rematching ? 0.6 : 1 }}
        >
          {rematching ? <LoadingSpinner size={20} color="#000" /> : 'لعبة جديدة سريعة ⚡'}
        </button>
        <button
          onClick={shareResult}
          className="btn"
          style={{ padding: '14px', fontSize: 15, borderRadius: 0, background: 'var(--neo-cyan)', border: '3px solid #000', fontWeight: 900, boxShadow: '4px 4px 0 #000' }}
        >
          شارك النتيجة ↗️
        </button>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
