// models/FraudAnalysis.js
const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const FraudAnalysisSchema = new Schema(
  {
    // Relasi ke chat (opsional — hanya jika ada conversation)
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },

    // Fallback ID untuk sesi panggilan (audio call) saat tidak ada conversationId
    callSessionId: { type: String, trim: true },

    // Siapa user yang terkait analisis ini
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Jenis analisis
    analysisType: { type: String, enum: ['text', 'audio'], required: true },

    // Skor legacy agar kompatibel dengan UI lama:
    //  - text: 2=fraud, 1=normal
    //  - audio: 1=fraud, 0=normal
    fraudScore: { type: Number, required: true },

    // Confidence dari model (0..1), opsi
    confidence: { type: Number, min: 0, max: 1 },

    // Data input tambahan (ringkasan, metadata audio, dll.)
    inputData: Schema.Types.Mixed,

    // Respons mentah dari model (string JSON)
    modelResponse: { type: String },

    // Waktu pemrosesan model (ms)
    processingTime: { type: Number },

    // Khusus audio streaming
    audioChunkIndex: { type: Number },
    audioFormat: {
      type: String,
      enum: ['wav', 'flac', 'opus', 'webm', 'ogg', 'mp3', 'aac', 'm4a'], // izinkan format umum
    },

    // Flag alert
    alertTriggered: { type: Boolean, default: false },

    // Timestamp catatan ini dibuat
    timestamp: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Validasi: minimal salah satu harus ada
FraudAnalysisSchema.pre('validate', function (next) {
  const hasConversation = !!this.conversationId;
  const hasCallSession = typeof this.callSessionId === 'string' && this.callSessionId.trim().length > 0;
  if (!hasConversation && !hasCallSession) {
    return next(new Error('Either conversationId or callSessionId is required'));
  }
  next();
});

// Method: aturan alert default
FraudAnalysisSchema.methods.shouldTriggerAlert = function () {
  if (this.analysisType === 'text') {
    return this.fraudScore === 2; // text: 2 = fraud
  }
  if (this.analysisType === 'audio') {
    return this.fraudScore === 1; // audio: 1 = fraud
  }
  return false;
};

FraudAnalysisSchema.methods.triggerAlert = async function () {
  this.alertTriggered = true;
  await this.save();
  return true;
};

// Statics: histori & alerts (dipakai routes)
FraudAnalysisSchema.statics.getFraudHistory = async function (conversationIdOrCallId, analysisType) {
  const q = {};
  if (conversationIdOrCallId) {
    if (Types.ObjectId.isValid(conversationIdOrCallId)) {
      q.conversationId = new Types.ObjectId(conversationIdOrCallId);
    } else {
      q.callSessionId = String(conversationIdOrCallId);
    }
  }
  if (analysisType) q.analysisType = analysisType;
  return this.find(q).sort({ timestamp: -1 }).limit(200);
};

FraudAnalysisSchema.statics.getRecentAlerts = async function (userId, hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000);
  const q = { alertTriggered: true, timestamp: { $gte: since } };
  if (userId && Types.ObjectId.isValid(userId)) q.userId = new Types.ObjectId(userId);
  return this.find(q).sort({ timestamp: -1 }).limit(200);
};

// Indexes untuk query cepat
FraudAnalysisSchema.index({ conversationId: 1, timestamp: -1 });
FraudAnalysisSchema.index({ callSessionId: 1, timestamp: -1 });
FraudAnalysisSchema.index({ userId: 1, timestamp: -1 });
FraudAnalysisSchema.index({ analysisType: 1, timestamp: -1 });
FraudAnalysisSchema.index({ alertTriggered: 1, timestamp: -1 });

module.exports = mongoose.models.FraudAnalysis || mongoose.model('FraudAnalysis', FraudAnalysisSchema);