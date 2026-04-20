import { useEffect, useState } from 'react';

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.(); }, 2000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--neo-black)', color: 'white',
      padding: '12px 24px', borderRadius: 0,
      fontSize: 15, fontWeight: 900,
      zIndex: 9999, whiteSpace: 'nowrap',
      border: '4px solid var(--neo-pink)',
      boxShadow: '6px 6px 0 var(--neo-pink)',
    }}>
      {message}
    </div>
  );
}
