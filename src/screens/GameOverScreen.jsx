import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { useRoom } from '../hooks/useRoom';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';
import UserAvatar from '../components/ui/UserAvatar';
import Toast from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { recordWin, recordLoss } from '../firebase/leaderboard';
import { awardCoins } from '../firebase/store';
import { recordMatch } from '../firebase/stats';
import { incrementDailyStat } from '../firebase/retention';
import { recordRecentPlayers } from '../firebase/recentPlayers';
import { trackModePlayed } from '../firebase/achievements';
import { createRoom } from '../firebase/rooms';
import { COIN_REWARDS } from '../utils/store';
import { useConfetti } from '../components/shared/Confetti';
import { XP_REWARDS } from '../utils/xp';
import { logEvent, EVENTS } from '../firebase/analytics';

export default function GameOverScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { room, players, isHost, leaveRoom, resetToLobby } = useRoom(roomCode);
  const confetti = useConfetti();
  const [toast, setToast] = useState('');
  const [rematching, setRematching] = useState(false);

  // Determine winner = player with fewest quarterMonkeys
  const winner = players.length > 0
    ? players.reduce((a, b) => (a.quarterMonkeys || 0) <= (b.quarterMonkeys || 0) ? a : b)
    : null;

  const iWon = winner?.uid === userProfile?.uid;
  const { playWin, playLose, playClick } = useAudio();
  const playedSound = useRef(false);

  // Record win/loss once
  useEffect(() => {
    if (!winner || !userProfile) return;
    const mode = room?.mode || 'monkey';
    if (iWon) {
      if (!playedSound.current) { playWin(); playedSound.current = true; }
      recordWin(userProfile.uid, mode).catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.WIN).catch(() => {});
    } else {
      if (!playedSound.current) { playLose(); playedSound.current = true; }
      recordLoss(userProfile.uid, mode).catch(() => {});
      awardCoins(userProfile.uid, COIN_REWARDS.LOSS).catch(() => {});
    }
    incrementDailyStat(userProfile.uid, 'games').catch(() => {});
    if (iWon) incrementDailyStat(userProfile.uid, 'wins').catch(() => {});
    incrementDailyStat(userProfile.uid, 'xp', iWon ? XP_REWARDS.WIN : XP_REWARDS.LOSS).catch(() => {});
    recordMatch(userProfile.uid, { mode: mode, won: iWon, players: players.length }).catch(() => {});
    recordRecentPlayers(userProfile.uid, players.map(p => p.uid)).catch(() => {});
    trackModePlayed(userProfile.uid, 'monkey').catch(() => {});
    logEvent(EVENTS.GAME_COMPLETED, { uid: userProfile.uid, mode: 'monkey', won: iWon, players: players.length });
  }, [!!winner]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync lobby redirect
  useEffect(() => {
    if (room?.status === 'lobby') nav.toLobby(roomCode);
  }, [room?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeave = async () => {
    playClick();
    await leaveRoom();
    nav.toHome();
  };

  const handleReset = () => {
    playClick();
    resetToLobby();
  };

  const handleQuickRematch = async () => {
    if (rematching) return;
    playClick();
    setRematching(true);
    logEvent(EVENTS.QUICK_REMATCH, { uid: userProfile.uid, mode: room?.mode || 'monkey' });
    try {
      await leaveRoom();
      const settings = {
        mode: room?.mode || 'monkey',
        category: room?.category || 'general',
        timeLimit: room?.timeLimit || 15,
        maxPlayers: room?.maxPlayers || 5,
        scoreTarget: room?.scoreTarget || 120,
        drawTime: room?.drawTime || 80,
        isPublic: true,
      };
      const code = await createRoom(userProfile, settings);
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'فشل إنشاء غرفة جديدة');
      setRematching(false);
    }
  };

  const shareResult = async () => {
    playClick();
    logEvent(EVENTS.SHARE, { uid: userProfile.uid, mode: room?.mode || 'monkey', won: iWon });
    const modeName = room?.mode === 'draw' ? 'ارسم وخمن' : room?.mode === 'charades' ? 'بدون كلام' : room?.mode === 'survival' ? 'البقاء للأقوى' : 'كلكس';
    const text = iWon 
      ? `فزت للتو في لعبة ${modeName} ضد ${players.length - 1} لاعبين! 🏆\nمن يتحداك في كلكس؟ 🐒`
      : `فاز ${winner?.username} في لعبة ${modeName}، ولكن سأنتقم في المرة القادمة! 🐒`;
    const url = window.location.origin + window.location.pathname;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'نتيجة كلكس',
          text,
          url
        });
      } catch (e) {}
    } else {
      navigator.clipboard?.writeText(`${text}\nالرابط: ${url}`).catch(() => {});
      setToast('تم نسخ النتيجة!');
    }
  };

  return (
    <div style={{
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
      <div className="slide-up" style={{
        background: '#FFF',
        padding: '40px 28px', width: '100%', maxWidth: 420,
        textAlign: 'center', boxShadow: '12px 12px 0px #000',
        position: 'relative', zIndex: 10, border: '6px solid #000', borderRadius: 0
      }}>
        <UserAvatar avatarId={winner?.avatarId ?? 0} size={80} style={{ margin: '0 auto 12px' }} />

        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#000', margin: '0 0 10px' }}>
          {winner?.username}
        </h1>
        <div style={{ display: 'inline-block', background: 'var(--neo-yellow)', border: '3px solid #000', padding: '4px 14px', fontSize: 16, fontWeight: 900, marginBottom: 28, boxShadow: '4px 4px 0 #000' }}>
          🏆 فاز!
        </div>

          {iWon && (
            <div style={{
            background: 'var(--neo-green)', border: '2.5px solid #000', padding: '4px 14px',
            fontSize: 12, fontWeight: 900, marginBottom: 20, display: 'inline-block', boxShadow: '3px 3px 0 #000'
          }}>
            مكافأة: +{XP_REWARDS.WIN} نقطة 🏆
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {players
            .sort((a, b) => (a.quarterMonkeys || 0) - (b.quarterMonkeys || 0))
            .map((p, i) => (
              <div key={p.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 0,
                background: i === 0 ? 'var(--neo-yellow)' : '#FFF',
                border: '3px solid #000',
                boxShadow: i === 0 ? '4px 4px 0 #000' : 'none'
              }}>
                <span style={{ fontWeight: 900, color: '#000', width: 24, fontSize: 13 }}>#{i + 1}</span>
                <UserAvatar avatarId={p.avatarId ?? 0} size={38} border="2px solid #000" />
                <span style={{ flex: 1, fontWeight: 900, color: '#000', textAlign: 'right', fontSize: 14, direction: 'rtl' }}>
                  {p.username}
                </span>
                <span style={{ fontSize: 11, color: '#000', fontWeight: 900, background: 'var(--neo-pink)', padding: '2px 8px', border: '1.5px solid #000' }}>
                  {p.quarterMonkeys || 0} 🐒
                </span>
              </div>
            ))}
        </div>

        {isHost ? (
          <button onClick={handleReset} className="btn btn-yellow"
            style={{ width: '100%', padding: '20px', fontSize: 18, marginBottom: 14, border: '4.5px solid #000', borderRadius: 0, boxShadow: '6px 6px 0 #000', fontWeight: 900 }}>
            العودة للقاعدة 🔄
          </button>
        ) : (
          <div style={{ fontSize: 13, color: '#555', fontWeight: 900, marginBottom: 16, background: '#EEE', padding: '8px', border: '2px dashed #000', direction: 'rtl' }}>
            في انتظار المضيف...
          </div>
        )}

        <button onClick={handleQuickRematch} disabled={rematching} className="btn btn-green"
          style={{ width: '100%', padding: '16px', fontSize: 16, marginBottom: 14, border: '4px solid #000', borderRadius: 0, boxShadow: '4px 4px 0 #000', fontWeight: 900, opacity: rematching ? 0.6 : 1 }}>
          {rematching ? <LoadingSpinner size={20} color="#000" /> : 'لعبة جديدة سريعة ⚡'}
        </button>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={shareResult} className="btn-cyan pop"
            style={{ flex: 1, padding: '16px', fontSize: 16, border: '3.5px solid #000', borderRadius: 0, fontWeight: 900, boxShadow: '4px 4px 0 #000', color: '#000', transition: 'none' }}>
            شارك النتيجة ↗️
          </button>
          <button onClick={handleLeave} className="btn btn-white"
            style={{ flex: 1, padding: '16px', fontSize: 16, border: '3.5px solid #000', borderRadius: 0, fontWeight: 900 }}>
            خروج 🚪
          </button>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
