import { useState, useEffect } from 'react';
import { leaveRoom } from '../../firebase/rooms';
import { useAudio } from '../../context/AudioContext';

const MODE_LABELS = {
  monkey: '🐒 كلكس!',
  draw: '🎨 رسم وتخمين',
  survival: '⚔️ البقاء للأقوى',
  charades: '🎭 بدون كلام',
};

export default function ReconnectModal({ room, onRejoin, onDismiss, userProfile }) {
  const { playClick } = useAudio();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      onRejoin();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = async () => {
    playClick();
    if (userProfile && room.code) {
      await leaveRoom(room.code, userProfile.uid);
    }
    onDismiss();
  };

  const handleRejoin = () => {
    playClick();
    onRejoin();
  };

  return (
    <div
      role="dialog"
      aria-label="لعبة جارية - إعادة الاتصال"
      style={{
        position: 'absolute', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="card slide-up" style={{
        padding: '36px 28px', width: '100%', maxWidth: 380,
        textAlign: 'center', borderRadius: 0,
        border: '5px solid #000',
        boxShadow: '10px 10px 0 #000',
        background: '#FFF',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔌</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#000', margin: '0 0 10px' }}>
          عندك لعبة جارية!
        </h2>
        <p style={{ fontSize: 16, fontWeight: 900, color: '#000', margin: '0 0 6px' }}>
          {MODE_LABELS[room.mode] || 'لعبة'}
        </p>
        <p style={{ fontSize: 13, color: '#666', fontWeight: 900, margin: '0 0 8px' }}>
          الغرفة: {room.code} &bull; {(room.playerOrder || []).length} لاعبين
        </p>
        <div style={{
          margin: '0 auto 24px', width: 120, height: 120,
          border: '5px solid #000', borderRadius: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--neo-yellow)',
          boxShadow: '4px 4px 0 #000',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--neo-green)',
            height: `${(countdown / 10) * 100}%`,
            transition: 'height 0.9s linear',
          }} />
          <span style={{ position: 'relative', zIndex: 2, fontSize: 42, fontWeight: 900, color: '#000' }}>
            {countdown}
          </span>
        </div>
        <p style={{ fontSize: 11, fontWeight: 900, color: '#666', margin: '0 0 20px' }}>
          سيتم إعادة الاتصال تلقائياً...
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={handleRejoin} className="btn btn-yellow" style={{
            width: '100%', padding: '18px', fontSize: 18,
            borderRadius: 0, border: '4.5px solid #000',
            boxShadow: '6px 6px 0 #000', fontWeight: 900,
          }}>
            🔄 ارجع للعبة الآن!
          </button>
          <button onClick={handleDismiss} className="btn btn-white" style={{
            width: '100%', padding: '14px', fontSize: 14,
            borderRadius: 0, border: '3px solid #000', fontWeight: 900,
          }}>
            اترك الغرفة
          </button>
        </div>
      </div>
    </div>
  );
}
