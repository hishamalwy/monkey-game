import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export async function submitReport(reporterUid, targetUid, targetUsername, reason, roomCode) {
  await addDoc(collection(db, 'reports'), {
    reporterUid,
    targetUid,
    targetUsername,
    reason,
    roomCode: roomCode || null,
    createdAt: serverTimestamp(),
    status: 'pending',
  });
}
