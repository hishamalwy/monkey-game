import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/ui/UserAvatar';
import { listenToRoom, leaveRoom, resetRoomToLobby } from '../firebase/rooms';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';
import { useConfetti } from '../components/shared/Confetti';
import { recordWin, recordLoss } from '../firebase/leaderboard';
import { awardCoins } from '../firebase/store';
import { recordMatch } from '../firebase/stats';
import { incrementDailyStat } from '../firebase/retention';
import { COIN_REWARDS } from '../utils/store';
import { XP_REWARDS } from '../utils/xp';

export default function DrawGameOverScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const confetti = useConfetti();

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
  }, [!!room?.drawState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResetToLobby = async () => {
    if (!isHost) return;
    try {
      await resetRoomToLobby(roomCode);
    } catch (e) { console.error(e); }
  };

  const handleLeave = async () => {
    if (!room || !userProfile) { nav.toHome(); return; }
    await leaveRoom(roomCode, userProfile.uid, isHost, room.playerOrder);
    nav.toHome();
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
        padding: '32px 24px', width: '100%', maxWidth: 400,
        textAlign: 'center', position: 'relative', zIndex: 10,
      }}>
        <UserAvatar avatarId={winner?.avatarId ?? 0} size={80} style={{ margin: '0 auto 10px' }} />
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 4px' }}>
          {winner?.username}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--bg-pink)', fontWeight: 900, margin: '0 0 20px' }}>
          🏆 فاز باللعبة!
        </p>

        {iWon && (
          <div style={{
            border: 'var(--brutal-border)', background: 'var(--bg-yellow)',
            padding: '8px', marginBottom: 16,
            fontSize: 15, fontWeight: 900, color: 'var(--bg-dark-purple)',
          }}>
            🎉 أنت الفائز! +{XP_REWARDS.WIN} XP
          </div>
        )}

        {/* Rankings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
          {sorted.map((p, i) => (
            <div key={p.uid} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: i === 0 ? 'var(--bg-yellow)' : '#FFF',
              border: 'var(--brutal-border)', marginBottom: -4,
            }}>
              <span style={{ fontWeight: 900, color: 'var(--color-muted)', width: 22, fontSize: 14 }}>
                #{i + 1}
              </span>
              <UserAvatar avatarId={p.avatarId ?? 0} size={36} />
              <span style={{ flex: 1, fontWeight: 900, color: 'var(--bg-dark-purple)', textAlign: 'right', fontSize: 14 }}>
                {p.username}
              </span>
              <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>
                {ds.scores?.[p.uid] || 0}
              </span>
            </div>
          ))}
          <div style={{ height: 4 }} />
        </div>

        {isHost ? (
          <button onClick={handleResetToLobby} className="btn btn-yellow" style={{ width: '100%', padding: '15px', fontSize: 17, marginBottom: 12 }}>
            🔄 العودة للروم (تغيير اللعبة)
          </button>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700, marginBottom: 12 }}>
            في انتظار الهوست للعودة للغرفة...
          </p>
        )}

        <button onClick={handleLeave} className="btn btn-pink" style={{ width: '100%', padding: '15px', fontSize: 17, opacity: 0.8 }}>
           🚪 مغادرة الغرفة
        </button>
      </div>
    </div>
  );
}
