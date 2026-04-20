import { doc, updateDoc, increment, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from './config';

export async function purchaseItem(uid, itemId, price) {
  const userRef = doc(db, 'users', uid);
  const itemRef = doc(db, 'purchases', `${uid}_${itemId}`);

  await runTransaction(db, async (txn) => {
    const userSnap = await txn.get(userRef);
    if (!userSnap.exists()) throw new Error('المستخدم غير موجود');

    const data = userSnap.data();
    if ((data.coins || 0) < price) throw new Error('ما عندك كفاية عملات!');
    if ((data.purchases || []).includes(itemId)) throw new Error('عندك هذا العنصر بالفعل!');

    const existingPurchase = await txn.get(itemRef);
    if (existingPurchase.exists()) throw new Error('عندك هذا العنصر بالفعل!');

    txn.update(userRef, {
      coins: increment(-price),
      purchases: arrayUnion(itemId),
    });

    txn.set(itemRef, { uid, itemId, price, purchasedAt: new Date() });
  });
}

export async function awardCoins(uid, amount) {
  if (!uid || typeof amount !== 'number' || amount <= 0) return;
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { coins: increment(amount) });
}

export async function setSelectedColor(uid, colorValue) {
  await updateDoc(doc(db, 'users', uid), { nameColor: colorValue });
}
