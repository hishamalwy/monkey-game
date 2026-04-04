const BASE_BONUS = 50;
const MAX_STREAK = 7;

export function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getStreakBonus(streak) {
  const multiplier = Math.min(streak, MAX_STREAK);
  return BASE_BONUS * multiplier;
}

export function calcStreak(lastLoginDate, currentStreak) {
  const today = getTodayStr();
  if (!lastLoginDate) return { streak: 1, isNewDay: true };
  if (lastLoginDate === today) return { streak: currentStreak || 1, isNewDay: false };

  const last = new Date(lastLoginDate);
  const now = new Date(today);
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return { streak: (currentStreak || 0) + 1, isNewDay: true };
  }
  return { streak: 1, isNewDay: true };
}

export function getStreakEmoji(streak) {
  if (streak >= 7) return '🔥';
  if (streak >= 5) return '⚡';
  if (streak >= 3) return '🌟';
  return '📅';
}

export const CHALLENGE_TEMPLATES = [
  { id: 'win_1', label: 'افز لعبة واحدة', type: 'wins', target: 1, reward: 80, emoji: '🏆' },
  { id: 'win_3', label: 'افز 3 ألعاب', type: 'wins', target: 3, reward: 250, emoji: '🏆' },
  { id: 'play_2', label: 'العب مباراتين', type: 'games', target: 2, reward: 60, emoji: '🎮' },
  { id: 'play_5', label: 'العب 5 مباريات', type: 'games', target: 5, reward: 150, emoji: '🎮' },
  { id: 'xp_100', label: 'اجمع 100 XP', type: 'xp', target: 100, reward: 100, emoji: '⭐' },
  { id: 'xp_300', label: 'اجمع 300 XP', type: 'xp', target: 300, reward: 300, emoji: '⭐' },
  { id: 'survival_1', label: 'العيب في سيرفايفر', type: 'survival', target: 1, reward: 120, emoji: '💀' },
  { id: 'draw_1', label: 'العب رسم وتخمين', type: 'draw', target: 1, reward: 100, emoji: '🎨' },
];

export function getDailyChallenges(dateStr) {
  const seed = dateStr.split('-').reduce((a, b) => a + parseInt(b, 10), 0);
  const indices = [];
  const picked = new Set();
  for (let i = 0; i < 3; i++) {
    let idx = (seed * (i + 3) + i * 7) % CHALLENGE_TEMPLATES.length;
    while (picked.has(idx)) idx = (idx + 1) % CHALLENGE_TEMPLATES.length;
    picked.add(idx);
    indices.push(idx);
  }
  return indices.map(i => CHALLENGE_TEMPLATES[i]);
}

export function getChallengeProgress(challenge, profile) {
  if (!profile) return 0;
  const todayKey = `today_${challenge.type}`;
  const progress = profile[todayKey] || 0;
  return Math.min(progress, challenge.target);
}

export function isChallengeComplete(challenge, profile) {
  return getChallengeProgress(challenge, profile) >= challenge.target;
}

export function isChallengeClaimed(challenge, profile) {
  const claimed = profile?.claimedChallenges || [];
  return claimed.includes(`${getTodayStr()}_${challenge.id}`);
}
