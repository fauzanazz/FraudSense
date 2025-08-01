const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://fraud-sense-ps91.vercel.app"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users and messages
const connectedUsers = new Map();
const messages = new Map(); // messageId -> message

// Helper function to find socket by username
function findSocketByUsername(username) {
  for (const [socketId, userData] of connectedUsers.entries()) {
    if (userData.username === username) {
      return io.sockets.sockets.get(socketId);
    }
  }
  return null;
}

// Text fraud detection function (simplified for demo)
function detectFraud(text) {
  // Simple keyword-based fraud detection
  const fraudKeywords = [
    'password', 'credit card', 'ssn', 'social security', 'bank account',
    'wire transfer', 'urgent', 'emergency', 'gift card', 'bitcoin',
    'lottery', 'inheritance', 'prince', 'nigerian', 'urgent help',
    'account suspended', 'verify account', 'click here', 'free money'
  ];
  
  const suspiciousPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
    /\b\d{10}\b/, // Phone number pattern
    /\$[\d,]+/, // Money amounts
  ];
  
  const lowerText = text.toLowerCase();
  
  // Check for fraud keywords
  const keywordMatches = fraudKeywords.filter(keyword => 
    lowerText.includes(keyword)
  );
  
  // Check for suspicious patterns
  const patternMatches = suspiciousPatterns.filter(pattern => 
    pattern.test(text)
  );
  
  // Calculate fraud score
  let fraudScore = 0;
  fraudScore += keywordMatches.length * 0.3;
  fraudScore += patternMatches.length * 0.4;
  
  // Additional heuristics
  if (text.includes('!') && text.includes('?')) fraudScore += 0.1; // Urgency indicators
  if (text.includes('FREE') || text.includes('FREE')) fraudScore += 0.2;
  if (text.includes('URGENT') || text.includes('urgent')) fraudScore += 0.3;
  
  // Normalize score to 0-1 range
  fraudScore = Math.min(fraudScore, 1);
  
  return {
    classification: fraudScore > 0.5 ? 'Fraud' : 'Safe',
    confidence: fraudScore
  };
}

// Audio fraud detection function (simplified for demo)
function detectAudioFraud(audioData) {
  // In a real implementation, this would:
  // 1. Decode the base64 audio data
  // 2. Convert to audio features (MFCC, spectrogram, etc.)
  // 3. Run through a trained model (LALM, etc.)
  // 4. Return classification results
  
  // For demo purposes, we'll simulate audio fraud detection
  const audioFeatures = {
    volume: Math.random(),
    pitch: Math.random(),
    speed: Math.random(),
    clarity: Math.random()
  };
  
  // Simulate fraud detection based on audio characteristics
  let fraudScore = 0;
  
  // High volume might indicate urgency
  if (audioFeatures.volume > 0.8) fraudScore += 0.2;
  
  // Unusual pitch patterns
  if (audioFeatures.pitch < 0.2 || audioFeatures.pitch > 0.8) fraudScore += 0.3;
  
  // Fast speech might indicate urgency
  if (audioFeatures.speed > 0.7) fraudScore += 0.2;
  
  // Poor audio quality might indicate recording
  if (audioFeatures.clarity < 0.4) fraudScore += 0.3;
  
  // Add some randomness for demo
  fraudScore += Math.random() * 0.2;
  
  // Normalize score to 0-1 range
  fraudScore = Math.min(fraudScore, 1);
  
  return {
    classification: fraudScore > 0.6 ? 'Fraud Detected' : 'Safe',
    confidence: fraudScore
  };
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle user joining room
  socket.on('joinRoom', ({ username, room }) => {
    socket.join(room);
    connectedUsers.set(socket.id, { username, room });
    
    console.log(`${username} joined room: ${room}`);
    
    // Notify others in the room
    socket.to(room).emit('userJoined', { username, timestamp: new Date() });
    
    // Send updated user list to all users in the room
    const roomUsers = Array.from(connectedUsers.values())
      .filter(user => user.room === room)
      .map(user => user.username);
    io.to(room).emit('userList', roomUsers);
  });

  // Handle user joining call room
  socket.on('joinCallRoom', ({ username, room }) => {
    socket.join(room);
    connectedUsers.set(socket.id, { username, room });
    
    console.log(`${username} joined call room: ${room}`);
    
    // Notify others in the room
    socket.to(room).emit('userJoined', { username, timestamp: new Date() });
    
    // Send updated user list to all users in the room
    const roomUsers = Array.from(connectedUsers.values())
      .filter(user => user.room === room)
      .map(user => user.username);
    io.to(room).emit('userList', roomUsers);
  });

  // Handle getUserList request
  socket.on('getUserList', () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    const roomUsers = Array.from(connectedUsers.values())
      .filter(u => u.room === user.room)
      .map(u => u.username);
    
    socket.emit('userList', roomUsers);
  });
  
  // Handle sending messages
  socket.on('sendMessage', (messageData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const message = {
      id: messageId,
      username: user.username,
      content: messageData.content,
      timestamp: new Date(),
      room: user.room
    };
    
    // Store message
    messages.set(messageId, message);
    
    // Broadcast message to room
    io.to(user.room).emit('message', message);
    
    // Analyze message for fraud detection
    setTimeout(() => {
      const fraudResult = detectFraud(messageData.content);
      console.log(`Fraud analysis for "${messageData.content}":`, fraudResult);
      
      // Send fraud result back to all clients in the room
      io.to(user.room).emit('fraudResult', {
        messageId,
        result: fraudResult
      });
    }, 1000); // Simulate processing delay
  });
  
  // Handle feedback on fraud detection
  socket.on('sendFeedback', ({ messageId, type }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    const message = messages.get(messageId);
    if (!message) return;
    
    // Update feedback (in a real app, this would be stored in a database)
    const feedback = {
      type,
      count: 1,
      users: [user.username]
    };
    
    // Broadcast feedback update
    io.to(user.room).emit('feedbackUpdate', {
      messageId,
      feedback
    });
    
    console.log(`Feedback received for message ${messageId}: ${type} from ${user.username}`);
  });
  
  // WebRTC Signaling Events
  socket.on('offer', (data) => {
    const targetSocket = findSocketByUsername(data.to);
    if (targetSocket) {
      targetSocket.emit('offer', {
        from: connectedUsers.get(socket.id)?.username,
        offer: data.offer
      });
    }
  });

  socket.on('answer', (data) => {
    const targetSocket = findSocketByUsername(data.to);
    if (targetSocket) {
      targetSocket.emit('answer', {
        from: connectedUsers.get(socket.id)?.username,
        answer: data.answer
      });
    }
  });

  socket.on('iceCandidate', (data) => {
    const targetSocket = findSocketByUsername(data.to);
    if (targetSocket) {
      targetSocket.emit('iceCandidate', {
        from: connectedUsers.get(socket.id)?.username,
        candidate: data.candidate
      });
    }
  });

  // Call Management Events
  socket.on('callRequest', (data) => {
    const targetSocket = findSocketByUsername(data.to);
    if (targetSocket) {
      targetSocket.emit('callRequest', {
        from: connectedUsers.get(socket.id)?.username,
        type: data.type
      });
    }
  });

  socket.on('callAccepted', (data) => {
    const targetSocket = findSocketByUsername(data.to);
    if (targetSocket) {
      targetSocket.emit('callAccepted', {
        from: connectedUsers.get(socket.id)?.username
      });
    }
  });

  socket.on('callRejected', (data) => {
    const targetSocket = findSocketByUsername(data.to);
    if (targetSocket) {
      targetSocket.emit('callRejected', {
        from: connectedUsers.get(socket.id)?.username
      });
    }
  });

  socket.on('endCall', (data) => {
    const targetSocket = findSocketByUsername(data.to);
    if (targetSocket) {
      targetSocket.emit('callEnded', {
        from: connectedUsers.get(socket.id)?.username
      });
    }
  });

  // Audio Processing for Fraud Detection
  socket.on('audioChunk', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    console.log(`Received audio chunk from ${user.username}`);
    
    // Process audio for fraud detection
    setTimeout(() => {
      const fraudResult = detectAudioFraud(data.audio);
      console.log(`Audio fraud analysis for ${user.username}:`, fraudResult);
      
      // Send result back to the client
      socket.emit('fraudResult', fraudResult);
    }, 1000); // Simulate processing delay
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`${user.username} disconnected`);
      const room = user.room;
      connectedUsers.delete(socket.id);
      
      // Notify others in the room
      socket.to(room).emit('userLeft', { 
        username: user.username, 
        timestamp: new Date() 
      });
      
      // Send updated user list to remaining users in the room
      const roomUsers = Array.from(connectedUsers.values())
        .filter(u => u.room === room)
        .map(u => u.username);
      io.to(room).emit('userList', roomUsers);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    connectedUsers: connectedUsers.size,
    totalMessages: messages.size
  });
});

// Get connected users
app.get('/users', (req, res) => {
  const users = Array.from(connectedUsers.values());
  res.json(users);
});

// Get available users for calls
app.get('/call-users', (req, res) => {
  const callUsers = Array.from(connectedUsers.values())
    .filter(user => user.room === 'call')
    .map(user => user.username);
  res.json(callUsers);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
}); 