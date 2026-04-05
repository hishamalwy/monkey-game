import { getStreakEmoji } from '../../utils/retention';
import { useNavigate } from 'react-router-dom';
import singleCoinIcon from '../../assets/icons/single_coin.png';
import treasureChestIcon from '../../assets/icons/treasure_chest.png';

const STREAK_DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function DailyBonusModal({ streak, bonus, onClaim }) {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'var(--bg-yellow)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
    }}>
      <div style={{ padding: '40px 24px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        <div style={{ position: 'relative', marginBottom: 30 }}>
            <div className="wizard-card" style={{ fontSize: 120, filter: 'drop-shadow(6px 6px 0 var(--bg-dark-purple))' }}>
              {getStreakEmoji(streak)}
            </div>
            <div className="card-rainbow" style={{
              position: 'absolute', top: -10, right: -20, background: 'var(--bg-pink)', color: '#FFF',
              padding: '6px 16px', transform: 'rotate(12deg)', fontWeight: 950, fontSize: 18, borderRadius: '12px'
            }}>
              هدية! 🎁
            </div>
        </div>

        <h2 className="title-glitch" style={{ fontSize: 40, marginBottom: 8 }}>مكافأة يومية!</h2>
        <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--bg-dark-purple)', marginBottom: 32 }}>
          يوم رقم <span style={{ color: 'var(--bg-pink)', fontSize: 28 }}>{streak}</span> على التوالي
        </p>

        <div style={{
           display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center'
        }}>
          {STREAK_DAYS.map(d => (
            <div key={d} className="card" style={{
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderWidth: 3,
              background: d <= streak ? 'var(--bg-green)' : '#FFF',
              color: d <= streak ? '#FFF' : 'var(--bg-dark-purple)',
              fontWeight: 950, fontSize: 16,
              borderRadius: '10px',
              transform: d === streak ? 'scale(1.2) rotate(-5deg)' : 'none',
              boxShadow: d === streak ? 'var(--brutal-shadow)' : 'none'
            }}>
              {d <= streak ? '✓' : d}
            </div>
          ))}
        </div>

        <div className="wizard-card card" style={{
          background: '#FFF', border: 'var(--brutal-border)',
          padding: '24px 40px', marginBottom: 40, fontWeight: 950, fontSize: 32,
          color: 'var(--bg-dark-purple)', borderRadius: '20px',
          boxShadow: 'var(--brutal-shadow)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          +{bonus} <img src={streak === 7 ? treasureChestIcon : singleCoinIcon} style={{ width: 54, height: 54 }} />
        </div>

        <button 
          onClick={onClaim} 
          className="btn btn-pink" 
          style={{ width: '100%', maxWidth: 300, padding: '20px', fontSize: 22, borderRadius: '20px' }}
        >
          استلمها الآن! 🐵
        </button>
      </div>
    </div>
  );
}
