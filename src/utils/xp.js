export const XP_REWARDS = {
  WIN: 50,
  LOSS: 10,
  SURVIVAL_ROUND: 5,
  DRAW_CORRECT_GUESS: 15,
};

const LEVEL_XP = [0, 50, 150, 300, 600, 1000, 1800, 3000, 5000, 8000, 12000];

export function getLevel(xp) {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) return i + 1;
  }
  return 1;
}

export function xpForLevel(level) {
  return LEVEL_XP[Math.min(level - 1, LEVEL_XP.length - 1)] || 0;
}

export function xpForNextLevel(level) {
  const next = level + 1;
  if (next > LEVEL_XP.length) {
    return LEVEL_XP[LEVEL_XP.length - 1] + (next - LEVEL_XP.length) * 4000;
  }
  return LEVEL_XP[next - 1];
}

export function getLevelProgress(xp) {
  const level = getLevel(xp);
  const currentFloor = xpForLevel(level);
  const nextCeiling = xpForNextLevel(level);
  const range = nextCeiling - currentFloor;
  if (range <= 0) return 100;
  return Math.min(100, ((xp - currentFloor) / range) * 100);
}

export function getLevelTitle(level) {
  const titles = [
    'مبتدئ', 'متعلّم', 'نشيط', 'محترف', 'خبير',
    'أسطورة', 'بطل', 'ماستر', 'غول', 'إمبراطور', 'إله',
  ];
  return titles[Math.min(level - 1, titles.length - 1)] || 'مبتدئ';
}

export function getLevelEmoji(level) {
  const emojis = ['🐣', '🐥', '🐒', '🦍', '🦁', '🐉', '🔥', '⚡', '💎', '👑', '🌟'];
  return emojis[Math.min(level - 1, emojis.length - 1)] || '🐣';
}
