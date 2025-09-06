const FraudAnalysis = require('../models/FraudAnalysis');
const vllmClient = require('./vllmClient');
const audioProcessor = require('./audioProcessor');

// Tambahkan di paling atas file:
const { Types } = require('mongoose');
const isValidObjectId = (v) => {
  try {
    if (!v) return false;
    if (!Types.ObjectId.isValid(v)) return false;
    return String(new Types.ObjectId(v)) === String(v);
  } catch { return false; }
};

class FraudDetectionService {
  constructor() {
    this.debounceTimeouts = new Map(); // Store debounce timeouts by conversation ID
    this.debounceDelay = parseInt(process.env.FRAUD_ANALYSIS_DEBOUNCE) || 3000;
    this.enableRealTimeAlerts = process.env.ENABLE_REAL_TIME_ALERTS !== 'false'; // Default to true
    this.storeFraudResults = process.env.STORE_FRAUD_RESULTS !== 'false'; // Default to true
    
    // Debug environment variables
    console.log('🔧 FraudDetectionService initialized:', {
      enableRealTimeAlerts: this.enableRealTimeAlerts,
      storeFraudResults: this.storeFraudResults,
      debounceDelay: this.debounceDelay,
      envENABLE_REAL_TIME_ALERTS: process.env.ENABLE_REAL_TIME_ALERTS,
      envSTORE_FRAUD_RESULTS: process.env.STORE_FRAUD_RESULTS
    });
  }

  /**
   * Analyze chat messages for fraud (with debouncing)
   * @param {string} conversationId - Conversation ID
   * @param {Array} messages - Array of chat messages
   * @param {Object} context - Additional context (user info, etc.)
   * @param {Function} callback - Callback function for results
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeTextWithDebounce(conversationId, messages, context, callback) {
    // Clear existing timeout for this conversation
    if (this.debounceTimeouts.has(conversationId)) {
      clearTimeout(this.debounceTimeouts.get(conversationId));
    }

    // Set new timeout
    const timeoutId = setTimeout(async () => {
      try {
        console.log(`⏰ Debounce timeout reached for conversation ${conversationId}`);
        const result = await this.analyzeText(conversationId, messages, context);
        
        if (callback) {
          callback(result);
        }
        
        // Remove timeout from map
        this.debounceTimeouts.delete(conversationId);
        
      } catch (error) {
        console.error('❌ Debounced text analysis error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    }, this.debounceDelay);

    this.debounceTimeouts.set(conversationId, timeoutId);
    
    console.log(`⏱️ Text analysis debounced for ${this.debounceDelay}ms (conversation: ${conversationId})`);
  }

  /**
   * Analyze chat messages for fraud (immediate)
   * @param {string} conversationId - Conversation ID
   * @param {Array} messages - Array of chat messages
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeText(conversationId, messages, context = {}) {
    try {
      console.log(`📝 Starting text analysis for conversation ${conversationId}`);
      
      if (!messages || messages.length === 0) {
        throw new Error('No messages provided for analysis');
      }

      // Call VLLM text analysis
      const analysisResult = await vllmClient.analyzeText(messages, context);
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Text analysis failed');
      }

      // Store analysis result
      const fraudAnalysis = await this.storeFraudAnalysis({
        conversationId,
        analysisType: 'text',
        userId: context.userId,
        fraudScore: analysisResult.fraudScore,
        confidence: analysisResult.confidence,
        inputData: {
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]?.content.substring(0, 100),
          context
        },
        modelResponse: analysisResult.rawResponse,
        processingTime: analysisResult.processingTime
      });

      // Check if alert should be triggered
      const shouldAlert = fraudAnalysis.shouldTriggerAlert();
      let alertResult = null;

      if (shouldAlert && this.enableRealTimeAlerts) {
        alertResult = await this.triggerFraudAlert(fraudAnalysis, 'text');
      }

      console.log(`✅ Text analysis completed - Score: ${analysisResult.fraudScore}, Alert: ${shouldAlert}`);

      return {
        success: true,
        analysisId: fraudAnalysis._id,
        fraudScore: analysisResult.fraudScore,
        confidence: analysisResult.confidence,
        alertTriggered: shouldAlert,
        alertData: alertResult,
        processingTime: analysisResult.processingTime
      };

    } catch (error) {
      console.error('❌ Text analysis error:', error.message);
      
      return {
        success: false,
        error: error.message,
        fraudScore: 1, // Default to normal
        confidence: 0
      };
    }
  }

  /**
   * Analyze audio chunk for fraud
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {string} format - Audio format (flac, opus, wav)
   * @param {Object} metadata - Audio metadata
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeAudioChunk(audioBuffer, format, metadata = {}) {
    try {
      // Normalisasi format input (auto-detect jika unknown)
      let inputFormat = (format || '').toLowerCase().trim();
      if (!inputFormat || inputFormat === 'unknown') {
        inputFormat = audioProcessor.detectAudioFormat(audioBuffer);
      }
      console.log(`🎵 Starting audio analysis - Format: ${inputFormat}`);
  
      // Validate audio input
      const validation = audioProcessor.validateAudioInput(audioBuffer, inputFormat);
      if (!validation.valid) {
        throw new Error(`Audio validation failed: ${validation.errors.join(', ')}`);
      }
  
      // Convert/normalize ke WAV 16k mono (FFmpeg)
      const processingResult = await audioProcessor.processAudioChunk(audioBuffer, inputFormat);
      if (!processingResult?.success) {
        throw new Error(processingResult?.error || 'Audio processing failed');
      }
  
      // Analisis ke Gemini
      const analysisResult = await vllmClient.analyzeAudio(
        processingResult.audioBuffer,
        processingResult.metadata
      );
      if (!analysisResult?.success) {
        throw new Error(analysisResult?.error || 'Audio analysis failed');
      }
  
      // Tentukan conversationId (ObjectId valid) atau fallback callSessionId (string)
      const convId = isValidObjectId(metadata.conversationId) ? metadata.conversationId : undefined;
      const callSessionId = convId
        ? undefined
        : (metadata.conversationId || metadata.callSessionId || `call_${metadata.userId}_${Date.now()}`);
  
      // Siapkan dokumen untuk disimpan
      const doc = {
        conversationId: convId,                      // hanya diisi jika valid ObjectId
        callSessionId,                               // fallback string untuk sesi panggilan
        analysisType: 'audio',
        userId: metadata.userId,
        fraudScore: analysisResult.fraudScore,       // legacy audio: 1 fraud, 0 normal
        confidence: analysisResult.confidence,
        inputData: {
          originalFormat: inputFormat,               // format asli dari klien
          finalFormat: 'wav',                        // hasil konversi
          ...processingResult.metadata,              // { format:'wav', sampleRate, channels, duration, ... }
          model: analysisResult.details || null      // { score, label, reason }
        },
        modelResponse: analysisResult.rawResponse,   // JSON mentah dari Gemini
        processingTime: analysisResult.processingTime,
        audioChunkIndex: metadata.chunkIndex || 0,
        audioFormat: 'wav'                           // SIMPAN final format agar lolos enum schema lama
      };
  
      // Hapus field undefined agar gak nabrak schema
      if (!doc.conversationId) delete doc.conversationId;
      if (!doc.callSessionId) delete doc.callSessionId;
  
      // Simpan
      const fraudAnalysis = await this.storeFraudAnalysis(doc);
  
      // Keputusan alert (legacy mapping audio)
      const shouldAlert = fraudAnalysis.shouldTriggerAlert
        ? fraudAnalysis.shouldTriggerAlert()
        : (analysisResult.fraudScore === 1);
  
      console.log('🚨 Alert decision debug:', {
        fraudScore: analysisResult.fraudScore,
        shouldAlert: shouldAlert,
        enableRealTimeAlerts: this.enableRealTimeAlerts,
        hasShouldTriggerAlert: !!fraudAnalysis.shouldTriggerAlert,
        willTriggerAlert: shouldAlert && this.enableRealTimeAlerts
      });
  
      let alertResult = null;
      if (shouldAlert && this.enableRealTimeAlerts) {
        alertResult = await this.triggerFraudAlert(fraudAnalysis, 'audio');
        console.log('🚨 Alert triggered successfully:', alertResult);
      } else {
        console.log('🚫 Alert NOT triggered - shouldAlert:', shouldAlert, 'enableRealTimeAlerts:', this.enableRealTimeAlerts);
      }
  
      console.log(`✅ Audio analysis completed - Score: ${analysisResult.fraudScore}, Alert: ${shouldAlert}`);
  
      return {
        success: true,
        analysisId: fraudAnalysis._id,
        fraudScore: analysisResult.fraudScore,
        confidence: analysisResult.confidence,
        alertTriggered: shouldAlert,
        alertData: alertResult,
        processingTime: analysisResult.processingTime,
        chunkIndex: metadata.chunkIndex || 0,
        details: analysisResult.details || null
      };
  
    } catch (error) {
      console.error('❌ Audio analysis error:', error.message);
      return {
        success: false,
        error: error.message,
        fraudScore: 0,
        confidence: 0
      };
    }
  }

  /**
   * Store fraud analysis result in database
   * @param {Object} analysisData - Analysis data to store
   * @returns {Promise<Object>} Stored analysis document
   */
  async storeFraudAnalysis(analysisData) {
    if (!this.storeFraudResults) {
      console.log('📦 Fraud result storage disabled');
      return {
        shouldTriggerAlert: () => analysisData.fraudScore > 1,
        _id: 'temp-id'
      };
    }

    try {
      const fraudAnalysis = new FraudAnalysis(analysisData);
      const savedAnalysis = await fraudAnalysis.save();
      
      console.log(`💾 Stored fraud analysis: ${savedAnalysis._id}`);
      return savedAnalysis;
      
    } catch (error) {
      console.error('❌ Failed to store fraud analysis:', error.message);
      throw error;
    }
  }

  /**
   * Trigger fraud alert
   * @param {Object} fraudAnalysis - Fraud analysis document
   * @param {string} type - Analysis type ('text' or 'audio')
   * @returns {Promise<Object>} Alert result
   */
  async triggerFraudAlert(fraudAnalysis, type) {
    try {
      // Mark alert as triggered in database
      if (fraudAnalysis.triggerAlert) {
        await fraudAnalysis.triggerAlert();
      }

      const alertData = {
        alertId: `alert_${Date.now()}`,
        analysisId: fraudAnalysis._id,
        conversationId: fraudAnalysis.conversationId,
        userId: fraudAnalysis.userId,
        type,
        fraudScore: fraudAnalysis.fraudScore,
        confidence: fraudAnalysis.confidence,
        timestamp: new Date(),
        severity: this.calculateAlertSeverity(fraudAnalysis.fraudScore, type),
        message: this.generateAlertMessage(fraudAnalysis.fraudScore, type)
      };

      console.log(`🚨 Fraud alert triggered: ${alertData.alertId}`);
      
      return alertData;
      
    } catch (error) {
      console.error('❌ Failed to trigger fraud alert:', error.message);
      throw error;
    }
  }

  /**
   * Calculate alert severity based on fraud score and type
   * @param {number} fraudScore - Fraud score
   * @param {string} type - Analysis type
   * @returns {string} Severity level
   */
  calculateAlertSeverity(fraudScore, type) {
    if (type === 'text') {
      return fraudScore === 2 ? 'high' : 'low';
    }
    if (type === 'audio') {
      return fraudScore === 1 ? 'high' : 'low';
    }
    return 'low';
  }

  /**
   * Generate alert message based on fraud score and type
   * @param {number} fraudScore - Fraud score
   * @param {string} type - Analysis type
   * @returns {string} Alert message
   */
  generateAlertMessage(fraudScore, type) {
    if (type === 'text') {
      return fraudScore === 2 ? 'Potential scam detected in conversation' : 'Normal conversation';
    }
    if (type === 'audio') {
      return fraudScore === 1 ? 'Suspicious audio patterns detected' : 'Normal audio';
    }
    return 'Unknown fraud pattern';
  }

  /**
   * Get fraud history for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} analysisType - Optional analysis type filter
   * @returns {Promise<Array>} Fraud analysis history
   */
  async getFraudHistory(conversationId, analysisType = null) {
    try {
      const history = await FraudAnalysis.getFraudHistory(conversationId, analysisType);
      return history;
    } catch (error) {
      console.error('❌ Failed to get fraud history:', error.message);
      throw error;
    }
  }

  /**
   * Get recent fraud alerts for a user
   * @param {string} userId - User ID
   * @param {number} hours - Hours to look back (default: 24)
   * @returns {Promise<Array>} Recent fraud alerts
   */
  async getRecentAlerts(userId, hours = 24) {
    try {
      const alerts = await FraudAnalysis.getRecentAlerts(userId, hours);
      return alerts;
    } catch (error) {
      console.error('❌ Failed to get recent alerts:', error.message);
      throw error;
    }
  }

  /**
   * Check service health
   * @returns {Promise<Object>} Service health status
   */
  async checkHealth() {
    try {
      const vllmHealth = await vllmClient.checkServiceHealth();
      
      return {
        fraudDetectionService: true,
        vllmServices: vllmHealth,
        debounceActive: this.debounceTimeouts.size,
        settings: {
          debounceDelay: this.debounceDelay,
          enableRealTimeAlerts: this.enableRealTimeAlerts,
          storeFraudResults: this.storeFraudResults
        },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        fraudDetectionService: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Clear debounce timeout for a conversation
   * @param {string} conversationId - Conversation ID
   */
  clearDebounceTimeout(conversationId) {
    if (this.debounceTimeouts.has(conversationId)) {
      clearTimeout(this.debounceTimeouts.get(conversationId));
      this.debounceTimeouts.delete(conversationId);
      console.log(`🧹 Cleared debounce timeout for conversation ${conversationId}`);
    }
  }

  /**
   * Clear all debounce timeouts
   */
  clearAllDebounceTimeouts() {
    this.debounceTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.debounceTimeouts.clear();
    console.log('🧹 Cleared all debounce timeouts');
  }
}

module.exports = new FraudDetectionService();