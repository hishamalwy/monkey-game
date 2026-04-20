import {
  doc, getDoc, updateDoc, arrayUnion, runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import { drawCategories } from '../data/drawCategories';

const MAX_STROKES = 150;

function pickWords(roomCategory, count = 3) {
  const cat = drawCategories.find(c => c.id === roomCategory) || drawCategories[0];
  const shuffled = [...cat.words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildInitialHint(word) {
  return word.split('').map(c => (c === ' ' ? ' ' : '_')).join('');
}

function normalizeGuess(str) {
  return str
    .trim()
    .replace(/[\u0610-\u061A\u064B-\u065F]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

function calculateCloseness(guess, word) {
  const n1 = normalizeGuess(guess);
  const n2 = normalizeGuess(word);
  if (n1 === n2) return 'correct';

  if (n1.length > 2 && n2.length > 2) {
    if (n2.includes(n1) || n1.includes(n2)) return 'close';
  }
  return 'wrong';
}

export async function startDrawGame(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const room = snap.data();
  if (room.hostUid !== callerUid) throw new Error('فقط الهوست يبدأ اللعبة');
  if (room.status === 'playing' || room.status === 'draw_over') throw new Error('اللعبة بدأت');

  const { playerOrder, wordChoices = 3, category = 'objects', scoreTarget = 100 } = room;
  const drawerUid = playerOrder[0];
  const words = pickWords(category, wordChoices);

  await updateDoc(doc(db, 'rooms', roomCode), {
    status: 'playing',
    drawState: {
      roundStatus: 'choosing',
      currentRound: 1,
      drawerUid,
      wordOptions: words,
      choosingEndsAt: Date.now() + 20000,
      chosenWord: null,
      wordLength: 0,
      hint: '',
      hintRevealCount: 0,
      roundEndsAt: null,
      strokes: [],
      messages: [],
      scores: Object.fromEntries(playerOrder.map(uid => [uid, 0])),
      scoreTarget,
      roundScores: {},
      guessersDone: [],
      bgFill: null,
      showWordLength: false,
    },
  });
}

export async function chooseDrawWord(roomCode, callerUid, word) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  const ds = room.drawState;
  if (!ds || ds.roundStatus !== 'choosing') return;
  if (ds.drawerUid !== callerUid) return;

  const drawTime = room.drawTime || 80;
  const hint = buildInitialHint(word);
  const endsAt = Date.now() + drawTime * 1000;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.roundStatus': 'drawing',
    'drawState.chosenWord': word,
    'drawState.wordLength': word.replace(/\s/g, '').length,
    'drawState.hint': hint,
    'drawState.hintRevealCount': 0,
    'drawState.roundEndsAt': endsAt,
    'drawState.strokes': [],
    'drawState.guessersDone': [],
    'drawState.roundScores': {},
    'drawState.messages': [],
    'drawState.bgFill': null,
    'drawState.showWordLength': false,
  });
}

export async function submitDrawGuess(roomCode, uid, username, guess, drawTime = 80) {
  const roomRef = doc(db, 'rooms', roomCode);

  return runTransaction(db, async (txn) => {
    const snap = await txn.get(roomRef);
    if (!snap.exists()) return { correct: false };
    const room = snap.data();
    const ds = room?.drawState;

    if (!ds || ds.roundStatus !== 'drawing') return { correct: false };
    if (!(room.players || {})[uid]) return { correct: false };
    if ((ds.guessersDone || []).includes(uid)) return { correct: false, alreadyGuessed: true };

    const closeness = calculateCloseness(guess, ds.chosenWord || '');
    const correct = closeness === 'correct';
    const isClose = closeness === 'close';

    const playerCount = (room.playerOrder || []).length;
    const rank = (ds.guessersDone || []).length;
    const points = Math.max(5, 15 - rank * 3);

    const messagesToAdd = [{
      uid, username,
      text: correct ? 'خمّن الكلمة الصحيحة! ✅' : (isClose ? 'قريب جداً! 🤏' : guess),
      originalText: guess,
      isCorrect: correct,
      isClose,
      points: correct ? points : 0,
      ts: Date.now(),
    }];

    const patch = {};

    if (correct) {
      patch[`drawState.roundScores.${uid}`] = points;
      const newTotal = (ds.scores?.[uid] || 0) + points;
      patch[`drawState.scores.${uid}`] = newTotal;
      patch['drawState.guessersDone'] = arrayUnion(uid);

      const activePlayers = Object.keys(room.players || {});
      const othersCount = Math.max(1, activePlayers.length - 1);
      const nowDone = (ds.guessersDone || []).length + 1;

      if (nowDone >= othersCount) {
        const drawerPoints = 10 + (nowDone * 5);
        messagesToAdd.push({
          uid: 'system', username: 'المنادي',
          text: 'الكل حلها صح! 🎉 برافو عليكم', ts: Date.now() + 1,
        });
        patch['drawState.roundStatus'] = 'reveal';
        const newDrawerTotal = (ds.scores?.[ds.drawerUid] || 0) + drawerPoints;
        patch[`drawState.scores.${ds.drawerUid}`] = newDrawerTotal;
        patch[`drawState.roundScores.${ds.drawerUid}`] = drawerPoints;
      }
    }

    patch['drawState.messages'] = arrayUnion(...messagesToAdd);
    txn.update(roomRef, patch);
    return { correct, points };
  });
}

export async function addStroke(roomCode, callerUid, stroke) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  const ds = room.drawState;
  if (!ds || ds.roundStatus !== 'drawing') return;
  if (ds.drawerUid !== callerUid) return;
  if ((ds.strokes || []).length >= MAX_STROKES) return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.strokes': arrayUnion(stroke),
  });
}

export async function clearDrawCanvas(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  if (snap.data().drawState?.drawerUid !== callerUid) return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.strokes': [],
    'drawState.bgFill': null,
  });
}

export async function undoLastStroke(roomCode, callerUid) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  const ds = snap.data()?.drawState;
  if (!ds || !ds.strokes || ds.strokes.length === 0) return;
  if (ds.drawerUid !== callerUid) return;

  const newStrokes = [...ds.strokes];
  newStrokes.pop();
  await updateDoc(roomRef, { 'drawState.strokes': newStrokes });
}

export async function fillBackground(roomCode, callerUid, color) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  if (snap.data().drawState?.drawerUid !== callerUid) return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.bgFill': color,
  });
}

export async function revealHint(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  const ds = room?.drawState;

  if (!ds || ds.roundStatus !== 'drawing' || !ds.chosenWord) return;
  if (ds.drawerUid !== callerUid) return;

  const wordChars = ds.chosenWord.split('');
  const hintChars = ds.hint.split('');

  const hiddenPositions = wordChars.reduce((acc, c, i) => {
    if (c !== ' ' && hintChars[i] === '_') acc.push(i);
    return acc;
  }, []);

  if (hiddenPositions.length <= 1) return;

  const idx = hiddenPositions[Math.floor(Math.random() * hiddenPositions.length)];
  hintChars[idx] = wordChars[idx];

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.hint': hintChars.join(''),
    'drawState.hintRevealCount': (ds.hintRevealCount || 0) + 1,
  });
}

export async function endDrawRound(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const ds = room?.drawState;

  if (!ds || ds.roundStatus !== 'drawing') return;

  const correctCount = ds.guessersDone?.length || 0;
  const drawerPoints = correctCount > 0 ? (10 + correctCount * 5) : 0;

  const newScores = { ...(ds.scores || {}) };
  newScores[ds.drawerUid] = (newScores[ds.drawerUid] || 0) + drawerPoints;

  const roundScores = { ...(ds.roundScores || {}), [ds.drawerUid]: drawerPoints };

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.roundStatus': 'reveal',
    'drawState.scores': newScores,
    'drawState.roundScores': roundScores,
  });
}

export async function revealWordLength(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  if (snap.data().drawState?.drawerUid !== callerUid) return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.showWordLength': true,
  });
}

export async function nextDrawRound(roomCode, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;
  const ds = room?.drawState;

  if (!ds || ds.roundStatus !== 'reveal') return;

  const { playerOrder, scoreTarget = 100, wordChoices = 3 } = room;

  const winner = playerOrder.find(uid => (ds.scores?.[uid] || 0) >= scoreTarget);
  if (winner) {
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'draw_over',
      'drawState.winnerUid': winner,
    });
    return;
  }

  const nextRound = ds.currentRound + 1;
  const drawerUid = playerOrder[(nextRound - 1) % playerOrder.length];
  const words = pickWords(room.category || 'objects', wordChoices);

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.roundStatus': 'choosing',
    'drawState.currentRound': nextRound,
    'drawState.drawerUid': drawerUid,
    'drawState.wordOptions': words,
    'drawState.choosingEndsAt': Date.now() + 20000,
    'drawState.chosenWord': null,
    'drawState.wordLength': 0,
    'drawState.hint': '',
    'drawState.hintRevealCount': 0,
    'drawState.roundEndsAt': null,
    'drawState.strokes': [],
    'drawState.messages': [],
    'drawState.guessersDone': [],
    'drawState.roundScores': {},
    'drawState.bgFill': null,
    'drawState.powerupUsed': false,
    'drawState.showWordLength': false,
  });
}
