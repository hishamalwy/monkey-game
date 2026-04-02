import { useState, useEffect, useRef, useCallback } from 'react';
import { serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { listenToRoom, updateGameState, leaveRoom, resolveChallenge } from '../firebase/rooms';
import { normalizeArabic } from '../utils/textUtils';
import { appCategories } from '../data/categories';
import { playSound, getHornType, startHorn, stopHorn, warmAudio } from '../utils/audio';

const MONKEY_LIMIT = 4; // 4 أرباع = قرد كامل = خروج

function checkGameOver(players, playerOrder) {
  return playerOrder.filter(uid => players[uid] && (players[uid].quarterMonkeys || 0) < MONKEY_LIMIT);
}

// syncHornState was removed - now using Socket.io for low-latency events

export function useRoom(roomCode) {
  const [room, setRoom] = useState(null);
  const [computedTimer, setComputedTimer] = useState(null);
  const timerRef = useRef(null);
  const penaltyFiredRef = useRef(false); // prevent double-fire on timer
  const penaltyProcessingRef = useRef(false); // Prevent concurrent penalty updates
  const prevPlayerUidRef = useRef(null); // Track previous player for penalty reset
  const prevStatusRef = useRef(null); // Track previous status for penalty reset
  const uid = auth.currentUser?.uid;

  const remoteHornPlayingRef = useRef(false);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = listenToRoom(roomCode, (data) => {
      setRoom(data);

      // Reset penalty guard reliably
      const curPlayerUid = data?.gameState?.currentPlayerUid;
      const curStatus = data?.status;
      if (curPlayerUid !== prevPlayerUidRef.current || curStatus !== prevStatusRef.current) {
        penaltyFiredRef.current = false;
      }
      prevPlayerUidRef.current = curPlayerUid;
      prevStatusRef.current = curStatus;

      // Firestore Sound Sync (Fallback/Secondary)
      const isHonking = data?.gameState?.isHonking;
      const isRemoteHonker = isHonking && data.gameState.honkerUid !== uid;
      if (isRemoteHonker && !remoteHornPlayingRef.current) {
        remoteHornPlayingRef.current = true;
        startHorn(data.gameState.lastHornType || 'classic');
      } else if (!isHonking && remoteHornPlayingRef.current) {
        remoteHornPlayingRef.current = false;
        stopHorn();
      }
    });
    return unsub;
  }, [roomCode, uid]);

  // Client-side timer
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
    
    // Check up to next N-1 players to find a survivor
    for (let i = 1; i <= order.length; i++) {
      const candidateUid = order[(currentIdx + i) % order.length];
      const p = playersMap[candidateUid];
      if (p && (p.quarterMonkeys || 0) < MONKEY_LIMIT) return candidateUid;
    }
    return room.gameState.currentPlayerUid; // Should not happen with game over check
  }, [room]);

  // ── Apply penalty & check for game over ──────────────────────
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

      // Game over if only 1 (or 0) survivors
      if (surviving.length <= 1) {
        playSound('win');
        const winnerUid = surviving[0] || null;
        await updateGameState(roomCode, {
          status: 'game_over',
          players: newPlayers,
          lastResult: { type: 'game_over', loserUid, winnerUid, reason },
        });
        return;
      }

      playSound('lose');
      await updateGameState(roomCode, {
        status: 'round_result',
        players: newPlayers,
        lastResult: { type, loserUid, reason },
      });
    } finally {
      penaltyProcessingRef.current = false;
    }
  }, [room, roomCode]);

  // ── Letter press ─────────────────────────────────────────────
  const pressLetter = useCallback(async (letter) => {
    if (!isMyTurn || !room) return;
    const newWordString = (room.gameState.currentWord || '') + letter;
    const normNewWord = normalizeArabic(newWordString);
    const usedWords = room.gameState.usedWords || [];

    const cat = appCategories.find(c => c.id === room.category) || appCategories[0];
    const categoryWords = cat.words;
    const normalizedCategory = categoryWords.map(w => normalizeArabic(w));

    // A word is only "Complete" if it's in the category, not already used,
    // AND doesn't have any continuations in the category (that are also not used).
    const exactIdx = normalizedCategory.findIndex(w => w === normNewWord);
    const isAlreadyUsed = usedWords.includes(normNewWord);

    // Filter available words starting with current word prefix
    const continuations = normalizedCategory.filter(w => 
       w.startsWith(normNewWord) && w.length > normNewWord.length && !usedWords.includes(w)
    );

    if (exactIdx !== -1 && !isAlreadyUsed && continuations.length === 0) {
      playSound('win');
      await updateGameState(roomCode, {
        status: 'round_result',
        'gameState.currentWord': newWordString,
        'gameState.usedWords': [...usedWords, normNewWord],
        lastResult: {
          type: 'word_complete',
          winnerUid: uid,
          word: categoryWords[exactIdx],
          reason: `اكتملت الكلمة! ✓  الإجابة: ${categoryWords[exactIdx]}`,
        },
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

  // ── Delete ───────────────────────────────────────────────────
  const pressDelete = useCallback(async () => {
    if (!isMyTurn || !room) return;
    const word = room.gameState.currentWord || '';
    if (!word) return;
    await updateGameState(roomCode, { 'gameState.currentWord': word.slice(0, -1) });
  }, [isMyTurn, room, roomCode]);

  // ── Challenge ────────────────────────────────────────────────
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
    });
  }, [isMyTurn, room, roomCode, uid]);

  // الهوست أو النظام ينهي التحدي
  const resolveSuspect = useCallback(async (isValid) => {
    if (!room || room.status !== 'suspect_question') return;
    const { suspectedUid, challengerUid, suspectAnswer } = room.gameState;

    if (isValid) {
      // المشتبه به صح -> المتحدي ياخد ربع قرد
      await applyPenalty(challengerUid, `المشتبه به كان صادقاً! الكلمة: ${suspectAnswer}`, 'challenge_failed');
    } else {
      // المشتبه به غلط -> هو اللي ياخد ربع قرد
      await applyPenalty(suspectedUid, `التحدي ناجح! الكلمة غير صحيحة أو لا تكمل ما سبق.`, 'challenge_success');
    }
  }, [room, applyPenalty]);

  // المشتبه به يدخل الكلمة
  const submitSuspectWord = useCallback(async (answer) => {
    if (!room || room.status !== 'suspect_question') return;
    await updateGameState(roomCode, { 'gameState.suspectAnswer': answer });
    
    // Automatic Check & Resolution
    const cat = appCategories.find(c => c.id === room.category) || appCategories[0];
    const normalizedWords = cat.words.map(w => normalizeArabic(w));
    const ansNorm = normalizeArabic(answer);
    const challengingNorm = normalizeArabic(room.gameState.challengingWord || '');

    const isValid = normalizedWords.some(w => w === ansNorm) && ansNorm.startsWith(challengingNorm);

    if (isValid) {
      // If it exists in JSON perfectly, resolve automatically
      // We wait a tiny bit to let the Answer update show on others' screens
      setTimeout(async () => {
         await resolveSuspect(true);
      }, 1000);
    }
  }, [room, roomCode, resolveSuspect]);

  // ── Next round ───────────────────────────────────────────────
  const confirmNextRound = useCallback(async () => {
    if (!isHost || !room) return;
    const loserUid = room.lastResult?.loserUid || room.gameState?.currentPlayerUid;
    const order = room.playerOrder || [];
    // Start from loser's position, skip eliminated players
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

  // ── Leave room ───────────────────────────────────────────────
  const doLeaveRoom = useCallback(async () => {
    await leaveRoom(roomCode, uid, isHost);
  }, [roomCode, uid, isHost]);

  // ── Timer expiry — scheduled from real Firestore timestamp ─────────
  useEffect(() => {
    if (!isHost || !room?.timeLimit || room.timeLimit === 0 || room.status !== 'playing') return;
    const { timeRemainingAtLastAction, lastActionAt } = room.gameState || {};
    if (!lastActionAt || !timeRemainingAtLastAction) return;

    const expiresAt = lastActionAt.toMillis() + timeRemainingAtLastAction * 1000;
    const msLeft = expiresAt - Date.now();

    // If the round already expired before we got here, skip — prevents
    // firing a fresh penalty the instant a new round starts (race fix).
    if (msLeft <= 0) return;

    const timeoutId = setTimeout(() => {
      if (penaltyFiredRef.current) return;
      penaltyFiredRef.current = true;
      applyPenalty(room.gameState.currentPlayerUid, 'انتهى الوقت! ⏰', 'timeout');
    }, msLeft);

    return () => clearTimeout(timeoutId);
  }, [isHost, room?.gameState?.lastActionAt, room?.gameState?.timeRemainingAtLastAction, room?.status]);

  const resetToLobby = useCallback(async () => {
    if (!isHost) return;
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'lobby',
      'drawState.roundStatus': 'none',
      'gameState.currentWord': '',
    });
  }, [isHost, roomCode]);

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
    resetToLobby,
    triggerHorn: (on) => {
      updateGameState(roomCode, { 
        'gameState.isHonking': on,
        'gameState.honkerUid': on ? uid : null,
        'gameState.lastHornType': getHornType()
      });
    },
  };
}
