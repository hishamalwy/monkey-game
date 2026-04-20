export const ACHIEVEMENTS = [
  { id: 'first_win', label: 'أول فوز', desc: 'افز أول لعبة', emoji: '🏆', condition: p => (p.wins || 0) >= 1, reward: 50 },
  { id: 'wins_10', label: 'بطل', desc: '10 انتصارات', emoji: '🥇', condition: p => (p.wins || 0) >= 10, reward: 200 },
  { id: 'wins_50', label: 'أسطورة', desc: '50 انتصار', emoji: '👑', condition: p => (p.wins || 0) >= 50, reward: 500 },
  { id: 'wins_100', label: 'إمبراطور', desc: '100 انتصار', emoji: '🌟', condition: p => (p.wins || 0) >= 100, reward: 1000 },
  { id: 'games_10', label: 'هاوي', desc: 'العب 10 مباريات', emoji: '🎮', condition: p => (p.gamesPlayed || 0) >= 10, reward: 80 },
  { id: 'games_50', label: 'مدمن', desc: 'العب 50 مباراة', emoji: '🔥', condition: p => (p.gamesPlayed || 0) >= 50, reward: 250 },
  { id: 'games_100', label: 'محترف', desc: 'العب 100 مباراة', emoji: '⚡', condition: p => (p.gamesPlayed || 0) >= 100, reward: 500 },
  { id: 'streak_7', label: 'مخلص', desc: '7 أيام متتالية', emoji: '📅', condition: p => (p.loginStreak || 0) >= 7, reward: 300 },
  { id: 'streak_30', label: 'وفي', desc: '30 يوم متتالي', emoji: '💎', condition: p => (p.loginStreak || 0) >= 30, reward: 1000 },
  { id: 'draw_win', label: 'رسام', desc: 'افز في ارسم وخمن', emoji: '🎨', condition: p => (p.wins_draw || 0) >= 1, reward: 100 },
  { id: 'survival_win', label: 'ناجي', desc: 'افز في البقاء للأقوى', emoji: '⚔️', condition: p => (p.wins_survival || 0) >= 1, reward: 150 },
  { id: 'charades_win', label: 'ممثل', desc: 'افز في بدون كلام', emoji: '🎭', condition: p => (p.wins_charades || 0) >= 1, reward: 150 },
  { id: 'rich', label: 'ثري', desc: 'اجمع 1000 عملة', emoji: '💰', condition: p => (p.coins || 0) >= 1000, reward: 100 },
  { id: 'xp_500', label: 'خبير', desc: 'اجمع 500 XP', emoji: '⭐', condition: p => (p.xp || 0) >= 500, reward: 200 },
  { id: 'xp_5000', label: 'ماستر', desc: 'اجمع 5000 XP', emoji: '🏅', condition: p => (p.xp || 0) >= 5000, reward: 800 },
  { id: 'all_modes', label: 'مستكشف', desc: 'العب كل الأوضاع', emoji: '🗺️', condition: p => (p.monkeyPlayed || 0) >= 1 && (p.drawPlayed || 0) >= 1 && (p.survivalPlayed || 0) >= 1 && (p.charadesPlayed || 0) >= 1, reward: 300 },
];

export function getUnlockedAchievements(profile) {
  return ACHIEVEMENTS.filter(a => a.condition(profile));
}

export function getNewlyUnlocked(profile, previouslyClaimed) {
  const claimed = previouslyClaimed || [];
  return ACHIEVEMENTS.filter(a => a.condition(profile) && !claimed.includes(a.id));
}

export function getAchievementProgress(achievement, profile) {
  return achievement.condition(profile) ? 100 : 0;
}
