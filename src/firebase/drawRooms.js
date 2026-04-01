import {
  doc, getDoc, updateDoc, arrayUnion,
} from 'firebase/firestore';
import { db } from './config';
import { drawCategories } from '../data/drawCategories';

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
    .replace(/[\u0610-\u061A\u064B-\u065F]/g, '') // strip tashkeel
    .replace(/\s+/g, ' ')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه') // common arabic variation
    .replace(/ى/g, 'ي') // common arabic variation
    .toLowerCase();
}

function calculateCloseness(guess, word) {
  const n1 = normalizeGuess(guess);
  const n2 = normalizeGuess(word);
  if (n1 === n2) return 'correct';
  
  // Very simple closeness: if one contains the other or length difference is small + most chars match
  if (n1.length > 2 && n2.length > 2) {
    if (n2.includes(n1) || n1.includes(n2)) return 'close';
  }
  return 'wrong';
}

export async function startDrawGame(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const { playerOrder, wordChoices = 3, category = 'objects' } = room;

  const drawerUid = playerOrder[0];
  const words = pickWords(category, wordChoices);

  await updateDoc(doc(db, 'rooms', roomCode), {
    status: 'playing',
    drawState: {
      roundStatus: 'choosing',
      currentRound: 1,
      totalRounds: playerOrder.length,
      drawerUid,
      wordOptions: words,
      chosenWord: null,
      wordLength: 0,
      hint: '',
      hintRevealCount: 0,
      roundEndsAt: null,
      strokes: [],
      messages: [],
      scores: Object.fromEntries(playerOrder.map(uid => [uid, 0])),
      roundScores: {},
      guessersDone: [],
      bgFill: null,
    },
  });
}

export async function chooseDrawWord(roomCode, word) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
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
  });
}

export async function submitDrawGuess(roomCode, uid, username, guess, drawTime = 80) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const ds = room?.drawState;

  if (!ds || ds.roundStatus !== 'drawing') return { correct: false };
  if ((ds.guessersDone || []).includes(uid)) return { correct: false, alreadyGuessed: true };

  const closeness = calculateCloseness(guess, ds.chosenWord || '');
  const correct = closeness === 'correct';
  const isClose = closeness === 'close';

  const timeRemaining = ds.roundEndsAt
    ? Math.max(0, (ds.roundEndsAt - Date.now()) / 1000)
    : 0;
  const ratio = Math.min(1, timeRemaining / drawTime);
  // Award points: max 100, min 45 if correct
  const points = correct ? Math.max(45, Math.round(ratio * 100)) : 0;

  const newMessage = {
    uid,
    username,
    text: correct ? 'خمّن الكلمة الصحيحة! ✅' : (isClose ? 'قريب جداً! 🤏' : guess),
    originalText: guess, 
    isCorrect: correct,
    isClose: isClose,
    points,
    ts: Date.now(),
  };

  const patch = {
    'drawState.messages': arrayUnion(newMessage),
  };

  if (correct) {
    if (ds.scores) {
       patch[`drawState.roundScores.${uid}`] = points;
       patch[`drawState.scores.${uid}`] = (ds.scores[uid] || 0) + points;
    }
    patch['drawState.guessersDone'] = arrayUnion(uid);
  }

  await updateDoc(doc(db, 'rooms', roomCode), patch);
  return { correct, points };
}

export async function addStroke(roomCode, stroke) {
  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.strokes': arrayUnion(stroke),
  });
}

export async function clearDrawCanvas(roomCode) {
  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.strokes': [],
    'drawState.bgFill': null,
  });
}

export async function fillBackground(roomCode, color) {
  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.bgFill': color,
  });
}

export async function revealHint(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const ds = room?.drawState;

  if (!ds || ds.roundStatus !== 'drawing' || !ds.chosenWord) return;

  const wordChars = ds.chosenWord.split('');
  const hintChars = ds.hint.split('');

  const hiddenPositions = wordChars.reduce((acc, c, i) => {
    if (c !== ' ' && hintChars[i] === '_') acc.push(i);
    return acc;
  }, []);

  if (hiddenPositions.length <= 1) return; // keep at least 1 hidden

  const idx = hiddenPositions[Math.floor(Math.random() * hiddenPositions.length)];
  hintChars[idx] = wordChars[idx];

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.hint': hintChars.join(''),
    'drawState.hintRevealCount': (ds.hintRevealCount || 0) + 1,
  });
}

export async function endDrawRound(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const ds = room?.drawState;

  if (!ds || ds.roundStatus !== 'drawing') return; 

  const guessers = (room.playerOrder || []).filter(uid => uid !== ds.drawerUid);
  const correctCount = ds.guessersDone?.length || 0;

  const drawerPoints = guessers.length > 0
    ? Math.round((correctCount / guessers.length) * 60)
    : 0;

  const newScores = { ...(ds.scores || {}) };
  newScores[ds.drawerUid] = (newScores[ds.drawerUid] || 0) + drawerPoints;

  const roundScores = { ...(ds.roundScores || {}), [ds.drawerUid]: drawerPoints };

  await updateDoc(doc(db, 'rooms', roomCode), {
    'drawState.roundStatus': 'reveal',
    'drawState.scores': newScores,
    'drawState.roundScores': roundScores,
  });
}

export async function nextDrawRound(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const ds = room?.drawState;

  if (!ds || ds.roundStatus !== 'reveal') return;

  const { playerOrder, scoreTarget = 40, wordChoices = 3 } = room;

  // Check if anyone hit scoreTarget
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
    'drawState.chosenWord': null,
    'drawState.wordLength': 0,
    'drawState.hint': '',
    'drawState.strokes': [],
    'drawState.messages': [],
    'drawState.guessersDone': [],
    'drawState.roundScores': {},
    'drawState.bgFill': null,
  });
}
