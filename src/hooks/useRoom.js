import { useState, useEffect, useRef, useCallback } from 'react';
import { serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { listenToRoom, updateGameState, leaveRoom, resolveChallenge } from '../firebase/rooms';
import { normalizeArabic } from '../utils/aiLogic';
import { appCategories } from '../data/categories';
import { playSound, getHornType } from '../utils/audio';

const MONKEY_LIMIT = 4; // 4 أرباع = قرد كامل = خروج

function checkGameOver(players, playerOrder) {
  return playerOrder.filter(uid => players[uid] && (players[uid].quarterMonkeys || 0) < MONKEY_LIMIT);
}

export async function triggerHorn(roomCode, hornType) {
  await updateGameState(roomCode, { 
    'gameState.lastHornAt': Date.now(),
    'gameState.lastHornType': hornType 
  });
}

export function useRoom(roomCode) {
  const [room, setRoom] = useState(null);
  const [computedTimer, setComputedTimer] = useState(null);
  const timerRef = useRef(null);
  const penaltyFiredRef = useRef(false); // prevent double-fire on timer
  const lastHornHandledRef = useRef(0); // Track last handled horn timestamp
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!roomCode) return;
    const unsub = listenToRoom(roomCode, (data) => {
      setRoom(data);
      // Reset penalty guard when turn of current player or game status changes
      if (data?.gameState?.currentPlayerUid !== room?.gameState?.currentPlayerUid || data?.status !== room?.status) {
        penaltyFiredRef.current = false;
      }
      
      // Listen for horn event
      if (data?.gameState?.lastHornAt && data.gameState.lastHornAt > lastHornHandledRef.current) {
        lastHornHandledRef.current = data.gameState.lastHornAt;
        if (data.gameState.currentPlayerUid !== uid) { 
           const typeToPlay = data.gameState.lastHornType || 'classic';
           previewHorn(typeToPlay); 
        }
      }
    });
    return unsub;
  }, [roomCode, room?.gameState?.currentPlayerUid, room?.status, uid]);

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
    if (!room) return;
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
  }, [room, roomCode]);

  // ── Letter press ─────────────────────────────────────────────
  const pressLetter = useCallback(async (letter) => {
    if (!isMyTurn || !room) return;
    const newWord = (room.gameState.currentWord || '') + letter;

    const cat = appCategories.find(c => c.id === room.category) || appCategories[0];
    const normalizedWords = cat.words.map(w => normalizeArabic(w));
    const exactIdx = normalizedWords.findIndex(w => w === normalizeArabic(newWord));

    if (exactIdx !== -1) {
      playSound('win');
      await updateGameState(roomCode, {
        status: 'round_result',
        'gameState.currentWord': newWord,
        lastResult: {
          type: 'word_complete',
          winnerUid: uid,
          word: cat.words[exactIdx],
          reason: `اكتملت الكلمة! ✓  الإجابة: ${cat.words[exactIdx]}`,
        },
      });
      return;
    }

    playSound('click');
    await updateGameState(roomCode, {
      'gameState.currentWord': newWord,
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
    const result = resolveChallenge(word, room.category);

    if (result.valid) {
      await applyPenalty(uid, `التحدي خاسر! الكلمة يمكن أن تكمل لتصبح: ${result.word}`, 'challenge');
    } else {
      await applyPenalty(prevUid, `التحدي ناجح! لا توجد كلمة تبدأ بـ: ${word}`, 'challenge');
    }
  }, [isMyTurn, room, roomCode, uid, applyPenalty]);

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

    await updateGameState(roomCode, {
      status: 'playing',
      lastResult: null,
      'gameState.currentWord': '',
      'gameState.currentPlayerUid': nextUid,
      'gameState.timeRemainingAtLastAction': room.timeLimit,
      'gameState.lastActionAt': serverTimestamp(),
    });
  }, [isHost, room, roomCode]);

  // ── Leave room ───────────────────────────────────────────────
  const doLeaveRoom = useCallback(async () => {
    await leaveRoom(roomCode, uid, isHost, room?.playerOrder);
  }, [roomCode, uid, isHost, room]);

  // ── Timer expiry (only active player writes) ─────────────────
  useEffect(() => {
    if (!isMyTurn || !room?.timeLimit || room.timeLimit === 0) return;
    if (room?.status !== 'playing') return;
    if (computedTimer === 0 && !penaltyFiredRef.current) {
      penaltyFiredRef.current = true;
      applyPenalty(uid, 'انتهى الوقت! ⏰', 'timeout');
    }
  }, [computedTimer, isMyTurn, room?.status]);

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
    triggerHorn: () => triggerHorn(roomCode, getHornType()),
    leaveRoom: doLeaveRoom,
    resetToLobby,
  };
}
