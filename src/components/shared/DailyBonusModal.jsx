import { getStreakEmoji } from '../../utils/retention';
import { useAudio } from '../../context/AudioContext';
import { useNavigate } from 'react-router-dom';
import singleCoinIcon from '../../assets/icons/single_coin.png';
import treasureChestIcon from '../../assets/icons/treasure_chest.png';

const STREAK_DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function DailyBonusModal({ streak, bonus, onClaim }) {
  const navigate = useNavigate();
  const { playBonus, playClick } = useAudio();

  const handleClaim = () => {
    playClick();
    playBonus();
    onClaim();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'var(--bg-yellow)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
      overflowY: 'auto'
    }}>
      <div style={{ padding: '24px 20px', textAlign: 'center', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        <div style={{ position: 'relative', marginBottom: 20 }}>
            <div className="wizard-card" style={{ fontSize: 'clamp(60px, 20vw, 100px)', filter: 'drop-shadow(4px 4px 0 var(--bg-dark-purple))' }}>
              {getStreakEmoji(streak)}
            </div>
            <div className="card-rainbow" style={{
              position: 'absolute', top: -5, right: -15, background: 'var(--bg-pink)', color: '#FFF',
              padding: '4px 12px', transform: 'rotate(12deg)', fontWeight: 900, fontSize: 14, borderRadius: '10px'
            }}>
              هدية! 🎁
            </div>
        </div>

        <h2 className="title-glitch" style={{ fontSize: 'clamp(24px, 8vw, 32px)', marginBottom: 4 }}>مكافأة يومية!</h2>
        <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', marginBottom: 20 }}>
          يوم رقم <span style={{ color: 'var(--bg-pink)', fontSize: 22 }}>{streak}</span> على التوالي
        </p>

        <div style={{
           display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center'
        }}>
          {STREAK_DAYS.map(d => (
            <div key={d} className="card" style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderWidth: 2,
              background: d <= streak ? 'var(--bg-green)' : '#FFF',
              color: d <= streak ? '#FFF' : 'var(--bg-dark-purple)',
              fontWeight: 900, fontSize: 14,
              borderRadius: '8px',
              transform: d === streak ? 'scale(1.15) rotate(-5deg)' : 'none',
              boxShadow: d === streak ? 'var(--brutal-shadow)' : 'none'
            }}>
              {d <= streak ? '✓' : d}
            </div>
          ))}
        </div>

        <div className="wizard-card card" style={{
          background: '#FFF', border: 'var(--brutal-border)',
          padding: '16px 24px', marginBottom: 24, fontWeight: 900, fontSize: 24,
          color: 'var(--bg-dark-purple)', borderRadius: '16px',
          boxShadow: 'var(--brutal-shadow)',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          +{bonus} <img src={streak === 7 ? treasureChestIcon : singleCoinIcon} style={{ width: 44, height: 44 }} />
        </div>

        <button 
          onClick={handleClaim} 
          className="btn btn-pink" 
          style={{ width: '100%', maxWidth: 280, padding: '16px', fontSize: 20, borderRadius: '16px' }}
        >
          استلمها الآن! 🐵
        </button>
      </div>
    </div>
  );
}
