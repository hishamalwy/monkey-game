import {
  doc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const CHARADES_TIME = 75;

export async function startCharadesGame(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const { playerOrder } = room;

  const teamA = playerOrder.filter((_, i) => i % 2 === 0);
  const teamB = playerOrder.filter((_, i) => i % 2 === 1);

  const actOrderA = [...teamA];
  const actOrderB = [...teamB];

  await updateDoc(doc(db, 'rooms', roomCode), {
    status: 'playing',
    charadesState: {
      phase: 'categoryVote',
      currentTeam: 'A',
      teams: { A: teamA, B: teamB },
      actOrders: { A: actOrderA, B: actOrderB },
      actedIndices: { A: 0, B: 0 },
      roundNumber: 1,
      scores: { A: 0, B: 0 },
      currentActorUid: null,
      currentCategory: null,
      categoryOptions: null,
      currentTitle: null,
      currentChallenge: null,
      timeEndsAt: null,
      guessedCorrectly: false,
      guessInput: '',
      phaseData: null,
      roundsHistory: [],
    },
  });
}

export async function charadesVoteCategory(roomCode, team, category) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'selectActor',
    'charadesState.currentCategory': category,
    'charadesState.categoryOptions': null,
  });
}

export async function charadesSelectActor(roomCode, team, actorUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  const category = cs.currentCategory;
  const { charadesMovies, charadesPlays, charadesChallenges } = await import('../data/charadesData');

  const titles = category === 'movie' ? charadesMovies : charadesPlays;
  const pick = titles[Math.floor(Math.random() * titles.length)];
  const title = pick.title;
  const challenge = charadesChallenges[Math.floor(Math.random() * charadesChallenges.length)];

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'acting',
    'charadesState.currentActorUid': actorUid,
    'charadesState.currentTitle': title,
    'charadesState.currentChallenge': challenge.text,
    'charadesState.timeEndsAt': Date.now() + CHARADES_TIME * 1000,
    'charadesState.guessedCorrectly': false,
    'charadesState.guessInput': '',
  });
}

export async function charadesSubmitGuess(roomCode, uid, guess) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'acting') return { correct: false };

  const team = cs.currentTeam;
  const isOnCurrentTeam = cs.teams[team]?.includes(uid);
  if (!isOnCurrentTeam) return { correct: false };

  const normalize = (s) => s
    .trim()
    .replace(/[\u0610-\u061A\u064B-\u065F]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();

  const titleNorm = normalize(cs.currentTitle || '');
  const guessNorm = normalize(guess);

  const correct = titleNorm === guessNorm;
  const timeLeft = Math.max(0, Math.round((cs.timeEndsAt - Date.now()) / 1000));
  const halfTime = CHARADES_TIME / 2;
  const points = correct
    ? (timeLeft >= halfTime ? 3 : 1)
    : 0;

  const patch = {
    'charadesState.guessedCorrectly': correct,
    'charadesState.guessInput': guess,
    'charadesState.phase': 'roundResult',
    'charadesState.phaseData': { guesser: uid, timeLeft, points, correct },
  };
  if (correct) {
    patch[`charadesState.scores.${team}`] = (cs.scores[team] || 0) + points;
    patch['charadesState.roundsHistory'] = [
      ...(cs.roundsHistory || []),
      {
        team,
        actor: cs.currentActorUid,
        title: cs.currentTitle,
        challenge: cs.currentChallenge,
        guessedCorrectly: true,
        guesser: uid,
        points,
      },
    ];
  }
  await updateDoc(doc(db, 'rooms', roomCode), patch);
  return { correct, points };
}

export async function charadesEndRound(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  const patch = {
    'charadesState.phase': 'roundResult',
    'charadesState.phaseData': { guessedCorrectly: false, timeLeft: 0, points: 0 },
  };

  if (!cs.guessedCorrectly) {
    patch['charadesState.roundsHistory'] = [
      ...(cs.roundsHistory || []),
      {
        team: cs.currentTeam,
        actor: cs.currentActorUid,
        title: cs.currentTitle,
        challenge: cs.currentChallenge,
        guessedCorrectly: false,
        guesser: null,
        points: 0,
      },
    ];
  }

  await updateDoc(doc(db, 'rooms', roomCode), patch);
}

export async function charadesNextRound(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  const nextTeam = cs.currentTeam === 'A' ? 'B' : 'A';
  const actedIndices = { ...cs.actedIndices };

  const curTeamOrder = cs.actOrders[cs.currentTeam] || [];
  const curIdx = actedIndices[cs.currentTeam] || 0;
  if (curIdx + 1 >= curTeamOrder.length) {
    actedIndices[cs.currentTeam] = 0;
  } else {
    actedIndices[cs.currentTeam] = curIdx + 1;
  }

  if (cs.roundNumber >= 10) {
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'charades_over',
      'charadesState.phase': 'gameOver',
    });
    return;
  }

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'categoryVote',
    'charadesState.currentTeam': nextTeam,
    'charadesState.roundNumber': cs.roundNumber + 1,
    'charadesState.currentActorUid': null,
    'charadesState.currentTitle': null,
    'charadesState.currentChallenge': null,
    'charadesState.timeEndsAt': null,
    'charadesState.guessedCorrectly': false,
    'charadesState.guessInput': '',
    'charadesState.phaseData': null,
    'charadesState.actedIndices': actedIndices,
  });
}

