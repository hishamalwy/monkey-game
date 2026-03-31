import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import GameScreen from '../components/GameScreen';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { playSound } from '../utils/audio';

export default function OnlineGameScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const {
    room, players, isMyTurn, computedTimer,
    pressLetter, pressDelete, pressChallenge,
  } = useRoom(roomCode);

  // Watch for status transitions
  useEffect(() => {
    if (!room) return;
    if (room.status === 'round_result') nav.toRoundResult();
    if (room.status === 'game_over') nav.toGameOver();
    if (room.status === 'lobby') nav.toLobby(roomCode);
  }, [room?.status]);

  // Physical keyboard support (only when it's my turn)
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

  if (!room?.gameState) {
    return (
      <div style={{
        width: '100vw', height: '100dvh', background: 'var(--color-bg)',
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

  const scorePlayers = players.map(p => ({
    id: p.uid,
    name: p.username,
    quarterMonkeys: p.quarterMonkeys || 0,
    avatarEmoji: AVATAR_EMOJIS[p.avatarId ?? 0],
  }));

  const currentPlayerIdx = players.findIndex(p => p.uid === currentPlayerUid);

  return (
    <div style={{
      width: '100vw', height: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(28,16,64,0.08)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-header)' }}>
          🐒 القرد بيتكلم
        </div>
        {/* Mini scoreboard */}
        <div style={{ display: 'flex', gap: 8 }}>
          {players.map((p, idx) => (
            <div key={p.uid} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '4px 8px', borderRadius: 10,
              background: p.uid === currentPlayerUid ? 'rgba(233,30,140,0.1)' : 'transparent',
              border: p.uid === currentPlayerUid ? '1px solid var(--color-primary)' : '1px solid transparent',
            }}>
              <span style={{ fontSize: 16 }}>{AVATAR_EMOJIS[p.avatarId ?? 0]}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-header)' }}>
                {p.username.slice(0, 5)}
              </span>
              <span style={{ fontSize: 9, color: 'var(--color-secondary)' }}>
                {p.quarterMonkeys > 0 ? `${p.quarterMonkeys}/4 🐒` : '—'}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Turn indicator */}
      <div style={{
        textAlign: 'center', padding: '8px',
        fontSize: 14, fontWeight: 700,
        color: isMyTurn ? 'var(--color-primary)' : 'var(--color-muted)',
        background: isMyTurn ? 'rgba(233,30,140,0.08)' : 'transparent',
      }}>
        {isMyTurn ? '👉 دورك الآن!' : `دور ${currentPlayer.name}...`}
      </div>

      {/* Game */}
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
    </div>
  );
}
