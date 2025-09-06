const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const socketCorsOrigins = (process.env.SOCKETIO_CORS_ORIGINS || "http://localhost:3000,http://localhost:5173,https://fraudsense-frontend.fauzanazz.com")
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: socketCorsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

app.use(cors({
  origin: socketCorsOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
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
      const Conversation = require('./models/Conversation');
      const newMessage = new Message({
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        content: messageData.content,
        timestamp: new Date()
      });
      
      await newMessage.save();
      // Update conversation last message preview and timestamp
      try {
        await Conversation.findByIdAndUpdate(messageData.conversationId, {
          lastMessage: messageData.content,
          lastMessageTime: new Date()
        });
      } catch (convErr) {
        console.error('Error updating conversation last message:', convErr);
      }
      
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

  socket.on('get-turn-config', (callback) => {
    // Determine TURN host/port
    let turnDomain = process.env.TURN_DOMAIN;
    let turnPort = process.env.TURN_PORT || '3478';

    // Support TURN_SERVER_URL env in formats like "turn.example.com:3478" or "turns://turn.example.com:5349"
    const turnServerUrl = process.env.TURN_SERVER_URL;
    if (!turnDomain && turnServerUrl) {
      try {
        const sanitized = turnServerUrl.replace(/^turns?:\/\//, '');
        const [host, port] = sanitized.split(':');
        if (host) turnDomain = host;
        if (port) turnPort = port;
      } catch (e) {
        console.warn('⚠️ Failed to parse TURN_SERVER_URL, falling back to env TURN_DOMAIN/PORT');
      }
    }

    const iceServers = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
    ];

    // Prefer ephemeral credentials when TURN_SECRET is provided (coturn --use-auth-secret)
    const turnSecret = process.env.TURN_SECRET;
    const turnRealm = process.env.TURN_REALM; // optional, for logging/reference
    const staticUser = process.env.TURN_USER;
    const staticPassword = process.env.TURN_PASSWORD;

    if (turnDomain) {
      const turnUrls = [
        `turn:${turnDomain}:${turnPort}?transport=udp`,
        `turn:${turnDomain}:${turnPort}?transport=tcp`
      ];

      if (process.env.TURN_ENABLE_TLS === '1' || process.env.TURN_ENABLE_TLS === 'true') {
        const tlsPort = process.env.TURN_TLS_PORT || '5349';
        turnUrls.push(`turns:${turnDomain}:${tlsPort}?transport=tcp`);
      }

      if (turnSecret) {
        // Generate ephemeral credentials valid for 1 hour
        const ttlSeconds = parseInt(process.env.TURN_TTL || '3600', 10);
        const unixTime = Math.floor(Date.now() / 1000) + ttlSeconds;
        const username = `${unixTime}:${socket.id}`; // bind to socket for traceability
        const credential = crypto
          .createHmac('sha1', turnSecret)
          .update(username)
          .digest('base64');

        iceServers.push({
          urls: turnUrls,
          username,
          credential,
          credentialType: 'token'
        });
        console.log('✅ TURN (ephemeral) configured', {
          domain: turnDomain,
          port: turnPort,
          realm: turnRealm,
          ttlSeconds
        });
        // Only add static fallback when explicitly allowed
        const allowStaticFallback = process.env.TURN_ALLOW_STATIC_FALLBACK === '1' || process.env.TURN_ALLOW_STATIC_FALLBACK === 'true';
        if (allowStaticFallback && staticUser && staticPassword) {
          iceServers.push({
            urls: turnUrls,
            username: staticUser,
            credential: staticPassword,
            credentialType: 'password'
          });
          console.log('✅ TURN (static fallback) configured in addition to ephemeral');
        }
      } else if (staticUser && staticPassword) {
        // No TURN_SECRET provided, use static credentials only
        iceServers.push({
          urls: turnUrls,
          username: staticUser,
          credential: staticPassword,
          credentialType: 'password'
        });
        console.log('✅ TURN (static) configured', { domain: turnDomain, port: turnPort });
      } else if (!turnSecret) {
        console.warn('⚠️ TURN credentials missing (TURN_SECRET or TURN_USER/PASSWORD). Using STUN only');
      }
    } else {
      console.warn('⚠️ TURN domain not set. Using STUN only');
    }

    const turnConfig = {
      iceServers,
      iceCandidatePoolSize: 2,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
    console.log('🔧 TURN config requested:', JSON.stringify(turnConfig, null, 2));
    if (callback) callback(turnConfig);
  });

  socket.on('call-offer', (data) => {
    console.log('📞 Call offer received:', { 
      from: socket.id, 
      fromUserId: data.fromUserId,
      toUserId: data.to, 
      hasOffer: !!data.offer,
      offerType: data.offer?.type,
      conversationId: data.conversationId
    });
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('call-offer', {
        offer: data.offer,
        from: data.from,
        fromUserId: data.fromUserId,
        conversationId: data.conversationId
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
      
      // Only send alert if fraud is detected (no analysis result sent)
      if (analysisResult.success && analysisResult.alertTriggered) {
        // Send fraud alert to all participants in the conversation
        io.to(conversationId).emit('fraud-alert', {
          type: 'audio',
          fraudScore: analysisResult.fraudScore,
          confidence: analysisResult.confidence,
          severity: analysisResult.fraudScore === 1 ? 'high' : 'low',
          message: analysisResult.fraudScore === 1 
            ? 'Suspicious audio patterns detected in call'
            : 'Normal audio patterns detected',
          timestamp: new Date(),
          analysisId: analysisResult.analysisId
        });
        console.log(`🚨 Audio fraud alert sent to conversation ${conversationId}`);
      }
      
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      socket.emit('audio-analysis-error', { error: error.message });
    }
  });

  socket.on('save-complete-audio', async (data) => {
    try {
      const { conversationId, audioData, userId, format = 'webm', isCompleteRecording, recordingDuration, timestamp } = data;
      
      console.log('💾 Saving complete audio recording:', {
        conversationId,
        userId,
        format,
        isCompleteRecording,
        recordingDuration,
        dataSize: audioData?.length || 0
      });

      // Convert base64 audio data to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');

      // Save complete audio file to permanent storage
      const saveResult = await audioProcessor.saveCompleteAudioRecording({
        audioBuffer,
        format,
        metadata: {
          conversationId,
          userId,
          socketId: socket.id,
          isCompleteRecording: true,
          recordingDuration,
          timestamp: new Date(timestamp),
          originalSize: audioBuffer.length
        }
      });

      if (saveResult.success) {
        console.log('✅ Complete audio recording saved:', saveResult.filePath);
        
        // Send confirmation back to client
        socket.emit('audio-saved', {
          success: true,
          filePath: saveResult.filePath,
          fileSize: saveResult.fileSize,
          message: 'Audio recording saved successfully'
        });
      } else {
        console.error('❌ Failed to save complete audio:', saveResult.error);
        socket.emit('audio-saved', {
          success: false,
          error: saveResult.error,
          message: 'Failed to save audio recording'
        });
      }
      
    } catch (error) {
      console.error('Error saving complete audio:', error);
      socket.emit('audio-saved', {
        success: false,
        error: error.message,
        message: 'Error saving audio recording'
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

// Start HTTP server unless running on Vercel serverless
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
if (!isVercel) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app (required for Vercel compatibility)
module.exports = app;