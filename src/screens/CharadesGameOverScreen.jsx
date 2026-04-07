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

export default function CharadesGameOverScreen() {
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

  if (!room || !room.charadesState) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const { charadesState } = room;
  const isHost = room.hostUid === userProfile?.uid;
  const scoresA = charadesState.scores?.A || 0;
  const scoresB = charadesState.scores?.B || 0;
  const winningTeam = scoresA > scoresB ? 'A' : scoresB > scoresA ? 'B' : null;
  const myTeam = (charadesState.teams?.A || []).includes(userProfile?.uid) ? 'A' : 'B';
  const isWinner = winningTeam === myTeam;
  const isDraw = scoresA === scoresB;

  if (!coinsAwarded && userProfile) {
    setCoinsAwarded(true);
    if (isWinner) {
      recordWin(userProfile.uid, 'charades').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.SURVIVAL_WIN).catch(() => {});
    } else {
      recordLoss(userProfile.uid, 'charades').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.LOSS).catch(() => {});
    }
    incrementDailyStat(userProfile.uid, 'games').catch(() => {});
    incrementDailyStat(userProfile.uid, 'charades').catch(() => {});
    if (isWinner) incrementDailyStat(userProfile.uid, 'wins').catch(() => {});
    incrementDailyStat(userProfile.uid, 'xp', isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS).catch(() => {});
    recordMatch(userProfile.uid, { mode: 'charades', won: isWinner, rounds: charadesState.roundNumber || 0 }).catch(() => {});
  }

  const handleReturnHome = async () => {
    await leaveRoom(roomCode, userProfile?.uid, isHost, room.playerOrder);
    nav.toHome();
  };

  const handleResetToLobby = async () => {
    if (isHost) await resetRoomToLobby(roomCode);
  };

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        background: isWinner || isDraw ? 'var(--bg-yellow)' : 'var(--bg-dark-purple)',
        borderBottom: '4px solid var(--bg-dark-purple)',
        padding: '18px 16px 14px', textAlign: 'center', flexShrink: 0,
      }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>{isWinner ? '🏆' : isDraw ? '🤝' : '🎭'}</div>
        <h1 style={{
          margin: '6px 0 0', fontSize: 22, fontWeight: 950,
          color: isWinner || isDraw ? 'var(--bg-dark-purple)' : '#FFF',
          textShadow: isWinner || isDraw ? '3px 3px 0 #FFF' : '3px 3px 0 var(--bg-pink)',
        }}>
          {isWinner ? 'فاز فريقك! 👑' : isDraw ? 'تعادل! 🤝' : 'جرّب ممثل!'}
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          background: '#FFF', border: '4px solid var(--bg-pink)', borderRadius: '18px',
          boxShadow: '6px 6px 0 var(--bg-dark-purple)', padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 24, background: 'var(--bg-pink)', width: 44, height: 44, borderRadius: 12, border: '3px solid var(--bg-dark-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🅰️</div>
              <div>
                <div style={{ fontWeight: 950, fontSize: 16, color: 'var(--bg-dark-purple)' }}>فريق الأحمر</div>
                <div style={{ fontWeight: 950, fontSize: 11, color: 'var(--bg-pink)' }}>تمثيل صامت</div>
              </div>
            </div>
            <div style={{
              background: winningTeam === 'A' ? 'var(--bg-yellow)' : '#F0F0F0',
              padding: '6px 16px', borderRadius: '100px', fontWeight: 950, fontSize: 20,
              border: '3px solid var(--bg-dark-purple)',
              color: 'var(--bg-dark-purple)',
            }}>
              {scoresA} ن
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(charadesState.teams?.A || []).map(uid => {
              const p = room.players?.[uid];
              return (
                <div key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ borderRadius: '50%', border: '3px solid var(--bg-pink)' }}>
                    <UserAvatar avatarId={p?.avatarId ?? 1} size={34} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>{p?.username?.slice(0, 8)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          background: '#FFF', border: '4px solid #2979FF', borderRadius: '18px',
          boxShadow: '6px 6px 0 var(--bg-dark-purple)', padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 24, background: '#2979FF', width: 44, height: 44, borderRadius: 12, border: '3px solid var(--bg-dark-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎭</div>
              <div>
                <div style={{ fontWeight: 950, fontSize: 16, color: 'var(--bg-dark-purple)' }}>فريق الأزرق</div>
                <div style={{ fontWeight: 950, fontSize: 11, color: '#2979FF' }}>تمثيل صامت</div>
              </div>
            </div>
            <div style={{
              background: winningTeam === 'B' ? 'var(--bg-yellow)' : '#F0F0F0',
              padding: '6px 16px', borderRadius: '100px', fontWeight: 950, fontSize: 20,
              border: '3px solid var(--bg-dark-purple)',
              color: 'var(--bg-dark-purple)',
            }}>
              {scoresB} ن
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(charadesState.teams?.B || []).map(uid => {
              const p = room.players?.[uid];
              return (
                <div key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ borderRadius: '50%', border: '3px solid #2979FF' }}>
                    <UserAvatar avatarId={p?.avatarId ?? 1} size={34} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>{p?.username?.slice(0, 8)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        margin: '0 16px 12px',
        background: isWinner ? 'var(--bg-green)' : 'var(--bg-dark-purple)',
        border: '3px solid var(--bg-dark-purple)', borderRadius: '14px',
        boxShadow: '4px 4px 0 var(--bg-dark-purple)', padding: 10,
        textAlign: 'center', color: isWinner ? 'var(--bg-dark-purple)' : 'var(--bg-yellow)',
        fontWeight: 950, fontSize: 14, flexShrink: 0,
      }}>
        +{isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS} XP {isWinner ? '🏆' : '📚'}
      </div>

      <div style={{
        background: '#FFF', borderTop: '4px solid var(--bg-dark-purple)',
        padding: '12px 16px env(safe-area-inset-bottom)',
        display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
      }}>
        {isHost ? (
          <button onClick={handleResetToLobby} className="btn btn-yellow" style={{ padding: '14px', fontSize: 16, borderRadius: '12px', fontWeight: 950 }}>
            🔄 العودة للروم
          </button>
        ) : (
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 12, color: 'var(--bg-dark-purple)', opacity: 0.6 }}>
            ⏳ بانتظار الهوست للعودة...
          </div>
        )}
        <button onClick={handleReturnHome} className="btn btn-white" style={{ padding: '11px', fontSize: 14, border: '3px solid var(--bg-dark-purple)', borderRadius: '12px' }}>
          🏠 الانسحاب
        </button>
      </div>
    </div>
  );
}
