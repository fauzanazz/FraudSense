# Fraud Detection Chat & Call Application

A real-time chat and video call application with AI-powered fraud detection capabilities.

## Features

- **Real-time Chat**: Instant messaging with fraud detection
- **Video/Audio Calls**: WebRTC-based calling with fraud analysis
- **AI Fraud Detection**: 
  - Text-based fraud detection using keyword analysis and pattern matching
  - Audio-based fraud detection for voice calls
  - Real-time alerts and confidence scoring
- **User Management**: Join rooms and manage connections
- **Responsive UI**: Modern, mobile-friendly interface

## Project Structure

```
datathon-final/
├── backend/           # Express.js + Socket.IO server
│   ├── server.js      # Main server file
│   └── package.json   # Backend dependencies
└── front-end-new/     # Next.js frontend application
    ├── app/           # Next.js app directory
    ├── components/    # React components
    └── package.json   # Frontend dependencies
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation & Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd front-end-new
npm install
```

## Running the Application

### Option 1: Run Backend and Frontend Separately

**Terminal 1 - Start Backend:**
```bash
cd backend
npm start
# or for development with auto-restart:
npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
cd front-end-new
npm run dev
```

### Option 2: Run Both with Concurrently (if installed globally)

```bash
# From project root
concurrently "cd backend && npm start" "cd front-end-new && npm run dev"
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Connected Users**: http://localhost:3001/users

## Usage

### Chat Feature
1. Open http://localhost:3000/chat
2. Enter your username and join the chat room
3. Start sending messages
4. Fraud detection will analyze messages in real-time
5. Alerts will appear for suspicious content

### Call Feature
1. Open http://localhost:3000/call
2. Enter your username to join the call room
3. Select a user to call (audio or video)
4. Accept incoming calls
5. Audio fraud detection runs during calls

## Fraud Detection Features

### Text Analysis
- Keyword-based detection (passwords, credit cards, etc.)
- Pattern matching (SSN, credit card numbers, phone numbers)
- Urgency indicators analysis
- Confidence scoring (0-100%)

### Audio Analysis
- Volume and pitch analysis
- Speech speed detection
- Audio quality assessment
- Real-time processing during calls

## API Endpoints

### Backend API Routes
- `GET /health` - Server health check
- `GET /users` - Get connected users
- `GET /call-users` - Get users available for calls

### WebSocket Events
- `joinRoom` - Join chat room
- `joinCallRoom` - Join call room
- `sendMessage` - Send chat message
- `sendFeedback` - Send fraud detection feedback
- `offer/answer/iceCandidate` - WebRTC signaling
- `callRequest/callAccepted/callRejected` - Call management
- `audioChunk` - Audio data for fraud analysis

## Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Development

### Backend Development
- Uses Express.js for HTTP server
- Socket.IO for real-time communication
- CORS enabled for frontend communication
- Modular fraud detection functions

### Frontend Development
- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Socket.IO client for real-time features
- WebRTC for peer-to-peer calls

## Deployment

### Backend Deployment
- Can be deployed to any Node.js hosting service
- Ensure WebSocket support
- Set appropriate CORS origins

### Frontend Deployment
- Optimized for Vercel deployment
- Static export available
- Environment variables for production

## Security Considerations

- Fraud detection is for demonstration purposes
- In production, implement proper authentication
- Add rate limiting and input validation
- Use HTTPS in production
- Implement proper error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and demonstration purposes. 