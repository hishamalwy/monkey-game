import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import UserAvatar from '../components/ui/UserAvatar';
import GameScreen from '../components/GameScreen';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { stopHorn } from '../utils/audio';

export default function OnlineGameScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const {
    room, players, isMyTurn, computedTimer,
    pressLetter, pressDelete, pressChallenge, leaveRoom, triggerHorn,
  } = useRoom(roomCode);

  const navRef = useRef(nav);
  useEffect(() => { navRef.current = nav; });

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isHonking, setIsHonking] = useState(false);

  const MONKEY_LIMIT = 4;

  const MonkeySVG = ({ qm }) => {
    const pct = Math.min((qm / 4) * 100, 100);
    return (
      <svg viewBox="0 0 100 100" width="32" height="32" style={{ overflow: 'visible', margin: '2px 0', opacity: qm === 0 ? 0.35 : 1 }}>
        <rect x="0" y="0" width="100" height="100" fill="#e0e0e0" mask="url(#global-monkey-mask)" />
        {qm > 0 && <rect x="0" y={100 - pct} width="100" height="100" fill="var(--bg-dark-purple)" mask="url(#global-monkey-mask)" style={{ transition: 'y 0.5s ease-out' }} />}
        <g fill="none" stroke="var(--bg-dark-purple)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M 68 80 Q 95 95 90 60 Q 90 40 75 60" />
          <circle cx="26" cy="36" r="10" />
          <circle cx="74" cy="36" r="10" />
          <path d="M 32 47 h 36 v 32 q 0 10 -18 10 q -18 0 -18 -10 Z" />
          <circle cx="50" cy="32" r="20" />
        </g>
      </svg>
    );
  };

  useEffect(() => {
    if (!room) return;
    if (room.status === 'round_result') navRef.current.toRoundResult();
    if (room.status === 'game_over') navRef.current.toGameOver();
    if (room.status === 'lobby') navRef.current.toLobby(roomCode);
  }, [room?.status]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isMyTurn) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); pressDelete(); return; }
      const arabicRegex = /^[\u0600-\u06FF\s]$/;
      if (arabicRegex.test(e.key)) { e.preventDefault(); pressLetter(e.key); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, pressLetter, pressDelete]);

  useEffect(() => () => stopHorn(), []);

  const handleHornStart = () => { setIsHonking(true); triggerHorn(); };
  const handleHornEnd = () => { setIsHonking(false); };

  const handleExit = async () => {
    await leaveRoom();
    navRef.current.toHome();
  };

  if (!room?.gameState) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;

  const currentPlayerUid = room.gameState.currentPlayerUid;
  const currentPlayerData = room.players[currentPlayerUid];
  const currentPlayer = {
    name: currentPlayerData?.username || '...',
    avatarId: currentPlayerData?.avatarId ?? 0,
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <header style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h2 className="title-glitch" style={{ margin: 0, fontSize: 24, transform: 'none' }}>كلكس!</h2>
        <button onClick={() => setShowExitConfirm(true)} className="btn btn-white" style={{ padding: '8px 16px', fontSize: 14 }}>✕ خروج</button>
      </header>

      <div style={{ padding: '16px 20px', display: 'flex', gap: 12, overflowX: 'auto', flexShrink: 0, position: 'relative' }}>
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <mask id="global-monkey-mask">
              <circle cx="50" cy="32" r="20" fill="white" /><circle cx="26" cy="36" r="10" fill="white" /><circle cx="74" cy="36" r="10" fill="white" />
              <path d="M 32 47 h 36 v 32 q 0 10 -18 10 q -18 0 -18 -10 Z" fill="white" />
              <path d="M 68 80 Q 95 95 90 60 Q 90 40 75 60" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" />
            </mask>
          </defs>
        </svg>

        {players.map((p) => {
          const qm = p.quarterMonkeys || 0;
          const eliminated = qm >= MONKEY_LIMIT;
          const isActive = p.uid === currentPlayerUid && !eliminated;
          return (
            <div key={p.uid} className="card" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', minWidth: 70, flexShrink: 0,
              background: isActive ? 'var(--bg-pink)' : '#FFF', border: '3px solid var(--bg-dark-purple)',
              boxShadow: isActive ? '4px 4px 0px var(--bg-dark-purple)' : '2px 2px 0px rgba(0,0,0,0.1)',
              transform: isActive ? 'translateY(-4px)' : 'none', opacity: eliminated ? 0.45 : 1, transition: 'all 0.3s'
            }}>
              <UserAvatar avatarId={p.avatarId ?? 0} size={42} style={{ marginBottom: 4 }} />
              <span style={{ fontSize: 11, fontWeight: 900, color: isActive ? '#FFF' : 'var(--bg-dark-purple)', marginBottom: 6 }}>{eliminated ? '💀' : p.username.slice(0, 8)}</span>
              <MonkeySVG qm={qm} />
            </div>
          );
        })}
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 8, borderTopLeftRadius: 32, borderTopRightRadius: 32, background: 'var(--color-card)', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
        <GameScreen
          currentWord={room.gameState.currentWord || ''}
          timeRemaining={computedTimer ?? room.timeLimit}
          timeLimit={room.timeLimit}
          currentPlayer={currentPlayer}
          isAiTurn={!isMyTurn}
          onKeyPress={pressLetter}
          onDelete={pressDelete}
          onChallenge={pressChallenge}
          isOnline={true}
        />
      </main>

      <button onMouseDown={handleHornStart} onMouseUp={handleHornEnd} onTouchStart={(e) => { e.preventDefault(); handleHornStart(); }} onTouchEnd={(e) => { e.preventDefault(); handleHornEnd(); }}
        className={`btn ${isHonking ? 'btn-pink' : 'btn-yellow'}`}
        style={{ position: 'absolute', bottom: 24, left: 24, width: 72, height: 72, borderRadius: '50%', fontSize: 34, zIndex: 100, boxShadow: 'var(--brutal-shadow)' }}>📯</button>

      {showExitConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(28,16,63,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 12px' }}>تخرج من اللعبة؟</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowExitConfirm(false)} className="btn btn-white" style={{ flex: 1, padding: 14 }}>لأ</button>
              <button onClick={handleExit} className="btn btn-pink" style={{ flex: 1, padding: 14 }}>اخرج</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
