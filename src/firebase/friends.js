import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from './config';

export async function sendFriendRequest(uid, targetUid) {
  const targetRef = doc(db, 'users', targetUid);
  await updateDoc(targetRef, {
    friendRequests: arrayUnion(uid),
  });
}

export async function acceptFriendRequest(uid, targetUid) {
  const userRef = doc(db, 'users', uid);
  const targetRef = doc(db, 'users', targetUid);
  await Promise.all([
    updateDoc(userRef, {
      friends: arrayUnion(targetUid),
      friendRequests: arrayRemove(targetUid),
    }),
    updateDoc(targetRef, {
      friends: arrayUnion(uid),
    }),
  ]);
}

export async function declineFriendRequest(uid, targetUid) {
  await updateDoc(doc(db, 'users', uid), {
    friendRequests: arrayRemove(targetUid),
  });
}

export async function removeFriend(uid, targetUid) {
  await Promise.all([
    updateDoc(doc(db, 'users', uid), { friends: arrayRemove(targetUid) }),
    updateDoc(doc(db, 'users', targetUid), { friends: arrayRemove(uid) }),
  ]);
}

export async function getFriendProfiles(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { friends: [], requests: [] };

  const data = snap.data();
  const friendUids = data.friends || [];
  const requestUids = data.friendRequests || [];

  const friends = [];
  for (const fUid of friendUids.slice(0, 30)) {
    const fSnap = await getDoc(doc(db, 'users', fUid));
    if (fSnap.exists()) {
      const d = fSnap.data();
      friends.push({ uid: fUid, username: d.username || 'لاعب', avatarId: d.avatarId ?? 1, xp: d.xp || 0, gamesPlayed: d.gamesPlayed || 0 });
    }
  }

  const requests = [];
  for (const rUid of requestUids.slice(0, 20)) {
    const rSnap = await getDoc(doc(db, 'users', rUid));
    if (rSnap.exists()) {
      const d = rSnap.data();
      requests.push({ uid: rUid, username: d.username || 'لاعب', avatarId: d.avatarId ?? 1 });
    }
  }

  return { friends, requests };
}
