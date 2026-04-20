import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import UserAvatar from '../components/ui/UserAvatar';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getMatchHistory } from '../firebase/stats';
import { getLevel, getLevelTitle, getLevelEmoji, getLevelProgress, xpForNextLevel } from '../utils/xp';
import { calcStreak, getStreakEmoji } from '../utils/retention';
import { ACHIEVEMENTS, getUnlockedAchievements } from '../utils/achievements';
import { claimAchievement } from '../firebase/achievements';
import EmptyState from '../components/shared/EmptyState';
import Toast from '../components/ui/Toast';

const MODE_LABELS = {
  monkey: { label: 'كلكس', emoji: '🐒', color: 'var(--neo-pink)' },
  draw: { label: 'ارسم وخمن', emoji: '🎨', color: 'var(--neo-yellow)' },
  survival: { label: 'البقاء', emoji: '💀', color: 'var(--neo-green)' },
  charades: { label: 'بدون كلام', emoji: '🎭', color: 'var(--neo-cyan)' },
};

export default function ProfileStatsScreen() {
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (userProfile?.uid) {
      getMatchHistory(userProfile.uid, 15)
        .then(setMatches)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [userProfile?.uid]);

  if (!userProfile) return null;

  const p = userProfile;
  const wins = p.wins || 0;
  const games = p.gamesPlayed || 0;
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
  const monkeyPlayed = p.monkeyPlayed || 0;
  const drawPlayed = p.drawPlayed || 0;
  const survivalPlayed = p.survivalPlayed || 0;
  const charadesPlayed = p.charadesPlayed || 0;
  const { streak } = calcStreak(p.lastLoginDate, p.loginStreak);
  const level = getLevel(p.xp || 0);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '5px solid #000', background: '#FFF' }}>
        <button onClick={nav.toHome} className="btn btn-white" style={{ padding: '6px 14px', fontSize: 13, fontWeight: 900, borderRadius: 0, border: '3px solid #000' }}>← رجوع</button>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>إحصائياتك 📊</div>
        <div style={{ width: 88 }} />
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Profile Header */}
        <div className="card" style={{ padding: 24, textAlign: 'center', borderRadius: 0, border: '4px solid #000', boxShadow: '8px 8px 0 var(--neo-cyan)' }}>
          <UserAvatar avatarId={p.avatarId ?? 0} size={84} style={{ margin: '0 auto 14px', border: '4px solid #000' }} />
          <div style={{ fontSize: 20, fontWeight: 900, color: '#000' }}>{p.username}</div>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#000', background: 'var(--neo-yellow)', display: 'inline-block', padding: '2px 10px', border: '2px solid #000', marginTop: 8 }}>
            {getLevelEmoji(p.xp ?? 0)} مستوى {level} — {getLevelTitle(level)}
          </div>
          <div style={{ width: '100%', height: 16, background: '#DDD', border: '3px solid #000', overflow: 'hidden', marginTop: 16, borderRadius: 0 }}>
            <div style={{ height: '100%', width: `${getLevelProgress(p.xp ?? 0)}%`, background: 'var(--neo-green)', borderRight: '3px solid #000' }} />
          </div>
          <div style={{ fontSize: 10, color: '#000', fontWeight: 900, marginTop: 6 }}>
            {p.xp ?? 0} / {xpForNextLevel(level)} نقطة خبرة
          </div>
        </div>

        {/* Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { val: games, label: 'مباريات', color: '#000' },
            { val: wins, label: 'فوز', color: 'var(--neo-pink)' },
            { val: `${winRate}%`, label: 'معدل', color: 'var(--neo-green)' },
            { val: p.coins || 0, label: 'عملات', color: 'var(--neo-yellow)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '12px 2px', textAlign: 'center', borderRadius: 0, border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 8, color: '#555', fontWeight: 900 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Streak & Extra */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="card" style={{ flex: 1, padding: '14px 10px', textAlign: 'center', borderRadius: 0, border: '3px solid #000', boxShadow: '4px 4px 0 var(--neo-pink)' }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>{getStreakEmoji(streak)}</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{streak}</div>
            <div style={{ fontSize: 9, color: '#555', fontWeight: 900 }}>يوم متتالي</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '14px 10px', textAlign: 'center', borderRadius: 0, border: '3px solid #000', boxShadow: '4px 4px 0 var(--neo-yellow)' }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>🎨</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{p.wins_draw || 0}</div>
            <div style={{ fontSize: 9, color: '#555', fontWeight: 900 }}>فوز بالرسم</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '14px 10px', textAlign: 'center', borderRadius: 0, border: '3px solid #000', boxShadow: '4px 4px 0 var(--neo-cyan)' }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>⚡</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{p.xp || 0}</div>
            <div style={{ fontSize: 9, color: '#555', fontWeight: 900 }}>مجموع XP</div>
          </div>
        </div>

        {/* Per-Mode */}
        <div style={{ fontSize: 13, fontWeight: 900, color: '#000', background: 'var(--neo-green)', display: 'inline-block', padding: '2px 8px', border: '2px solid #000', marginTop: 10 }}>إحصائيات الأوضاع</div>
        {Object.entries(MODE_LABELS).map(([mode, info]) => {
          const played = mode === 'monkey' ? monkeyPlayed : mode === 'draw' ? drawPlayed : mode === 'survival' ? survivalPlayed : charadesPlayed;
          const modeWins = mode === 'draw' ? (p.wins_draw || 0) : mode === 'survival' ? (p.wins_survival || 0) : mode === 'charades' ? (p.wins_charades || 0) : Math.max(0, wins - (p.wins_draw || 0) - (p.wins_survival || 0) - (p.wins_charades || 0));
          const rate = played > 0 ? Math.round((modeWins / played) * 100) : 0;

          return (
            <div key={mode} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, borderRadius: 0, border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}>
              <div style={{ width: 48, height: 48, borderRadius: 0, background: mode === 'monkey' ? 'var(--neo-pink)' : mode === 'draw' ? 'var(--neo-yellow)' : 'var(--neo-green)', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '2px 2px 0 #000' }}>
                {info.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>{info.label}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#000', fontWeight: 900 }}>{played} مباريات</span>
                  <span style={{ fontSize: 10, color: '#000', fontWeight: 900 }}>{modeWins} فوز</span>
                  <span style={{ fontSize: 10, color: '#000', fontWeight: 900 }}>{rate}% معدل</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Achievements */}
        <div style={{ fontSize: 13, fontWeight: 900, color: '#000', background: 'var(--neo-pink)', display: 'inline-block', padding: '2px 8px', border: '2px solid #000', marginTop: 10 }}>الإنجازات 🏅</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {ACHIEVEMENTS.map(a => {
            const unlocked = a.condition(p);
            const claimed = (p.claimedAchievements || []).includes(a.id);
            return (
              <div key={a.id} onClick={() => {
                if (unlocked && !claimed) {
                  claimAchievement(p.uid, a.id, a.reward)
                    .then(() => setToast(`+${a.reward} عملة! ${a.emoji}`))
                    .catch(e => setToast(e.message));
                }
              }} style={{
                padding: '12px 4px', textAlign: 'center', borderRadius: 0,
                background: claimed ? 'var(--neo-green)' : unlocked ? 'var(--neo-yellow)' : '#EEE',
                border: `3px solid #000`, cursor: unlocked && !claimed ? 'pointer' : 'default',
                opacity: unlocked ? 1 : 0.4, position: 'relative',
                boxShadow: unlocked && !claimed ? '3px 3px 0 #000' : 'none',
              }}>
                <div style={{ fontSize: 28 }}>{a.emoji}</div>
                <div style={{ fontSize: 8, fontWeight: 900, color: '#000', marginTop: 4 }}>{a.label}</div>
                {unlocked && !claimed && <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--neo-pink)', border: '1.5px solid #000', width: 14, height: 14, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>!</div>}
                {claimed && <div style={{ position: 'absolute', top: -4, right: -4, background: '#000', color: 'var(--neo-green)', width: 14, height: 14, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>✓</div>}
              </div>
            );
          })}
        </div>

        {/* Match History */}
        <div style={{ fontSize: 13, fontWeight: 900, color: '#000', background: 'var(--neo-cyan)', display: 'inline-block', padding: '2px 8px', border: '2px solid #000', marginTop: 10 }}>المباريات الأخيرة</div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><LoadingSpinner /></div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon="🎮"
            title="لا توجد مباريات مسجلة بعد"
            description="العب مباريات لتظهر هنا!"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map(m => {
              const info = MODE_LABELS[m.mode] || MODE_LABELS.monkey;
              const date = m.playedAt?.toDate?.() || new Date();
              const timeStr = date.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
              return (
                <div key={m.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 0, border: '3px solid #000', borderLeft: `8px solid ${m.won ? 'var(--neo-green)' : 'var(--neo-pink)'}` }}>
                  <span style={{ fontSize: 20 }}>{info.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#000' }}>
                      {info.label} — {m.won ? 'فوز ✅' : 'خسارة ❌'}
                    </div>
                    <div style={{ fontSize: 10, color: '#555', fontWeight: 900 }}>
                      {timeStr} • {m.players || '?'} لاعبين
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav active="settings" onNavigate={(key) => {
        if (key === 'home') nav.toHome();
        else if (key === 'leaderboard') nav.toLeaderboard();
      }} />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
