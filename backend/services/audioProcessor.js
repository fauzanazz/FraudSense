const ffmpeg = require('fluent-ffmpeg');
const wav = require('node-wav');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');

class AudioProcessor {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'fraudsense-audio');
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
      // Deteksi format dari header; jika gagal pakai yang dikirim klien
      const detected = this.detectAudioFormat(audioBuffer);
      const inFmt = (detected && detected !== 'unknown')
        ? detected
        : ((format || '').toLowerCase().trim() || 'unknown');
  
      console.log(`🎵 Processing audio chunk... detected=${detected}, provided=${format}, used=${inFmt}`);
  
      // Validasi dasar
      const validation = this.validateAudioInput(audioBuffer, inFmt);
      if (!validation.valid) {
        throw new Error(`Audio validation failed: ${validation.errors.join(', ')}`);
      }
  
      // Simpan buffer ke file sementara (ekstensi sesuai inFmt)
      const inputFile = await this.saveBufferToTempFile(audioBuffer, inFmt);
  
      // Konversi → WAV 16k mono (paksa demuxer via inputFormat)
      const outputFile = await this.convertToWav(inputFile, {
        ...options,
        inputFormat: inFmt,
      });
  
      // Baca WAV hasil
      const processedBuffer = fs.readFileSync(outputFile);
      const audioData = wav.decode(processedBuffer);
  
      const metadata = {
        format: 'wav',
        sampleRate: audioData.sampleRate,
        channels: audioData.channelData.length,
        duration: audioData.channelData[0].length / audioData.sampleRate,
        originalFormat: inFmt,
        processingTime: Date.now()
      };
  
      this.cleanupTempFile(inputFile);
      this.cleanupTempFile(outputFile);
  
      console.log('✅ Audio processing completed:', metadata);
  
      return { audioBuffer: processedBuffer, metadata, success: true };
  
    } catch (error) {
      console.error('❌ Audio processing error:', error.message);
      return { audioBuffer: null, metadata: null, error: error.message, success: false };
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
      const outputFile = path.join(this.tempDir, `processed_${Date.now()}.wav`);
      const sr = options.sampleRate || this.sampleRate;
      const inFmt = (options.inputFormat || '').toLowerCase();
  
      console.log('🔄 Converting audio to WAV format... (inputFormat:', inFmt || 'auto', ')');
  
      // Helper: jalankan sekali dengan pilihan demuxer tertentu (atau biarkan auto-probe jika null)
      const runOnce = (demuxerLabel) =>
        new Promise((res, rej) => {
          const cmd = ffmpeg(inputFile);
  
          // Paksa demuxer jika ada
          if (demuxerLabel) {
            cmd.inputOptions(['-f', demuxerLabel]);
          }
          // Bantu FFmpeg membaca potongan blob (perbesar analyzation)
          cmd.inputOptions(['-analyzeduration', '100M', '-probesize', '100M']);
  
          cmd
            .noVideo()
            .audioFrequency(sr)
            .audioChannels(1)            // mono
            .audioCodec('pcm_s16le')     // 16-bit PCM
            .format('wav')
            .outputOptions(['-map_metadata', '-1']) // drop metadata
            .on('start', (cl) => console.log('📢 FFmpeg command:', cl))
            .on('progress', (p) => {
              if (p && typeof p.percent === 'number') {
                console.log('⏳ Processing:', Math.round(p.percent) + '%');
              }
            })
            .on('end', () => {
              console.log('✅ Audio conversion completed');
              res(outputFile);
            })
            .on('error', (err) => {
              console.error('❌ FFmpeg error:', err.message || err);
              // Hapus output parsial agar percobaan berikutnya bersih
              try { if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile); } catch (_) {}
              rej(err);
            })
            .save(outputFile);
        });
  
      // Tentukan urutan demuxer yang dicoba berdasarkan inputFormat
      const attempts = [];
      switch (inFmt) {
        case 'webm':
        case 'matroska':
          attempts.push('matroska'); // yang benar untuk -f (bukan "matroska,webm")
          attempts.push(null);       // biarkan FFmpeg probe jika paksa gagal
          break;
        case 'ogg':
        case 'opus':
          attempts.push('ogg');
          attempts.push(null);
          break;
        case 'mp3':
          attempts.push('mp3');
          attempts.push(null);
          break;
        case 'wav':
          attempts.push('wav');
          attempts.push(null);
          break;
        case 'aac':
        case 'm4a':
          // sering terdeteksi otomatis; tidak dipaksa
          attempts.push(null);
          break;
        default:
          // tidak diketahui → coba auto-probe saja
          attempts.push(null);
          break;
      }
  
      (async () => {
        let lastErr;
        for (const demuxer of attempts) {
          try {
            const out = await runOnce(demuxer);
            return resolve(out);
          } catch (e) {
            lastErr = e;
          }
        }
        reject(lastErr || new Error('FFmpeg failed to convert input'));
      })();
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
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    const supportedFormats = ['flac', 'opus', 'wav', 'webm', 'ogg', 'mp3', 'm4a', 'aac'];
  
    const validation = { valid: true, errors: [] };
  
    if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
      validation.valid = false;
      validation.errors.push('Invalid audio buffer');
      return validation;
    }
  
    const fmt = (format || '').toLowerCase();
    if (!supportedFormats.includes(fmt)) {
      validation.valid = false;
      validation.errors.push(`Unsupported format: ${format}. Supported: ${supportedFormats.join(', ')}`);
    }
  
    if (audioBuffer.length > maxSizeBytes) {
      validation.valid = false;
      validation.errors.push(`File too large: ${audioBuffer.length} bytes. Max: ${maxSizeBytes} bytes`);
    }
  
    if (audioBuffer.length < 1000) {
      validation.valid = false;
      validation.errors.push('Audio file too small');
    }
  
    return validation;
  }
  
  detectAudioFormat(buffer) {
    try {
      const b = buffer;
      if (!b || b.length < 4) return 'unknown';
  
      // WAV (RIFF)
      if (b.slice(0, 4).toString('ascii') === 'RIFF') return 'wav';
      // FLAC
      if (b.slice(0, 4).toString('ascii') === 'fLaC') return 'flac';
      // OGG container (OggS)
      if (b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return 'ogg';
      // WebM/Matroska (EBML header)
      if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return 'webm';
      // WebM Cluster (potongan tanpa header EBML)
      if (b[0] === 0x1F && b[1] === 0x43 && b[2] === 0xB6 && b[3] === 0x75) return 'webm';
      // MP3: "ID3" atau frame sync 0xFF Ex
      if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return 'mp3';
      if (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0) return 'mp3';
      // AAC (ADTS) heuristik
      if (b[0] === 0xFF && (b[1] & 0xF6) === 0xF0) return 'aac';
  
      return 'unknown';
    } catch {
      return 'unknown';
    }
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