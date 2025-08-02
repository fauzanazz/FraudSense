const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/chatapp?authSource=admin';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const userSockets = new Map();

const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const aiAnalysisRoutes = require('./routes/ai-analysis');

// Import fraud detection services
const fraudDetection = require('./services/fraudDetection');
const audioProcessor = require('./services/audioProcessor');

app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-login', (userId) => {
    userSockets.set(userId, socket.id);
    console.log('User logged in:', { userId, socketId: socket.id });
  });

  socket.on('joinRoom', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.id} joined room ${conversationId}`);
  });

  socket.on('sendMessage', async (messageData) => {
    try {
      const Message = require('./models/Message');
      const newMessage = new Message({
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        content: messageData.content,
        timestamp: new Date()
      });
      
      await newMessage.save();
      
      io.to(messageData.conversationId).emit('receiveMessage', {
        ...newMessage.toObject(),
        senderName: messageData.senderName
      });

      // Trigger debounced fraud analysis for text
      const messages = await Message.find({ conversationId: messageData.conversationId })
        .sort({ timestamp: 1 })
        .populate('senderId', 'username');

      const formattedMessages = messages.map(msg => ({
        senderName: msg.senderId?.username || 'Unknown',
        content: msg.content,
        timestamp: msg.timestamp
      }));

      const context = {
        userId: messageData.senderId,
        conversationId: messageData.conversationId,
        messageCount: messages.length
      };

      // Debounced text analysis with real-time callback
      fraudDetection.analyzeTextWithDebounce(
        messageData.conversationId,
        formattedMessages,
        context,
        (analysisResult) => {
          if (analysisResult.success && analysisResult.alertTriggered) {
            // Send fraud alert to all participants in the conversation
            io.to(messageData.conversationId).emit('fraud-alert', {
              type: 'text',
              ...analysisResult.alertData,
              timestamp: new Date()
            });
            console.log(`🚨 Text fraud alert sent to conversation ${messageData.conversationId}`);
          }
          
          // Send analysis result to conversation participants
          io.to(messageData.conversationId).emit('fraud-analysis-result', {
            type: 'text',
            conversationId: messageData.conversationId,
            ...analysisResult
          });
        }
      );
      
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('call-offer', (data) => {
    console.log('📞 Call offer received:', { 
      from: socket.id, 
      fromUserId: data.fromUserId,
      toUserId: data.to, 
      hasOffer: !!data.offer,
      offerType: data.offer?.type 
    });
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('call-offer', {
        offer: data.offer,
        from: data.from,
        fromUserId: data.fromUserId
      });
      console.log('✅ Call offer sent to socket:', targetSocketId);
    } else {
      console.log('❌ Target user not found or offline:', data.to);
      console.log('📋 Active users:', Array.from(userSockets.keys()));
    }
  });

  socket.on('call-answer', (data) => {
    console.log('📞 Call answer received:', { 
      from: socket.id, 
      toUserId: data.to, 
      hasAnswer: !!data.answer,
      answerType: data.answer?.type 
    });
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('call-answer', {
        answer: data.answer,
        from: socket.id
      });
      console.log('✅ Call answer sent to socket:', targetSocketId);
    } else {
      console.log('❌ Target user not found for answer:', data.to);
    }
  });

  socket.on('ice-candidate', (data) => {
    console.log('🧊 ICE candidate received for user:', data.to);
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('ice-candidate', {
        candidate: data.candidate,
        from: socket.id
      });
      console.log('✅ ICE candidate forwarded to socket:', targetSocketId);
    } else {
      console.log('❌ Target user not found for ICE candidate:', data.to);
    }
  });

  socket.on('hang-up', (data) => {
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('hang-up');
    }
  });

  socket.on('call-rejected', (data) => {
    console.log('Call rejected by user:', data.to);
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('call-rejected');
    }
  });

  socket.on('call-ended', (data) => {
    console.log('Call ended by user:', socket.id, 'to:', data.to);
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('call-ended', {
        from: socket.id
      });
    }
  });

  socket.on('audio-chunk', async (data) => {
    try {
      const { conversationId, audioData, userId, format = 'webm' } = data;
      
      // Process audio chunk for fraud detection
      const metadata = {
        userId,
        conversationId,
        socketId: socket.id
      };

      // Convert base64 audio data to buffer if needed
      const audioBuffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData, 'base64');

      // Trigger audio fraud analysis
      const analysisResult = await fraudDetection.analyzeAudioChunk(audioBuffer, format, metadata);
      
      if (analysisResult.success && analysisResult.alertTriggered) {
        // Send fraud alert to all participants in the conversation
        io.to(conversationId).emit('fraud-alert', {
          type: 'audio',
          ...analysisResult.alertData,
          timestamp: new Date()
        });
        console.log(`🚨 Audio fraud alert sent to conversation ${conversationId}`);
      }
      
      // Send analysis result to conversation participants
      io.to(conversationId).emit('fraud-analysis-result', {
        type: 'audio',
        conversationId,
        ...analysisResult
      });
      
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      socket.emit('audio-analysis-error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log('Removed user from map:', userId);
        break;
      }
    }
  });
});

// For Vercel serverless deployment
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app;