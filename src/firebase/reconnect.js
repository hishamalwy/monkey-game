import { query, collection, where, getDocs, limit } from 'firebase/firestore';
import { db } from './config';

export async function findActiveRoom(uid) {
  const q = query(
    collection(db, 'rooms'),
    where('status', 'in', [
      'playing', 'suspect_question', 'round_result', 'game_over',
      'draw_over', 'charades_over',
    ]),
    limit(100)
  );
  const snap = await getDocs(q);
  const room = snap.docs.find(d => {
    const data = d.data();
    return data.players && data.players[uid];
  });
  return room ? { code: room.id, ...room.data() } : null;
}

export function getGameRoute(room) {
  if (!room) return null;
  const mode = room.mode;
  const status = room.status;

  if (status === 'lobby') return `/lobby/${room.code}`;
  if (status === 'game_over') {
    if (mode === 'draw') return `/draw-over/${room.code}`;
    if (mode === 'survival') return `/survival-over/${room.code}`;
    if (mode === 'charades') return `/charades-over/${room.code}`;
    return `/game-over/${room.code}`;
  }
  if (status === 'draw_over') return `/draw-over/${room.code}`;
  if (status === 'charades_over') return `/charades-over/${room.code}`;
  if (mode === 'draw') return `/draw/${room.code}`;
  if (mode === 'survival') return `/survival/${room.code}`;
  if (mode === 'charades') return `/charades/${room.code}`;
  return `/game/${room.code}`;
}
