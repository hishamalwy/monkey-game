import Keyboard from './Keyboard';

export default function GameScreen({
  currentWord, timeRemaining, timeLimit,
  currentPlayer, onKeyPress, onChallenge, isAiTurn, onDelete, isOnline,
}) {
  const pct = timeLimit > 0 ? (timeRemaining / timeLimit) * 100 : 100;
  const isUrgent = timeLimit > 0 && timeRemaining <= 5;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-evenly',
        padding: '8px 16px', overflow: 'hidden',
      }}>

        {/* Current Player Badge */}
        <div style={{
          background: 'rgba(233,30,140,0.1)',
          border: '2px solid rgba(233,30,140,0.3)',
          borderRadius: 50, padding: '7px 20px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 15, color: 'var(--color-primary)', fontWeight: 700 }}>دور:</span>
          <span style={{
            fontSize: 15, color: 'var(--color-header)', fontWeight: 700,
            ...(isAiTurn ? { opacity: 0.7 } : {}),
          }}>
            {currentPlayer?.name}
            {isAiTurn && <span style={{ fontSize: 12, marginRight: 6, color: 'var(--color-muted)' }}>يفكر…</span>}
          </span>
        </div>

        {/* Timer bar */}
        {timeLimit > 0 && (
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12, color: isUrgent ? 'var(--color-danger)' : 'var(--color-muted)', marginBottom: 6,
            }}>
              <span>⏱</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{timeRemaining}s</span>
            </div>
            <div style={{
              height: 6, background: 'rgba(28,16,64,0.1)',
              borderRadius: 3, overflow: 'hidden',
            }}>
              <div className="timer-bar" style={{
                height: '100%',
                width: `${pct}%`,
                background: isUrgent
                  ? 'var(--color-danger)'
                  : 'var(--color-primary)',
                borderRadius: 3,
              }} />
            </div>
          </div>
        )}

        {/* Word Display */}
        <div className={`word-display glow-pulse ${isAiTurn ? '' : 'pop'}`} style={{
          width: '100%', maxWidth: 360,
          minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px 24px',
        }}>
          <span style={{
            fontFamily: 'Cairo, sans-serif',
            fontSize: currentWord.length > 6 ? 40 : currentWord.length > 3 ? 52 : 64,
            fontWeight: 900, letterSpacing: '0.04em',
            color: currentWord ? 'var(--color-header)' : 'rgba(28,16,64,0.2)',
            textAlign: 'center', lineHeight: 1.2,
            transition: 'font-size 0.2s ease',
          }}>
            {currentWord || '_ _ _'}
          </span>
        </div>

        {/* Challenge Button */}
        <button
          onClick={onChallenge}
          disabled={isAiTurn || !currentWord}
          className="btn btn-danger"
          style={{
            width: '100%', maxWidth: 360, padding: '14px',
            fontSize: 18, letterSpacing: '0.03em',
            opacity: (isAiTurn || !currentWord) ? 0.4 : 1,
            cursor: (isAiTurn || !currentWord) ? 'not-allowed' : 'pointer',
          }}
        >
          شك!
        </button>
      </div>

      {/* On-screen keyboard */}
      <Keyboard onKeyPress={onKeyPress} onDelete={onDelete} disabled={isAiTurn} />

      {!isOnline && (
        <div style={{
          textAlign: 'center', paddingBottom: 6,
          fontSize: 11, color: 'var(--color-muted)',
        }}>
          ⌨️ يمكنك اللعب بكيبورد الكمبيوتر
        </div>
      )}
    </div>
  );
}
