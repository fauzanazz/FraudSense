const express = require('express');
const router = express.Router();
const fraudDetection = require('../services/fraudDetection');
const audioUpload = require('../middleware/audioUpload');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const FraudAnalysis = require('../models/FraudAnalysis');

/**
 * POST /api/ai-analysis/text
 * Analyze chat conversation for fraud detection
 */
router.post('/text', async (req, res) => {
  try {
    const { conversationId, userId, forceImmediate = false } = req.body;
    
    console.log(`📝 Text analysis request - Conversation: ${conversationId}, User: ${userId}`);

    // Validate required fields
    if (!conversationId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId and userId are required'
      });
    }

    // Fetch conversation and messages
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 })
      .populate('senderId', 'username');

    if (!messages || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No messages found in conversation'
      });
    }

    // Format messages for analysis
    const formattedMessages = messages.map(msg => ({
      senderName: msg.senderId?.username || 'Unknown',
      content: msg.content,
      timestamp: msg.timestamp
    }));

    const context = {
      userId,
      conversationId,
      participantCount: conversation.participants.length,
      messageCount: messages.length
    };

    if (forceImmediate) {
      // Immediate analysis
      const result = await fraudDetection.analyzeText(conversationId, formattedMessages, context);
      res.json(result);
    } else {
      // Debounced analysis
      fraudDetection.analyzeTextWithDebounce(
        conversationId,
        formattedMessages,
        context,
        (result) => {
          // This callback will be called after debounce
          // For now, we'll just log it. Real-time updates will be handled via Socket.io
          console.log('📊 Debounced analysis completed:', result);
        }
      );

      res.json({
        success: true,
        message: 'Text analysis queued (debounced)',
        debounceDelay: process.env.FRAUD_ANALYSIS_DEBOUNCE || 3000
      });
    }

  } catch (error) {
    console.error('❌ Text analysis route error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Service unavailable'
    });
  }
});

/**
 * POST /api/ai-analysis/audio
 * Analyze audio file for fraud detection
 */
router.post('/audio',
  audioUpload.rateLimiter(60), // 60 uploads per minute
  audioUpload.single('audio'),
  audioUpload.validateFormat(),
  async (req, res) => {
    try {
      const { conversationId, userId, chunkIndex = 0 } = req.body;
      
      console.log(`🎵 Audio analysis request - Conversation: ${conversationId}, Chunk: ${chunkIndex}`);

      // Validate required fields
      if (!conversationId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'conversationId and userId are required'
        });
      }

      // Check if conversation exists
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      const audioBuffer = req.file.buffer;
      const audioFormat = req.audioFormat;
      
      const metadata = {
        conversationId,
        userId,
        chunkIndex: parseInt(chunkIndex),
        format: audioFormat,
        originalSize: audioBuffer.length,
        ...req.audioMetadata
      };

      // Analyze audio
      const result = await fraudDetection.analyzeAudioChunk(audioBuffer, audioFormat, metadata);
      
      res.json(result);

    } catch (error) {
      console.error('❌ Audio analysis route error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Service unavailable'
      });
    }
  }
);

/**
 * POST /api/ai-analysis/audio-chunk
 * Analyze audio chunk for real-time fraud detection (streaming)
 */
router.post('/audio-chunk',
  audioUpload.rateLimiter(120), // 120 chunks per minute for streaming
  audioUpload.chunk(),
  async (req, res) => {
    try {
      const { conversationId, userId } = req.query;
      const chunkIndex = parseInt(req.headers['chunk-index']) || 0;
      
      console.log(`🎵 Audio chunk analysis - Conversation: ${conversationId}, Chunk: ${chunkIndex}`);

      // Validate required fields
      if (!conversationId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'conversationId and userId are required'
        });
      }

      const audioBuffer = req.audioBuffer;
      const audioFormat = req.audioFormat;
      
      const metadata = {
        conversationId,
        userId,
        chunkIndex,
        format: audioFormat,
        originalSize: audioBuffer.length,
        streaming: true,
        ...req.audioMetadata
      };

      // Analyze audio chunk
      const result = await fraudDetection.analyzeAudioChunk(audioBuffer, audioFormat, metadata);
      
      res.json(result);

    } catch (error) {
      console.error('❌ Audio chunk analysis route error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Service unavailable'
      });
    }
  }
);

/**
 * GET /api/ai-analysis/fraud-history/:conversationId
 * Get fraud analysis history for a conversation
 */
router.get('/fraud-history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { analysisType, limit = 50 } = req.query;
    
    console.log(`📊 Fraud history request - Conversation: ${conversationId}`);

    // Check if conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Get fraud history
    const history = await fraudDetection.getFraudHistory(conversationId, analysisType);
    
    // Limit results
    const limitedHistory = history.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      conversationId,
      analysisType: analysisType || 'all',
      count: limitedHistory.length,
      history: limitedHistory
    });

  } catch (error) {
    console.error('❌ Fraud history route error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Service unavailable'
    });
  }
});

/**
 * GET /api/ai-analysis/alerts/:userId
 * Get recent fraud alerts for a user
 */
router.get('/alerts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { hours = 24 } = req.query;
    
    console.log(`🚨 Recent alerts request - User: ${userId}, Hours: ${hours}`);

    // Get recent alerts
    const alerts = await fraudDetection.getRecentAlerts(userId, parseInt(hours));
    
    res.json({
      success: true,
      userId,
      hours: parseInt(hours),
      count: alerts.length,
      alerts
    });

  } catch (error) {
    console.error('❌ Recent alerts route error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Service unavailable'
    });
  }
});

/**
 * GET /api/ai-analysis/health
 * Check AI analysis service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await fraudDetection.checkHealth();
    
    const statusCode = health.fraudDetectionService && 
                      health.vllmServices.sailor2 && 
                      health.vllmServices.qwen2Audio ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.fraudDetectionService,
      ...health
    });

  } catch (error) {
    console.error('❌ Health check route error:', error.message);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
});

/**
 * DELETE /api/ai-analysis/debounce/:conversationId
 * Clear debounce timeout for a conversation (force immediate analysis)
 */
router.delete('/debounce/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log(`⏰ Clear debounce request - Conversation: ${conversationId}`);

    fraudDetection.clearDebounceTimeout(conversationId);
    
    res.json({
      success: true,
      message: 'Debounce timeout cleared',
      conversationId
    });

  } catch (error) {
    console.error('❌ Clear debounce route error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Service unavailable'
    });
  }
});

/**
 * GET /api/ai-analysis/stats/:conversationId
 * Get fraud analysis statistics for a conversation
 */
router.get('/stats/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log(`📈 Analysis stats request - Conversation: ${conversationId}`);

    // Check if conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Get analysis statistics
    const [textAnalyses, audioAnalyses, recentAlerts] = await Promise.all([
      FraudAnalysis.find({ conversationId, analysisType: 'text' }),
      FraudAnalysis.find({ conversationId, analysisType: 'audio' }),
      FraudAnalysis.find({ 
        conversationId, 
        alertTriggered: true,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    const stats = {
      textAnalysis: {
        total: textAnalyses.length,
        normalCount: textAnalyses.filter(a => a.fraudScore === 1).length,
        scamCount: textAnalyses.filter(a => a.fraudScore === 2).length,
        avgConfidence: textAnalyses.length > 0 ? 
          textAnalyses.reduce((sum, a) => sum + a.confidence, 0) / textAnalyses.length : 0
      },
      audioAnalysis: {
        total: audioAnalyses.length,
        normalCount: audioAnalyses.filter(a => a.fraudScore === 0).length,
        fraudCount: audioAnalyses.filter(a => a.fraudScore === 1).length,
        avgConfidence: audioAnalyses.length > 0 ? 
          audioAnalyses.reduce((sum, a) => sum + a.confidence, 0) / audioAnalyses.length : 0
      },
      alerts: {
        last24Hours: recentAlerts.length,
        lastAlert: recentAlerts.length > 0 ? recentAlerts[0].timestamp : null
      }
    };

    res.json({
      success: true,
      conversationId,
      stats
    });

  } catch (error) {
    console.error('❌ Analysis stats route error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Service unavailable'
    });
  }
});

module.exports = router;