import { useState } from 'react';
import { playSound } from '../utils/audio';

const ROWS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'ظ'],
];

export default function Keyboard({ onKeyPress, disabled, onDelete }) {
  const [pressed, setPressed] = useState(null);

  const handleKey = (key) => {
    if (disabled) return;
    setPressed(key);
    setTimeout(() => setPressed(null), 150);
    playSound('click');
    onKeyPress(key);
  };

  return (
    <div style={{
      width: '100%', padding: '8px 4px',
      background: 'var(--color-bg)',
      borderTop: '1px solid rgba(28,16,64,0.1)',
    }}>
      {ROWS.map((row, ri) => (
        <div key={ri} style={{
          display: 'flex', justifyContent: 'center',
          gap: 4, marginBottom: ri < ROWS.length - 1 ? 4 : 0,
        }}>
          {row.map(key => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              disabled={disabled}
              className={`kb-key${pressed === key ? ' pressed' : ''}`}
              style={{ flex: 1, maxWidth: 44, height: 44 }}
            >
              {key}
            </button>
          ))}
          {ri === ROWS.length - 1 && (
            <button
              onClick={() => handleKey(' ')}
              disabled={disabled}
              aria-label="مسافة"
              className={`kb-key${pressed === ' ' ? ' pressed' : ''}`}
              style={{ flex: 1.5, maxWidth: 62, height: 44, fontSize: '1.1rem' }}
            >
              ␣
            </button>
          )}
          {ri === ROWS.length - 1 && (
            <button
              onClick={() => { if (!disabled) onDelete(); }}
              disabled={disabled}
              aria-label="مسح الحرف"
              className="kb-key"
              style={{ flex: 1.5, maxWidth: 62, height: 44, fontSize: '1.25rem', color: 'var(--color-primary)' }}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
