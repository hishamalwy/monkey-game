import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { getRandomSurvivalQuestions } from '../data/survivalQuestions';

export async function startSurvivalGame(code, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', code));
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const room = snap.data();
  if (room.hostUid !== callerUid) throw new Error('فقط الهوست يبدأ اللعبة');

  const questions = getRandomSurvivalQuestions(30);

  const initialAlivePlayers = {};
  room.playerOrder.forEach(uid => {
    initialAlivePlayers[uid] = 3;
  });

  await updateDoc(doc(db, 'rooms', code), {
    status: 'playing',
    survivalState: {
      status: 'question',
      currentQuestionIndex: 0,
      questions,
      answers: {},
      alivePlayers: initialAlivePlayers,
      roundStartTime: serverTimestamp(),
      timeLimit: room.timeLimit || 15,
      eliminatedThisRound: [],
    },
  });
}

export async function submitSurvivalAnswer(code, uid, answerIndex) {
  const snap = await getDoc(doc(db, 'rooms', code));
  if (!snap.exists()) return;
  const room = snap.data();
  if (!room.players?.[uid]) return;
  if (!room.survivalState || room.survivalState.status !== 'question') return;

  const question = room.survivalState.questions[room.survivalState.currentQuestionIndex];
  if (!question) return;
  if (answerIndex < 0 || answerIndex >= (question.options?.length || 0)) return;

  await updateDoc(doc(db, 'rooms', code), {
    [`survivalState.answers.${uid}`]: {
      answer: answerIndex,
      time: Date.now(),
    },
  });
}

export async function survivalReveal(code, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', code));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;

  const ss = room.survivalState;
  if (!ss || ss.status !== 'question') return;

  const question = ss.questions[ss.currentQuestionIndex];
  if (!question) return;

  const correctAnswer = question.correct;
  const alivePlayers = { ...(ss.alivePlayers || {}) };
  const eliminatedThisRound = [];
  const answered = ss.answers || {};

  const playerOrder = room.playerOrder || [];
  for (const uid of playerOrder) {
    if (alivePlayers[uid] === undefined || alivePlayers[uid] <= 0) continue;

    const playerAnswer = answered[uid];
    if (!playerAnswer || playerAnswer.answer !== correctAnswer) {
      alivePlayers[uid] = Math.max(0, (alivePlayers[uid] || 3) - 1);
      if (alivePlayers[uid] <= 0) {
        eliminatedThisRound.push(uid);
      }
    }
  }

  const aliveCount = Object.values(alivePlayers).filter(v => v > 0).length;
  const isGameOver = aliveCount <= 1 || (ss.currentQuestionIndex + 1) >= ss.questions.length;

  await updateDoc(doc(db, 'rooms', code), {
    'survivalState.status': 'reveal',
    'survivalState.alivePlayers': alivePlayers,
    'survivalState.eliminatedThisRound': eliminatedThisRound,
    ...(isGameOver ? { 'survivalState.status': 'finished' } : {}),
  });
}

export async function survivalNextQuestion(code, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', code));
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid !== callerUid) return;

  const ss = room.survivalState;
  if (!ss) return;

  const nextIndex = ss.currentQuestionIndex + 1;
  if (nextIndex >= ss.questions.length) return;

  await updateDoc(doc(db, 'rooms', code), {
    'survivalState.status': 'question',
    'survivalState.currentQuestionIndex': nextIndex,
    'survivalState.answers': {},
    'survivalState.roundStartTime': serverTimestamp(),
    'survivalState.eliminatedThisRound': [],
  });
}

export async function endSurvivalGame(code, callerUid) {
  const snap = await getDoc(doc(db, 'rooms', code));
  if (!snap.exists()) return;
  if (snap.data().hostUid !== callerUid) return;

  await updateDoc(doc(db, 'rooms', code), {
    'survivalState.status': 'finished',
  });
}
