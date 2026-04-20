import { doc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { db } from './config';
import { increment } from 'firebase/firestore';

export async function claimAchievement(uid, achievementId, reward) {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (txn) => {
    const snap = await txn.get(userRef);
    if (!snap.exists()) throw new Error('المستخدم غير موجود');
    const data = snap.data();
    const claimed = data.claimedAchievements || [];
    if (claimed.includes(achievementId)) throw new Error('تم استلام هذه الإنجاز مسبقاً');
    txn.update(userRef, {
      claimedAchievements: arrayUnion(achievementId),
      coins: increment(reward),
    });
  });
}

export async function trackModePlayed(uid, mode) {
  const field = `${mode}Played`;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    [field]: increment(1),
    gamesPlayed: increment(1),
  });
}
