const ffmpeg = require('fluent-ffmpeg');
const wav = require('node-wav');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

class AudioProcessor {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.sampleRate = parseInt(process.env.AUDIO_SAMPLE_RATE) || 16000;
    this.chunkDuration = parseInt(process.env.AUDIO_CHUNK_DURATION) || 3000; // 3 seconds
    
    // Ensure temp directory exists
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists for audio processing
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log('📁 Created temp directory for audio processing');
    }
  }

  /**
   * Process audio chunk for fraud analysis
   * @param {Buffer} audioBuffer - Input audio buffer
   * @param {string} format - Input format ('flac', 'opus', 'wav')
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed audio data and metadata
   */
  async processAudioChunk(audioBuffer, format, options = {}) {
    try {
      console.log(`🎵 Processing ${format} audio chunk...`);
      
      const inputFile = await this.saveBufferToTempFile(audioBuffer, format);
      const outputFile = await this.convertToWav(inputFile, options);
      
      // Read the processed WAV file
      const processedBuffer = fs.readFileSync(outputFile);
      const audioData = wav.decode(processedBuffer);
      
      // Extract metadata
      const metadata = {
        format: 'wav',
        sampleRate: audioData.sampleRate,
        channels: audioData.channelData.length,
        duration: audioData.channelData[0].length / audioData.sampleRate,
        originalFormat: format,
        processingTime: Date.now()
      };
      
      // Cleanup temp files
      this.cleanupTempFile(inputFile);
      this.cleanupTempFile(outputFile);
      
      console.log('✅ Audio processing completed:', metadata);
      
      return {
        audioBuffer: processedBuffer,
        metadata,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Audio processing error:', error.message);
      
      return {
        audioBuffer: null,
        metadata: null,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Convert audio to WAV format suitable for AI model
   * @param {string} inputFile - Path to input file
   * @param {Object} options - Conversion options
   * @returns {Promise<string>} Path to output WAV file
   */
  async convertToWav(inputFile, options = {}) {
    return new Promise((resolve, reject) => {
      const outputFile = path.join(
        this.tempDir, 
        `processed_${Date.now()}.wav`
      );

      console.log('🔄 Converting audio to WAV format...');

      ffmpeg(inputFile)
        .audioFrequency(options.sampleRate || this.sampleRate)
        .audioChannels(1) // Mono for AI processing
        .audioCodec('pcm_s16le') // 16-bit PCM
        .format('wav')
        .on('start', (commandLine) => {
          console.log('📢 FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('⏳ Processing: ' + Math.round(progress.percent) + '% done');
        })
        .on('end', () => {
          console.log('✅ Audio conversion completed');
          resolve(outputFile);
        })
        .on('error', (error) => {
          console.error('❌ FFmpeg error:', error.message);
          reject(error);
        })
        .save(outputFile);
    });
  }

  /**
   * Save audio buffer to temporary file
   * @param {Buffer} buffer - Audio buffer
   * @param {string} format - File format
   * @returns {Promise<string>} Path to temporary file
   */
  async saveBufferToTempFile(buffer, format) {
    const fileName = `input_${Date.now()}.${format}`;
    const filePath = path.join(this.tempDir, fileName);
    
    const writeFile = promisify(fs.writeFile);
    await writeFile(filePath, buffer);
    
    console.log(`💾 Saved ${format} buffer to temp file: ${fileName}`);
    return filePath;
  }

  /**
   * Split audio into chunks for streaming analysis
   * @param {Buffer} audioBuffer - Input audio buffer
   * @param {number} chunkDurationMs - Chunk duration in milliseconds
   * @returns {Promise<Array>} Array of audio chunks
   */
  async splitAudioIntoChunks(audioBuffer, chunkDurationMs = null) {
    try {
      const duration = chunkDurationMs || this.chunkDuration;
      const audioData = wav.decode(audioBuffer);
      const samplesPerChunk = Math.floor((duration / 1000) * audioData.sampleRate);
      
      const chunks = [];
      const totalSamples = audioData.channelData[0].length;
      
      for (let i = 0; i < totalSamples; i += samplesPerChunk) {
        const end = Math.min(i + samplesPerChunk, totalSamples);
        const chunkData = {
          sampleRate: audioData.sampleRate,
          channelData: [audioData.channelData[0].slice(i, end)]
        };
        
        const chunkBuffer = wav.encode(chunkData.channelData, {
          sampleRate: chunkData.sampleRate,
          float: false,
          bitDepth: 16
        });
        
        chunks.push({
          buffer: chunkBuffer,
          index: Math.floor(i / samplesPerChunk),
          startTime: (i / audioData.sampleRate) * 1000,
          duration: ((end - i) / audioData.sampleRate) * 1000
        });
      }
      
      console.log(`🔪 Split audio into ${chunks.length} chunks`);
      return chunks;
      
    } catch (error) {
      console.error('❌ Audio splitting error:', error.message);
      throw error;
    }
  }

  /**
   * Validate audio format and size
   * @param {Buffer} audioBuffer - Audio buffer to validate
   * @param {string} format - Expected format
   * @returns {Object} Validation result
   */
  validateAudioInput(audioBuffer, format) {
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    const supportedFormats = ['flac', 'opus', 'wav'];
    
    const validation = {
      valid: true,
      errors: []
    };
    
    // Check format support
    if (!supportedFormats.includes(format.toLowerCase())) {
      validation.valid = false;
      validation.errors.push(`Unsupported format: ${format}. Supported: ${supportedFormats.join(', ')}`);
    }
    
    // Check file size
    if (audioBuffer.length > maxSizeBytes) {
      validation.valid = false;
      validation.errors.push(`File too large: ${audioBuffer.length} bytes. Max: ${maxSizeBytes} bytes`);
    }
    
    // Check minimum size
    if (audioBuffer.length < 1000) {
      validation.valid = false;
      validation.errors.push('Audio file too small');
    }
    
    return validation;
  }

  /**
   * Clean up temporary file
   * @param {string} filePath - Path to file to delete
   */
  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up temp file: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup temp file:', error.message);
    }
  }

  /**
   * Clean up all temp files older than specified time
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupOldTempFiles(maxAgeMs = 60 * 60 * 1000) {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      
      files.forEach(fileName => {
        const filePath = path.join(this.tempDir, fileName);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAgeMs) {
          this.cleanupTempFile(filePath);
        }
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to cleanup old temp files:', error.message);
    }
  }

  /**
   * Get audio format from buffer header
   * @param {Buffer} buffer - Audio buffer
   * @returns {string} Detected format or 'unknown'
   */
  detectAudioFormat(buffer) {
    try {
      // Check for common audio format signatures
      const header = buffer.slice(0, 12).toString('ascii', 0, 4);
      
      if (header === 'RIFF') {
        return 'wav';
      }
      if (header === 'fLaC') {
        return 'flac';
      }
      if (buffer[0] === 0x4F && buffer[1] === 0x67) {
        return 'opus'; // Ogg container, likely Opus
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Start periodic cleanup of temp files
   */
  startPeriodicCleanup() {
    // Clean up temp files every 30 minutes
    setInterval(() => {
      this.cleanupOldTempFiles();
    }, 30 * 60 * 1000);
    
    console.log('🧹 Started periodic temp file cleanup');
  }
}

module.exports = new AudioProcessor();