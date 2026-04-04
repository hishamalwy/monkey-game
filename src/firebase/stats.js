import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export async function recordMatch(uid, data) {
  await addDoc(collection(db, 'users', uid, 'matches'), {
    ...data,
    playedAt: serverTimestamp(),
  });
}

export async function getMatchHistory(uid, max = 20) {
  const q = query(collection(db, 'users', uid, 'matches'), orderBy('playedAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
