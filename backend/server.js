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

app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});