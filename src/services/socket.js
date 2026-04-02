import { io } from 'socket.io-client';
import { startHorn, stopHorn } from '../utils/audio';

// استبدل هذا بعنوان السيرفر الفعلي
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const socket = io(SOCKET_URL, {
  autoConnect: false, 
  reconnection: true,
  transports: ['websocket'], 
});

export const connectSocket = (roomId) => {
  if (!socket.connected) {
    socket.connect();
    socket.on('connect', () => {
      console.log('✅ Connected to Sound Server');
      socket.emit('join_room', { roomId });
    });

    // استلام حدث تشغيل الصوت من السيرفر
    socket.on('play_sound_event', ({ soundName, isHonking, playerId }) => {
      console.log(`🔊 Receiving Sound: ${soundName} (${isHonking ? 'ON' : 'OFF'})`);
      if (isHonking) {
        startHorn(soundName);
      } else {
        stopHorn();
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from Sound Server');
    });
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const emitSound = (roomId, soundName, isHonking) => {
  if (socket.connected) {
    socket.emit('play_sound', { roomId, soundName, isHonking });
  }
};

export default socket;
