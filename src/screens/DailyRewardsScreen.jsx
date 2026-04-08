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
        flex: 1, overflowY: 'auto', padding: '12px 20px calc(24px + env(safe-area-inset-bottom))', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, 
        position: 'relative', zIndex: 5, width: '100%'
      }}>
        
        {/* Streak Dashboard */}
        <div className="card slide-up" style={{ 
          width: '100%', maxWidth: 360, padding: '12px 12px', background: '#FFF', 
          borderRadius: '20px', border: '4px solid var(--bg-dark-purple)', 
          boxShadow: '6px 6px 0 var(--bg-pink)', position: 'relative'
        }}>
          {/* Subtle bg monkey removed for clarity if it was occluding text */}
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
            <div style={{ flex: 1, textAlign: 'right', direction: 'rtl' }}>
              <h2 style={{ fontSize: 'clamp(20px, 5.5vw, 24px)', fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0, lineHeight: 1.1 }}>ستريك {streak} أيام</h2>
              <p style={{ fontSize: 11, fontWeight: 900, color: 'var(--bg-pink)', margin: '2px 0 0' }}>استمر للجائزة الكبرى! 🔥</p>
            </div>
            <div style={{ fontSize: 'clamp(36px, 9vw, 48px)', marginRight: 12 }}>{getStreakEmoji(streak)}</div>
          </div>
          
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 4px', marginBottom: 16,
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
                  padding: '8px 2px', borderRadius: '12px', 
                  background: isPast ? 'var(--bg-green)' : isCurrent ? 'var(--bg-yellow)' : '#F5F5FF', 
                  color: 'var(--bg-dark-purple)', 
                  border: isCurrent ? '3px solid var(--bg-dark-purple)' : '2.5px solid var(--bg-dark-purple)', 
                  transform: isCurrent ? 'scale(1.05) rotate(-2deg)' : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  position: 'relative'
                }}>
                  <div style={{ fontSize: 9, fontWeight: 950, opacity: 0.8 }}>ي {d}</div>
                  <img src={icon} style={{ width: d === 7 ? 28 : 20, height: d === 7 ? 28 : 20, objectFit: 'contain' }} />
                  <div style={{ fontSize: 9, fontWeight: 950, color: isCurrent || isPast ? 'var(--bg-dark-purple)' : '#999', display: 'flex', alignItems: 'center', gap: 2 }}>
                    {d * 50}
                  </div>
                  {isPast && (
                    <div style={{ 
                      position: 'absolute', top: -4, right: -4, background: 'var(--bg-dark-purple)', 
                      color: '#FFF', width: 14, height: 14, borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8,
                      border: '1.5px solid #FFF', zIndex: 10
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
              style={{ width: '100%', padding: '14px', fontSize: 16, borderRadius: '14px', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}
            >
              {claiming ? 'جاري الاستلام...' : 'استلم هديتك! 🎁'}
            </button>
          ) : (
            <div style={{ 
              padding: 14, background: 'var(--bg-green)', color: '#FFF', 
              borderRadius: '14px', fontWeight: 950, border: '3px solid var(--bg-dark-purple)', 
              fontSize: 14, textAlign: 'center', boxShadow: '3px 3px 0 var(--bg-dark-purple)' 
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
            padding: '12px', minHeight: 160, display: 'flex', flexDirection: 'column', 
            justifyContent: 'center', position: 'relative', borderRadius: '20px', 
            background: '#FFF', border: '4px solid var(--bg-dark-purple)', 
            boxShadow: '5px 5px 0 var(--bg-blue)' 
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, direction: 'rtl' }}>
                    <div style={{ 
                      fontSize: 32, width: 60, height: 60, background: 'var(--bg-blue)', 
                      borderRadius: '16px', display: 'flex', alignItems: 'center', 
                      justifyContent: 'center', border: '3px solid var(--bg-dark-purple)', 
                      boxShadow: '3px 3px 0 var(--bg-dark-purple)' 
                    }}>{ch.emoji}</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--bg-dark-purple)', lineHeight: 1.2 }}>{ch.label}</div>
                      <div style={{ 
                        fontSize: 13, fontWeight: 950, color: 'var(--bg-pink)', 
                        marginTop: 4, display: 'flex', alignItems: 'center', 
                        justifyContent: 'flex-end', gap: 4 
                      }}>
                        الجائزة: {ch.reward} <img src={singleCoinIcon} style={{ width: 16, height: 16 }} />
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, direction: 'rtl', fontWeight: 950, fontSize: 12 }}>
                        <span>الإنجاز:</span>
                        <span>{progress} / {ch.target}</span>
                    </div>
                    <div style={{ width: '100%', height: 16, background: '#F0F0F0', border: '3px solid var(--bg-dark-purple)', borderRadius: 10, overflow: 'hidden' }}>
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
                      <div className="btn btn-white" style={{ width: '100%', padding: 12, opacity: 0.7, borderRadius: '12px', background: '#EEE', fontSize: 14 }}>تم الاستلام ✅</div>
                    ) : complete ? (
                      <button onClick={() => handleClaimChallenge(ch)} className="btn btn-green pop" style={{ width: '100%', padding: 12, borderRadius: '12px', fontSize: 16, boxShadow: '3px 3px 0 var(--bg-dark-purple)' }}>استلم المكافأة! 🔥</button>
                    ) : (
                      <button disabled className="btn btn-white" style={{ width: '100%', padding: 12, opacity: 0.5, borderRadius: '12px', fontSize: 14 }}>العب وجرب حظك! 🐒</button>
                    )}
                  </div>
                </div>
              );
            })()}
            {/* Nav Controls Inside Card */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button 
                onClick={() => setActiveChallengeIndex(i => (i - 1 + challenges.length) % challenges.length)} 
                className="btn btn-yellow" 
                style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: 16 }}
              >
                السابق
              </button>
              <button 
                onClick={() => setActiveChallengeIndex(i => (i + 1) % challenges.length)} 
                className="btn btn-yellow" 
                style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: 16 }}
              >
                التالي
              </button>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="card" style={{ 
          padding: '12px 16px', width: '100%', maxWidth: 360, borderRadius: '18px', 
          background: 'var(--bg-green)', color: 'var(--bg-dark-purple)', 
          border: '3px solid var(--bg-dark-purple)', boxShadow: '4px 4px 0 var(--bg-yellow)',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14
        }}>
           <div style={{ fontSize: 24 }}>💡</div>
           <p style={{ margin: 0, fontSize: 12, fontWeight: 950, textAlign: 'right', direction: 'rtl', lineHeight: 1.3 }}>
             اليوم السابع فيه **صندوق كنز**! اوعى تفوت الستريك 🔥
           </p>
        </div>

      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <BottomNav active="home" onNavigate={(key) => { if (key === 'home') nav.toHome(); else if (key === 'settings') nav.toSettings(); else if (key === 'store') nav.toStore(); else if (key === 'leaderboard') nav.toLeaderboard(); }} />
    </div>
  );
}