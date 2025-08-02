const axios = require('axios');

class VLLMClient {
  constructor() {
    this.sailor2Endpoint = process.env.SAILOR2_ENDPOINT;
    this.qwen2AudioEndpoint = process.env.QWEN2_AUDIO_ENDPOINT;
    this.timeout = 30000; // 30 seconds timeout
  }

  /**
   * Analyze text for fraud detection using Sailor2 model
   * @param {Array} chatHistory - Array of chat messages
   * @param {Object} context - Additional context (user info, etc.)
   * @returns {Promise<Object>} Analysis result with fraud score (1=normal, 2=scam)
   */
  async analyzeText(chatHistory, context = {}) {
    try {
      const startTime = Date.now();
      
      // Format chat history for the model
      const prompt = this.formatChatHistoryForAnalysis(chatHistory, context);
      
      console.log('📝 Sending text analysis request to Sailor2...');
      
      const response = await axios.post(
        `${this.sailor2Endpoint}/v1/completions`,
        {
          model: "fauzanazz/sailor2-fraud-indo-8b-merged",
          prompt: prompt,
          max_tokens: 10,
          temperature: 0.1,
          stop: ["\n"]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      const processingTime = Date.now() - startTime;
      const rawResponse = response.data.choices[0].text.trim();
      
      console.log('✅ Sailor2 response received:', rawResponse);
      
      // Parse the response to extract fraud score
      const fraudScore = this.parseTextAnalysisResponse(rawResponse);
      
      return {
        fraudScore,
        confidence: response.data.confidence || 0.8,
        processingTime,
        rawResponse,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Text analysis error:', error.message);
      
      return {
        fraudScore: 1, // Default to normal when error occurs
        confidence: 0,
        processingTime: 0,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Analyze audio for fraud detection using Qwen2.5-audio model
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {Object} metadata - Audio metadata (format, sampleRate, etc.)
   * @returns {Promise<Object>} Analysis result with fraud score (0=normal, 1=fraud)
   */
  async analyzeAudio(audioBuffer, metadata = {}) {
    try {
      const startTime = Date.now();
      
      // Convert audio buffer to base64 for API transmission
      const audioBase64 = audioBuffer.toString('base64');
      
      // Format prompt for audio analysis
      const prompt = this.formatAudioPromptForAnalysis(metadata);
      
      console.log('🎵 Sending audio analysis request to Qwen2.5-audio...');
      
      const response = await axios.post(
        `${this.qwen2AudioEndpoint}/v1/completions`,
        {
          model: "fauzanazz/qwen2-audio-indo-fraud-7b-merged",
          prompt: prompt,
          audio: audioBase64,
          max_tokens: 5,
          temperature: 0.1,
          stop: ["\n"]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      const processingTime = Date.now() - startTime;
      const rawResponse = response.data.choices[0].text.trim();
      
      console.log('✅ Qwen2.5-audio response received:', rawResponse);
      
      // Parse the response to extract fraud score
      const fraudScore = this.parseAudioAnalysisResponse(rawResponse);
      
      return {
        fraudScore,
        confidence: response.data.confidence || 0.8,
        processingTime,
        rawResponse,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Audio analysis error:', error.message);
      
      return {
        fraudScore: 0, // Default to normal when error occurs
        confidence: 0,
        processingTime: 0,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Format chat history into a prompt for fraud analysis
   * @param {Array} chatHistory - Array of chat messages
   * @param {Object} context - Additional context
   * @returns {string} Formatted prompt
   */
  formatChatHistoryForAnalysis(chatHistory, context) {
    let prompt = "Analyze the following conversation for potential fraud or scam indicators. Respond with only '1' for normal conversation or '2' for scam/fraud detected.\n\n";
    
    // Add context if available
    if (context.userInfo) {
      prompt += `User Context: ${JSON.stringify(context.userInfo)}\n\n`;
    }
    
    // Add conversation history
    prompt += "Conversation:\n";
    chatHistory.forEach((message, index) => {
      prompt += `${message.senderName}: ${message.content}\n`;
    });
    
    prompt += "\nAnalysis (1=normal, 2=scam): ";
    
    return prompt;
  }

  /**
   * Format audio metadata into a prompt for audio analysis
   * @param {Object} metadata - Audio metadata
   * @returns {string} Formatted prompt
   */
  formatAudioPromptForAnalysis(metadata) {
    let prompt = "Analyze the following audio for potential fraud indicators in speech patterns, voice characteristics, or suspicious behavior. Respond with only '0' for normal audio or '1' for fraud detected.\n\n";
    
    if (metadata) {
      prompt += `Audio Metadata: Sample Rate: ${metadata.sampleRate || 16000}Hz, Format: ${metadata.format || 'unknown'}, Duration: ${metadata.duration || 'unknown'}s\n\n`;
    }
    
    prompt += "Audio Analysis (0=normal, 1=fraud): ";
    
    return prompt;
  }

  /**
   * Parse text analysis response and extract fraud score
   * @param {string} rawResponse - Raw model response
   * @returns {number} Fraud score (1 or 2)
   */
  parseTextAnalysisResponse(rawResponse) {
    // Extract number from response
    const match = rawResponse.match(/[12]/);
    if (match) {
      const score = parseInt(match[0]);
      return (score === 1 || score === 2) ? score : 1;
    }
    
    // Fallback: look for keywords
    const lowerResponse = rawResponse.toLowerCase();
    if (lowerResponse.includes('scam') || lowerResponse.includes('fraud') || lowerResponse.includes('suspicious')) {
      return 2;
    }
    
    return 1; // Default to normal
  }

  /**
   * Parse audio analysis response and extract fraud score
   * @param {string} rawResponse - Raw model response
   * @returns {number} Fraud score (0 or 1)
   */
  parseAudioAnalysisResponse(rawResponse) {
    // Extract number from response
    const match = rawResponse.match(/[01]/);
    if (match) {
      const score = parseInt(match[0]);
      return (score === 0 || score === 1) ? score : 0;
    }
    
    // Fallback: look for keywords
    const lowerResponse = rawResponse.toLowerCase();
    if (lowerResponse.includes('fraud') || lowerResponse.includes('suspicious') || lowerResponse.includes('fake')) {
      return 1;
    }
    
    return 0; // Default to normal
  }

  /**
   * Check if VLLM services are available
   * @returns {Promise<Object>} Service availability status
   */
  async checkServiceHealth() {
    const results = {
      sailor2: false,
      qwen2Audio: false,
      timestamp: new Date()
    };

    try {
      // Check Sailor2 service
      const sailor2Response = await axios.get(`${this.sailor2Endpoint}/health`, { timeout: 5000 });
      results.sailor2 = sailor2Response.status === 200;
    } catch (error) {
      console.log('Sailor2 service unavailable:', error.message);
    }

    try {
      // Check Qwen2.5-audio service
      const qwen2Response = await axios.get(`${this.qwen2AudioEndpoint}/health`, { timeout: 5000 });
      results.qwen2Audio = qwen2Response.status === 200;
    } catch (error) {
      console.log('Qwen2.5-audio service unavailable:', error.message);
    }

    return results;
  }
}

module.exports = new VLLMClient();