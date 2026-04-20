import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { listenToRoom, leaveRoom, resetRoomToLobby } from '../firebase/rooms';
import { recordWin, recordLoss } from '../firebase/leaderboard';
import { awardCoins } from '../firebase/store';
import { recordMatch } from '../firebase/stats';
import { incrementDailyStat } from '../firebase/retention';
import { recordRecentPlayers } from '../firebase/recentPlayers';
import { COIN_REWARDS } from '../utils/store';
import { XP_REWARDS } from '../utils/xp';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

export default function CharadesGameOverScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playWin, playLose, playClick } = useAudio();
  const [room, setRoom] = useState(null);
  const [coinsAwarded, setCoinsAwarded] = useState(false);
  const soundPlayedRef = useRef(false);
  const [toast, setToast] = useState('');

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
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      if (isWinner) playWin(); else playLose();
    }
    if (isWinner) {
      recordWin(userProfile.uid, 'charades').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.CHARADES_WIN).catch(() => {});
    } else {
      recordLoss(userProfile.uid, 'charades').catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.LOSS).catch(() => {});
    }
    incrementDailyStat(userProfile.uid, 'games').catch(() => {});
    incrementDailyStat(userProfile.uid, 'charades').catch(() => {});
    if (isWinner) incrementDailyStat(userProfile.uid, 'wins').catch(() => {});
    incrementDailyStat(userProfile.uid, 'xp', isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS).catch(() => {});
    recordMatch(userProfile.uid, { mode: 'charades', won: isWinner, rounds: charadesState.roundNumber || 0 }).catch(() => {});
    recordRecentPlayers(userProfile.uid, room.playerOrder || []).catch(() => {});
  }

  const handleReturnHome = async () => {
    playClick();
    await leaveRoom(roomCode, userProfile?.uid);
    nav.toHome();
  };

  const handleResetToLobby = async () => {
    if (isHost) { playClick(); await resetRoomToLobby(roomCode, userProfile?.uid); }
  };

  const shareResult = async () => {
    playClick();
    const text = isWinner
      ? `فاز فريقي في بدون كلام! 🎭🏆\nمن يتحدانا في كلكس؟ 🐒`
      : `خسرنا في بدون كلام، بس المرة الجاية نخربها! 🎭`;
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
        background: isWinner || isDraw ? 'var(--neo-yellow)' : 'var(--neo-pink)',
        borderBottom: '5px solid #000',
        padding: '24px 16px 20px', textAlign: 'center', flexShrink: 0,
      }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 8 }}>{isWinner ? '🏆' : isDraw ? '🤝' : '🎭'}</div>
        <h1 style={{
          margin: 0, fontSize: 24, fontWeight: 900,
          color: '#000',
          lineHeight: 1.1
        }}>
          {isWinner ? 'الفريق الفائز 👑' : isDraw ? 'تعادل 🤝' : 'للأسف خسرتم'}
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{
          background: '#FFF', border: '3.5px solid #000', borderRadius: 0,
          boxShadow: '6px 6px 0 var(--neo-pink)', padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20, background: 'var(--neo-pink)', width: 48, height: 48, borderRadius: 0, border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, boxShadow: '3px 3px 0 #000' }}>A</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#000' }}>الفريق الأحمر</div>
                <div style={{ fontWeight: 900, fontSize: 10, color: 'var(--neo-pink)' }}>فريق التمثيل</div>
              </div>
            </div>
            <div className="card" style={{
              background: winningTeam === 'A' ? 'var(--neo-yellow)' : '#EEE',
              padding: '8px 18px', borderRadius: 0, fontWeight: 900, fontSize: 24,
              border: '3px solid #000',
              color: '#000',
              boxShadow: winningTeam === 'A' ? '3px 3px 0 #000' : 'none'
            }}>
              {scoresA}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(charadesState.teams?.A || []).map(uid => {
              const p = room.players?.[uid];
              return (
                <div key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ borderRadius: '50%', border: '3px solid var(--neo-pink)' }}>
                    <UserAvatar avatarId={p?.avatarId ?? 1} size={34} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#000' }}>{p?.username?.slice(0, 8)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{
          background: '#FFF', border: '3.5px solid #000', borderRadius: 0,
          boxShadow: '6px 6px 0 var(--neo-cyan)', padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20, background: 'var(--neo-cyan)', width: 48, height: 48, borderRadius: 0, border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, boxShadow: '3px 3px 0 #000' }}>B</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#000' }}>الفريق الأزرق</div>
                <div style={{ fontWeight: 900, fontSize: 10, color: 'var(--neo-cyan)' }}>فريق التمثيل</div>
              </div>
            </div>
            <div className="card" style={{
              background: winningTeam === 'B' ? 'var(--neo-yellow)' : '#EEE',
              padding: '8px 18px', borderRadius: 0, fontWeight: 900, fontSize: 24,
              border: '3px solid #000',
              color: '#000',
              boxShadow: winningTeam === 'B' ? '3px 3px 0 #000' : 'none'
            }}>
              {scoresB}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(charadesState.teams?.B || []).map(uid => {
              const p = room.players?.[uid];
              return (
                <div key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ borderRadius: '50%', border: '3px solid var(--neo-cyan)' }}>
                    <UserAvatar avatarId={p?.avatarId ?? 1} size={34} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#000' }}>{p?.username?.slice(0, 8)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        margin: '0 16px 12px',
        background: isWinner ? 'var(--neo-green)' : 'var(--neo-pink)',
        border: '3.5px solid #000', borderRadius: 0,
        boxShadow: '4px 4px 0 #000', padding: 12,
        textAlign: 'center', color: '#000',
        fontWeight: 900, fontSize: 14, flexShrink: 0,
      }}>
        مكافأة: +{isWinner ? XP_REWARDS.WIN : XP_REWARDS.LOSS} نقطة {isWinner ? '🏆' : '📚'}
      </div>

      <div style={{
        background: '#FFF', borderTop: '5px solid #000',
        padding: '16px 20px env(safe-area-inset-bottom)',
        display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0,
      }}>
        {isHost ? (
          <button onClick={handleResetToLobby} className="btn btn-yellow" style={{ padding: '18px', fontSize: 18, borderRadius: 0, border: '4.5px solid #000', boxShadow: '6px 6px 0 #000', fontWeight: 900 }}>
            العودة للقاعدة 🔄
          </button>
        ) : (
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 13, color: '#000', opacity: 0.7, background: '#EEE', padding: '10px', border: '2px dashed #000', direction: 'rtl' }}>
            في انتظار المضيف...
          </div>
        )}
        <button onClick={handleReturnHome} className="btn btn-white" style={{ padding: '14px', fontSize: 15, border: '3.5px solid #000', borderRadius: 0, fontWeight: 900 }}>
          العودة للرئيسية 🏠
        </button>
        <button onClick={shareResult} className="btn" style={{ padding: '14px', fontSize: 15, borderRadius: 0, background: 'var(--neo-cyan)', border: '3px solid #000', fontWeight: 900, boxShadow: '4px 4px 0 #000' }}>
          شارك النتيجة ↗️
        </button>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
