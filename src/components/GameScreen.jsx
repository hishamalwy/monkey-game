import { useEffect, useRef } from 'react';
import UserAvatar from './ui/UserAvatar';

// Standard English to Default Arabic keyboard mapping
const EN_TO_AR = {
  'q':'ض', 'w':'ص', 'e':'ث', 'r':'ق', 't':'ف', 'y':'غ', 'u':'ع', 'i':'ه', 'o':'خ', 'p':'ح', '[':'ج', ']':'د',
  'a':'ش', 's':'س', 'd':'ي', 'f':'ب', 'g':'ل', 'h':'ا', 'j':'ت', 'k':'ن', 'l':'م', ';':'ك', '\'':'ط',
  'z':'ئ', 'x':'ء', 'c':'ؤ', 'v':'ر', 'b':'لا', 'n':'ى', 'm':'ة', ',':'و', '.':'ز', '/':'ظ'
};

export default function GameScreen({
  currentWord, timeRemaining, timeLimit,
  currentPlayer, onKeyPress, onChallenge, isAiTurn, onDelete
}) {
  const pct = timeLimit > 0 ? (timeRemaining / timeLimit) * 100 : 100;
  const isUrgent = timeLimit > 0 && timeRemaining <= 5;

  const inputRef = useRef(null);

  // Auto-focus native keyboard area
  useEffect(() => {
    if (!isAiTurn && inputRef.current) {
      // Focus more aggressively when turn starts
      const focusInput = () => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      };
      
      focusInput();
      const timer = setTimeout(focusInput, 300); // Wait for animations to settle
      const timer2 = setTimeout(focusInput, 800); // Secondary fallback
      
      return () => { clearTimeout(timer); clearTimeout(timer2); };
    } else if (isAiTurn && inputRef.current) {
      inputRef.current?.blur();
    }
  }, [isAiTurn, currentPlayer?.name]); // Trigger when turn changes or player name changes (new round)

  // Desktop physical keyboard
  useEffect(() => {
    if (isAiTurn) return;
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target === inputRef.current) return;
      if (e.key === 'Backspace') { e.preventDefault(); onDelete(); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onKeyPress(' '); return; }
      let char = e.key;
      if (/^[a-zA-Z]$/.test(char)) char = EN_TO_AR[char.toLowerCase()];
      if (char && /^[\u0600-\u06FF\s]+$/.test(char)) onKeyPress(char);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiTurn, onKeyPress, onDelete]);

  const handleInputChange = (e) => {
    if (isAiTurn) return;
    const val = e.target.value;
    if (val.length < currentWord.length) {
      onDelete();
    } else {
      let char = val.slice(currentWord.length);
      char = char[char.length - 1];
      if (!char) return;
      if (/^[a-zA-Z]$/.test(char)) char = EN_TO_AR[char.toLowerCase()];
      if (char && /^[\u0600-\u06FF\s]+$/.test(char)) onKeyPress(char);
    }
  };

  return (
    <div 
      onClick={() => !isAiTurn && inputRef.current?.focus()} 
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: isAiTurn ? 'default' : 'text' }}
    >
      {/* Hidden input for Native Mobile/Desktop Keyboard */}
      <input
        ref={inputRef}
        type="text"
        value={currentWord}
        onChange={handleInputChange}
        disabled={isAiTurn}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        style={{ opacity: 0, position: 'absolute', zIndex: -1 }}
      />

      {/* ── Top content area ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-evenly',
        padding: '10px 20px', overflow: 'hidden', gap: 10,
      }}>

        {/* Current player badge */}
        <div className="card" style={{
          padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--bg-pink)', fontWeight: 900 }}>دور:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {currentPlayer?.avatarId !== undefined && (
              <UserAvatar avatarId={currentPlayer.avatarId} size={28} style={{ border: 'none' }} />
            )}
            <span className="truncate" style={{
              fontSize: '1rem', color: 'var(--bg-dark-purple)', fontWeight: 900, maxWidth: 130,
              ...(isAiTurn ? { opacity: 0.6 } : {}),
            }}>
              {currentPlayer?.name}
              {isAiTurn && (
                <span style={{ fontSize: '0.75rem', marginRight: 6, color: 'rgba(28,16,63,0.45)' }}>
                  يفكر…
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Timer bar */}
        {timeLimit > 0 && (
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 6, fontSize: '0.8rem',
              color: isUrgent ? 'var(--bg-pink)' : 'var(--bg-dark-purple)',
            }}>
              <span>⏱</span>
              <span style={{ fontWeight: 900, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>
                {timeRemaining}s
              </span>
            </div>
            <div style={{ height: 14, background: '#FFF', border: 'var(--brutal-border)', overflow: 'hidden' }}>
              <div className="timer-bar" style={{
                height: '100%',
                width: `${pct}%`,
                background: isUrgent ? 'var(--bg-pink)' : 'var(--bg-green)',
                borderRight: pct > 0 ? 'var(--brutal-border)' : 'none',
              }} />
            </div>
          </div>
        )}

        {/* Word tiles */}
        <div className={isAiTurn ? '' : 'pop'} style={{
          width: '100%', maxWidth: 360,
          display: 'flex', alignItems: 'center', gap: 6,
          flexDirection: 'row', flexWrap: 'wrap',
          alignContent: 'center', justifyContent: 'center',
          minHeight: 80,
        }}>
          {currentWord ? (
            currentWord.split('').map((char, i) => (
              <div key={i} className="card" style={{
                width: 56, height: 68,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem', fontWeight: 900, color: 'var(--bg-dark-purple)',
              }}>
                {char}
              </div>
            ))
          ) : (
            <div className="card" style={{
              width: 56, height: 68,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.2rem', fontWeight: 900, color: 'rgba(28,16,63,0.25)',
            }}>_</div>
          )}
        </div>

        {/* Challenge button */}
        <button
          onClick={onChallenge}
          disabled={isAiTurn || !currentWord}
          className="btn"
          style={{
            width: '100%', maxWidth: 360,
            background: 'var(--bg-orange)', color: '#FFF',
            padding: '14px', fontSize: '1.15rem',
            opacity: (isAiTurn || !currentWord) ? 0.35 : 1,
          }}
        >
          أتحداك! 🧐
        </button>

        {!isAiTurn && (
          <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem', marginTop: 10 }}>
            اضغط في أي مكان للكتابة ⌨️
          </div>
        )}
      </div>

    </div>
  );
}
