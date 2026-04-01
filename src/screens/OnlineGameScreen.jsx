import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import GameScreen from '../components/GameScreen';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { startHorn, stopHorn } from '../utils/audio';

export default function OnlineGameScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const {
    room, players, isMyTurn, computedTimer,
    pressLetter, pressDelete, pressChallenge, leaveRoom,
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

  // Status transitions — uses navRef to avoid stale closure
  useEffect(() => {
    if (!room) return;
    if (room.status === 'round_result') navRef.current.toRoundResult();
    if (room.status === 'game_over') navRef.current.toGameOver();
    if (room.status === 'lobby') navRef.current.toLobby(roomCode);
  }, [room?.status]);

  // Physical keyboard
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

  // Cleanup horn on unmount
  useEffect(() => () => stopHorn(), []);

  const handleHornStart = () => { setIsHonking(true); startHorn(); };
  const handleHornEnd = () => { setIsHonking(false); stopHorn(); };

  const handleExit = async () => {
    await leaveRoom();
    navRef.current.toHome();
  };

  if (!room?.gameState) {
    return (
      <div style={{
        width: '100%', height: '100%', background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  const currentPlayerUid = room.gameState.currentPlayerUid;
  const currentPlayerData = room.players[currentPlayerUid];
  const currentPlayer = {
    name: currentPlayerData?.username || '...',
    avatarEmoji: AVATAR_EMOJIS[currentPlayerData?.avatarId ?? 0],
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <h2 className="title-glitch" style={{ margin: 0, fontSize: 24, transform: 'none' }}>كلكس!</h2>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="btn btn-white"
          style={{ padding: '8px 16px', fontSize: 14 }}
        >
          ✕ خروج
        </button>
      </header>

      {/* Floating Players Dock */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', gap: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        flexShrink: 0,
        position: 'relative',
      }}>
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <mask id="global-monkey-mask">
              <circle cx="50" cy="32" r="20" fill="white" />
              <circle cx="26" cy="36" r="10" fill="white" />
              <circle cx="74" cy="36" r="10" fill="white" />
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
            <div key={p.uid} className="card slide-up" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 12px', minWidth: 70, flexShrink: 0,
              background: isActive ? 'var(--bg-pink)' : '#FFF',
              border: '3px solid var(--bg-dark-purple)',
              boxShadow: isActive ? '4px 4px 0px var(--bg-dark-purple)' : '2px 2px 0px rgba(45,27,78,0.2)',
              transform: isActive ? 'translateY(-4px)' : 'none',
              opacity: eliminated ? 0.45 : 1,
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <span style={{ fontSize: 20, filter: eliminated ? 'grayscale(1)' : 'none', marginBottom: 4 }}>
                {AVATAR_EMOJIS[p.avatarId ?? 0]}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 900,
                color: isActive ? '#FFF' : 'var(--bg-dark-purple)',
                marginBottom: 6
              }}>
                {eliminated ? '💀' : p.username.slice(0, 8)}
              </span>
              <MonkeySVG qm={qm} />
            </div>
          );
        })}
      </div>

      {/* Game area */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        position: 'relative',
        background: 'var(--color-card)',
        borderTop: 'var(--brutal-border)',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
        marginTop: 8
      }}>
        {/* Turn indicator watermark font-size reduced slightly */}
        {isMyTurn && (
          <div className="pop" style={{
            position: 'absolute', top: 20, right: 20, zIndex: 10,
            background: 'var(--bg-pink)', color: 'white', padding: '4px 12px',
            fontWeight: 900, borderRadius: 12, transform: 'rotate(5deg)',
            border: '2px solid var(--bg-dark-purple)', boxShadow: '2px 2px 0 var(--bg-dark-purple)'
          }}>
            دورك! 🔥
          </div>
        )}
        
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

      {/* Floating Horn FAB */}
      <button
        onMouseDown={handleHornStart}
        onMouseUp={handleHornEnd}
        onMouseLeave={handleHornEnd}
        onTouchStart={(e) => { e.preventDefault(); handleHornStart(); }}
        onTouchEnd={(e) => { e.preventDefault(); handleHornEnd(); }}
        className={`btn ${isHonking ? 'btn-pink' : 'btn-yellow'}`}
        style={{
          position: 'absolute', bottom: 24, left: 24,
          width: 72, height: 72, borderRadius: '50%',
          padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, zIndex: 100,
          boxShadow: isHonking ? '0 2px 8px rgba(233,30,140,0.5)' : 'var(--brutal-shadow)',
          transform: isHonking ? 'scale(0.93)' : 'scale(1)',
          transition: 'all 0.08s ease',
        }}
      >
        📯
      </button>

      {/* Exit confirmation overlay */}
      {showExitConfirm && (
        <div className="slide-up" style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(28,16,63,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div className="card" style={{
            padding: '28px 24px',
            width: '100%', maxWidth: 320, textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 12px' }}>
              تخرج من اللعبة؟
            </h3>
            <p style={{ fontSize: 16, color: 'var(--bg-dark-purple)', marginBottom: 24, fontWeight: 700 }}>
              لو خرجت هتتحسب عليك خسارة! 🐒
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowExitConfirm(false)} className="btn btn-white"
                style={{ flex: 1, padding: '14px', fontSize: 16 }}>
                لأ، كمل
              </button>
              <button onClick={handleExit} className="btn btn-pink"
                style={{ flex: 1, padding: '14px', fontSize: 16 }}>
                اخرج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

