const tokenService = require('../services/tokenService');
const User = require('../models/User');
const Message = require('../models/Message');
const { eventService, EVENTS } = require('../services/eventService');

/**
 * Configure and register Socket.IO handlers and authentication middleware
 * @param {import('socket.io').Server} io
 */
const initSocketHandler = (io) => {
  // Socket.IO Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      if (token && token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = tokenService.verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User does not exist'));
      }

      // Attach authenticated user to the socket instance
      socket.user = user;
      next();
    } catch (error) {
      console.warn(`[Socket.IO] Auth failure on connection: ${error.message}`);
      return next(new Error(`Authentication error: ${error.message}`));
    }
  });

  io.on('connection', (socket) => {
    console.log(
      `[Socket.IO] Connected: ${socket.id} | User: ${socket.user.name} (${socket.user.email}) [Role: ${socket.user.role}]`
    );

    // Event: join_room
    socket.on('join_room', (data) => {
      try {
        const roomId = typeof data === 'string' ? data : data?.roomId;

        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
          socket.emit('message_error', { message: 'Invalid or missing roomId' });
          return;
        }

        const cleanRoom = roomId.trim();
        socket.join(cleanRoom);
        console.log(`[Socket.IO] User ${socket.user.name} joined room: ${cleanRoom}`);

        // Broadcast to other participants in the room
        socket.to(cleanRoom).emit('user_joined', {
          userId: socket.user._id.toString(),
          userName: socket.user.name,
          roomId: cleanRoom,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        socket.emit('message_error', { message: 'Failed to join room' });
      }
    });

    // Event: send_message
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content } = data || {};

        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
          socket.emit('message_error', { message: 'Room ID is required to send messages' });
          return;
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          socket.emit('message_error', { message: 'Message content cannot be empty' });
          return;
        }

        const cleanRoom = roomId.trim();
        const cleanContent = content.trim();

        // Persist message in MongoDB
        const message = await Message.create({
          senderId: socket.user._id,
          senderName: socket.user.name,
          roomId: cleanRoom,
          content: cleanContent,
          timestamp: new Date(),
        });

        // Emit application event
        eventService.emit(EVENTS.MESSAGE_SENT, {
          messageId: message._id.toString(),
          senderId: socket.user._id.toString(),
          roomId: cleanRoom,
          preview: cleanContent.length > 40 ? cleanContent.substring(0, 40) + '...' : cleanContent,
        });

        // Broadcast message to all sockets in the room (including sender)
        io.to(cleanRoom).emit('receive_message', {
          id: message._id.toString(),
          senderId: socket.user._id.toString(),
          senderName: socket.user.name,
          roomId: cleanRoom,
          content: message.content,
          timestamp: message.timestamp,
        });
      } catch (err) {
        console.error('[Socket.IO] send_message error:', err.message);
        socket.emit('message_error', { message: 'Error processing and saving message' });
      }
    });

    // Event: leave_room
    socket.on('leave_room', (data) => {
      try {
        const roomId = typeof data === 'string' ? data : data?.roomId;

        if (!roomId) return;
        const cleanRoom = roomId.trim();

        socket.leave(cleanRoom);
        console.log(`[Socket.IO] User ${socket.user.name} left room: ${cleanRoom}`);

        socket.to(cleanRoom).emit('user_left', {
          userId: socket.user._id.toString(),
          userName: socket.user.name,
          roomId: cleanRoom,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        socket.emit('message_error', { message: 'Failed to leave room' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${socket.id} | User: ${socket.user.name} (${reason})`);
    });
  });
};

module.exports = initSocketHandler;
