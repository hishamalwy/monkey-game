import { leaveRoom } from '../../firebase/rooms';

const MODE_LABELS = {
  monkey: '🐒 كلكس!',
  draw: '🎨 رسم وتخمين',
  survival: '⚔️ سيرفايفر',
};

export default function ReconnectModal({ room, onRejoin, onDismiss, userProfile }) {
  const handleDismiss = async () => {
    if (userProfile && room.code) {
      const isHost = room.hostUid === userProfile.uid;
      await leaveRoom(room.code, userProfile.uid, isHost);
    }
    onDismiss();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: 'rgba(28,16,63,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="card slide-up" style={{
        padding: '32px 24px', width: '100%', maxWidth: 360,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔌</div>
        <h2 style={{ fontSize: 22, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: '0 0 8px' }}>
          عندك لعبة جارية!
        </h2>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--bg-pink)', margin: '0 0 6px' }}>
          {MODE_LABELS[room.mode] || 'لعبة'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700, margin: '0 0 20px' }}>
          الغرفة: {room.code} • {(room.playerOrder || []).length} لاعبين
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onRejoin} className="btn btn-green" style={{ width: '100%', padding: '14px', fontSize: 17 }}>
            🔄 ارجع للعبة!
          </button>
          <button onClick={handleDismiss} className="btn btn-white" style={{ width: '100%', padding: '12px', fontSize: 14, opacity: 0.7 }}>
            اترك الغرفة
          </button>
        </div>
      </div>
    </div>
  );
}
