const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Store connected users and their rooms
const connectedUsers = new Map();
const chatRooms = new Map();
const callRooms = new Map();

// Chat functionality
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join chat room
  socket.on('joinRoom', ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    
    // Store user info
    connectedUsers.set(socket.id, { username, room, type: 'chat' });
    
    // Join room
    socket.join(room);
    
    // Initialize room if it doesn't exist
    if (!chatRooms.has(room)) {
      chatRooms.set(room, []);
    }
    
    console.log(`${username} joined chat room: ${room}`);
    
    // Send room history
    const roomHistory = chatRooms.get(room) || [];
    socket.emit('roomHistory', roomHistory);
    
    // Notify others
    socket.to(room).emit('userJoined', { username });
  });

  // Send message
  socket.on('sendMessage', (messageData) => {
    const { username, content } = messageData;
    const room = socket.room;
    
    if (!room) return;
    
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      username,
      content,
      timestamp: new Date(),
    };
    
    // Store message in room history
    if (!chatRooms.has(room)) {
      chatRooms.set(room, []);
    }
    chatRooms.get(room).push(message);
    
    // Keep only last messages based on config
    if (chatRooms.get(room).length > config.MAX_MESSAGES_PER_ROOM) {
      chatRooms.get(room).shift();
    }
    
    // Broadcast to room
    io.to(room).emit('message', message);
    
    // Simulate fraud detection (in real app, this would call your ML model)
    setTimeout(() => {
      const fraudResult = simulateFraudDetection(content);
      io.to(room).emit('fraudResult', {
        messageId: message.id,
        result: fraudResult
      });
    }, 1000 + Math.random() * 2000);
  });

  // Send feedback
  socket.on('sendFeedback', ({ messageId, type }) => {
    const room = socket.room;
    if (!room) return;
    
    // In a real app, you'd store this in a database
    io.to(room).emit('feedbackUpdate', {
      messageId,
      feedback: {
        type,
        count: Math.floor(Math.random() * 10) + 1
      }
    });
  });

  // Call functionality
  socket.on('joinCallRoom', ({ username, room }) => {
    socket.username = username;
    socket.callRoom = room;
    
    // Store user info
    connectedUsers.set(socket.id, { username, room, type: 'call' });
    
    // Join room
    socket.join(room);
    
    // Initialize call room if it doesn't exist
    if (!callRooms.has(room)) {
      callRooms.set(room, new Set());
    }
    callRooms.get(room).add(username);
    
    console.log(`${username} joined call room: ${room}`);
    
    // Notify others in the room
    socket.to(room).emit('userJoined', { username });
    
    // Send list of users in room
    const usersInRoom = Array.from(callRooms.get(room));
    io.to(room).emit('usersInRoom', usersInRoom);
  });

  // Call signaling
  socket.on('offer', ({ to, offer }) => {
    const targetSocket = findSocketByUsername(to);
    if (targetSocket) {
      targetSocket.emit('offer', { from: socket.username, offer });
    }
  });

  socket.on('answer', ({ to, answer }) => {
    const targetSocket = findSocketByUsername(to);
    if (targetSocket) {
      targetSocket.emit('answer', { from: socket.username, answer });
    }
  });

  socket.on('iceCandidate', ({ to, candidate }) => {
    const targetSocket = findSocketByUsername(to);
    if (targetSocket) {
      targetSocket.emit('iceCandidate', { from: socket.username, candidate });
    }
  });

  // Call requests
  socket.on('callRequest', ({ to, type }) => {
    const targetSocket = findSocketByUsername(to);
    if (targetSocket) {
      targetSocket.emit('callRequest', { from: socket.username, type });
    }
  });

  socket.on('callAccepted', ({ to }) => {
    const targetSocket = findSocketByUsername(to);
    if (targetSocket) {
      targetSocket.emit('callAccepted', { from: socket.username });
    }
  });

  socket.on('callRejected', ({ to }) => {
    const targetSocket = findSocketByUsername(to);
    if (targetSocket) {
      targetSocket.emit('callRejected', { from: socket.username });
    }
  });

  socket.on('endCall', ({ to }) => {
    const targetSocket = findSocketByUsername(to);
    if (targetSocket) {
      targetSocket.emit('callEnded', { from: socket.username });
    }
  });

  // Audio processing for fraud detection
  socket.on('audioChunk', ({ audio, timestamp }) => {
    // In a real app, you'd send this to your audio processing service
    console.log(`Received audio chunk from ${socket.username} at ${timestamp}`);
    
    // Simulate audio fraud detection
    setTimeout(() => {
      const fraudResult = simulateAudioFraudDetection();
      socket.emit('fraudResult', fraudResult);
    }, 2000 + Math.random() * 3000);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      const { username, room, type } = userInfo;
      
      if (type === 'call' && callRooms.has(room)) {
        callRooms.get(room).delete(username);
        if (callRooms.get(room).size === 0) {
          callRooms.delete(room);
        }
      }
      
      // Notify others
      socket.to(room).emit('userLeft', { username });
      
      // Send updated user list for call rooms
      if (type === 'call' && callRooms.has(room)) {
        const usersInRoom = Array.from(callRooms.get(room));
        io.to(room).emit('usersInRoom', usersInRoom);
      }
      
      connectedUsers.delete(socket.id);
      console.log(`${username} disconnected from ${room}`);
    }
  });
});

// Helper function to find socket by username
function findSocketByUsername(username) {
  for (const [socketId, userInfo] of connectedUsers.entries()) {
    if (userInfo.username === username) {
      return io.sockets.sockets.get(socketId);
    }
  }
  return null;
}

// Simulate text fraud detection
function simulateFraudDetection(content) {
  const fraudKeywords = ['password', 'credit card', 'ssn', 'social security', 'bank account', 'account number', 'routing number', 'cvv', 'pin', 'mother maiden name'];
  const hasFraudKeywords = fraudKeywords.some(keyword => 
    content.toLowerCase().includes(keyword)
  );
  
  let confidence;
  let isFraud;
  
  if (hasFraudKeywords) {
    // If fraud keywords are found, generate high confidence (60-95%)
    confidence = 0.6 + Math.random() * 0.35;
    isFraud = true;
  } else {
    // If no fraud keywords, mostly safe with occasional false positives
    confidence = Math.random();
    isFraud = confidence > 0.85; // Only 15% chance of false positive
  }
  
  return {
    classification: isFraud ? 'Fraud' : 'Safe',
    confidence: confidence
  };
}

// Simulate audio fraud detection
function simulateAudioFraudDetection() {
  const randomConfidence = Math.random();
  const isFraud = randomConfidence > 0.7;
  
  return {
    classification: isFraud ? 'Fraud Detected' : 'Safe',
    confidence: randomConfidence
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    connectedUsers: connectedUsers.size,
    chatRooms: chatRooms.size,
    callRooms: callRooms.size
  });
});

// Get connected users
app.get('/users', (req, res) => {
  const users = Array.from(connectedUsers.values());
  res.json(users);
});

server.listen(config.PORT, () => {
  console.log(`🚀 WebSocket server running on port ${config.PORT}`);
  console.log(`📡 Chat and audio functionality enabled`);
  console.log(`🔗 Connect from: ${config.CORS_ORIGIN}`);
  console.log(`⚙️  Environment: ${config.NODE_ENV}`);
}); 