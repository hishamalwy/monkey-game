import { useState, useEffect, useRef, useCallback } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { listenToRoom, updateGameState, leaveRoom, resolveChallenge } from '../firebase/rooms';
import { normalizeArabic } from '../utils/aiLogic';
import { appCategories } from '../data/categories';
import { playSound } from '../utils/audio';

export function useRoom(roomCode) {
  const [room, setRoom] = useState(null);
  const [computedTimer, setComputedTimer] = useState(null);
  const timerRef = useRef(null);
  const uid = auth.currentUser?.uid;

  // Listen to Firestore room document
  useEffect(() => {
    if (!roomCode) return;
    const unsub = listenToRoom(roomCode, setRoom);
    return unsub;
  }, [roomCode]);

  // Client-side timer derived from lastActionAt + timeRemainingAtLastAction
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
      const remaining = Math.max(0, timeRemainingAtLastAction - elapsed);
      setComputedTimer(Math.ceil(remaining));
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [room?.gameState?.lastActionAt, room?.gameState?.timeRemainingAtLastAction, room?.timeLimit]);

  const isMyTurn = room?.gameState?.currentPlayerUid === uid;
  const isHost = room?.hostUid === uid;

  const players = room
    ? (room.playerOrder || []).map(id => room.players[id]).filter(Boolean)
    : [];

  const nextPlayerUid = useCallback(() => {
    if (!room) return null;
    const order = room.playerOrder || [];
    const idx = order.indexOf(room.gameState.currentPlayerUid);
    return order[(idx + 1) % order.length];
  }, [room]);

  const pressLetter = useCallback(async (letter) => {
    if (!isMyTurn || !room) return;
    const newWord = (room.gameState.currentWord || '') + letter;

    // Check if exact word
    const cat = appCategories.find(c => c.id === room.category) || appCategories[0];
    const normalizedWords = cat.words.map(w => normalizeArabic(w));
    const normalizedNew = normalizeArabic(newWord);
    const exactIdx = normalizedWords.findIndex(w => w === normalizedNew);

    if (exactIdx !== -1) {
      playSound('win');
      await updateGameState(roomCode, {
        status: 'round_result',
        'gameState.currentWord': newWord,
        lastResult: {
          type: 'word_complete',
          winnerUid: uid,
          word: cat.words[exactIdx],
          reason: `اكتملت الكلمة! الإجابة: ${cat.words[exactIdx]}`,
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
  }, [isMyTurn, room, roomCode, uid, nextPlayerUid]);

  const pressDelete = useCallback(async () => {
    if (!isMyTurn || !room) return;
    const word = room.gameState.currentWord || '';
    if (!word) return;
    await updateGameState(roomCode, {
      'gameState.currentWord': word.slice(0, -1),
    });
  }, [isMyTurn, room, roomCode]);

  const pressChallenge = useCallback(async () => {
    if (!isMyTurn || !room) return;
    const word = room.gameState.currentWord || '';
    if (!word) return;

    playSound('alert');
    const order = room.playerOrder || [];
    const myIdx = order.indexOf(uid);
    const prevUid = order[myIdx === 0 ? order.length - 1 : myIdx - 1];

    const result = resolveChallenge(word, room.category);

    let loserUid, reason;
    if (result.valid) {
      // Challenger (me) loses
      loserUid = uid;
      reason = `التحدي خاسر! الكلمة يمكن أن تكمل لتصبح: ${result.word}`;
    } else {
      // Previous player loses
      loserUid = prevUid;
      reason = `التحدي ناجح! لا توجد كلمة تبدأ بـ: ${word}`;
    }

    playSound('lose');
    const newPlayers = { ...room.players };
    if (newPlayers[loserUid]) {
      newPlayers[loserUid] = {
        ...newPlayers[loserUid],
        quarterMonkeys: (newPlayers[loserUid].quarterMonkeys || 0) + 1,
      };
    }

    await updateGameState(roomCode, {
      status: 'round_result',
      players: newPlayers,
      lastResult: { type: 'challenge', loserUid, reason },
    });
  }, [isMyTurn, room, roomCode, uid]);

  const confirmNextRound = useCallback(async () => {
    if (!isHost || !room) return;
    const loserUid = room.lastResult?.loserUid || room.gameState?.currentPlayerUid;
    const order = room.playerOrder || [];
    const loserIdx = order.indexOf(loserUid);
    const nextUid = order[loserIdx !== -1 ? loserIdx : 0];

    await updateGameState(roomCode, {
      status: 'playing',
      lastResult: null,
      'gameState.currentWord': '',
      'gameState.currentPlayerUid': nextUid,
      'gameState.timeRemainingAtLastAction': room.timeLimit,
      'gameState.lastActionAt': serverTimestamp(),
    });
  }, [isHost, room, roomCode]);

  const doLeaveRoom = useCallback(async () => {
    await leaveRoom(roomCode, uid, isHost, room?.playerOrder);
  }, [roomCode, uid, isHost, room]);

  // Timer expiry — only active player writes
  useEffect(() => {
    if (!isMyTurn || !room?.timeLimit || room.timeLimit === 0) return;
    if (computedTimer === 0) {
      const order = room.playerOrder || [];
      const newPlayers = { ...room.players };
      if (newPlayers[uid]) {
        newPlayers[uid] = { ...newPlayers[uid], quarterMonkeys: (newPlayers[uid].quarterMonkeys || 0) + 1 };
      }
      playSound('lose');
      updateGameState(roomCode, {
        status: 'round_result',
        players: newPlayers,
        lastResult: { type: 'timeout', loserUid: uid, reason: 'انتهى الوقت! ⏰' },
      });
    }
  }, [computedTimer, isMyTurn]);

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
    leaveRoom: doLeaveRoom,
  };
}
