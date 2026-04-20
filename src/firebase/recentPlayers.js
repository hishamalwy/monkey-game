import { doc, updateDoc, arrayUnion, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const MAX_RECENT = 20;

export async function recordRecentPlayers(uid, playerUids) {
  const others = playerUids.filter(id => id !== uid);
  if (others.length === 0) return;

  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const existing = snap.data().recentPlayers || [];
  const updated = [...others, ...existing.filter(id => !others.includes(id))].slice(0, MAX_RECENT);

  await updateDoc(ref, {
    recentPlayers: updated,
    lastPlayedAt: serverTimestamp(),
  });
}

export async function getRecentPlayers(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];

  const uids = snap.data().recentPlayers || [];
  if (uids.length === 0) return [];

  const players = [];
  for (const playerId of uids.slice(0, 10)) {
    const pSnap = await getDoc(doc(db, 'users', playerId));
    if (pSnap.exists()) {
      const d = pSnap.data();
      players.push({
        uid: playerId,
        username: d.username || 'لاعب',
        avatarId: d.avatarId ?? 1,
      });
    }
  }
  return players;
}
