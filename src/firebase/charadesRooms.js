import {
  doc, getDoc, updateDoc,
} from 'firebase/firestore';
import { db } from './config';

const CHARADES_TIME = 75;

function normalizeArabic(s) {
  return s
    .trim()
    .replace(/[\u0610-\u061A\u064B-\u065F]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

export async function startCharadesGame(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const scoreTarget = room.scoreTarget || 20;
  await updateDoc(doc(db, 'rooms', roomCode), {
    status: 'playing',
    charadesState: {
      phase: 'chooseTeam',
      currentTeam: 'A',
      teams: { A: [], B: [] },
      actOrders: { A: [], B: [] },
      actedPlayers: { A: [], B: [] },
      roundNumber: 1,
      scores: { A: 0, B: 0 },
      scoreTarget,
      titleOptions: null,
      titleVotes: {},
      actorVotes: {},
      currentActorUid: null,
      currentTitle: null,
      currentTitleType: null,
      currentChallenge: null,
      timeEndsAt: null,
      guessedCorrectly: false,
      phaseData: null,
      roundsHistory: [],
    },
  });
}

export async function charadesJoinTeam(roomCode, uid, team) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'chooseTeam') return;

  const teams = {
    A: [...(cs.teams.A || [])].filter(id => id !== uid),
    B: [...(cs.teams.B || [])].filter(id => id !== uid),
  };
  teams[team] = [...teams[team], uid];

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.teams': teams,
  });
}

export async function charadesConfirmTeams(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  const { charadesMovies, charadesPlays } = await import('../data/charadesData');
  const allTitles = [
    ...charadesMovies.map(m => ({ title: m.title, emoji: m.emoji, type: 'movie' })),
    ...charadesPlays.map(p => ({ title: p.title, emoji: p.emoji, type: 'play' })),
  ];
  const shuffled = [...allTitles].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, 3);

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'titleVote',
    'charadesState.titleOptions': options,
    'charadesState.titleVotes': {},
    'charadesState.actorVotes': {},
    'charadesState.actOrders': {
      A: [...(cs.teams.A || [])],
      B: [...(cs.teams.B || [])],
    },
  });
}

export async function charadesVoteTitle(roomCode, uid, optionIndex) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'titleVote') return;

  const votes = { ...(cs.titleVotes || {}) };
  votes[uid] = optionIndex;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.titleVotes': votes,
  });
}

export async function charadesResolveTitle(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'titleVote' || !cs.titleOptions?.length) return;

  const votes = cs.titleVotes || {};
  const counts = {};
  Object.values(votes).forEach(idx => {
    counts[idx] = (counts[idx] || 0) + 1;
  });

  let maxVotes = 0;
  let winnerIdx = 0;
  Object.entries(counts).forEach(([idx, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      winnerIdx = parseInt(idx);
    }
  });

  const winner = cs.titleOptions[winnerIdx] || cs.titleOptions[0];

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'selectActor',
    'charadesState.currentTitle': winner.title,
    'charadesState.currentTitleType': winner.type,
    'charadesState.titleVotes': {},
  });
}

export async function charadesVoteActor(roomCode, uid, actorUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'selectActor') return;

  const votes = { ...(cs.actorVotes || {}) };
  votes[uid] = actorUid;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.actorVotes': votes,
  });
}

export async function charadesResolveActor(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'selectActor') return;

  const votes = cs.actorVotes || {};
  const counts = {};
  Object.values(votes).forEach(uid => {
    counts[uid] = (counts[uid] || 0) + 1;
  });

  let maxVotes = 0;
  let winnerUid = (cs.teams[cs.currentTeam] || [])[0];
  Object.entries(counts).forEach(([uid, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      winnerUid = uid;
    }
  });

  const { charadesChallenges } = await import('../data/charadesData');
  const challenge = charadesChallenges[Math.floor(Math.random() * charadesChallenges.length)];

  const acted = { ...(cs.actedPlayers || { A: [], B: [] }) };
  const currentActed = [...(acted[cs.currentTeam] || [])];
  if (!currentActed.includes(winnerUid)) {
    currentActed.push(winnerUid);
  }
  if (currentActed.length >= (cs.teams[cs.currentTeam] || []).length) {
    acted[cs.currentTeam] = [];
  } else {
    acted[cs.currentTeam] = currentActed;
  }

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'acting',
    'charadesState.currentActorUid': winnerUid,
    'charadesState.currentChallenge': challenge.text,
    'charadesState.timeEndsAt': Date.now() + CHARADES_TIME * 1000,
    'charadesState.guessedCorrectly': false,
    'charadesState.actorVotes': {},
    'charadesState.actedPlayers': acted,
  });
}

export async function charadesSubmitGuess(roomCode, uid, guess) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'acting') return { correct: false };

  const team = cs.currentTeam;
  const isOnCurrentTeam = cs.teams[team]?.includes(uid);
  if (!isOnCurrentTeam) return { correct: false };

  const titleNorm = normalizeArabic(cs.currentTitle || '');
  const guessNorm = normalizeArabic(guess);
  const correct = titleNorm === guessNorm;

  const timeLeft = Math.max(0, Math.round((cs.timeEndsAt - Date.now()) / 1000));
  const halfTime = CHARADES_TIME / 2;
  const points = correct ? (timeLeft >= halfTime ? 3 : 1) : 0;
  const newScore = correct ? (cs.scores[team] || 0) + points : (cs.scores[team] || 0);
  const wonGame = correct && newScore >= (cs.scoreTarget || 20);

  const patch = {
    'charadesState.guessedCorrectly': correct,
    'charadesState.phase': wonGame ? 'gameOver' : 'roundResult',
    'charadesState.phaseData': { guesser: uid, timeLeft, points, correct, beforeHalf: timeLeft >= halfTime },
  };
  if (correct) {
    patch[`charadesState.scores.${team}`] = newScore;
    patch['charadesState.roundsHistory'] = [
      ...(cs.roundsHistory || []),
      {
        team, actor: cs.currentActorUid, title: cs.currentTitle,
        challenge: cs.currentChallenge, guessedCorrectly: true,
        guesser: uid, points,
      },
    ];
  }
  if (wonGame) {
    patch['status'] = 'charades_over';
  }
  await updateDoc(doc(db, 'rooms', roomCode), patch);
  return { correct, points };
}

export async function charadesHostConfirmCorrect(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'acting') return;

  const team = cs.currentTeam;
  const timeLeft = Math.max(0, Math.round((cs.timeEndsAt - Date.now()) / 1000));
  const halfTime = CHARADES_TIME / 2;
  const points = timeLeft >= halfTime ? 3 : 1;
  const newScore = (cs.scores[team] || 0) + points;
  const wonGame = newScore >= (cs.scoreTarget || 20);

  const patch = {
    'charadesState.guessedCorrectly': true,
    'charadesState.phase': wonGame ? 'gameOver' : 'roundResult',
    'charadesState.phaseData': { correct: true, timeLeft, points, beforeHalf: timeLeft >= halfTime },
    [`charadesState.scores.${team}`]: newScore,
    'charadesState.roundsHistory': [
      ...(cs.roundsHistory || []),
      {
        team, actor: cs.currentActorUid, title: cs.currentTitle,
        challenge: cs.currentChallenge, guessedCorrectly: true,
        guesser: 'host', points,
      },
    ],
  };
  if (wonGame) {
    patch['status'] = 'charades_over';
  }
  await updateDoc(doc(db, 'rooms', roomCode), patch);
}

export async function charadesEndRound(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  const patch = {
    'charadesState.phase': 'roundResult',
    'charadesState.phaseData': { guessedCorrectly: false, timeLeft: 0, points: 0, correct: false },
  };

  if (!cs.guessedCorrectly) {
    patch['charadesState.roundsHistory'] = [
      ...(cs.roundsHistory || []),
      {
        team: cs.currentTeam, actor: cs.currentActorUid, title: cs.currentTitle,
        challenge: cs.currentChallenge, guessedCorrectly: false,
        guesser: null, points: 0,
      },
    ];
  }

  await updateDoc(doc(db, 'rooms', roomCode), patch);
}

export async function charadesNextRound(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  const scoreTarget = cs.scoreTarget || 20;
  if ((cs.scores?.A || 0) >= scoreTarget || (cs.scores?.B || 0) >= scoreTarget || cs.roundNumber >= 10) {
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'charades_over',
      'charadesState.phase': 'gameOver',
    });
    return;
  }

  const nextTeam = cs.currentTeam === 'A' ? 'B' : 'A';

  const { charadesMovies, charadesPlays } = await import('../data/charadesData');
  const allTitles = [
    ...charadesMovies.map(m => ({ title: m.title, emoji: m.emoji, type: 'movie' })),
    ...charadesPlays.map(p => ({ title: p.title, emoji: p.emoji, type: 'play' })),
  ];
  const shuffled = [...allTitles].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, 3);

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'titleVote',
    'charadesState.currentTeam': nextTeam,
    'charadesState.roundNumber': cs.roundNumber + 1,
    'charadesState.titleOptions': options,
    'charadesState.titleVotes': {},
    'charadesState.actorVotes': {},
    'charadesState.currentActorUid': null,
    'charadesState.currentTitle': null,
    'charadesState.currentTitleType': null,
    'charadesState.currentChallenge': null,
    'charadesState.timeEndsAt': null,
    'charadesState.guessedCorrectly': false,
    'charadesState.phaseData': null,
  });
}
