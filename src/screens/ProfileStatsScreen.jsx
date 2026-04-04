import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import UserAvatar from '../components/ui/UserAvatar';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getMatchHistory } from '../firebase/stats';
import { getLevel, getLevelTitle, getLevelEmoji, getLevelProgress, xpForNextLevel } from '../utils/xp';
import { calcStreak, getStreakEmoji } from '../utils/retention';

const MODE_LABELS = {
  monkey: { label: 'كلكس!', emoji: '🐒', color: 'var(--bg-pink)' },
  draw: { label: 'رسم وتخمين', emoji: '🎨', color: 'var(--bg-yellow)' },
  survival: { label: 'سيرفايفر', emoji: '💀', color: 'var(--bg-green)' },
};

export default function ProfileStatsScreen() {
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const { streak } = calcStreak(p.lastLoginDate, p.loginStreak);
  const level = getLevel(p.xp || 0);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '4px solid var(--bg-dark-purple)', background: 'var(--bg-yellow)',
      }}>
        <button onClick={nav.toHome} className="btn btn-dark" style={{ padding: '6px 14px', fontSize: 13 }}>← رجوع</button>
        <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>الملف الشخصي 📊</div>
        <div style={{ width: 60 }} />
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Profile Header */}
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <UserAvatar avatarId={p.avatarId ?? 0} size={80} style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 20, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>{p.username}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--bg-pink)', marginTop: 4 }}>
            {getLevelEmoji(p.xp ?? 0)} لفل {level} — {getLevelTitle(level)}
          </div>
          <div style={{ width: '100%', height: 10, background: '#E5E7EB', border: '2px solid var(--bg-dark-purple)', overflow: 'hidden', marginTop: 12 }}>
            <div style={{ height: '100%', width: `${getLevelProgress(p.xp ?? 0)}%`, background: 'var(--bg-green)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 700, marginTop: 4 }}>
            {p.xp ?? 0} / {xpForNextLevel(level)} XP
          </div>
        </div>

        {/* Overview Stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { val: games, label: 'مباريات', color: 'var(--bg-dark-purple)' },
            { val: wins, label: 'انتصارات', color: 'var(--bg-pink)' },
            { val: `${winRate}%`, label: 'نسبة الفوز', color: 'var(--bg-green)' },
            { val: p.coins || 0, label: 'عملة', color: 'var(--bg-yellow)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 950, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Streak & Rank */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="card" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{getStreakEmoji(streak)}</div>
            <div style={{ fontSize: 18, fontWeight: 950 }}>{streak}</div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800 }}>ستريك أيام</div>
          </div>
          <div className="card" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>🏆</div>
            <div style={{ fontSize: 18, fontWeight: 950 }}>{p.wins_draw || 0}</div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800 }}>فوز رسم</div>
          </div>
          <div className="card" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>⚡</div>
            <div style={{ fontSize: 18, fontWeight: 950 }}>{p.xp || 0}</div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800 }}>XP كلي</div>
          </div>
        </div>

        {/* Per-Mode Stats */}
        <div style={{ fontSize: 14, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>إحصائيات الأوضاع</div>
        {Object.entries(MODE_LABELS).map(([mode, info]) => {
          const played = mode === 'monkey' ? monkeyPlayed : mode === 'draw' ? drawPlayed : survivalPlayed;
          const modeWins = mode === 'draw' ? (p.wins_draw || 0) : mode === 'monkey' ? Math.max(0, wins - (p.wins_draw || 0)) : 0;
          const rate = played > 0 ? Math.round((modeWins / played) * 100) : 0;

          return (
            <div key={mode} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: info.color, border: '3px solid var(--bg-dark-purple)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>
                {info.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>{info.label}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 700 }}>{played} لعبة</span>
                  <span style={{ fontSize: 11, color: 'var(--bg-green)', fontWeight: 700 }}>{modeWins} فوز</span>
                  <span style={{ fontSize: 11, color: 'var(--bg-pink)', fontWeight: 700 }}>{rate}%</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Match History */}
        <div style={{ fontSize: 14, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>آخر المباريات</div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><LoadingSpinner /></div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 13, fontWeight: 700, padding: 20 }}>
            لا توجد مباريات بعد — العب الأولى! 🎮
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {matches.map(m => {
              const info = MODE_LABELS[m.mode] || MODE_LABELS.monkey;
              const date = m.playedAt?.toDate?.() || new Date();
              const timeStr = date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
              return (
                <div key={m.id} className="card" style={{
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  borderLeft: `5px solid ${m.won ? 'var(--bg-green)' : 'var(--bg-pink)'}`,
                }}>
                  <span style={{ fontSize: 20 }}>{info.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>
                      {info.label} — {m.won ? 'فوز ✅' : 'خسارة ❌'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 700 }}>
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
    </div>
  );
}
