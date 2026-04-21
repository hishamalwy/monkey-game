import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { getRandomBuzzerItem } from '../data/buzzerCategories';

export async function startBuzzerGame(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const room = snap.data();
  if (room.hostUid !== callerUid) throw new Error('فقط الهوست يبدأ اللعبة');

  const scoreTarget = room.scoreTarget || 10;
  const players = room.playerOrder || [];
  const scores = {};
  players.forEach(uid => { scores[uid] = 0; });

  await updateDoc(doc(db, 'rooms', roomCode), {
    status: 'playing',
    buzzerState: {
      phase: 'category_select',
      roundNumber: 0,
      scoreTarget,
      scores,
      currentCategory: null,
      currentItem: null,
      currentItemIdx: -1,
      revealed: false,
      buzzerOpen: false,
      buzzedUid: null,
      buzzedAt: null,
      buzzLocked: false,
      usedItems: {},
      winnerUid: null,
    },
  });
}

export async function buzzerSelectCategory(roomCode, callerUid, categoryId) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const bs = room.buzzerState;
  if (!bs) return;
  if (bs.phase !== 'category_select' && bs.phase !== 'round_result') return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'buzzerState.currentCategory': categoryId,
    'buzzerState.phase': 'preparing',
  });

  await _loadNewQuestion(roomCode, categoryId, bs.usedItems || {});
}

async function _loadNewQuestion(roomCode, categoryId, usedItems) {
  const excluded = usedItems[categoryId] || [];
  const result = getRandomBuzzerItem(categoryId, excluded);
  if (!result) return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'buzzerState.currentItem': result.item,
    'buzzerState.currentItemIdx': result.idx,
    'buzzerState.revealed': false,
    'buzzerState.buzzerOpen': false,
    'buzzerState.buzzedUid': null,
    'buzzerState.buzzedAt': null,
    'buzzerState.buzzLocked': false,
    'buzzerState.phase': 'ready',
  });
}

export async function buzzerChangeQuestion(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const bs = room.buzzerState;
  if (!bs || !bs.currentCategory) return;
  if (bs.phase !== 'ready' && bs.phase !== 'preparing') return;

  await _loadNewQuestion(roomCode, bs.currentCategory, bs.usedItems || {});
}

export async function buzzerReveal(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const bs = room.buzzerState;
  if (!bs || bs.phase !== 'ready') return;
  if (!bs.currentItem || bs.currentItem.type !== 'visual') return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'buzzerState.revealed': true,
    'buzzerState.phase': 'revealed',
  });
}

export async function buzzerOpenBuzzer(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const bs = room.buzzerState;
  if (!bs) return;
  if (bs.phase !== 'ready' && bs.phase !== 'revealed') return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'buzzerState.buzzerOpen': true,
    'buzzerState.buzzedUid': null,
    'buzzerState.buzzedAt': null,
    'buzzerState.buzzLocked': false,
    'buzzerState.phase': 'buzzer_open',
  });
}

export async function buzzerPress(roomCode, uid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (!room.players?.[uid]) return;
  const bs = room.buzzerState;
  if (!bs || !bs.buzzerOpen || bs.buzzLocked) return;
  if (bs.buzzedUid) return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'buzzerState.buzzedUid': uid,
    'buzzerState.buzzedAt': Date.now(),
    'buzzerState.buzzLocked': true,
    'buzzerState.buzzerOpen': false,
    'buzzerState.phase': 'answering',
  });
}

export async function buzzerJudgeCorrect(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const bs = room.buzzerState;
  if (!bs || bs.phase !== 'answering' || !bs.buzzedUid) return;

  const newScores = { ...bs.scores, [bs.buzzedUid]: (bs.scores[bs.buzzedUid] || 0) + 1 };
  const roundNumber = bs.roundNumber + 1;
  const usedItems = { ...bs.usedItems };
  if (bs.currentCategory && bs.currentItemIdx >= 0) {
    usedItems[bs.currentCategory] = [...(usedItems[bs.currentCategory] || []), bs.currentItemIdx];
  }

  const scoreTarget = bs.scoreTarget || 10;
  const winnerUid = newScores[bs.buzzedUid] >= scoreTarget ? bs.buzzedUid : null;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'buzzerState.scores': newScores,
    'buzzerState.roundNumber': roundNumber,
    'buzzerState.usedItems': usedItems,
    'buzzerState.phase': winnerUid ? 'game_over' : 'round_result',
    'buzzerState.buzzedUid': bs.buzzedUid,
    'buzzerState.lastResult': 'correct',
    'buzzerState.winnerUid': winnerUid,
  });
}

export async function buzzerJudgeWrong(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const bs = room.buzzerState;
  if (!bs || bs.phase !== 'answering') return;

  const usedItems = { ...bs.usedItems };
  if (bs.currentCategory && bs.currentItemIdx >= 0) {
    usedItems[bs.currentCategory] = [...(usedItems[bs.currentCategory] || []), bs.currentItemIdx];
  }

  await updateDoc(doc(db, 'rooms', roomCode), {
    'buzzerState.roundNumber': bs.roundNumber + 1,
    'buzzerState.usedItems': usedItems,
    'buzzerState.phase': 'round_result',
    'buzzerState.lastResult': 'wrong',
  });
}

export async function buzzerSkipRound(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const bs = room.buzzerState;
  if (!bs) return;
  if (bs.phase !== 'answering' && bs.phase !== 'buzzer_open' && bs.phase !== 'ready' && bs.phase !== 'revealed') return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'buzzerState.phase': 'round_result',
    'buzzerState.lastResult': 'skipped',
    'buzzerState.buzzerOpen': false,
    'buzzerState.buzzLocked': true,
  });
}

export async function buzzerEndGame(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const bs = room.buzzerState;
  if (!bs) return;

  const scores = bs.scores || {};
  let winnerUid = null;
  let maxScore = -1;
  Object.entries(scores).forEach(([uid, s]) => {
    if (s > maxScore) { maxScore = s; winnerUid = uid; }
  });

  await updateDoc(doc(db, 'rooms', roomCode), {
    status: 'buzzer_over',
    'buzzerState.phase': 'game_over',
    'buzzerState.winnerUid': winnerUid,
  });
}
