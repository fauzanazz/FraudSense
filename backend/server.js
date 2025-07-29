const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users and messages
const connectedUsers = new Map();
const messages = new Map(); // messageId -> message

// Fraud detection function (simplified for demo)
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
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`${user.username} disconnected`);
      connectedUsers.delete(socket.id);
      
      // Notify others in the room
      socket.to(user.room).emit('userLeft', { 
        username: user.username, 
        timestamp: new Date() 
      });
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

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
}); 