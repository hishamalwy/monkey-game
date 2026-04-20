import { useState, useEffect, useRef, useCallback } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { listenToRoom, updateGameState, leaveRoom, resetRoomToLobby } from '../firebase/rooms';
import { normalizeArabic } from '../utils/textUtils';
import { appCategories } from '../data/categories';
import { playSound, getHornType, startHorn, stopHorn } from '../utils/audio';
import { isPlayerMuted } from '../services/socket';

const MONKEY_LIMIT = 4;

function checkGameOver(players, playerOrder) {
  return playerOrder.filter(uid => players[uid] && (players[uid].quarterMonkeys || 0) < MONKEY_LIMIT);
}

export function useRoom(roomCode) {
  const [room, setRoom] = useState(undefined);
  const [computedTimer, setComputedTimer] = useState(null);
  const timerRef = useRef(null);
  const penaltyFiredRef = useRef(false);
  const penaltyProcessingRef = useRef(false);
  const prevPlayerUidRef = useRef(null);
  const prevStatusRef = useRef(null);
  const uid = auth.currentUser?.uid;

  const remoteHornPlayingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopHorn();
    };
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = listenToRoom(roomCode, (data) => {
      setRoom(data);

      const curPlayerUid = data?.gameState?.currentPlayerUid;
      const curStatus = data?.status;
      if (curPlayerUid !== prevPlayerUidRef.current || curStatus !== prevStatusRef.current) {
        penaltyFiredRef.current = false;
      }
      prevPlayerUidRef.current = curPlayerUid;
      prevStatusRef.current = curStatus;

      const isHonking = data?.gameState?.isHonking;
      const isRemoteHonker = isHonking && data.gameState.honkerUid !== uid;
      if (isRemoteHonker && !remoteHornPlayingRef.current) {
        if (!isPlayerMuted(data.gameState.honkerUid)) {
          remoteHornPlayingRef.current = true;
          startHorn(data.gameState.lastHornType || 'classic');
        }
      } else if (!isHonking && remoteHornPlayingRef.current) {
        remoteHornPlayingRef.current = false;
        stopHorn();
      }
    });
    return unsub;
  }, [roomCode, uid]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!room?.gameState || !room?.timeLimit || room.timeLimit === 0) {
      setComputedTimer(null);
      return;
    }
    const { timeRemainingAtLastAction, lastActionAt } = room.gameState;
    if (!lastActionAt) { setComputedTimer(timeRemainingAtLastAction); return; }

    const tick = () => {
      const elapsed = (Date.now() - lastActionAt.toMillis()) / 1000;
      setComputedTimer(Math.max(0, Math.ceil(timeRemainingAtLastAction - elapsed)));
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [room?.gameState?.lastActionAt, room?.gameState?.timeRemainingAtLastAction, room?.timeLimit]);

  const isMyTurn = room?.gameState?.currentPlayerUid === uid;
  const isHost = room?.hostUid === uid;
  const players = room ? (room.playerOrder || []).map(id => room.players[id]).filter(Boolean) : [];

  const nextPlayerUid = useCallback(() => {
    if (!room) return null;
    const order = room.playerOrder || [];
    const playersMap = room.players;
    const currentIdx = order.indexOf(room.gameState.currentPlayerUid);

    for (let i = 1; i <= order.length; i++) {
      const candidateUid = order[(currentIdx + i) % order.length];
      const p = playersMap[candidateUid];
      if (p && (p.quarterMonkeys || 0) < MONKEY_LIMIT) return candidateUid;
    }
    return room.gameState.currentPlayerUid;
  }, [room]);

  const applyPenalty = useCallback(async (loserUid, reason, type = 'penalty') => {
    if (!room || (room.status !== 'playing' && room.status !== 'suspect_question') || penaltyProcessingRef.current) return;
    penaltyProcessingRef.current = true;

    try {
      const newPlayers = { ...room.players };
      if (newPlayers[loserUid]) {
        newPlayers[loserUid] = {
          ...newPlayers[loserUid],
          quarterMonkeys: (newPlayers[loserUid].quarterMonkeys || 0) + 1,
        };
      }

      const surviving = checkGameOver(newPlayers, room.playerOrder || []);

      if (surviving.length <= 1) {
        playSound('win');
        const winnerUid = surviving[0] || null;
        await updateGameState(roomCode, {
          status: 'game_over',
          players: newPlayers,
          lastResult: { type: 'game_over', loserUid, winnerUid, reason },
          'gameState.isHonking': false,
          'gameState.honkerUid': null,
        });
        return;
      }

      playSound('lose');
      await updateGameState(roomCode, {
        status: 'round_result',
        players: newPlayers,
        lastResult: { type, loserUid, reason },
        'gameState.isHonking': false,
        'gameState.honkerUid': null,
      });
    } finally {
      penaltyProcessingRef.current = false;
    }
  }, [room, roomCode]);

  const pressLetter = useCallback(async (letter) => {
    if (!isMyTurn || !room) return;
    const currentWord = (room.gameState.currentWord || '');
    const newWordString = currentWord + letter;
    const normNewWord = normalizeArabic(newWordString);
    const usedWords = room.gameState.usedWords || [];

    const cat = appCategories.find(c => c.id === room.category) || appCategories[0];
    const categoryWords = cat.words;
    const normalizedCategory = categoryWords.map(w => normalizeArabic(w));

    const exactIdx = normalizedCategory.findIndex(w => w === normNewWord);

    if (exactIdx !== -1 && !usedWords.map(w => normalizeArabic(w)).includes(normNewWord)) {
       playSound('win');
       const updatedUsed = [...usedWords, normNewWord];

       await updateGameState(roomCode, {
          status: 'round_result',
          'gameState.currentWord': newWordString,
          'gameState.usedWords': updatedUsed,
          lastResult: {
            type: 'word_complete',
            loserUid: null,
            reason: `اكتملت الدولة: ${categoryWords[exactIdx]}`,
            word: categoryWords[exactIdx],
          },
          'gameState.isHonking': false,
          'gameState.honkerUid': null,
       });
       return;
    }

    playSound('click');
    await updateGameState(roomCode, {
      'gameState.currentWord': newWordString,
      'gameState.currentPlayerUid': nextPlayerUid(),
      'gameState.timeRemainingAtLastAction': room.timeLimit,
      'gameState.lastActionAt': serverTimestamp(),
    });
  }, [isMyTurn, room, roomCode, uid, nextPlayerUid, applyPenalty]);

  const pressDelete = useCallback(async () => {
    if (!isMyTurn || !room) return;
    const word = room.gameState.currentWord || '';
    if (!word) return;
    await updateGameState(roomCode, { 'gameState.currentWord': word.slice(0, -1) });
  }, [isMyTurn, room, roomCode]);

  const pressChallenge = useCallback(async () => {
    if (!isMyTurn || !room) return;
    const word = room.gameState.currentWord || '';
    if (!word) return;

    playSound('alert');
    const order = room.playerOrder || [];
    const myIdx = order.indexOf(uid);
    const prevUid = order[myIdx === 0 ? order.length - 1 : myIdx - 1];

    await updateGameState(roomCode, {
      status: 'suspect_question',
      'gameState.suspectedUid': prevUid,
      'gameState.challengerUid': uid,
      'gameState.challengingWord': word,
      'gameState.suspectAnswer': '',
      'gameState.isHonking': false,
      'gameState.honkerUid': null,
    });
  }, [isMyTurn, room, roomCode, uid]);

  const resolveSuspect = useCallback(async (isValid) => {
    if (!room || room.status !== 'suspect_question') return;
    const { suspectedUid, challengerUid, suspectAnswer, challengingWord } = room.gameState;

    const isActuallyLonger = (suspectAnswer || '').length > (challengingWord || '').length;

    if (isValid && suspectAnswer) {
       const usedWords = room.gameState.usedWords || [];
       const ansNorm = normalizeArabic(suspectAnswer);
       await updateGameState(roomCode, { 'gameState.usedWords': [...usedWords, ansNorm] });
    }

    if (isValid && isActuallyLonger) {
      await applyPenalty(challengerUid, `المشتبه به كان صادقاً! الكلمة: ${suspectAnswer}`, 'challenge_failed');
    } else {
      const reason = !isValid
        ? `التحدي ناجح! الكلمة غير صحيحة أو لا تكمل ما سبق.`
        : `خسرت لأنك أكملت كلمة! الكلمة: ${suspectAnswer}`;
      await applyPenalty(suspectedUid, reason, 'challenge_success');
    }
  }, [room, applyPenalty, roomCode]);

  const submitSuspectWord = useCallback(async (answer) => {
    if (!room || room.status !== 'suspect_question') return;
    await updateGameState(roomCode, { 'gameState.suspectAnswer': answer });
  }, [room, roomCode]);

  const confirmNextRound = useCallback(async () => {
    if (!isHost || !room) return;
    const loserUid = room.lastResult?.loserUid || room.gameState?.currentPlayerUid;
    const order = room.playerOrder || [];
    let nextUid = loserUid;
    for (let i = 0; i < order.length; i++) {
      const candidate = order[(order.indexOf(loserUid) + i) % order.length];
      if (room.players[candidate] && (room.players[candidate].quarterMonkeys || 0) < MONKEY_LIMIT) {
        nextUid = candidate; break;
      }
    }

    penaltyFiredRef.current = false;
    await updateGameState(roomCode, {
      status: 'playing',
      lastResult: null,
      'gameState.currentWord': '',
      'gameState.currentPlayerUid': nextUid,
      'gameState.usedWords': room.gameState.usedWords || [],
      'gameState.timeRemainingAtLastAction': room.timeLimit,
      'gameState.lastActionAt': serverTimestamp(),
    });
  }, [isHost, room, roomCode]);

  const doLeaveRoom = useCallback(async () => {
    await leaveRoom(roomCode, uid);
  }, [roomCode, uid]);

  useEffect(() => {
    if (!isHost || !room?.timeLimit || room.timeLimit === 0 || room.status !== 'playing') return;
    const { timeRemainingAtLastAction, lastActionAt } = room.gameState || {};
    if (!lastActionAt || !timeRemainingAtLastAction) return;

    const expiresAt = lastActionAt.toMillis() + timeRemainingAtLastAction * 1000;
    const msLeft = expiresAt - Date.now();

    if (msLeft <= 0) return;

    const timeoutId = setTimeout(() => {
      if (penaltyFiredRef.current) return;
      penaltyFiredRef.current = true;
      applyPenalty(room.gameState.currentPlayerUid, 'انتهى الوقت! ⏰', 'timeout');
    }, msLeft);

    return () => clearTimeout(timeoutId);
  }, [isHost, room?.gameState?.lastActionAt, room?.gameState?.timeRemainingAtLastAction, room?.status]);

  const resetToLobbyFn = useCallback(async () => {
    if (!isHost) return;
    await resetRoomToLobby(roomCode, uid);
  }, [isHost, roomCode, uid]);

  return {
    room,
    players,
    isMyTurn,
    isHost,
    computedTimer,
    pressLetter,
    pressDelete,
    pressChallenge,
    confirmNextRound,
    submitSuspectWord,
    resolveSuspect,
    leaveRoom: doLeaveRoom,
    resetToLobby: resetToLobbyFn,
    triggerHorn: (on) => {
      updateGameState(roomCode, {
        'gameState.isHonking': on,
        'gameState.honkerUid': on ? uid : null,
        'gameState.lastHornType': getHornType(),
      });
    },
  };
}
