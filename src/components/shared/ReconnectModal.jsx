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
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
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
        <p style={{ fontSize: 13, color: '#666', fontWeight: 900, margin: '0 0 28px' }}>
          الغرفة: {room.code} &bull; {(room.playerOrder || []).length} لاعبين
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={handleRejoin} className="btn btn-yellow" style={{
            width: '100%', padding: '18px', fontSize: 18,
            borderRadius: 0, border: '4.5px solid #000',
            boxShadow: '6px 6px 0 #000', fontWeight: 900,
          }}>
            🔄 ارجع للعبة!
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
