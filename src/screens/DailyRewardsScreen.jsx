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
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimChallenge = async (challenge) => {
    try {
      await claimChallenge(userProfile.uid, challenge, userProfile);
      setToast(`+${challenge.reward} 🪙`);
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    }
  };

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Background Decor */}
      <div className="bg-stickers">
        <div style={{ position: 'absolute', top: '15%', left: '5%', fontSize: 32, transform: 'rotate(-15deg)' }}>🎁</div>
        <div style={{ position: 'absolute', top: '40%', right: '8%', fontSize: 36, transform: 'rotate(12deg)' }}>🎯</div>
        <div style={{ position: 'absolute', bottom: '25%', left: '10%', fontSize: 28, transform: 'rotate(10deg)' }}>🔥</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', position: 'relative', zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>مركز المكافآت</h1>
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative', zIndex: 5 }}>
        
        {/* Daily Streak Card */}
        <div className="card" style={{ width: '100%', maxWidth: 400, padding: '24px', background: '#FFF', borderRadius: 'var(--brutal-radius-lg)', border: '4px solid var(--bg-dark-purple)', boxShadow: '8px 8px 0 var(--bg-dark-purple)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{getStreakEmoji(streak)}</div>
          <h2 style={{ fontSize: 24, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: '0 0 4px' }}>ستريك {streak} أيام! 🔥</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '24px 0' }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const isCurrent = d === streak;
              const isPast = d < streak;
              return (
                <div key={d} className="card" style={{ padding: '12px 4px', borderRadius: '12px', background: isPast ? 'var(--bg-green)' : isCurrent ? 'var(--bg-pink)' : '#F3F4F6', color: (isPast || isCurrent) ? '#FFF' : 'var(--bg-dark-purple)', border: '3px solid var(--bg-dark-purple)', boxShadow: isCurrent ? '4px 4px 0 var(--bg-dark-purple)' : 'none', transform: isCurrent ? 'scale(1.1) rotate(-3deg)' : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 950 }}>يوم {d}</div>
                  <div style={{ fontSize: 16 }}>{isPast ? '✅' : '🪙'}</div>
                </div>
              );
            })}
             <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: streak >= 7 ? 'var(--bg-blue)' : '#EEE', color: (streak >= 7) ? '#FFF' : '#AAA', borderRadius: '12px', border: '3px solid var(--bg-dark-purple)' }}>
               <span style={{ fontSize: 20 }}>🎁</span>
             </div>
          </div>

          {(isNewDay && !claimedToday) ? (
            <button onClick={handleClaim} disabled={claiming} className="btn btn-pink" style={{ width: '100%', padding: '18px', fontSize: 18, borderRadius: '16px' }}>
              {claiming ? '...' : 'استلم هدية اليوم! 🪙'}
            </button>
          ) : (
            <div style={{ padding: 18, background: 'var(--bg-green)', color: 'var(--bg-dark-purple)', borderRadius: '16px', fontWeight: 950, border: '3px solid var(--bg-dark-purple)', fontSize: 16 }}>تم استلام هدية اليوم! ✅</div>
          )}
        </div>

        {/* Challenges Wizard */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, direction: 'rtl' }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>تحديات اليوم</h3>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {challenges.map((_, idx) => (
                <div key={idx} style={{ width: activeChallengeIndex === idx ? 16 : 6, height: 6, background: activeChallengeIndex === idx ? 'var(--bg-pink)' : 'rgba(28,16,64,0.2)', borderRadius: 3, transition: 'all 0.3s ease' }} />
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '24px', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', borderRadius: '24px', background: '#FFF', border: '4px solid var(--bg-dark-purple)', boxShadow: '8px 8px 0 var(--bg-dark-purple)' }}>
            {(() => {
              const ch = challenges[activeChallengeIndex];
              if (!ch) return null;
              const progress = getChallengeProgress(ch, userProfile);
              const complete = progress >= ch.target;
              const claimed = isChallengeClaimed(ch, userProfile);
              const pct = Math.min(100, (progress / ch.target) * 100);
              return (
                <div key={ch.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, direction: 'rtl' }}>
                    <div style={{ fontSize: 32, width: 64, height: 64, background: 'var(--bg-blue)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg-dark-purple)', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>{ch.emoji}</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>{ch.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--bg-pink)', marginTop: 4 }}>الجائزة: {ch.reward} 🪙</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 16, background: '#F0F0F0', border: '3px solid var(--bg-dark-purple)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: complete ? 'var(--bg-green)' : 'var(--bg-pink)', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 950, minWidth: 44 }}>{progress}/{ch.target}</div>
                  </div>
                  <div style={{ marginTop: 24 }}>
                    {claimed ? <div className="btn btn-white" style={{ width: '100%', padding: 14, opacity: 0.7, borderRadius: '14px' }}>تم الاستلام ✅</div> : complete ? <button onClick={() => handleClaimChallenge(ch)} className="btn btn-green" style={{ width: '100%', padding: 14, borderRadius: '14px' }}>استلم المكافأة! 🪙</button> : <button disabled className="btn btn-white" style={{ width: '100%', padding: 14, opacity: 0.5, borderRadius: '14px' }}>خلص المهمة 🐒</button>}
                  </div>
                </div>
              );
            })()}
            <button onClick={() => setActiveChallengeIndex(i => (i - 1 + challenges.length) % challenges.length)} style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, padding: 0 }} className="btn btn-yellow">←</button>
            <button onClick={() => setActiveChallengeIndex(i => (i + 1) % challenges.length)} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, padding: 0 }} className="btn btn-yellow">→</button>
          </div>
        </div>

        {/* Global Strategy Box */}
        <div className="card" style={{ padding: '20px', width: '100%', maxWidth: 400, borderRadius: '20px', background: 'var(--bg-dark-purple)', color: '#FFF', border: 'none' }}>
           <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 950, color: '#FFE300' }}>قواعد المكافآت 💡</h3>
           <ul style={{ margin: 0, paddingRight: 20, fontSize: 14, fontWeight: 800, textAlign: 'right', direction: 'rtl', lineHeight: 1.6 }}>
             <li>ادخل كل يوم عشان ستريكك ميروحش 🔥</li>
             <li>خلص المهام عشان تجمع عملات بسرعة 🪙</li>
             <li>اليوم السابع فيه جايزة كبرى مستنياك! 🏆</li>
           </ul>
        </div>

      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <BottomNav active="home" onNavigate={(key) => { if (key === 'home') nav.toHome(); else if (key === 'settings') nav.toSettings(); else if (key === 'store') nav.toStore(); else if (key === 'leaderboard') nav.toLeaderboard(); }} />
    </div>
  );
}