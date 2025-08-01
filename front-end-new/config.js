module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Client Configuration
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  
  // Fraud Detection Configuration
  FRAUD_DETECTION_ENABLED: process.env.FRAUD_DETECTION_ENABLED !== 'false',
  AUDIO_PROCESSING_INTERVAL: parseInt(process.env.AUDIO_PROCESSING_INTERVAL) || 3000,
  
  // WebRTC Configuration
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  
  // Room Configuration
  MAX_MESSAGES_PER_ROOM: 100,
  MAX_USERS_PER_ROOM: 10,
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000'
}; 