// services/vllmClient.js
// Full Gemini (text & audio) with strict JSON {score,label,reason}

const axios = require('axios');
const { GoogleGenAI, Type } = require('@google/genai');

class VLLMClient {
  constructor() {
    // ===== Gemini config =====
    // Env:
    //   GEMINI_API_KEY=...
    //   GEMINI_TEXT_MODEL=gemini-2.5-flash
    //   GEMINI_AUDIO_MODEL=gemini-2.5-flash
    this.geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.geminiTextModel = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
    this.geminiAudioModel = process.env.GEMINI_AUDIO_MODEL || 'gemini-2.5-flash';
    this.timeout = 30000;

    if (!this.geminiApiKey) {
      console.warn('[VLLMClient] Missing GEMINI_API_KEY / GOOGLE_API_KEY');
    }
    this.genai = new GoogleGenAI({ apiKey: this.geminiApiKey });
  }

  // =========================
  // TEXT ANALYSIS (Gemini)
  // =========================
  /**
   * @param {Array<{role:string, content:string}>} chatHistory
   * @param {Object} context
   */
  async analyzeText(chatHistory, context = {}) {
    const startTime = Date.now();
    try {
      if (!this.genai) throw new Error('Gemini client not initialized');

      const prompt = this.formatChatHistoryForAnalysis(chatHistory, context);

      // Use JSON structured output for strict schema
      const response = await this.genai.models.generateContent({
        model: this.geminiTextModel,
        contents: prompt, // string OK; SDK wraps as Content
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              label: { type: Type.STRING, enum: ['fraud', 'normal'] },
              reason: { type: Type.STRING },
            },
            required: ['score', 'label', 'reason'],
            propertyOrdering: ['score', 'label', 'reason'],
          },
        },
      });

      const rawResponse = String(response?.text ?? '').trim();
      const processingTime = Date.now() - startTime;

      const { score, label, reason } = safeParseThreeFieldJSON(rawResponse);
      // Legacy mapping (TEXT): 2=fraud, 1=normal
      const fraudScore = (label === 'fraud') || (typeof score === 'number' && score >= 0.5) ? 2 : 1;

      return {
        success: true,
        fraudScore,
        confidence: typeof score === 'number' ? score : 0.8,
        processingTime,
        rawResponse,
        details: { score, label, reason },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fraudScore: 1, // default normal (legacy text)
        confidence: 0.5,
        processingTime: Date.now() - startTime,
        rawResponse: '',
      };
    }
  }

  formatChatHistoryForAnalysis(chatHistory, context) {
    const lines = (chatHistory || []).map(m => {
      const r = (m.role || '').toLowerCase();
      const who = r === 'user' ? 'User' : 'Assistant';
      // singkatkan konten agar tidak membengkak
      const c = (m.content || '').slice(0, 4000);
      return `${who}: ${c}`;
    });
    const joined = lines.join('\n');

    const contextStr = `userId=${context.userId || '-'}; conversationId=${context.conversationId || '-'}`;

    return [
      'You are a fraud/scam detector for text chat.',
      'Decide if the conversation shows fraud signals (OTP asking, money urgency, phishing cues, spoofing, social engineering).',
      'Return STRICT JSON only (no extra text, no code fences) with keys: score, label, reason.',
      'score ∈ [0,1] is fraud likelihood; label ∈ {"fraud","normal"}; reason <= 200 chars.',
      `Context: ${contextStr}`,
      '',
      'Chat Transcript:',
      joined,
      '',
      'Output keys EXACTLY: score,label,reason',
    ].join('\n');
  }

  // =========================
  // AUDIO ANALYSIS (Gemini)
  // =========================
  /**
   * @param {Buffer} audioBuffer - WAV PCM 16k mono (audioProcessor already normalizes)
   * @param {Object} metadata
   */
  async analyzeAudio(audioBuffer, metadata = {}) {
    const startTime = Date.now();
    try {
      if (!this.genai) throw new Error('Gemini client not initialized');

      const audioBase64 = audioBuffer.toString('base64');
      const prompt = this.formatAudioPromptForAnalysis(metadata);

      const response = await this.genai.models.generateContent({
        model: this.geminiAudioModel,
        contents: [
          { text: prompt },
          { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              label: { type: Type.STRING, enum: ['fraud', 'normal'] },
              reason: { type: Type.STRING },
            },
            required: ['score', 'label', 'reason'],
            propertyOrdering: ['score', 'label', 'reason'],
          },
        },
      });

      const rawText = String(response?.text ?? '').trim();
      const processingTime = Date.now() - startTime;
      const { score, label, reason } = safeParseThreeFieldJSON(rawText);

      // Legacy mapping (AUDIO): 1=fraud, 0=normal
      const fraudScore = (label === 'fraud') || (typeof score === 'number' && score >= 0.5) ? 1 : 0;

      return {
        success: true,
        fraudScore,
        confidence: typeof score === 'number' ? score : 0.8,
        processingTime,
        rawResponse: rawText,
        details: { score, label, reason },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fraudScore: 0,
        confidence: 0.5,
        processingTime: Date.now() - startTime,
        rawResponse: '',
      };
    }
  }

  formatAudioPromptForAnalysis(metadata = {}) {
    const meta = {
      format: metadata.format || 'wav',
      sampleRate: metadata.sampleRate || 16000,
      channels: metadata.channels || 1,
      duration: metadata.duration ?? 'unknown',
    };

    return [
      'You are an expert call-audio fraud detector (voice phishing, OTP ask, money urgency, impersonation/spoofing).',
      'Analyze the attached audio and return STRICT JSON only with: score, label, reason.',
      'score ∈ [0,1] (fraud likelihood); label ∈ {"fraud","normal"}; reason <= 200 chars.',
      `Audio metadata: ${JSON.stringify(meta)}`,
      '',
      'Output keys EXACTLY: score,label,reason',
    ].join('\n');
  }

  // =========================
  // HEALTH CHECKS
  // =========================
  async checkServiceHealth() {
    const results = {
      geminiText: false,
      geminiAudio: false,
      timestamp: new Date(),
    };

    try {
      const pingText = await this.genai.models.generateContent({
        model: this.geminiTextModel,
        contents: 'ping',
      });
      results.geminiText = !!(pingText && (pingText.text ?? '').length >= 0);
    } catch (e) {
      console.log('Gemini text unavailable:', e.message);
    }

    try {
      const pingAudio = await this.genai.models.generateContent({
        model: this.geminiAudioModel,
        contents: 'ping',
      });
      results.geminiAudio = !!(pingAudio && (pingAudio.text ?? '').length >= 0);
    } catch (e) {
      console.log('Gemini audio unavailable:', e.message);
    }

    return results;
  }
}

// ===== Utils =====
function safeParseThreeFieldJSON(raw) {
  if (!raw) return { score: undefined, label: undefined, reason: undefined };
  let t = String(raw).trim();

  // strip fences if any
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim();
  }
  const i = t.indexOf('{');
  const j = t.lastIndexOf('}');
  if (i >= 0 && j > i) t = t.slice(i, j + 1);

  let obj = null;
  try { obj = JSON.parse(t); } catch (_e) {}

  let score = (obj && typeof obj.score === 'number') ? obj.score : undefined;
  if (typeof score === 'number') score = Math.max(0, Math.min(1, score));

  let label = (obj && typeof obj.label === 'string') ? obj.label.toLowerCase().trim() : undefined;
  if (label !== 'fraud' && label !== 'normal') {
    const base = JSON.stringify(obj || {}) + ' ' + raw.toLowerCase();
    if (/fraud|scam|phishing|spoof|penipuan/.test(base)) label = 'fraud';
    else if (/normal|legit|benign|aman|bukan penipuan/.test(base)) label = 'normal';
  }
  const reason = (obj && typeof obj.reason === 'string') ? obj.reason : undefined;

  return { score, label, reason };
}

module.exports = new VLLMClient();
