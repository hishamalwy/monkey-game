import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { logEvent, EVENTS } from './analytics';

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
  logEvent(EVENTS.REPORT_SUBMITTED, { reporterUid, targetUid, reason, roomCode });
}
