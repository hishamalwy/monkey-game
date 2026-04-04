import { useState, useEffect } from 'react';
import { auth } from '../../firebase/config';

export default function ConnectionStatus() {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => {
      setConnected(true);
    });

    const handleOnline = () => setConnected(true);
    const handleOffline = () => setConnected(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (connected) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#EF4444', color: '#FFF', padding: '8px 16px',
      textAlign: 'center', fontSize: 13, fontWeight: 800,
    }}>
      ⚠️ لا يوجد اتصال بالإنترنت...
    </div>
  );
}
