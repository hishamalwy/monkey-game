import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from './config';
import { awardCoins } from './store';
import { getTodayStr, calcStreak, getStreakBonus, getDailyChallenges, isChallengeComplete, isChallengeClaimed } from '../utils/retention';

export async function claimDailyBonus(uid, profile) {
  const { streak, isNewDay } = calcStreak(profile.lastLoginDate, profile.loginStreak);
  if (!isNewDay) return { claimed: false, streak, bonus: 0 };

  const bonus = getStreakBonus(streak);
  await updateDoc(doc(db, 'users', uid), {
    lastLoginDate: getTodayStr(),
    loginStreak: streak,
    coins: increment(bonus),
  });

  return { claimed: true, streak, bonus };
}

export async function incrementDailyStat(uid, statType, amount = 1) {
  const todayKey = `today_${statType}`;
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const lastReset = data.dailyStatsDate;
  const today = getTodayStr();

  const updates = { [todayKey]: increment(amount) };

  if (lastReset !== today) {
    updates.dailyStatsDate = today;
    updates.today_wins = statType === 'wins' ? 1 : 0;
    updates.today_games = statType === 'games' ? 1 : 0;
    updates.today_xp = statType === 'xp' ? amount : 0;
    updates.today_survival = statType === 'survival' ? 1 : 0;
    updates.today_draw = statType === 'draw' ? 1 : 0;
    updates.claimedChallenges = [];
    delete updates[todayKey];
    updates[todayKey] = statType === 'xp' ? amount : 1;
  }

  await updateDoc(ref, updates);
}

export async function claimChallenge(uid, challenge, profile) {
  const challengeKey = `${getTodayStr()}_${challenge.id}`;
  if (!isChallengeComplete(challenge, profile)) throw new Error('التحدي لم يكتمل بعد');
  if (isChallengeClaimed(challenge, profile)) throw new Error('تم استلام المكافأة بالفعل');

  await updateDoc(doc(db, 'users', uid), {
    claimedChallenges: [...(profile.claimedChallenges || []), challengeKey],
    coins: increment(challenge.reward),
  });
}

export function checkChallengeCompletion(challenge, profile) {
  if (!profile) return false;
  const todayKey = `today_${challenge.type}`;
  const progress = profile[todayKey] || 0;
  return progress >= challenge.target;
}
