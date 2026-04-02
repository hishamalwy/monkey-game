const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: '*', // تأكد من تقييد هذا في الإنتاج
  },
});

const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  // الانضمام لغرفة معينة
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // حدث تشغيل الصوت
  /**
   * يستلم roomId و soundName
   * ويقوم بعمل Broadcast لكل الغرفة بما فيهم المرسل لضمان المزامنة
   */
  socket.on('play_sound', ({ roomId, soundName, playerId }) => {
    console.log(`Play Sound: ${soundName} in Room: ${roomId}`);
    
    // إرسال لجميع المشتركين في الغرفة (כולל المرسل لضمان نفس التزامن)
    io.to(roomId).emit('play_sound_event', { soundName, playerId });
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Socket.io Server running on port ${PORT}`);
});
