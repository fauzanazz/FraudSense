const multer = require('multer');
const path = require('path');
const fs = require('fs');

class AudioUploadMiddleware {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp/uploads');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedFormats = ['flac', 'opus', 'wav'];
    
    // Ensure upload directory exists
    this.ensureUploadDir();
    
    // Configure multer
    this.upload = this.configureMulter();
  }

  /**
   * Ensure upload directory exists
   */
  ensureUploadDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log('📁 Created audio upload directory');
    }
  }

  /**
   * Configure multer for audio uploads
   * @returns {Object} Configured multer instance
   */
  configureMulter() {
    const storage = multer.memoryStorage(); // Store in memory for processing

    const fileFilter = (req, file, cb) => {
      try {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        
        if (!this.allowedFormats.includes(ext)) {
          return cb(new Error(`Unsupported audio format: ${ext}. Allowed: ${this.allowedFormats.join(', ')}`));
        }

        // Check MIME type
        const allowedMimeTypes = [
          'audio/flac',
          'audio/x-flac',
          'audio/ogg',
          'audio/opus',
          'audio/wav',
          'audio/wave',
          'audio/x-wav'
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          console.warn(`⚠️ Unexpected MIME type: ${file.mimetype} for file: ${file.originalname}`);
          // Allow it to proceed as we'll validate the actual content later
        }

        cb(null, true);
        
      } catch (error) {
        cb(error);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 1 // Only one file at a time
      }
    });
  }

  /**
   * Middleware for single audio file upload
   * @param {string} fieldName - Form field name for the audio file
   * @returns {Function} Express middleware function
   */
  single(fieldName = 'audio') {
    return (req, res, next) => {
      const singleUpload = this.upload.single(fieldName);
      
      singleUpload(req, res, (error) => {
        if (error) {
          console.error('❌ Audio upload error:', error.message);
          
          if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                success: false,
                error: `File too large. Maximum size: ${this.maxFileSize / (1024 * 1024)}MB`
              });
            }
            if (error.code === 'LIMIT_FILE_COUNT') {
              return res.status(400).json({
                success: false,
                error: 'Only one file allowed per request'
              });
            }
          }
          
          return res.status(400).json({
            success: false,
            error: error.message
          });
        }

        // Validate uploaded file
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No audio file provided'
          });
        }

        // Add audio format detection
        const detectedFormat = this.detectAudioFormat(req.file.buffer);
        req.audioFormat = detectedFormat;

        // Add file metadata to request
        req.audioMetadata = {
          originalName: req.file.originalname,
          size: req.file.size,
          detectedFormat,
          uploadTimestamp: new Date()
        };

        console.log(`📤 Audio file uploaded: ${req.file.originalname} (${req.file.size} bytes, ${detectedFormat})`);
        
        next();
      });
    };
  }

  /**
   * Middleware for audio chunk uploads (for streaming)
   * @returns {Function} Express middleware function
   */
  chunk() {
    return (req, res, next) => {
      // For streaming audio chunks, we expect raw body data
      const chunks = [];
      
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        try {
          const audioBuffer = Buffer.concat(chunks);
          
          if (audioBuffer.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'No audio data received'
            });
          }

          if (audioBuffer.length > this.maxFileSize) {
            return res.status(400).json({
              success: false,
              error: `Audio chunk too large. Maximum size: ${this.maxFileSize / (1024 * 1024)}MB`
            });
          }

          // Detect format from buffer
          const detectedFormat = this.detectAudioFormat(audioBuffer);
          
          // Add to request object
          req.audioBuffer = audioBuffer;
          req.audioFormat = detectedFormat;
          req.audioMetadata = {
            size: audioBuffer.length,
            detectedFormat,
            chunkTimestamp: new Date(),
            chunkIndex: parseInt(req.headers['chunk-index']) || 0
          };

          console.log(`🎵 Audio chunk received: ${audioBuffer.length} bytes (${detectedFormat})`);
          
          next();
          
        } catch (error) {
          console.error('❌ Audio chunk processing error:', error.message);
          res.status(500).json({
            success: false,
            error: 'Failed to process audio chunk'
          });
        }
      });

      req.on('error', (error) => {
        console.error('❌ Audio chunk stream error:', error.message);
        res.status(500).json({
          success: false,
          error: 'Audio stream error'
        });
      });
    };
  }

  /**
   * Middleware to validate audio format from request
   * @param {Array} allowedFormats - Optional array of allowed formats
   * @returns {Function} Express middleware function
   */
  validateFormat(allowedFormats = null) {
    const formats = allowedFormats || this.allowedFormats;
    
    return (req, res, next) => {
      const audioFormat = req.audioFormat || req.body.format;
      
      if (!audioFormat) {
        return res.status(400).json({
          success: false,
          error: 'Audio format not specified or detected'
        });
      }

      if (!formats.includes(audioFormat.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: `Unsupported audio format: ${audioFormat}. Allowed: ${formats.join(', ')}`
        });
      }

      next();
    };
  }

  /**
   * Middleware to add rate limiting for audio uploads
   * @param {number} maxUploadsPerMinute - Maximum uploads per minute per IP
   * @returns {Function} Express middleware function
   */
  rateLimiter(maxUploadsPerMinute = 30) {
    const uploads = new Map(); // IP -> [timestamp, timestamp, ...]
    
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      
      // Get or initialize upload history for this IP
      if (!uploads.has(clientIP)) {
        uploads.set(clientIP, []);
      }
      
      const ipUploads = uploads.get(clientIP);
      
      // Remove uploads older than 1 minute
      const recentUploads = ipUploads.filter(timestamp => timestamp > oneMinuteAgo);
      
      // Check rate limit
      if (recentUploads.length >= maxUploadsPerMinute) {
        return res.status(429).json({
          success: false,
          error: `Rate limit exceeded. Maximum ${maxUploadsPerMinute} uploads per minute.`,
          retryAfter: 60
        });
      }
      
      // Add current upload timestamp
      recentUploads.push(now);
      uploads.set(clientIP, recentUploads);
      
      next();
    };
  }

  /**
   * Detect audio format from buffer header
   * @param {Buffer} buffer - Audio buffer
   * @returns {string} Detected format
   */
  detectAudioFormat(buffer) {
    try {
      if (!buffer || buffer.length < 12) {
        return 'unknown';
      }

      // Check for RIFF/WAVE header (WAV)
      if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && 
          buffer.slice(8, 12).toString('ascii') === 'WAVE') {
        return 'wav';
      }

      // Check for FLAC header
      if (buffer.slice(0, 4).toString('ascii') === 'fLaC') {
        return 'flac';
      }

      // Check for Ogg header (Opus uses Ogg container)
      if (buffer.slice(0, 4).toString('ascii') === 'OggS') {
        // Look for Opus header in Ogg stream
        const oggPage = buffer.slice(0, Math.min(200, buffer.length)).toString('ascii');
        if (oggPage.includes('OpusHead')) {
          return 'opus';
        }
        return 'ogg';
      }

      return 'unknown';
      
    } catch (error) {
      console.warn('⚠️ Audio format detection error:', error.message);
      return 'unknown';
    }
  }

  /**
   * Error handling middleware for audio uploads
   * @returns {Function} Express error middleware function
   */
  errorHandler() {
    return (error, req, res, next) => {
      console.error('❌ Audio upload middleware error:', error.message);
      
      if (error instanceof multer.MulterError) {
        let message = 'Audio upload error';
        let statusCode = 400;
        
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            message = `File too large. Maximum size: ${this.maxFileSize / (1024 * 1024)}MB`;
            break;
          case 'LIMIT_FILE_COUNT':
            message = 'Only one file allowed per request';
            break;
          case 'LIMIT_FIELD_COUNT':
            message = 'Too many form fields';
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected file field';
            break;
          default:
            message = error.message;
        }
        
        return res.status(statusCode).json({
          success: false,
          error: message,
          code: error.code
        });
      }
      
      // Other errors
      res.status(500).json({
        success: false,
        error: 'Internal server error during audio upload'
      });
    };
  }

  /**
   * Get middleware configuration info
   * @returns {Object} Configuration information
   */
  getConfig() {
    return {
      maxFileSize: this.maxFileSize,
      allowedFormats: this.allowedFormats,
      tempDir: this.tempDir
    };
  }
}

module.exports = new AudioUploadMiddleware();