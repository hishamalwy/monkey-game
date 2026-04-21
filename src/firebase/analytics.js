import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const EVENTS = {
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  GAME_STARTED: 'game_started',
  GAME_COMPLETED: 'game_completed',
  PURCHASE: 'purchase',
  DAILY_BONUS_CLAIMED: 'daily_bonus_claimed',
  ACHIEVEMENT_CLAIMED: 'achievement_claimed',
  SHARE: 'share',
  QUICK_PLAY: 'quick_play',
  QUICK_REMATCH: 'quick_rematch',
  REPORT_SUBMITTED: 'report_submitted',
  ERROR: 'error',
  DROP: 'player_drop',
};

let sessionStartTs = null;

export function initSession(uid) {
  sessionStartTs = Date.now();
  logEvent(EVENTS.SESSION_START, { uid });
}

export function endSession(uid) {
  if (!sessionStartTs) return;
  const duration = Math.round((Date.now() - sessionStartTs) / 1000);
  logEvent(EVENTS.SESSION_END, { uid, duration });
  sessionStartTs = null;
}

export function logEvent(event, params = {}) {
  const data = {
    event,
    ...params,
    ts: serverTimestamp(),
    tsLocal: new Date().toISOString(),
  };

  addDoc(collection(db, 'analytics'), data).catch(() => {});
}

export { EVENTS };
