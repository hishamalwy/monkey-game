import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import {
  calcStreak,
  getTodayStr,
  getStreakEmoji,
  getDailyChallenges,
  getChallengeProgress,
  isChallengeClaimed
} from '../utils/retention';
import { claimDailyBonus, claimChallenge } from '../firebase/retention';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Toast from '../components/ui/Toast';
import singleCoinIcon from '../assets/icons/single_coin.png';
import coinsBundleIcon from '../assets/icons/coins_bundle.png';
import treasureChestIcon from '../assets/icons/treasure_chest.png';

export default function DailyRewardsScreen() {
  const { userProfile } = useAuth();
  const nav = useNavigation();
  const navigate = useNavigate();

  const [claiming, setClaiming] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0);
  const [toast, setToast] = useState('');

  const { streak, isNewDay } = calcStreak(
    userProfile?.lastLoginDate,
    userProfile?.loginStreak
  );

  const todayStr = getTodayStr();
  const challenges = getDailyChallenges(todayStr);

  const handleClaim = async () => {
    if (!userProfile || claiming) return;
    setClaiming(true);
    try {
      await claimDailyBonus(userProfile.uid, userProfile);
      setClaimedToday(true);
      setToast('تم استلام الهدية! 🥥');
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimChallenge = async (challenge) => {
    try {
      await claimChallenge(userProfile.uid, challenge, userProfile);
      setToast(`+${challenge.reward} عملة! 💎`);
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    }
  };

  return (
    <div className="brutal-bg" style={{ 
      width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', 
      overflow: 'hidden', background: 'var(--bg-dark-purple)' 
    }}>
      
      {/* Dynamic Background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none', zIndex: 1, backgroundImage: 'radial-gradient(#FFF 2px, transparent 2px)', backgroundSize: '30px 30px' }} />

      {/* Header */}
      <div className="top-nav-brutal" style={{ 
        background: 'var(--bg-yellow)', borderBottom: '5px solid var(--bg-dark-purple)', 
        position: 'relative', zIndex: 10, padding: '16px 20px', justifyContent: 'center'
      }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <button onClick={() => nav.toHome()} className="btn btn-white" style={{ width: 40, height: 40, borderRadius: '12px', fontSize: 20 }}>✕</button>
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 950, color: 'var(--bg-dark-purple)', textShadow: '2px 2px 0 #FFF' }}>مركز الهدايا 🎁</h1>
      </div>

      <div className="content-with-nav" style={{ 
        flex: 1, overflowY: 'auto', padding: '24px 16px env(safe-area-inset-bottom)', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, 
        position: 'relative', zIndex: 5 
      }}>
        
        {/* Streak Dashboard */}
        <div className="card slide-up" style={{ 
          width: '100%', maxWidth: 410, padding: '24px 16px', background: '#FFF', 
          borderRadius: '28px', border: '5.5px solid var(--bg-dark-purple)', 
          boxShadow: '10px 10px 0 var(--bg-pink)', position: 'relative'
        }}>
          {/* Subtle bg monkey removed for clarity if it was occluding text */}
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px' }}>
            <div style={{ flex: 1, textAlign: 'right', direction: 'rtl' }}>
              <h2 style={{ fontSize: 'clamp(22px, 6vw, 28px)', fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0, lineHeight: 1.1 }}>ستريك {streak} أيام</h2>
              <p style={{ fontSize: 12, fontWeight: 900, color: 'var(--bg-pink)', margin: '4px 0 0' }}>استمر كل يوم للجائزة الكبرى! 🔥</p>
            </div>
            <div style={{ fontSize: 'clamp(40px, 10vw, 54px)', marginRight: 12 }}>{getStreakEmoji(streak)}</div>
          </div>
          
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 8px', marginBottom: 26,
            direction: 'rtl' 
          }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const isCurrent = d === streak;
              const isPast = d < streak;
              let icon = singleCoinIcon;
              if (d >= 4 && d <= 6) icon = coinsBundleIcon;
              if (d === 7) icon = treasureChestIcon;

              return (
                <div key={d} className="card pop" style={{ 
                  padding: '12px 4px', borderRadius: '18px', 
                  background: isPast ? 'var(--bg-green)' : isCurrent ? 'var(--bg-yellow)' : '#F5F5FF', 
                  color: 'var(--bg-dark-purple)', 
                  border: isCurrent ? '4.5px solid var(--bg-dark-purple)' : '3.5px solid var(--bg-dark-purple)', 
                  boxShadow: isCurrent ? '0px 0px 12px rgba(255,227,0,0.4)' : 'none', 
                  transform: isCurrent ? 'scale(1.08) rotate(-2deg)' : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  position: 'relative'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.8 }}>ي {d}</div>
                  <img src={icon} style={{ width: d === 7 ? 38 : 28, height: d === 7 ? 38 : 28, objectFit: 'contain' }} />
                  <div style={{ fontSize: 10, fontWeight: 950, color: isCurrent || isPast ? 'var(--bg-dark-purple)' : '#999', display: 'flex', alignItems: 'center', gap: 2 }}>
                    {d * 50} <img src={singleCoinIcon} style={{ width: 12, height: 12 }} />
                  </div>
                  {isPast && (
                    <div style={{ 
                      position: 'absolute', top: -6, right: -6, background: 'var(--bg-dark-purple)', 
                      color: '#FFF', width: 20, height: 20, borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                      border: '2px solid #FFF', zIndex: 10
                    }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>

          {(isNewDay && !claimedToday) ? (
            <button 
              onClick={handleClaim} 
              disabled={claiming} 
              className="btn btn-yellow pop" 
              style={{ width: '100%', padding: '20px', fontSize: 20, borderRadius: '18px', boxShadow: '5px 5px 0 var(--bg-dark-purple)' }}
            >
              {claiming ? 'جاري الاستلام...' : 'استلم هديتك الآن! 🎁'}
            </button>
          ) : (
            <div style={{ 
              padding: 20, background: 'var(--bg-green)', color: '#FFF', 
              borderRadius: '18px', fontWeight: 950, border: '4px solid var(--bg-dark-purple)', 
              fontSize: 18, textAlign: 'center', boxShadow: '4px 4px 0 var(--bg-dark-purple)' 
            }}>
               تم استلام هدية اليوم! ✅
            </div>
          )}
        </div>

        {/* Challenges Section */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, direction: 'rtl', padding: '0 8px' }}>
            <div style={{ background: 'var(--bg-pink)', width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg-dark-purple)', fontSize: 24 }}>🎯</div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: '#FFF' }}>تحديات يومية</h3>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {challenges.map((_, idx) => (
                <div key={idx} style={{ width: activeChallengeIndex === idx ? 20 : 8, height: 8, background: activeChallengeIndex === idx ? 'var(--bg-yellow)' : 'rgba(255,255,255,0.2)', borderRadius: 4, transition: 'all 0.3s ease' }} />
              ))}
            </div>
          </div>

          <div className="card slide-up" style={{ 
            padding: '24px', minHeight: 220, display: 'flex', flexDirection: 'column', 
            justifyContent: 'center', position: 'relative', borderRadius: '28px', 
            background: '#FFF', border: '5px solid var(--bg-dark-purple)', 
            boxShadow: '8px 8px 0 var(--bg-blue)' 
          }}>
            {(() => {
              const ch = challenges[activeChallengeIndex];
              if (!ch) return null;
              const progress = getChallengeProgress(ch, userProfile);
              const complete = progress >= ch.target;
              const claimed = isChallengeClaimed(ch, userProfile);
              const pct = Math.min(100, (progress / ch.target) * 100);
              return (
                <div key={ch.id} style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, direction: 'rtl' }}>
                    <div style={{ 
                      fontSize: 40, width: 75, height: 75, background: 'var(--bg-blue)', 
                      borderRadius: '18px', display: 'flex', alignItems: 'center', 
                      justifyContent: 'center', border: '4px solid var(--bg-dark-purple)', 
                      boxShadow: '4px 4px 0 var(--bg-dark-purple)' 
                    }}>{ch.emoji}</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 950, color: 'var(--bg-dark-purple)', lineHeight: 1.2 }}>{ch.label}</div>
                      <div style={{ 
                        fontSize: 14, fontWeight: 950, color: 'var(--bg-pink)', 
                        marginTop: 6, display: 'flex', alignItems: 'center', 
                        justifyContent: 'flex-end', gap: 6 
                      }}>
                        الجائزة: {ch.reward} <img src={singleCoinIcon} style={{ width: 18, height: 18 }} />
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 25 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, direction: 'rtl', fontWeight: 950, fontSize: 13 }}>
                        <span>الإنجاز:</span>
                        <span>{progress} / {ch.target}</span>
                    </div>
                    <div style={{ width: '100%', height: 20, background: '#F0F0F0', border: '3.5px solid var(--bg-dark-purple)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', width: `${pct}%`, 
                        background: complete ? 'var(--bg-green)' : 'var(--bg-pink)', 
                        transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
                      }} />
                    </div>
                  </div>

                  <div>
                    {claimed ? (
                      <div className="btn btn-white" style={{ width: '100%', padding: 16, opacity: 0.7, borderRadius: '16px', background: '#EEE' }}>تم الاستلام ✅</div>
                    ) : complete ? (
                      <button onClick={() => handleClaimChallenge(ch)} className="btn btn-green pop" style={{ width: '100%', padding: 16, borderRadius: '16px', fontSize: 18, boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>استلم المكافأة! 🔥</button>
                    ) : (
                      <button disabled className="btn btn-white" style={{ width: '100%', padding: 16, opacity: 0.5, borderRadius: '16px', fontSize: 16 }}>العب وجرب حظك! 🐒</button>
                    )}
                  </div>
                </div>
              );
            })()}
            {/* Nav Controls Inside Card */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button 
                onClick={() => setActiveChallengeIndex(i => (i - 1 + challenges.length) % challenges.length)} 
                className="btn btn-yellow" 
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: 18 }}
              >
                السابق
              </button>
              <button 
                onClick={() => setActiveChallengeIndex(i => (i + 1) % challenges.length)} 
                className="btn btn-yellow" 
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: 18 }}
              >
                التالي
              </button>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="card" style={{ 
          padding: '16px 20px', width: '100%', maxWidth: 400, borderRadius: '24px', 
          background: 'var(--bg-green)', color: 'var(--bg-dark-purple)', 
          border: '4px solid var(--bg-dark-purple)', boxShadow: '5px 5px 0 var(--bg-yellow)',
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20
        }}>
           <div style={{ fontSize: 32 }}>💡</div>
           <p style={{ margin: 0, fontSize: 14, fontWeight: 950, textAlign: 'right', direction: 'rtl', lineHeight: 1.4 }}>
             اليوم السابع فيه **صندوق الكنز** جايزة كبرى! اوعى تفوت الستريك بتاعك 🔥
           </p>
        </div>

      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <BottomNav active="home" onNavigate={(key) => { if (key === 'home') nav.toHome(); else if (key === 'settings') nav.toSettings(); else if (key === 'store') nav.toStore(); else if (key === 'leaderboard') nav.toLeaderboard(); }} />
    </div>
  );
}