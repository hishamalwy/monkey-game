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
  const cardShadow = isWinner ? '12px 12px 0 var(--bg-pink)' : '12px 12px 0 var(--bg-green)';
  const xpGained = isWinner ? 50 : 10;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '24px',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      background: bgColor,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 20, left: 20, fontSize: 40, opacity: isWinner ? 0.4 : 0.1, transform: 'rotate(-15deg)' }}>🏆</div>
      <div style={{ position: 'absolute', bottom: 40, right: 30, fontSize: 50, opacity: isWinner ? 0.4 : 0.1, transform: 'rotate(20deg)' }}>💀</div>

      <h1 className="title-glitch pop" style={{
        fontSize: isWinner ? 50 : 40,
        marginBottom: 24,
        color: titleColor,
        textShadow: titleShadow
      }}>
        {isWinner ? 'البطل الوحيد! 👑' : 'تم استبعادك! 💀'}
      </h1>

      <div className="card slide-up" style={{
        padding: '40px 24px',
        marginBottom: 32,
        width: '100%',
        maxWidth: 420,
        background: '#FFF',
        border: '6px solid var(--bg-dark-purple)',
        boxShadow: cardShadow,
        position: 'relative'
      }}>
          <div style={{
            position: 'absolute', top: -15, right: '50%', transform: 'translateX(50%) rotate(-2deg)',
            background: 'var(--bg-dark-purple)', color: '#FFF', padding: '4px 16px',
            fontWeight: 950, fontSize: 12, border: '2px solid #FFF', whiteSpace: 'nowrap'
          }}>
            {isWinner ? 'ناجي مذهل' : 'استسلم مؤسف'}
          </div>

          <div className="pop" style={{ fontSize: 90, marginBottom: 16 }}>{isWinner ? '🦁' : '🤕'}</div>

          <h2 style={{ fontSize: 28, fontWeight: 950, color: 'var(--bg-dark-purple)', marginBottom: 8, lineHeight: 1.1 }}>
              {isWinner ? 'سيطرة كاملة!' : 'حظ موفق المرة القادمة'}
          </h2>

          <div style={{
            background: isWinner ? 'var(--bg-green)' : 'var(--bg-pink)',
            color: '#FFF', padding: '8px 20px', display: 'inline-block',
            fontWeight: 950, fontSize: 18, marginTop: 12, border: '4px solid var(--bg-dark-purple)'
          }}>
            {winner ? winner.username : 'لا يوجد فائز'}
          </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32, width: '100%', maxWidth: 420 }}>
          <div style={{ flex: 1, background: '#FFF', border: '5px solid var(--bg-dark-purple)', padding: 18, boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>
              <div style={{ fontSize: 11, fontWeight: 950, color: 'var(--bg-pink)', textTransform: 'uppercase', marginBottom: 4 }}>الجولات</div>
              <div style={{ fontSize: 36, fontWeight: 950 }}>{survivalState.currentQuestionIndex + 1}</div>
          </div>
          <div style={{ flex: 1, background: '#FFF', border: '5px solid var(--bg-dark-purple)', padding: 18, boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>
              <div style={{ fontSize: 11, fontWeight: 950, color: 'var(--bg-green)', textTransform: 'uppercase', marginBottom: 4 }}>الناجون</div>
              <div style={{ fontSize: 36, fontWeight: 950 }}>{alivePlayersUids.length}</div>
          </div>
          <div style={{ flex: 1, background: '#FFF', border: '5px solid var(--bg-dark-purple)', padding: 18, boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>
              <div style={{ fontSize: 11, fontWeight: 950, color: 'var(--bg-yellow)', textTransform: 'uppercase', marginBottom: 4 }}>XP</div>
              <div style={{ fontSize: 36, fontWeight: 950 }}>+{xpGained}</div>
          </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 420, zIndex: 10 }}>
        {isHost ? (
          <button
            onClick={handleResetToLobby}
            className="btn btn-yellow"
            style={{ padding: '20px', fontSize: 24, boxShadow: '8px 8px 0 var(--bg-dark-purple)' }}
          >
              🔄 العودة للروم
          </button>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.1)', border: '2px dashed #FFF', color: '#FFF',
            padding: 12, fontWeight: 900, fontSize: 14
          }}>
            ⏳ بانتظار الهوست لإعطاء أمر العودة...
          </div>
        )}

        <button
          onClick={handleReturnAction}
          className="btn btn-white"
          style={{ padding: '16px', fontSize: 18, opacity: 0.9 }}
        >
            الانسحاب للشاشة الرئيسية 🏠
        </button>
      </div>
    </div>
  );
}
