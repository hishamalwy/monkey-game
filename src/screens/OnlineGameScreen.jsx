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
    }}>
      {/* Header */}
      <header style={{
        padding: '10px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--color-card)',
        borderBottom: '2px solid rgba(28,16,64,0.08)',
        flexShrink: 0,
      }}>
        {/* Exit button */}
        <button
          onClick={() => setShowExitConfirm(true)}
          style={{
            background: 'rgba(233,30,140,0.08)', border: '2px solid rgba(233,30,140,0.2)',
            borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: 'var(--color-primary)',
            fontFamily: 'Cairo, sans-serif',
          }}>
          ✕ خروج
        </button>

        {/* Mini scoreboard */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '60vw' }}>
          {players.map((p) => {
            const qm = p.quarterMonkeys || 0;
            const eliminated = qm >= 4;
            return (
              <div key={p.uid} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '3px 7px', borderRadius: 10, flexShrink: 0,
                background: p.uid === currentPlayerUid ? 'rgba(233,30,140,0.12)' : 'rgba(28,16,64,0.04)',
                border: p.uid === currentPlayerUid ? '2px solid var(--color-primary)' : '2px solid transparent',
                opacity: eliminated ? 0.4 : 1,
              }}>
                <span style={{ fontSize: 15 }}>{AVATAR_EMOJIS[p.avatarId ?? 0]}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-header)' }}>
                  {p.username.slice(0, 6)}
                </span>
                <span style={{ fontSize: 9, color: eliminated ? 'var(--color-danger)' : 'var(--color-secondary)', fontWeight: 700 }}>
                  {eliminated ? '💀' : qm > 0 ? `${qm}/4🐒` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Turn banner */}
      <div style={{
        textAlign: 'center', padding: '7px 16px',
        fontSize: 14, fontWeight: 900,
        background: isMyTurn ? 'var(--color-primary)' : 'rgba(28,16,64,0.07)',
        color: isMyTurn ? 'white' : 'var(--color-muted)',
        transition: 'all 0.3s ease',
        flexShrink: 0,
      }}>
        {isMyTurn ? '👉 دورك الآن!' : `⏳ دور ${currentPlayer.name}...`}
      </div>

      {/* Game area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
      </div>

      {/* Horn button */}
      <div style={{
        padding: '8px 16px 12px',
        background: 'var(--color-card)',
        borderTop: '1px solid rgba(28,16,64,0.08)',
        display: 'flex', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <button
          onMouseDown={handleHornStart}
          onMouseUp={handleHornEnd}
          onMouseLeave={handleHornEnd}
          onTouchStart={(e) => { e.preventDefault(); handleHornStart(); }}
          onTouchEnd={(e) => { e.preventDefault(); handleHornEnd(); }}
          style={{
            background: isHonking
              ? 'linear-gradient(135deg, #FF6B35, #e55c25)'
              : 'linear-gradient(135deg, #FFD700, #FFC200)',
            border: 'none', borderRadius: 50,
            padding: '10px 32px', cursor: 'pointer',
            fontSize: 22,
            fontFamily: 'Cairo, sans-serif', fontWeight: 900,
            color: 'var(--color-header)',
            boxShadow: isHonking
              ? '0 2px 8px rgba(255,107,53,0.5)'
              : '0 4px 16px rgba(255,215,0,0.5)',
            transform: isHonking ? 'scale(0.93)' : 'scale(1)',
            transition: 'all 0.08s ease',
            userSelect: 'none', WebkitUserSelect: 'none',
          }}
        >
          📯
        </button>
      </div>

      {/* Exit confirmation overlay */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(28,16,64,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--color-card)', borderRadius: 20, padding: '28px 24px',
            width: '100%', maxWidth: 320, textAlign: 'center',
            boxShadow: '0 12px 48px rgba(28,16,64,0.2)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-header)', margin: '0 0 8px' }}>
              تخرج من اللعبة؟
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 20 }}>
              لو خرجت هتتحسب عليك خسارة
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowExitConfirm(false)} className="btn btn-ghost"
                style={{ flex: 1, padding: '12px', fontSize: 15, borderRadius: 14 }}>
                لأ، ابقى
              </button>
              <button onClick={handleExit} className="btn btn-danger"
                style={{ flex: 1, padding: '12px', fontSize: 15, borderRadius: 14 }}>
                اخرج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

