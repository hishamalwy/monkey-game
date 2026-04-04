import { collection, query, orderBy, limit, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { XP_REWARDS } from '../utils/xp';

export async function getLeaderboard(max = 20, mode = 'monkey') {
  const field = mode === 'draw' ? 'wins_draw' : 'wins';
  const q = query(collection(db, 'users'), orderBy(field, 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function recordWin(uid, mode = 'monkey') {
  const ref = doc(db, 'users', uid);
  const updates = {
    wins: increment(1),
    gamesPlayed: increment(1),
    xp: increment(XP_REWARDS.WIN),
  };
  if (mode === 'draw') {
    updates.wins_draw = increment(1);
    updates.drawPlayed = increment(1);
  } else if (mode === 'survival') {
    updates.survivalPlayed = increment(1);
  } else {
    updates.monkeyPlayed = increment(1);
  }
  await updateDoc(ref, updates);
}

export async function recordLoss(uid, mode = 'monkey') {
  const ref = doc(db, 'users', uid);
  const updates = {
    gamesPlayed: increment(1),
    xp: increment(XP_REWARDS.LOSS),
  };
  if (mode === 'draw') {
    updates.drawPlayed = increment(1);
  } else if (mode === 'survival') {
    updates.survivalPlayed = increment(1);
  } else {
    updates.monkeyPlayed = increment(1);
  }
  await updateDoc(ref, updates);
}
