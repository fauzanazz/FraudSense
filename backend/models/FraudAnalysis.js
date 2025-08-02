const mongoose = require('mongoose');

const fraudAnalysisSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  analysisType: {
    type: String,
    enum: ['text', 'audio'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fraudScore: {
    type: Number,
    required: true,
    // Text: 1 (normal) or 2 (scam)
    // Audio: 0 (normal) or 1 (fraud)
    validate: {
      validator: function(value) {
        if (this.analysisType === 'text') {
          return value === 1 || value === 2;
        }
        if (this.analysisType === 'audio') {
          return value === 0 || value === 1;
        }
        return false;
      },
      message: 'Invalid fraud score for analysis type'
    }
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  inputData: {
    // Store chat history for text analysis or audio metadata for audio analysis
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  modelResponse: {
    // Store full model response for debugging
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  alertTriggered: {
    type: Boolean,
    default: false
  },
  alertTimestamp: {
    type: Date,
    default: null
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  audioChunkIndex: {
    type: Number,
    required: function() { return this.analysisType === 'audio'; },
    default: null
  },
  audioFormat: {
    type: String,
    enum: ['flac', 'opus', 'wav'],
    required: function() { return this.analysisType === 'audio'; },
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
fraudAnalysisSchema.index({ conversationId: 1, analysisType: 1 });
fraudAnalysisSchema.index({ userId: 1, timestamp: -1 });
fraudAnalysisSchema.index({ fraudScore: 1, alertTriggered: 1 });

// Static method to get fraud history for a conversation
fraudAnalysisSchema.statics.getFraudHistory = function(conversationId, analysisType = null) {
  const query = { conversationId };
  if (analysisType) {
    query.analysisType = analysisType;
  }
  return this.find(query).sort({ timestamp: -1 });
};

// Static method to get recent fraud alerts
fraudAnalysisSchema.statics.getRecentAlerts = function(userId, hours = 24) {
  const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    userId,
    alertTriggered: true,
    timestamp: { $gte: timeThreshold }
  }).sort({ timestamp: -1 });
};

// Instance method to check if this analysis should trigger an alert
fraudAnalysisSchema.methods.shouldTriggerAlert = function() {
  if (this.analysisType === 'text') {
    return this.fraudScore === 2; // Scam detected
  }
  if (this.analysisType === 'audio') {
    return this.fraudScore === 1; // Fraud detected
  }
  return false;
};

// Instance method to trigger alert
fraudAnalysisSchema.methods.triggerAlert = function() {
  this.alertTriggered = true;
  this.alertTimestamp = new Date();
  return this.save();
};

module.exports = mongoose.model('FraudAnalysis', fraudAnalysisSchema);