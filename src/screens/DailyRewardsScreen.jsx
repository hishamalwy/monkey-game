import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import {
  calcStreak,
  getTodayStr,
  getStreakEmoji,
  getDailyChallenges,
  getChallengeProgress,
  isChallengeClaimed,
  getWeeklyMissions,
  getWeeklyProgress,
  isWeeklyMissionClaimed,
} from '../utils/retention';
import { claimDailyBonus, claimChallenge } from '../firebase/retention';
import BottomNav from '../components/BottomNav';
import Toast from '../components/ui/Toast';
import singleCoinIcon from '../assets/icons/single_coin.png';
import coinsBundleIcon from '../assets/icons/coins_bundle.png';
import treasureChestIcon from '../assets/icons/treasure_chest.png';

export default function DailyRewardsScreen() {
  const { userProfile } = useAuth();
  const nav = useNavigation();

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
      setToast('تم استلام المكافأة! 🥥');
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
      overflow: 'hidden'
    }}>

      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none', zIndex: 1, backgroundImage: 'radial-gradient(#FFF 2px, transparent 2px)', backgroundSize: '30px 30px' }} />

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', borderBottom: '5px solid #000', position: 'relative', zIndex: 10, padding: '16px 20px', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <button onClick={() => nav.toHome()} className="btn btn-white" style={{ width: 40, height: 40, borderRadius: 0, fontSize: 20, border: '3px solid #000', padding: 0 }}>✕</button>
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#000' }}>المكافآت اليومية 🎁</h1>
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '12px 20px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative', zIndex: 5, width: '100%' }}>

        {/* Streak Card */}
        <div className="card slide-up" style={{ width: '100%', maxWidth: 360, padding: '12px 12px', background: '#FFF', borderRadius: 0, border: '4px solid #000', boxShadow: '8px 8px 0 var(--neo-pink)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px', direction: 'rtl' }}>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <h2 style={{ fontSize: 'clamp(18px, 5vw, 22px)', fontWeight: 900, color: '#000', margin: 0, lineHeight: 1.1 }}>{streak} أيام متتالية</h2>
              <p style={{ fontSize: 10, fontWeight: 900, color: '#000', background: 'var(--neo-yellow)', display: 'inline-block', padding: '1px 6px', border: '1.5px solid #000', marginTop: 4 }}>واصل للحصول على الصندوق الكبير 🔥</p>
            </div>
            <div style={{ fontSize: 'clamp(32px, 8vw, 42px)', backgroundColor: 'var(--neo-cyan)', border: '3px solid #000', padding: 4, width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0 #000', marginRight: 12 }}>{getStreakEmoji(streak)}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 8px', marginBottom: 20, direction: 'ltr' }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const isCurrent = d === streak;
              const isPast = d < streak;
              let icon = singleCoinIcon;
              if (d >= 4 && d <= 6) icon = coinsBundleIcon;
              if (d === 7) icon = treasureChestIcon;

              return (
                <div key={d} className="card pop" style={{ padding: '10px 2px', borderRadius: 0, background: isPast ? 'var(--neo-green)' : isCurrent ? 'var(--neo-yellow)' : '#FFF', color: '#000', border: isCurrent ? '3px solid #000' : '2px solid #000', transform: isCurrent ? 'translateY(-2px)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative', boxShadow: isCurrent ? '4px 4px 0 #000' : '2px 2px 0 #000', transition: 'none' }}>
                  <div style={{ fontSize: 9, fontWeight: 900 }}>يوم {d}</div>
                  <img src={icon} style={{ width: d === 7 ? 32 : 24, height: d === 7 ? 32 : 24, objectFit: 'contain' }} />
                  <div style={{ fontSize: 9, fontWeight: 900, color: '#000', display: 'flex', alignItems: 'center', gap: 2 }}>{d * 50}</div>
                  {isPast && (
                    <div style={{ position: 'absolute', top: -3, right: -3, background: '#000', color: 'var(--neo-green)', width: 16, height: 16, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: '1.5px solid #000', zIndex: 10 }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>

          {(isNewDay && !claimedToday) ? (
            <button onClick={handleClaim} disabled={claiming} className="btn btn-yellow pop" style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 900, borderRadius: 0, border: '4px solid #000', boxShadow: '6px 6px 0 #000' }}>
              {claiming ? 'جاري المعالجة...' : 'استلم المكافأة 🎁'}
            </button>
          ) : (
            <div style={{ padding: 16, background: 'var(--neo-green)', color: '#000', borderRadius: 0, fontWeight: 900, border: '4px solid #000', fontSize: 14, textAlign: 'center', boxShadow: '4px 4px 0 #000' }}>
              تم استلام مكافأة اليوم ✅
            </div>
          )}
        </div>

        {/* Challenges */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, direction: 'rtl', padding: '0 12px' }}>
            <div style={{ background: 'var(--neo-pink)', width: 44, height: 44, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #000', fontSize: 24, boxShadow: '4px 4px 0 #000' }}>🎯</div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#000' }}>تحديات اليوم</h3>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {challenges.map((_, idx) => (
                <div key={idx} style={{ width: activeChallengeIndex === idx ? 24 : 10, height: 10, background: activeChallengeIndex === idx ? 'var(--neo-cyan)' : '#DDD', border: '2px solid #000', transition: 'none' }} />
              ))}
            </div>
          </div>

          <div className="card slide-up" style={{ padding: '16px', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', borderRadius: 0, background: '#FFF', border: '5px solid #000', boxShadow: '8px 8px 0 var(--neo-cyan)' }}>
            {(() => {
              const ch = challenges[activeChallengeIndex];
              if (!ch) return null;
              const progress = getChallengeProgress(ch, userProfile);
              const complete = progress >= ch.target;
              const claimed = isChallengeClaimed(ch, userProfile);
              const pct = Math.min(100, (progress / ch.target) * 100);
              return (
                <div key={ch.id} style={{ transition: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, direction: 'rtl' }}>
                    <div style={{ fontSize: 32, width: 64, height: 64, background: 'var(--neo-cyan)', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}>{ch.emoji}</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>{ch.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#000', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        المكافأة: {ch.reward} <img src={singleCoinIcon} style={{ width: 18, height: 18 }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, direction: 'rtl', fontWeight: 900, fontSize: 11 }}>
                      <span>التقدم:</span>
                      <span>{progress} / {ch.target}</span>
                    </div>
                    <div style={{ width: '100%', height: 20, background: '#DDD', border: '3px solid #000', borderRadius: 0, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: complete ? 'var(--neo-green)' : 'var(--neo-pink)', transition: 'none', borderRight: pct > 0 ? '3px solid #000' : 'none' }} />
                    </div>
                  </div>

                  <div>
                    {claimed ? (
                      <div className="btn btn-white" style={{ width: '100%', padding: 12, opacity: 0.7, borderRadius: 0, border: '3px solid #000', background: '#EEE', fontSize: 14, fontWeight: 900 }}>تم الاستلام ✅</div>
                    ) : complete ? (
                      <button onClick={() => handleClaimChallenge(ch)} className="btn btn-green pop" style={{ width: '100%', padding: 14, borderRadius: 0, border: '4px solid #000', fontSize: 15, fontWeight: 900, boxShadow: '4px 4px 0 #000' }}>استلم المكافأة 🔥</button>
                    ) : (
                      <button disabled className="btn btn-white" style={{ width: '100%', padding: 12, opacity: 0.6, borderRadius: 0, border: '3px solid #000', fontSize: 13, fontWeight: 900 }}>التحدي جارٍ 🐒</button>
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => setActiveChallengeIndex(i => (i - 1 + challenges.length) % challenges.length)} className="btn btn-white" style={{ flex: 1, padding: '10px', borderRadius: 0, border: '3px solid #000', fontSize: 14, fontWeight: 900, boxShadow: '3px 3px 0 #000' }}>
                السابق
              </button>
              <button onClick={() => setActiveChallengeIndex(i => (i + 1) % challenges.length)} className="btn btn-yellow" style={{ flex: 1, padding: '10px', borderRadius: 0, border: '3px solid #000', fontSize: 14, fontWeight: 900, boxShadow: '3px 3px 0 #000' }}>
                التالي
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Missions */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, direction: 'rtl', padding: '0 12px' }}>
            <div style={{ background: 'var(--neo-yellow)', width: 44, height: 44, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #000', fontSize: 24, boxShadow: '4px 4px 0 #000' }}>🗓️</div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#000' }}>مهام الأسبوع</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {getWeeklyMissions(todayStr).map(mission => {
              const progress = getWeeklyProgress(mission, userProfile);
              const complete = progress >= mission.target;
              const claimed = isWeeklyMissionClaimed(mission, userProfile);
              const pct = Math.min(100, (progress / mission.target) * 100);
              return (
                <div key={mission.id} className="card" style={{ padding: '14px 16px', borderRadius: 0, background: claimed ? '#EEE' : '#FFF', border: `3px solid #000`, boxShadow: '4px 4px 0 var(--neo-yellow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl' }}>
                    <div style={{ fontSize: 28, width: 48, height: 48, background: claimed ? '#DDD' : 'var(--neo-yellow)', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #000' }}>{mission.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>{mission.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <div style={{ flex: 1, height: 12, background: '#DDD', border: '2px solid #000', borderRadius: 0, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: complete ? 'var(--neo-green)' : 'var(--neo-pink)', transition: 'none' }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#000' }}>{progress}/{mission.target}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: '#000', background: '#FFF', padding: '4px 8px', border: '2px solid #000', whiteSpace: 'nowrap' }}>+{mission.reward} 🪙</div>
                  </div>
                  {claimed && <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, fontWeight: 900, color: 'var(--neo-green)' }}>تم الاستلام ✅</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip */}
        <div className="card" style={{ padding: '14px 16px', width: '100%', maxWidth: 360, borderRadius: 0, background: 'var(--neo-green)', color: '#000', border: '4px solid #000', boxShadow: '6px 6px 0 var(--neo-yellow)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 28 }}>💡</div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 900, textAlign: 'right', direction: 'rtl', lineHeight: 1.3 }}>
            نصيحة: العب 7 أيام متتالية للحصول على صندوق الكنز الكبير 🔥
          </p>
        </div>

      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <BottomNav active="home" onNavigate={(key) => {
        if (key === 'home') nav.toHome();
        else if (key === 'settings') nav.toSettings();
        else if (key === 'store') nav.toStore();
        else if (key === 'leaderboard') nav.toLeaderboard();
      }} />
    </div>
  );
}
