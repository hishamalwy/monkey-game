import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom, leaveRoom, resetRoomToLobby } from '../firebase/rooms';
import { recordWin, recordLoss } from '../firebase/leaderboard';
import { awardCoins } from '../firebase/store';
import { recordMatch } from '../firebase/stats';
import { incrementDailyStat } from '../firebase/retention';
import { COIN_REWARDS } from '../utils/store';
import { XP_REWARDS } from '../utils/xp';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

export default function SurvivalGameOverScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const [coinsAwarded, setCoinsAwarded] = useState(false);

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
  }

  const handleReturnAction = async () => {
    await leaveRoom(roomCode, userProfile?.uid, isHost, room.playerOrder);
    nav.toHome();
  };

  const handleResetToLobby = async () => {
    if (isHost) await resetRoomToLobby(roomCode);
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
        background: isWinner ? 'var(--bg-yellow)' : 'var(--bg-dark-purple)',
        borderBottom: '4px solid var(--bg-dark-purple)',
        padding: '18px 16px 14px',
        textAlign: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>{isWinner ? '🏆' : '💀'}</div>
        <h1 style={{
          margin: '6px 0 0',
          fontSize: 22, fontWeight: 950,
          color: isWinner ? 'var(--bg-dark-purple)' : '#FFF',
          textShadow: isWinner ? '3px 3px 0 #FFF' : '3px 3px 0 var(--bg-pink)',
          lineHeight: 1.1,
        }}>
          {isWinner ? 'البطل الوحيد! 👑' : 'تم استبعادك! 💔'}
        </h1>
      </div>

      {/* ── WINNER CARD ── */}
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <div style={{
          background: '#FFF',
          border: '4px solid var(--bg-dark-purple)',
          borderRadius: '18px',
          boxShadow: '6px 6px 0 var(--bg-pink)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: 16,
            background: 'var(--bg-dark-purple)', color: 'var(--bg-yellow)',
            padding: '2px 10px', borderRadius: '100px',
            fontWeight: 950, fontSize: 11,
            border: '3px solid var(--bg-dark-purple)',
          }}>
            🏆 الفائز
          </div>
          <div style={{
            border: '4px solid var(--bg-yellow)',
            borderRadius: '50%',
            boxShadow: '4px 4px 0 var(--bg-dark-purple)',
            flexShrink: 0,
          }}>
            <UserAvatar avatarId={winner?.avatarId ?? 1} size={54} />
          </div>
          <div>
            <div style={{ fontWeight: 950, fontSize: 19, color: 'var(--bg-dark-purple)', lineHeight: 1.1 }}>
              {winner?.username || 'لا يوجد فائز'}
            </div>
            <div style={{
              display: 'inline-block',
              background: 'var(--bg-green)', color: '#FFF',
              border: '3px solid var(--bg-dark-purple)',
              padding: '2px 10px', borderRadius: '100px',
              fontWeight: 950, fontSize: 11, marginTop: 4,
            }}>
              ✔️ ناجٍ
            </div>
          </div>
          {/* Stats */}
          <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
            <div style={{ fontWeight: 950, fontSize: 24, color: 'var(--bg-pink)', lineHeight: 1 }}>
              {survivalState.currentQuestionIndex + 1}
            </div>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--bg-dark-purple)', opacity: 0.6 }}>جولة</div>
          </div>
        </div>
      </div>

      {/* ── PLAYER LEADERBOARD ── */}
      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {allPlayers.map((p, i) => {
          const isMe = p.uid === userProfile?.uid;
          const alive = p.lives > 0;
          return (
            <div
              key={p.uid}
              style={{
                background: isMe ? 'var(--bg-yellow)' : '#FFF',
                border: `3.5px solid var(--bg-dark-purple)`,
                borderRadius: '14px',
                boxShadow: isMe ? '4px 4px 0 var(--bg-dark-purple)' : '3px 3px 0 rgba(28,16,64,0.2)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: alive ? 1 : 0.6,
              }}
            >
              <span style={{ fontWeight: 950, fontSize: 13, color: 'var(--bg-dark-purple)', width: 22, textAlign: 'center' }}>
                {alive ? (i === 0 ? '🥇' : `#${i + 1}`) : '💀'}
              </span>
              <div style={{
                borderRadius: '50%',
                border: `3px solid ${alive ? 'var(--bg-dark-purple)' : '#CCC'}`,
                filter: alive ? 'none' : 'grayscale(1)',
                flexShrink: 0,
              }}>
                <UserAvatar avatarId={p.avatarId ?? 1} size={34} />
              </div>
              <span style={{ flex: 1, fontWeight: 950, fontSize: 14, color: 'var(--bg-dark-purple)' }}>
                {p.username}
                {isMe && <span style={{ fontSize: 10, marginRight: 4, opacity: 0.7 }}>(أنت)</span>}
              </span>
              {/* Hearts */}
              <div style={{ display: 'flex', gap: 2 }}>
                <Heart filled={p.lives >= 1} />
                <Heart filled={p.lives >= 2} />
                <Heart filled={p.lives >= 3} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── XP BANNER ── */}
      <div style={{
        margin: '0 16px 12px',
        background: isWinner ? 'var(--bg-green)' : 'var(--bg-dark-purple)',
        border: '3px solid var(--bg-dark-purple)',
        borderRadius: '14px',
        boxShadow: '4px 4px 0 var(--bg-dark-purple)',
        padding: '10px',
        textAlign: 'center',
        color: isWinner ? 'var(--bg-dark-purple)' : 'var(--bg-yellow)',
        fontWeight: 950, fontSize: 14,
        flexShrink: 0,
      }}>
        +{isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS} XP {isWinner ? '🏆' : '📚'}
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div style={{
        background: '#FFF',
        borderTop: '4px solid var(--bg-dark-purple)',
        padding: '12px 16px env(safe-area-inset-bottom)',
        display: 'flex', flexDirection: 'column', gap: 8,
        flexShrink: 0,
      }}>
        {isHost ? (
          <button
            onClick={handleResetToLobby}
            className="btn btn-yellow"
            style={{ padding: '14px', fontSize: 16, boxShadow: '4px 4px 0 var(--bg-dark-purple)', borderRadius: '12px', fontWeight: 950 }}
          >
            🔄 العودة للروم
          </button>
        ) : (
          <div style={{
            textAlign: 'center', fontWeight: 900, fontSize: 12,
            color: 'var(--bg-dark-purple)', opacity: 0.6,
          }}>
            ⏳ بانتظار الهوست للعودة...
          </div>
        )}
        <button
          onClick={handleReturnAction}
          className="btn btn-white"
          style={{ padding: '11px', fontSize: 14, border: '3px solid var(--bg-dark-purple)', borderRadius: '12px' }}
        >
          🏠 الانسحاب
        </button>
      </div>
    </div>
  );
}
