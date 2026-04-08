import {
  doc, getDoc, updateDoc,
} from 'firebase/firestore';
import { db } from './config';
import { pickCharadesOptions, maybeGetChallenge } from '../data/charadesData';

function getOpposingTeam(team) {
  return team === 'A' ? 'B' : 'A';
}

export async function startCharadesGame(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const scoreTarget = room.scoreTarget || 20;
  const charadesTime = room.charadesTime || 60;

  await updateDoc(doc(db, 'rooms', roomCode), {
    status: 'playing',
    charadesState: {
      phase: 'chooseTeam',
      choosingTeam: 'A',
      teams: { A: [], B: [] },
      teamLeaders: { A: null, B: null },
      actedPlayers: { A: [], B: [] },
      roundNumber: 1,
      scores: { A: 0, B: 0 },
      scoreTarget,
      charadesTime,
      excludedTitles: [],
      titleOptions: null,
      titleVotes: {},
      voteTimerEndsAt: null,
      actorVotes: {},
      currentActorUid: null,
      currentTitle: null,
      currentTitleType: null,
      currentChallenge: null,
      actorReady: false,
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

export async function charadesSetTeamLeader(roomCode, team, uid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'chooseTeam') return;
  if (!(cs.teams[team] || []).includes(uid)) return;

  await updateDoc(doc(db, 'rooms', roomCode), {
    [`charadesState.teamLeaders.${team}`]: uid,
  });
}

export async function charadesConfirmTeams(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  const room = snap.data();
  const allPlayers = room.playerOrder || [];
  const hostUid = room.hostUid;
  let teams = {
    A: [...(cs.teams.A || [])],
    B: [...(cs.teams.B || [])],
  };

  const unassigned = allPlayers.filter(uid => !teams.A.includes(uid) && !teams.B.includes(uid));
  for (const uid of unassigned) {
    if (teams.A.length <= teams.B.length) teams.A.push(uid);
    else teams.B.push(uid);
  }

  let teamLeaders = { ...(cs.teamLeaders || { A: null, B: null }) };
  
  // Host is always leader of their team
  if (teams.A.includes(hostUid)) teamLeaders.A = hostUid;
  else if (teams.B.includes(hostUid)) teamLeaders.B = hostUid;

  // Ensure other team has a leader too
  if (!teamLeaders.A && teams.A.length > 0) teamLeaders.A = teams.A[0];
  if (!teamLeaders.B && teams.B.length > 0) teamLeaders.B = teams.B[0];

  const options = pickCharadesOptions([]);

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'titleVote',
    'charadesState.teams': teams,
    'charadesState.teamLeaders': teamLeaders,
    'charadesState.titleOptions': options,
    'charadesState.titleVotes': {},
    'charadesState.actorVotes': {},
    'charadesState.voteTimerEndsAt': null,
  });
}

export async function charadesVoteTitle(roomCode, uid, optionIndex) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'titleVote') return;

  const choosingTeamMembers = cs.teams[cs.choosingTeam] || [];
  if (!choosingTeamMembers.includes(uid)) return;

  const votes = { ...(cs.titleVotes || {}) };
  votes[uid] = optionIndex;

  const patch = {
    'charadesState.titleVotes': votes,
  };

  if (!cs.voteTimerEndsAt && Object.keys(votes).length >= 1) {
    patch['charadesState.voteTimerEndsAt'] = Date.now() + 10000;
  }

  await updateDoc(doc(db, 'rooms', roomCode), patch);
}

export async function charadesResolveTitle(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'titleVote' || !cs.titleOptions?.length) return;

  const votes = cs.titleVotes || {};
  const counts = {};
  // If no one voted, we'll pick first option
  if (Object.keys(votes).length === 0) {
    counts[0] = 1;
  } else {
    Object.values(votes).forEach(idx => {
      counts[idx] = (counts[idx] || 0) + 1;
    });
  }

  let maxVotes = -1;
  let winnerIdx = 0;
  Object.entries(counts).forEach(([idx, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      winnerIdx = parseInt(idx);
    }
  });

  const winner = cs.titleOptions[winnerIdx] || cs.titleOptions[0];
  const newExcluded = [...(cs.excludedTitles || []), winner.title];

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'selectActor',
    'charadesState.currentTitle': winner.title,
    'charadesState.currentTitleType': winner.type,
    'charadesState.titleVotes': {},
    'charadesState.excludedTitles': newExcluded,
    'charadesState.voteTimerEndsAt': null,
  });
}

export async function charadesVoteActor(roomCode, uid, actorUid) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'selectActor') return;

  const choosingTeamMembers = cs.teams[cs.choosingTeam] || [];
  if (!choosingTeamMembers.includes(uid)) return;

  const guessingTeam = getOpposingTeam(cs.choosingTeam);
  const guessingTeamMembers = cs.teams[guessingTeam] || [];
  if (!guessingTeamMembers.includes(actorUid)) return;

  const votes = { ...(cs.actorVotes || {}) };
  votes[uid] = actorUid;

  const patch = {
    'charadesState.actorVotes': votes,
  };

  if (!cs.voteTimerEndsAt) {
    patch['charadesState.voteTimerEndsAt'] = Date.now() + 10000;
  }

  await updateDoc(doc(db, 'rooms', roomCode), patch);
}

export async function charadesResolveActor(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'selectActor') return;

  const guessingTeam = getOpposingTeam(cs.choosingTeam);
  const guessingTeamMembers = cs.teams[guessingTeam] || [];

  const votes = cs.actorVotes || {};
  const counts = {};
  
  if (Object.keys(votes).length === 0) {
    // Pick someone who hasn't acted yet, or just anyone if all acted
    const actedSet = new Set(cs.actedPlayers?.[guessingTeam] || []);
    const candidates = guessingTeamMembers.filter(uid => !actedSet.has(uid));
    const fallback = candidates.length > 0 ? candidates[0] : guessingTeamMembers[0];
    counts[fallback] = 1;
  } else {
    Object.values(votes).forEach(uid => {
      counts[uid] = (counts[uid] || 0) + 1;
    });
  }

  let maxVotes = -1;
  let winnerUid = guessingTeamMembers[0];
  Object.entries(counts).forEach(([uid, count]) => {
    if (count > maxVotes && guessingTeamMembers.includes(uid)) {
      maxVotes = count;
      winnerUid = uid;
    }
  });

  const challenge = maybeGetChallenge();

  const acted = { ...(cs.actedPlayers || { A: [], B: [] }) };
  const currentActed = [...(acted[guessingTeam] || [])];
  if (!currentActed.includes(winnerUid)) {
    currentActed.push(winnerUid);
  }
  if (currentActed.length >= guessingTeamMembers.length) {
    acted[guessingTeam] = [];
  } else {
    acted[guessingTeam] = currentActed;
  }

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'acting',
    'charadesState.currentActorUid': winnerUid,
    'charadesState.currentChallenge': challenge ? challenge.text : null,
    'charadesState.actorReady': false,
    'charadesState.prepTimerEndsAt': Date.now() + 20000, // 20s prep
    'charadesState.timeEndsAt': null,
    'charadesState.guessedCorrectly': false,
    'charadesState.actorVotes': {},
    'charadesState.actedPlayers': acted,
    'charadesState.voteTimerEndsAt': null,
  });
}

export async function charadesActorReady(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs || cs.phase !== 'acting' || cs.actorReady) return;

  const charadesTime = cs.charadesTime || 60;

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.actorReady': true,
    'charadesState.prepTimerEndsAt': null,
    'charadesState.timeEndsAt': Date.now() + charadesTime * 1000,
  });
}

export async function charadesHostConfirmCorrect(roomCode) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const room = snap.data();
  const cs = room?.charadesState;
  if (!cs || cs.phase !== 'acting') return;

  const guessingTeam = getOpposingTeam(cs.choosingTeam);
  const charadesTime = cs.charadesTime || 60;
  const halfTime = charadesTime / 2;
  const timeLeft = cs.timeEndsAt ? Math.max(0, Math.round((cs.timeEndsAt - Date.now()) / 1000)) : charadesTime;

  // نقطتين لو جاوبوا قبل نص الوقت، نقطة واحدة لو بعد نص الوقت
  const beforeHalf = timeLeft > halfTime;
  const points = beforeHalf ? 2 : 1;

  const newScore = (cs.scores[guessingTeam] || 0) + points;
  const wonGame = newScore >= (cs.scoreTarget || 20);

  const patch = {
    'charadesState.guessedCorrectly': true,
    'charadesState.phase': wonGame ? 'gameOver' : 'roundResult',
    'charadesState.phaseData': { correct: true, timeLeft, points, beforeHalf },
    [`charadesState.scores.${guessingTeam}`]: newScore,
    'charadesState.roundsHistory': [
      ...(cs.roundsHistory || []),
      {
        choosingTeam: cs.choosingTeam, guessingTeam, actor: cs.currentActorUid,
        title: cs.currentTitle, challenge: cs.currentChallenge,
        guessedCorrectly: true, guesser: 'host', points, beforeHalf,
      },
    ],
  };
  if (wonGame) {
    patch['status'] = 'charades_over';
  }
  await updateDoc(doc(db, 'rooms', roomCode), patch);
}

export async function charadesLeaderAdjustScore(roomCode, team, delta) {
  const snap = await getDoc(doc(db, 'rooms', roomCode));
  const cs = snap.data()?.charadesState;
  if (!cs) return;

  const current = cs.scores?.[team] || 0;
  const newScore = Math.max(0, current + delta);

  await updateDoc(doc(db, 'rooms', roomCode), {
    [`charadesState.scores.${team}`]: newScore,
  });
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
    const guessingTeam = getOpposingTeam(cs.choosingTeam);
    patch['charadesState.roundsHistory'] = [
      ...(cs.roundsHistory || []),
      {
        choosingTeam: cs.choosingTeam, guessingTeam, actor: cs.currentActorUid,
        title: cs.currentTitle, challenge: cs.currentChallenge,
        guessedCorrectly: false, guesser: null, points: 0,
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
  if ((cs.scores?.A || 0) >= scoreTarget || (cs.scores?.B || 0) >= scoreTarget || cs.roundNumber >= 20) {
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'charades_over',
      'charadesState.phase': 'gameOver',
    });
    return;
  }

  const nextChoosingTeam = getOpposingTeam(cs.choosingTeam);
  const excluded = cs.excludedTitles || [];
  const options = pickCharadesOptions(excluded);

  await updateDoc(doc(db, 'rooms', roomCode), {
    'charadesState.phase': 'titleVote',
    'charadesState.choosingTeam': nextChoosingTeam,
    'charadesState.roundNumber': cs.roundNumber + 1,
    'charadesState.titleOptions': options,
    'charadesState.titleVotes': {},
    'charadesState.actorVotes': {},
    'charadesState.currentActorUid': null,
    'charadesState.currentTitle': null,
    'charadesState.currentTitleType': null,
    'charadesState.currentChallenge': null,
    'charadesState.actorReady': false,
    'charadesState.timeEndsAt': null,
    'charadesState.guessedCorrectly': false,
    'charadesState.phaseData': null,
    'charadesState.voteTimerEndsAt': null,
  });
}
