/**
 * Socket.IO real-time communication for chat
 * Handles DM rooms and @mention notifications
 */

const { Server } = require('socket.io');
const { verify } = require('../auth');
const { db } = require('../db');

let io = null;

/**
 * Initialize Socket.IO server
 */
function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    },
    transports: ['websocket', 'polling']
  });
  
  // Make io globally available
  global.io = io;
  
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      // Verify JWT token
      const decoded = verify(token, process.env.JWT_SECRET || 'dev-secret');
      
      // Get user from database
      const user = db.prepare('SELECT id, ecosystem_id, ecosystem_id_long FROM users WHERE id = ?').get(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.userId = user.id;
      socket.userEcosystemId = user.ecosystem_id || user.ecosystem_id_long;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });
  
  // Connection handling
  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected to socket`);
    
    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Handle joining DM rooms
    socket.on('join_dm', async (data) => {
      try {
        const { peerEcosystemId } = data;
        
        if (!peerEcosystemId) {
          socket.emit('error', { message: 'Peer UEID required' });
          return;
        }
        
        // Find peer user
        const peer = db.prepare(`
          SELECT id FROM users 
          WHERE ecosystem_id = ? OR ecosystem_id_long = ?
        `).get(peerEcosystemId, peerEcosystemId);
        
        if (!peer) {
          socket.emit('error', { message: 'Peer not found' });
          return;
        }
        
        // Check if users have accepted connection
        const connection = db.prepare(`
          SELECT status FROM connections 
          WHERE ((user_id = ? AND peer_id = ?) OR (user_id = ? AND peer_id = ?))
            AND status = 'accepted'
        `).get(socket.userId, peer.id, peer.id, socket.userId);
        
        if (!connection) {
          socket.emit('error', { message: 'Connection not accepted' });
          return;
        }
        
        // Join DM room
        const roomName = getRoomName(socket.userId, peer.id);
        socket.join(roomName);
        
        socket.emit('joined_dm', { room: roomName, peerId: peer.id });
        
      } catch (error) {
        console.error('Join DM error:', error);
        socket.emit('error', { message: 'Failed to join DM room' });
      }
    });
    
    // Handle leaving DM rooms
    socket.on('leave_dm', (data) => {
      const { peerEcosystemId } = data;
      
      if (peerEcosystemId) {
        // Find peer user
        const peer = db.prepare(`
          SELECT id FROM users 
          WHERE ecosystem_id = ? OR ecosystem_id_long = ?
        `).get(peerEcosystemId, peerEcosystemId);
        
        if (peer) {
          const roomName = getRoomName(socket.userId, peer.id);
          socket.leave(roomName);
          socket.emit('left_dm', { room: roomName });
        }
      }
    });
    
    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { peerEcosystemId } = data;
      
      if (peerEcosystemId) {
        const peer = db.prepare(`
          SELECT id FROM users 
          WHERE ecosystem_id = ? OR ecosystem_id_long = ?
        `).get(peerEcosystemId, peerEcosystemId);
        
        if (peer) {
          const roomName = getRoomName(socket.userId, peer.id);
          socket.to(roomName).emit('user_typing', {
            userId: socket.userId,
            ecosystemId: socket.userEcosystemId,
            isTyping: true
          });
        }
      }
    });
    
    socket.on('typing_stop', (data) => {
      const { peerEcosystemId } = data;
      
      if (peerEcosystemId) {
        const peer = db.prepare(`
          SELECT id FROM users 
          WHERE ecosystem_id = ? OR ecosystem_id_long = ?
        `).get(peerEcosystemId, peerEcosystemId);
        
        if (peer) {
          const roomName = getRoomName(socket.userId, peer.id);
          socket.to(roomName).emit('user_typing', {
            userId: socket.userId,
            ecosystemId: socket.userEcosystemId,
            isTyping: false
          });
        }
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from socket`);
    });
  });
  
  console.log('Socket.IO server initialized');
  return io;
}

/**
 * Get room name for DM between two users
 */
function getRoomName(userId1, userId2) {
  const sorted = [userId1, userId2].sort();
  return `dm:${sorted[0]}:${sorted[1]}`;
}

/**
 * Send message to DM room
 */
function sendMessageToRoom(senderId, receiverId, message) {
  if (!io) return;
  
  const roomName = getRoomName(senderId, receiverId);
  io.to(roomName).emit('message', message);
}

/**
 * Send notification to user
 */
function sendNotificationToUser(userId, notification) {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Get connected users count
 */
function getConnectedUsersCount() {
  if (!io) return 0;
  return io.engine.clientsCount;
}

/**
 * Get socket instance
 */
function getSocketInstance() {
  return io;
}

module.exports = {
  initializeSocket,
  sendMessageToRoom,
  sendNotificationToUser,
  getConnectedUsersCount,
  getSocketInstance
};
