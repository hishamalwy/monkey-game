import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from './config';

export async function blockUser(uid, targetUid) {
  await updateDoc(doc(db, 'users', uid), {
    blockedUsers: arrayUnion(targetUid),
  });
}

export async function unblockUser(uid, targetUid) {
  await updateDoc(doc(db, 'users', uid), {
    blockedUsers: arrayRemove(targetUid),
  });
}

export function listenToBlocklist(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      callback(snap.data().blockedUsers || []);
    } else {
      callback([]);
    }
  });
}
