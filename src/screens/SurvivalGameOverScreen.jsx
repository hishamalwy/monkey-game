import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom, leaveRoom, resetRoomToLobby } from '../firebase/rooms';
import { recordWin, recordLoss } from '../firebase/leaderboard';
import { awardCoins } from '../firebase/store';
import { recordMatch } from '../firebase/stats';
import { incrementDailyStat } from '../firebase/retention';
import { COIN_REWARDS } from '../utils/store';
import { XP_REWARDS } from '../utils/xp';
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
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const { survivalState } = room;
  const isHost = room.hostUid === userProfile.uid;
  const alivePlayersUids = Object.keys(survivalState.alivePlayers).filter(uid => survivalState.alivePlayers[uid]);
  const isWinner = alivePlayersUids.includes(userProfile.uid);
  const winnerUid = alivePlayersUids[0];
  const winner = room.players[winnerUid];

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
    await leaveRoom(roomCode, userProfile.uid, isHost, room.playerOrder);
    nav.toHome();
  };

  const handleResetToLobby = async () => {
    if (isHost) await resetRoomToLobby(roomCode);
  };

  const bgColor = isWinner ? 'var(--bg-yellow)' : 'var(--bg-dark-purple)';
  const titleColor = isWinner ? 'var(--bg-dark-purple)' : '#FFF';
  const titleShadow = isWinner ? '4px 4px 0 #FFF' : '4px 4px 0 var(--bg-pink)';
  const cardShadow = isWinner ? '6px 6px 0 var(--bg-pink)' : '6px 6px 0 var(--bg-green)';
  const xpGained = isWinner ? 50 : 10;

  return (
    <div className="brutal-bg" style={{
      width: '100%', height: '100dvh',
      display: 'flex', flexDirection: 'column',
      padding: '12px',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      background: bgColor,
      position: 'relative',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 24, opacity: isWinner ? 1 : 0.05, transform: 'rotate(-10deg)', zIndex: 1 }}>🏆</div>
      <div style={{ position: 'absolute', bottom: 24, right: 16, fontSize: 32, opacity: isWinner ? 0.3 : 0.05, transform: 'rotate(15deg)', zIndex: 1 }}>💀</div>

      <h1 className="title-glitch pop" style={{
        fontSize: isWinner ? 'clamp(26px, 8vw, 42px)' : 'clamp(22px, 7vw, 32px)',
        marginBottom: 16,
        color: titleColor,
        textShadow: titleShadow,
        lineHeight: 1
      }}>
        {isWinner ? 'البطل الوحيد! 👑' : 'تم استبعادك! 💀'}
      </h1>

      <div className="card slide-up" style={{
        padding: '16px 12px',
        marginBottom: 16,
        width: '92%',
        maxWidth: 300,
        background: '#FFF',
        border: '3.5px solid var(--bg-dark-purple)',
        boxShadow: cardShadow,
        position: 'relative',
        boxSizing: 'border-box'
      }}>
          <div style={{
            position: 'absolute', top: -10, right: '50%', transform: 'translateX(50%) rotate(-2deg)',
            background: 'var(--bg-dark-purple)', color: '#FFF', padding: '2px 8px',
            fontWeight: 950, fontSize: 10, border: '1.5px solid #FFF', whiteSpace: 'nowrap'
          }}>
            {isWinner ? 'ناجي مذهل' : 'استسلم مؤسف'}
          </div>

          <div className="pop" style={{ fontSize: 54, marginBottom: 8 }}>{isWinner ? '🦁' : '🤕'}</div>

          <h2 style={{ fontSize: 18, fontWeight: 950, color: 'var(--bg-dark-purple)', marginBottom: 4, lineHeight: 1.1 }}>
              {isWinner ? 'سيطرة كاملة!' : 'حظ موفق'}
          </h2>

          <div style={{
            background: isWinner ? 'var(--bg-green)' : 'var(--bg-pink)',
            color: '#FFF', padding: '4px 12px', display: 'inline-block',
            fontWeight: 950, fontSize: 13, marginTop: 4, border: '3px solid var(--bg-dark-purple)'
          }}>
            {winner ? winner.username : 'لا يوجد فائز'}
          </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16, width: '92%', maxWidth: 300 }}>
          <div style={{ background: '#FFF', border: '3.5px solid var(--bg-dark-purple)', padding: 8, boxShadow: '3px 3px 0 var(--bg-dark-purple)', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 8, fontWeight: 950, color: 'var(--bg-pink)', textTransform: 'uppercase' }}>جولة</div>
              <div style={{ fontSize: 20, fontWeight: 950 }}>{survivalState.currentQuestionIndex + 1}</div>
          </div>
          <div style={{ background: '#FFF', border: '3.5px solid var(--bg-dark-purple)', padding: 8, boxShadow: '3px 3px 0 var(--bg-dark-purple)', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 8, fontWeight: 950, color: 'var(--bg-green)', textTransform: 'uppercase' }}>ناجٍ</div>
              <div style={{ fontSize: 20, fontWeight: 950 }}>{alivePlayersUids.length}</div>
          </div>
          <div style={{ background: '#FFF', border: '3.5px solid var(--bg-dark-purple)', padding: 8, boxShadow: '3px 3px 0 var(--bg-dark-purple)', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 8, fontWeight: 950, color: 'var(--bg-yellow)', textTransform: 'uppercase' }}>XP</div>
              <div style={{ fontSize: 20, fontWeight: 950 }}>+{xpGained}</div>
          </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '92%', maxWidth: 300, zIndex: 10 }}>
        {isHost ? (
          <button
            onClick={handleResetToLobby}
            className="btn btn-yellow"
            style={{ padding: '12px', fontSize: 16, boxShadow: '4px 4px 0 var(--bg-dark-purple)', borderRadius: '10px' }}
          >
              🔄 العودة للروم
          </button>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.1)', border: '2px dashed #FFF', color: '#FFF',
            padding: 8, fontWeight: 900, fontSize: 11
          }}>
            ⏳ بانتظار الهوست للعودة...
          </div>
        )}

        <button
          onClick={handleReturnAction}
          className="btn btn-white"
          style={{ padding: '10px', fontSize: 13, border: '3px solid var(--bg-dark-purple)', borderRadius: '10px' }}
        >
            الانسحاب 🏠
        </button>
      </div>
    </div>
  );
}
