import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, deleteField, arrayUnion, deleteDoc,
  query, where, getDocs, limit, arrayRemove, collection,
  runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import { normalizeArabic } from '../utils/textUtils';
import { checkRateLimit } from '../utils/rateLimit';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';
import { logEvent, EVENTS } from './analytics';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode() {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

async function generateUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    const snap = await getDoc(doc(db, 'rooms', code));
    if (!snap.exists()) return code;
  }
  throw new Error('تعذر إنشاء كود الغرفة، حاول مرة أخرى');
}

export async function createRoom(userProfile, settings = {}) {
  if (!checkRateLimit(`create_${userProfile.uid}`, 3, 30000)) {
    throw new Error('عمليات كثيرة، انتظر قليلاً');
  }
  try {
    const q = query(collection(db, 'rooms'), where('hostUid', '==', userProfile.uid), limit(10));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch (err) {
    console.error('Room cleanup failed:', err);
  }

  const code = await generateUniqueCode();
  const roomRef = doc(db, 'rooms', code);

  const roomData = {
    code,
    hostUid: userProfile.uid,
    hostName: userProfile.username,
    status: 'lobby',
    mode: settings.mode || 'monkey',
    category: settings.category || (settings.mode === 'buzzer' ? '' : 'countries'),
    maxPlayers: settings.maxPlayers || 5,
    isPublic: settings.isPublic ?? true,
    timeLimit: settings.timeLimit || 15,
    scoreTarget: settings.scoreTarget || 40,
    drawTime: settings.drawTime || 80,
    charadesTime: settings.charadesTime || 60,
    wordChoices: settings.wordChoices || 3,
    entryFee: settings.entryFee || 0,
    createdAt: serverTimestamp(),
    playerOrder: [userProfile.uid],
    players: {
      [userProfile.uid]: {
        uid: userProfile.uid,
        username: userProfile.username,
        avatarId: userProfile.avatarId || 0,
        isReady: true,
        points: 0,
        quarterMonkeys: 0,
      },
    },
    gameState: {
      currentPlayerUid: null,
      currentWord: '',
      history: [],
      lastActionAt: null,
    },
  };

  await setDoc(roomRef, roomData);
  logEvent(EVENTS.ROOM_CREATED, { uid: userProfile.uid, mode: roomData.mode, isPublic: roomData.isPublic });
  return code;
}

export async function joinRoom(code, userProfile) {
  if (!checkRateLimit(`join_${userProfile.uid}`, 5, 15000)) {
    throw new Error('عمليات كثيرة، انتظر قليلاً');
  }
  const roomRef = doc(db, 'rooms', code);

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(roomRef);
    if (!snap.exists()) throw new Error('الغرفة غير موجودة');
    const room = snap.data();

    if (room.status !== 'lobby') throw new Error('اللعبة بدأت بالفعل');
    if (Object.keys(room.players || {}).length >= (room.maxPlayers || 8)) {
      throw new Error('الغرفة ممتلئة');
    }
    if (room.players[userProfile.uid]) return;

    txn.update(roomRef, {
      [`players.${userProfile.uid}`]: {
        uid: userProfile.uid,
        username: userProfile.username,
        avatarId: userProfile.avatarId,
        isReady: true,
        quarterMonkeys: 0,
      },
      playerOrder: arrayUnion(userProfile.uid),
    });
  });
  logEvent(EVENTS.ROOM_JOINED, { uid: userProfile.uid, code });
}

export async function setReady(code, uid, isReady) {
  await updateDoc(doc(db, 'rooms', code), {
    [`players.${uid}.isReady`]: isReady,
  });
}

export async function startGame(code) {
  const roomRef = doc(db, 'rooms', code);

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(roomRef);
    if (!snap.exists()) throw new Error('الغرفة غير موجودة');
    const room = snap.data();

    if (room.hostUid !== txn._authUid) {
      throw new Error('فقط الهوست يقدر يبدأ اللعبة');
    }
    if (room.status !== 'lobby') throw new Error('اللعبة بدأت بالفعل');

    const firstUid = room.playerOrder[0];
    txn.update(roomRef, {
      status: 'playing',
      gameState: {
        currentWord: '',
        usedWords: [],
        currentPlayerUid: firstUid,
        timeRemainingAtLastAction: room.timeLimit,
        lastActionAt: serverTimestamp(),
      },
      lastResult: null,
    });
  });
  logEvent(EVENTS.GAME_STARTED, { code });
}

export async function updateGameState(code, patch) {
  await updateDoc(doc(db, 'rooms', code), patch);
}

export async function updateRoomSettings(code, uid, settings) {
  const roomRef = doc(db, 'rooms', code);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  if (snap.data().hostUid !== uid) throw new Error('فقط الهوست يقدر يغير الإعدادات');
  if (snap.data().status !== 'lobby') throw new Error('ما تقدر تغير الإعدادات بعد ما اللعبة تبدأ');

  await updateDoc(roomRef, settings);
}

export async function leaveRoom(code, uid) {
  const roomRef = doc(db, 'rooms', code);

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(roomRef);
    if (!snap.exists()) return;
    const room = snap.data();
    const isHost = room.hostUid === uid;

    if (isHost) {
      txn.delete(roomRef);
      return;
    }

    const currentUids = Object.keys(room.players || {});
    const remainingUids = currentUids.filter(id => id !== uid);

    if (remainingUids.length === 0) {
      txn.delete(roomRef);
      return;
    }

    txn.update(roomRef, {
      [`players.${uid}`]: deleteField(),
      playerOrder: arrayRemove(uid),
    });
  });
  logEvent(EVENTS.ROOM_LEFT, { uid, code });
}

export async function kickPlayer(code, hostUid, targetUid) {
  if (!checkRateLimit(`kick_${hostUid}`, 5, 10000)) {
    throw new Error('عمليات كثيرة، انتظر قليلاً');
  }
  const roomRef = doc(db, 'rooms', code);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const room = snap.data();

  if (room.hostUid !== hostUid) throw new Error('فقط الهوست يقدر يطرد لاعب');
  if (hostUid === targetUid) throw new Error('ما تقدر تطرد نفسك');
  if (!room.players[targetUid]) throw new Error('اللاعب مش في الغرفة');

  await updateDoc(roomRef, {
    [`players.${targetUid}`]: deleteField(),
    playerOrder: arrayRemove(targetUid),
  });
}

export async function resetRoomToLobby(code, hostUid) {
  const roomRef = doc(db, 'rooms', code);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;
  if (snap.data().hostUid !== hostUid) throw new Error('فقط الهوست يقدر يعيد اللعبة');
  const room = snap.data();

  const updates = {
    status: 'lobby',
    gameState: deleteField(),
    drawState: deleteField(),
    survivalState: deleteField(),
    charadesState: deleteField(),
    buzzerState: deleteField(),
    lastResult: deleteField(),
    currentWord: '',
  };

  if (room.players) {
    Object.keys(room.players).forEach(uid => {
      updates[`players.${uid}.quarterMonkeys`] = 0;
      updates[`players.${uid}.isReady`] = false;
    });
  }

  await updateDoc(roomRef, updates);
}

export async function cleanupOldRooms() {
  try {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const q = query(
      collection(db, 'rooms'),
      where('createdAt', '<', twoHoursAgo),
      limit(20)
    );

    const snap = await getDocs(q);
    const batch = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(batch);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

export function listenToRoom(code, callback) {
  return onSnapshot(doc(db, 'rooms', code), (snap) => {
    if (snap.exists()) callback(snap.data());
    else callback(null);
  });
}

export async function fetchPublicRooms() {
  cleanupOldRooms().catch(() => {});

  const q = query(
    collection(db, 'rooms'),
    where('isPublic', '==', true),
    where('status', '==', 'lobby'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data())
    .filter(room => (room.playerOrder || []).length > 0);
}

export async function quickPlay(userProfile, mode = 'monkey') {
  const q = query(
    collection(db, 'rooms'),
    where('isPublic', '==', true),
    where('status', '==', 'lobby'),
    where('mode', '==', mode),
    limit(10)
  );
  const snap = await getDocs(q);
  const rooms = snap.docs.map(d => d.data()).filter(room => {
    const count = (room.playerOrder || []).length;
    return count > 0 && count < (room.maxPlayers || 5) && !room.players?.[userProfile.uid];
  });

  if (rooms.length > 0) {
    rooms.sort((a, b) => (b.playerOrder?.length || 0) - (a.playerOrder?.length || 0));
    const target = rooms[0];
    await joinRoom(target.code, userProfile);
    return target.code;
  }

  const settings = {
    mode,
    category: mode === 'draw' ? drawCategories[0].id : appCategories[0].id,
    timeLimit: 15,
    maxPlayers: 5,
    isPublic: true,
    drawTime: 80,
    entryFee: 0,
    wordChoices: 3,
  };
  logEvent(EVENTS.QUICK_PLAY, { uid: userProfile.uid, mode });
  return createRoom(userProfile, settings);
}

export function resolveChallenge(currentWord, categoryId, mode = 'monkey') {
  const cats = mode === 'draw' ? drawCategories : appCategories;
  const cat = cats.find(c => c.id === categoryId) || cats[0];
  const normalizedWords = cat.words.map(w => normalizeArabic(w));
  const normalizedWord = normalizeArabic(currentWord);

  let bestMatch = null;
  let bestLength = 0;

  for (let i = 0; i < normalizedWords.length; i++) {
    if (normalizedWords[i].startsWith(normalizedWord) && normalizedWords[i].length > bestLength) {
      bestMatch = cat.words[i];
      bestLength = normalizedWords[i].length;
    }
  }

  if (bestMatch) {
    return { valid: true, word: bestMatch };
  }
  return { valid: false };
}
