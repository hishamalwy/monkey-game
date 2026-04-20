import { useEffect, useRef, useState } from 'react';
import UserAvatar from './ui/UserAvatar';

// Standard English to Default Arabic keyboard mapping
const EN_TO_AR = {
  'q':'ض', 'w':'ص', 'e':'ث', 'r':'ق', 't':'ف', 'y':'غ', 'u':'ع', 'i':'ه', 'o':'خ', 'p':'ح', '[':'ج', ']':'د',
  'a':'ش', 's':'س', 'd':'ي', 'f':'ب', 'g':'ل', 'h':'ا', 'j':'ت', 'k':'ن', 'l':'م', ';':'ك', '\'':'ط',
  'z':'ئ', 'x':'ء', 'c':'ؤ', 'v':'ر', 'b':'لا', 'n':'ى', 'm':'ة', ',':'و', '.':'ز', '/':'ظ',
  '،': 'و' 
};

export default function GameScreen({
  currentWord, timeRemaining, timeLimit,
  currentPlayer, onKeyPress, onDelete, onChallenge, isAiTurn, isMyTurn
}) {
  const pct = timeLimit > 0 ? (timeRemaining / timeLimit) * 100 : 100;
  const isUrgent = timeLimit > 0 && timeRemaining <= 5;

  const inputRef = useRef(null);

  const [showHint, setShowHint] = useState(false);

  // Auto-focus native keyboard area
  useEffect(() => {
    if (!isAiTurn && inputRef.current) {
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 3000);

      // Focus more aggressively when turn starts
      const focusInput = () => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      };
      
      focusInput();
      const timerFocus1 = setTimeout(focusInput, 300); // Wait for animations to settle
      const timerFocus2 = setTimeout(focusInput, 800); // Secondary fallback
      
      return () => { 
        clearTimeout(timer); 
        clearTimeout(timerFocus1); 
        clearTimeout(timerFocus2); 
      };
    } else if (isAiTurn && inputRef.current) {
      inputRef.current?.blur();
      setShowHint(false);
    }
  }, [isAiTurn, currentPlayer?.name]); // Trigger when turn changes or player name changes (new round)

  // Desktop physical keyboard
  useEffect(() => {
    if (isAiTurn) return;
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target === inputRef.current) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onKeyPress(' '); return; }
      let char = e.key;
      // 1. If it's already an Arabic char from a native layout, accept it
      if (/^[\u0600-\u06FF]$/.test(char)) { onKeyPress(char); return; }
      // 2. Otherwise map from English layout
      if (/^[a-zA-Z]$/.test(char)) char = EN_TO_AR[char.toLowerCase()];
      if (char && /^[\u0600-\u06FF\s]+$/.test(char)) onKeyPress(char);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiTurn, onKeyPress, onDelete]);

  const handleInputChange = (e) => {
    if (isAiTurn) return;
    const val = e.target.value;
    if (val.length > currentWord.length) {
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
          background: isMyTurn ? 'var(--neo-pink)' : '#FFF',
          color: isMyTurn ? '#FFF' : 'var(--neo-black)',
          border: `3px solid var(--neo-black)`,
          transition: 'all 0.3s ease'
        }}>
          <span style={{ fontSize: '0.85rem', color: isMyTurn ? '#000' : 'var(--neo-pink)', fontWeight: 900 }}>دور:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {currentPlayer?.avatarId !== undefined && (
              <UserAvatar avatarId={currentPlayer.avatarId} size={28} style={{ border: isMyTurn ? '2px solid #FFF' : 'none' }} />
            )}
            <span className="truncate" style={{
              fontSize: '1rem', color: isMyTurn ? '#000' : 'var(--neo-black)', fontWeight: 900, maxWidth: 130,
              ...(isAiTurn ? { opacity: 0.6 } : {}),
            }}>
              {currentPlayer?.name} {isMyTurn && '(أنت)'}
              {isAiTurn && (
                <span style={{ fontSize: '0.75rem', marginRight: 6, color: 'rgba(0,0,0,0.45)' }}>
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
              color: isUrgent ? 'var(--neo-pink)' : 'var(--neo-black)',
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
                background: isUrgent ? 'var(--neo-pink)' : 'var(--neo-green)',
                borderRight: pct > 0 ? 'var(--brutal-border)' : 'none',
              }} />
            </div>
          </div>
        )}

        {/* Word tiles - Shrinks as word grows */}
        <div 
          className={isAiTurn ? '' : 'pop'} 
          style={{
            width: '100%', maxWidth: 360, position: 'relative',
            display: 'flex', alignItems: 'center', gap: 6,
            flexDirection: 'row', flexWrap: 'wrap',
            alignContent: 'center', justifyContent: 'center',
            minHeight: 100,
            cursor: 'pointer'
          }}
          onClick={(e) => {
             e.stopPropagation();
             if (!isAiTurn) inputRef.current?.focus();
          }}
        >
          {/* Mobile Focus Hint: shown for 3s when turn starts */}
          {!isAiTurn && showHint && (
             <div style={{
               position: 'absolute', top: -30, background: 'var(--neo-pink)', color: '#000',
               padding: '4px 12px', borderRadius: 0, fontSize: 13, fontWeight: 900, border: '3px solid #000',
               boxShadow: '4px 4px 0 #000', animation: 'pop 1s infinite alternate'
             }}>
                اضغط هنا أو اكتب! ⌨️ 👇
             </div>
          )}
          {(() => {
            const word = currentWord || '_';
            const chars = word.split('');
            const tileCount = chars.length;
            
            // Dynamic sizing & wrap logic
            const maxInRow = 10;
            const containerWidth = 340;
            
            let tileWidth, tileHeight, fontSize;
            
            if (tileCount <= maxInRow) {
               // Single row shrinking
               const calculated = Math.min(56, (containerWidth - (tileCount * 6)) / tileCount);
               tileWidth = Math.max(34, calculated);
               tileHeight = tileWidth * 1.2;
               fontSize = tileWidth / 22;
            } else {
               // Wrapped mode
               tileWidth = 40;
               tileHeight = 52;
               fontSize = 1.3;
            }

            return chars.map((char, i) => (
              <div key={i} className="card" style={{
                width: tileWidth, 
                height: tileHeight,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: `${fontSize}rem`, 
                fontWeight: 900, 
                color: currentWord ? 'var(--neo-black)' : 'rgba(0,0,0,0.25)',
                padding: 0,
                flexShrink: 0,
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                borderWidth: tileWidth < 40 ? '3px' : '4px'
              }}>
                {char}
              </div>
            ));
          })()}
        </div>

        {/* Action Button: ONLY ONE as requested */}
        <div style={{ padding: '0 20px', width: '100%', maxWidth: 360 }}>
          <button
            onClick={onChallenge}
            disabled={isAiTurn || !currentWord}
            className="btn"
            style={{
              width: '100%',
              background: 'var(--neo-pink)', color: '#000',
              padding: '16px', fontSize: '1.25rem',
              opacity: (isAiTurn || !currentWord) ? 0.35 : 1,
              border: '5px solid #000',
              boxShadow: '4px 4px 0 #000', borderRadius: 0
            }}
          >
            أشك! 🧐
          </button>
        </div>

        {!isAiTurn && (
          <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem', marginTop: 10 }}>
            اضغط في أي مكان للكتابة ⌨️
          </div>
        )}
      </div>

    </div>
  );
}
