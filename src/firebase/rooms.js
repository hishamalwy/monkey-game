import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, deleteField, arrayUnion, deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import { normalizeArabic } from '../utils/aiLogic';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';

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
  const code = await generateUniqueCode();
  const {
    category = 'countries', timeLimit = 15, maxPlayers = 5,
    mode = 'monkey', scoreTarget = 40, drawTime = 80, wordChoices = 3,
    entryFee = 100,
  } = settings;

  await setDoc(doc(db, 'rooms', code), {
    code,
    hostUid: userProfile.uid,
    status: 'lobby',
    mode,
    category,
    timeLimit,
    maxPlayers,
    scoreTarget,
    drawTime,
    wordChoices,
    entryFee,
    createdAt: serverTimestamp(),
    players: {
      [userProfile.uid]: {
        uid: userProfile.uid,
        username: userProfile.username,
        avatarId: userProfile.avatarId,
        isReady: true,
        quarterMonkeys: 0,
      },
    },
    playerOrder: [userProfile.uid],
    gameState: null,
    lastResult: null,
  });

  return code;
}

export async function joinRoom(code, userProfile) {
  const roomRef = doc(db, 'rooms', code);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const room = snap.data();
  if (room.status !== 'lobby') throw new Error('اللعبة بدأت بالفعل');
  if (Object.keys(room.players).length >= (room.maxPlayers || 8)) throw new Error('الغرفة ممتلئة');
  if (room.players[userProfile.uid]) return; // already in room

  await updateDoc(roomRef, {
    [`players.${userProfile.uid}`]: {
      uid: userProfile.uid,
      username: userProfile.username,
      avatarId: userProfile.avatarId,
      isReady: true,
      quarterMonkeys: 0,
    },
    playerOrder: arrayUnion(userProfile.uid),
  });
}

export async function setReady(code, uid, isReady) {
  await updateDoc(doc(db, 'rooms', code), {
    [`players.${uid}.isReady`]: isReady,
  });
}

export async function startGame(code) {
  const snap = await getDoc(doc(db, 'rooms', code));
  const room = snap.data();
  const firstUid = room.playerOrder[0];

  await updateDoc(doc(db, 'rooms', code), {
    status: 'playing',
    gameState: {
      currentWord: '',
      currentPlayerUid: firstUid,
      timeRemainingAtLastAction: room.timeLimit,
      lastActionAt: serverTimestamp(),
    },
    lastResult: null,
  });
}

export async function updateGameState(code, patch) {
  await updateDoc(doc(db, 'rooms', code), patch);
}

export async function leaveRoom(code, uid, isHost, playerOrder) {
  const roomRef = doc(db, 'rooms', code);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const room = snap.data();
  const remainingOrder = (room.playerOrder || []).filter(id => id !== uid);

  if (remainingOrder.length === 0) {
    // Last player — delete room
    await deleteDoc(roomRef);
    return;
  }

  const patch = {
    [`players.${uid}`]: deleteField(),
    playerOrder: remainingOrder,
  };

  if (isHost) {
    patch.hostUid = remainingOrder[0];
  }

  await updateDoc(roomRef, patch);
}

export function listenToRoom(code, callback) {
  return onSnapshot(doc(db, 'rooms', code), (snap) => {
    if (snap.exists()) callback(snap.data());
    else callback(null);
  });
}

export function resolveChallenge(currentWord, categoryId, mode = 'monkey') {
  const cats = mode === 'draw' ? drawCategories : appCategories;
  const cat = cats.find(c => c.id === categoryId) || cats[0];
  const normalizedWords = cat.words.map(w => normalizeArabic(w));
  const normalizedWord = normalizeArabic(currentWord);
  const isPrefixValid = normalizedWords.some(w => w.startsWith(normalizedWord));

  if (isPrefixValid) {
    const idx = normalizedWords.findIndex(w => w.startsWith(normalizedWord));
    return { valid: true, word: cat.words[idx] };
  }
  return { valid: false };
}
