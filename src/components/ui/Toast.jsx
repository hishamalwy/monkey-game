import { useEffect, useState } from 'react';

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.(); }, 2000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--color-header)', color: 'white',
      padding: '10px 20px', borderRadius: 50,
      fontSize: 14, fontWeight: 700,
      zIndex: 9999, whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(28,16,64,0.3)',
    }}>
      {message}
    </div>
  );
}
