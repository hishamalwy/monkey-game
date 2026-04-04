import { doc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from './config';

export async function purchaseItem(uid, itemId, price) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('المستخدم غير موجود');

  const data = snap.data();
  if ((data.coins || 0) < price) throw new Error('ما عندك كفاية عملات!');
  if ((data.purchases || []).includes(itemId)) throw new Error('عندك هذا العنصر بالفعل!');

  await updateDoc(ref, {
    coins: increment(-price),
    purchases: arrayUnion(itemId),
  });
}

export async function awardCoins(uid, amount) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { coins: increment(amount) });
}

export async function setSelectedColor(uid, colorValue) {
  await updateDoc(doc(db, 'users', uid), { nameColor: colorValue });
}
