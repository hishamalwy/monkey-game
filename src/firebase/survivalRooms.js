import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { getRandomSurvivalQuestions } from '../data/survivalQuestions';

export async function startSurvivalGame(code) {
  const snap = await getDoc(doc(db, 'rooms', code));
  const room = snap.data();

  // pick 100 random questions to ensure a true elimination experience
  const questions = getRandomSurvivalQuestions(100);
  
  const initialAlivePlayers = {};
  room.playerOrder.forEach(uid => {
    initialAlivePlayers[uid] = 3; // 3 lives/hearts
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
      eliminatedThisRound: []
    },
  });
}

export async function submitSurvivalAnswer(code, uid, answerIndex) {
  await updateDoc(doc(db, 'rooms', code), {
    [`survivalState.answers.${uid}`]: {
      answer: answerIndex,
      time: serverTimestamp()
    }
  });
}

export async function survivalReveal(code, alivePlayers, eliminatedThisRound) {
  await updateDoc(doc(db, 'rooms', code), {
    'survivalState.status': 'reveal',
    'survivalState.alivePlayers': alivePlayers,
    'survivalState.eliminatedThisRound': eliminatedThisRound,
  });
}

export async function survivalNextQuestion(code, nextIndex) {
  await updateDoc(doc(db, 'rooms', code), {
    'survivalState.status': 'question',
    'survivalState.currentQuestionIndex': nextIndex,
    'survivalState.answers': {},
    'survivalState.roundStartTime': serverTimestamp(),
    'survivalState.eliminatedThisRound': []
  });
}

export async function endSurvivalGame(code) {
  await updateDoc(doc(db, 'rooms', code), {
    'survivalState.status': 'finished'
  });
}
