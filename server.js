const express = require('express');
const app = express();
const http = require('http');
const rateLimit = require('express-rate-limit');
const server = http.createServer(app);
const { Server } = require('socket.io');

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
  },
});

const PORT = process.env.PORT || 3000;

const VALID_SOUND_NAMES = new Set([
  'classic', 'ambulance', 'duck', 'laser', 'boing',
  'ghost', 'ufo', 'sonar', 'bike', 'slide', 'train', 'cuckoo', 'drop',
]);

const SOUND_RATE_WINDOWS = new Map();

function cleanupRateMap() {
  const now = Date.now();
  for (const [key, entry] of SOUND_RATE_WINDOWS) {
    if (now - entry.lastReset > 60000) {
      SOUND_RATE_WINDOWS.delete(key);
    }
  }
}

setInterval(cleanupRateMap, 60000);

function checkSoundRate(socketId) {
  const now = Date.now();
  const entry = SOUND_RATE_WINDOWS.get(socketId);
  if (!entry || now - entry.lastReset > 10000) {
    SOUND_RATE_WINDOWS.set(socketId, { count: 1, lastReset: now });
    return true;
  }
  if (entry.count >= 8) return false;
  entry.count++;
  return true;
}

io.use((socket, next) => {
  const roomId = socket.handshake.auth?.roomId;
  if (!roomId || typeof roomId !== 'string' || roomId.length > 20) {
    return next(new Error('Invalid roomId'));
  }
  socket._validatedRoomId = roomId;
  next();
});

io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  socket.on('join_room', ({ roomId }) => {
    if (!roomId || typeof roomId !== 'string' || roomId.length > 20) return;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('play_sound', ({ roomId, soundName, playerId }) => {
    if (!roomId || typeof roomId !== 'string') return;
    if (!soundName || typeof soundName !== 'string') return;
    if (!VALID_SOUND_NAMES.has(soundName)) return;
    if (!playerId || typeof playerId !== 'string') return;
    if (!checkSoundRate(socket.id)) return;

    io.to(roomId).emit('play_sound_event', { soundName, playerId });
  });

  socket.on('disconnect', () => {
    SOUND_RATE_WINDOWS.delete(socket.id);
    console.log('User Disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Socket.io Server running on port ${PORT}`);
});
