import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, deleteField, arrayUnion, deleteDoc,
  query, where, getDocs, limit, arrayRemove, collection
} from 'firebase/firestore';
import { db } from './config';
import { normalizeArabic } from '../utils/textUtils';
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
  // 🧹 Cleanup: Delete any existing rooms created by this user
  try {
    const q = query(collection(db, 'rooms'), where('hostUid', '==', userProfile.uid));
    const snap = await getDocs(q);
    const batch = snap.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(batch);
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
    category: settings.category || 'countries',
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
        quarterMonkeys: 0
      }
    },
    gameState: {
      currentPlayerUid: null,
      currentWord: '',
      history: [],
      lastActionAt: null
    }
  };

  await setDoc(roomRef, roomData);
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
      usedWords: [],
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

export async function updateRoomSettings(code, settings) {
  await updateDoc(doc(db, 'rooms', code), settings);
}

export async function leaveRoom(code, uid, isHost) {
  const roomRef = doc(db, 'rooms', code);
  
  // 🚪 If host leaves, kill the room for everyone
  if (isHost) {
    await deleteDoc(roomRef);
    return;
  }

  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const room = snap.data();
  const currentUids = Object.keys(room.players || {});
  const remainingUids = currentUids.filter(id => id !== uid);

  // If nobody left, delete the room
  if (remainingUids.length === 0) {
    await deleteDoc(roomRef);
    return;
  }

  const patch = {
    [`players.${uid}`]: deleteField(),
    playerOrder: arrayRemove(uid),
  };

  await updateDoc(roomRef, patch);
}

export async function kickPlayer(code, uid) {
  const roomRef = doc(db, 'rooms', code);
  await updateDoc(roomRef, {
    [`players.${uid}`]: deleteField(),
    playerOrder: arrayRemove(uid),
  });
}

export async function resetRoomToLobby(code) {
  const roomRef = doc(db, 'rooms', code);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;
  const room = snap.data();
  
  const updates = {
    status: 'lobby',
    gameState: deleteField(),
    drawState: deleteField(),
    survivalState: deleteField(),
    charadesState: deleteField(),
    lastResult: deleteField(),
    currentWord: '', // Ensure old data is cleared
  };

  // Reset all players stats for the new game
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
  // Run a quick cleanup first
  cleanupOldRooms().catch(() => {});

  const q = query(
    collection(db, 'rooms'),
    where('isPublic', '==', true),
    where('status', '==', 'lobby'),
    limit(20)
  );
  const snap = await getDocs(q);
  // Manual filter for rooms with at least one player in playerOrder
  return snap.docs
    .map(d => d.data())
    .filter(room => (room.playerOrder || []).length > 0);
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
