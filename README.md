# Real-time Chat & Video Call with Fraud Detection

A modern real-time chat and video call application built with Next.js and Socket.IO, featuring integrated fraud detection pipelines that analyze both text messages and audio streams in real-time.

## Features

### Frontend (Next.js)
- 🎨 Modern, responsive UI with Tailwind CSS
- 💬 Real-time messaging with WebSocket
- 📞 Peer-to-peer video/audio calls with WebRTC
- 👤 User authentication with username
- 🚨 Live fraud detection results (text + audio)
- 👍👎 Feedback system for classification accuracy
- ⚡ Smooth animations and transitions
- 📱 Mobile-friendly design

### Backend (Node.js + Socket.IO)
- 🔌 WebSocket server for real-time communication
- 🛡️ Text-based fraud detection pipeline
- 🔊 Audio-based fraud detection pipeline
- 📊 Confidence scoring for classifications
- 👥 Multi-user room management
- 📝 Message history and feedback tracking
- 🏥 Health check endpoints

### Video Call Features
- **WebRTC Peer-to-Peer**: Direct media streaming between users
- **Audio/Video Support**: Both audio-only and video calls
- **Real-time Audio Analysis**: Continuous fraud detection on audio streams
- **Call Controls**: Mute, video toggle, end call
- **Live Audio Visualizer**: Real-time waveform display
- **Fraud Alerts**: Instant notifications during calls

### Fraud Detection Features
- **Text Analysis**: Detects suspicious terms and patterns
- **Audio Analysis**: Analyzes voice characteristics and patterns
- **Real-time Processing**: Processes data within seconds
- **Confidence Scoring**: Provides percentage-based confidence
- **Multi-modal Detection**: Combines text and audio analysis

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd datathon-final
npm run install:all
```

2. **Start both servers:**
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Manual Setup

If you prefer to run servers separately:

**Frontend:**
```bash
cd front-end-new
npm install
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm run dev
```

## Usage

### Chat Feature
1. **Open the application** at http://localhost:3000
2. **Click "Enter Chat Room"** or navigate to `/chat`
3. **Enter your username** in the join modal
4. **Start chatting** - messages are analyzed automatically
5. **View fraud results** - each message shows a classification badge
6. **Provide feedback** - use thumbs up/down buttons to rate accuracy

### Video Call Feature
1. **Open the application** at http://localhost:3000
2. **Click "Start Voice Call"** or navigate to `/call`
3. **Enter your username** in the join modal
4. **Select a user** from the available users list
5. **Choose call type** (audio or video)
6. **Start the call** - audio will be analyzed in real-time
7. **View fraud alerts** - real-time notifications during the call

## Testing Fraud Detection

### Text Messages:
**Safe messages:**
- "Hello, how are you today?"
- "Let's meet for coffee tomorrow"

**Fraudulent messages:**
- "URGENT: Your account has been suspended! Click here to verify"
- "You've won $1,000,000! Send your credit card details"
- "I'm a Nigerian prince and need your bank account number"

### Audio Calls:
The system analyzes audio characteristics including:
- Volume levels (high volume may indicate urgency)
- Pitch patterns (unusual patterns may indicate fraud)
- Speech speed (fast speech may indicate urgency)
- Audio quality (poor quality may indicate recording)

## Project Structure

```
datathon-final/
├── front-end-new/           # Next.js frontend
│   ├── app/
│   │   ├── chat/page.tsx    # Chat interface
│   │   ├── call/page.tsx    # Video call interface
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── ChatMessage.tsx  # Individual message component
│   │   ├── ChatInput.tsx    # Message input component
│   │   ├── UserJoinModal.tsx # Username entry modal
│   │   ├── CallInterface.tsx # Video call interface
│   │   └── CallSetup.tsx    # Call setup modal
│   └── package.json
├── backend/                  # Node.js backend
│   ├── server.js            # Socket.IO server with WebRTC signaling
│   ├── package.json
│   └── README.md
└── package.json             # Root package.json
```

## API Endpoints

### Backend REST API
- `GET /health` - Server health check
- `GET /users` - List connected users
- `GET /call-users` - List users available for calls

### WebSocket Events

**Chat Events:**
- `joinRoom` - Join chat room
- `sendMessage` - Send message
- `sendFeedback` - Submit fraud detection feedback

**Call Events:**
- `joinCallRoom` - Join call room
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `iceCandidate` - WebRTC ICE candidate
- `callRequest` - Initiate call request
- `callAccepted` - Accept call
- `callRejected` - Reject call
- `endCall` - End call
- `audioChunk` - Send audio for analysis

**Server Events:**
- `message` - New message received
- `fraudResult` - Fraud analysis result (text or audio)
- `feedbackUpdate` - Feedback count update
- `userJoined` - User joined notification
- `userLeft` - User left notification

## WebRTC Implementation

### Signaling
- Uses Socket.IO for WebRTC signaling
- Handles offer/answer exchange
- Manages ICE candidate exchange
- Supports multiple concurrent calls

### Media Handling
- Peer-to-peer media streaming
- Audio recording for fraud detection
- Real-time audio processing
- Automatic media cleanup

### STUN Servers
- Google STUN servers for NAT traversal
- Supports both audio and video calls
- Automatic fallback mechanisms

## Customization

### Fraud Detection Rules
Edit `backend/server.js` to modify detection logic:

**Text Detection:**
- Add/remove keywords in `fraudKeywords` array
- Adjust pattern matching in `suspiciousPatterns`
- Modify scoring algorithm in `detectFraud()` function

**Audio Detection:**
- Modify `detectAudioFraud()` function
- Adjust audio feature thresholds
- Integrate with real ML models (LALM, etc.)

### UI Styling
- Modify Tailwind classes in component files
- Update animations in `front-end-new/app/globals.css`
- Customize color schemes and layouts

## Development

### Adding New Features
1. **Frontend**: Add components in `front-end-new/components/`
2. **Backend**: Extend `server.js` with new Socket.IO events
3. **Styling**: Use Tailwind CSS classes for consistent design

### Debugging
- Frontend logs: Browser console
- Backend logs: Terminal running `npm run dev:backend`
- WebSocket: Use browser dev tools Network tab
- WebRTC: Use browser dev tools WebRTC tab

## Production Deployment

### Frontend
```bash
cd front-end-new
npm run build
npm start
```

### Backend
```bash
cd backend
npm start
```

Remember to:
- Set environment variables
- Configure CORS for production domains
- Use a process manager like PM2
- Set up proper SSL certificates
- Configure TURN servers for WebRTC

## Security Considerations

- **WebRTC Security**: Implement proper authentication
- **Audio Privacy**: Ensure audio data is handled securely
- **Fraud Detection**: Validate all inputs and outputs
- **Rate Limiting**: Implement API rate limiting
- **Data Encryption**: Use HTTPS/WSS in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License - see LICENSE file for details. 