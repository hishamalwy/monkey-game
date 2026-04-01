import { collection, query, orderBy, limit, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';

export async function getLeaderboard(count = 50, mode = 'monkey') {
  const field = mode === 'draw' ? 'wins_draw' : 'wins';
  const q = query(collection(db, 'users'), orderBy(field, 'desc'), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function recordWin(uid, mode = 'monkey') {
  const field = mode === 'draw' ? 'wins_draw' : 'wins';
  await updateDoc(doc(db, 'users', uid), {
    [field]: increment(1),
    gamesPlayed: increment(1),
  });
}

export async function recordLoss(uid) {
  await updateDoc(doc(db, 'users', uid), {
    gamesPlayed: increment(1),
  });
}
