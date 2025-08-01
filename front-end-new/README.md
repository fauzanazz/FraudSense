# Full-Stack Next.js Chat & Audio App

A real-time chat and audio calling application built with Next.js and Socket.IO, featuring fraud detection for both text and audio content.

## Features

### Chat Functionality
- Real-time messaging with WebSocket
- Fraud detection for text messages
- User feedback system (thumbs up/down)
- Message history persistence
- User join/leave notifications

### Audio/Video Calling
- WebRTC-based peer-to-peer calls
- Audio and video support
- Real-time audio fraud detection
- Call controls (mute, video toggle)
- Call duration tracking

### Fraud Detection
- Text-based fraud detection with keyword analysis
- Audio-based fraud detection simulation
- Confidence scoring
- Real-time classification results

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Node.js, Express, Socket.IO
- **Styling**: Tailwind CSS
- **Real-time**: WebSocket (Socket.IO)
- **Media**: WebRTC for audio/video calls

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd front-end-new
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Option 1: Run Both Server and Client (Recommended)
```bash
npm run dev:full
```

This will start both the WebSocket server (port 3001) and the Next.js client (port 3000) simultaneously.

### Option 2: Run Separately

**Terminal 1 - Start WebSocket Server:**
```bash
npm run dev:server
```

**Terminal 2 - Start Next.js Client:**
```bash
npm run dev
```

## Usage

### Chat Page (`/chat`)
1. Open http://localhost:3000/chat
2. Enter your username to join
3. Start sending messages
4. View real-time fraud detection results
5. Provide feedback on classifications

### Call Page (`/call`)
1. Open http://localhost:3000/call
2. Enter your username to join the call room
3. See other users in the room
4. Initiate audio or video calls
5. Use call controls during the call
6. Monitor real-time audio fraud detection

## API Endpoints

### WebSocket Server (Port 3001)

**Health Check:**
```
GET http://localhost:3001/health
```

**Connected Users:**
```
GET http://localhost:3001/users
```

### WebSocket Events

#### Chat Events
- `joinRoom` - Join a chat room
- `sendMessage` - Send a message
- `sendFeedback` - Send feedback on fraud detection
- `message` - Receive a message
- `fraudResult` - Receive fraud detection result
- `feedbackUpdate` - Receive feedback update

#### Call Events
- `joinCallRoom` - Join a call room
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `iceCandidate` - ICE candidate exchange
- `callRequest` - Request a call
- `callAccepted` - Accept a call
- `callRejected` - Reject a call
- `endCall` - End a call
- `audioChunk` - Send audio for fraud detection

## Project Structure

```
front-end-new/
├── app/                    # Next.js app directory
│   ├── chat/              # Chat page
│   ├── call/              # Call page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ChatMessage.tsx    # Chat message component
│   ├── ChatInput.tsx      # Chat input component
│   ├── CallInterface.tsx  # Call interface component
│   └── CallSetup.tsx      # Call setup component
├── server.js              # WebSocket server
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Development

### Adding New Features

1. **Chat Features**: Modify `app/chat/page.tsx` and related components
2. **Call Features**: Modify `app/call/page.tsx` and related components
3. **Server Features**: Modify `server.js` to add new WebSocket events
4. **Fraud Detection**: Replace simulation functions in `server.js` with real ML models

### Environment Variables

Create a `.env.local` file for environment-specific configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Client Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change the server port in `server.js` or kill existing processes
   - Update the client connection URL accordingly

2. **WebSocket Connection Failed**
   - Ensure the server is running on port 3001
   - Check CORS configuration in `server.js`
   - Verify firewall settings

3. **Audio/Video Not Working**
   - Ensure HTTPS in production (required for media access)
   - Check browser permissions for camera/microphone
   - Verify WebRTC support in the browser

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=socket.io:* npm run dev:full
```

## Production Deployment

1. Build the Next.js application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start:server
npm run start
```

3. Configure environment variables for production
4. Set up proper SSL certificates for WebRTC
5. Configure reverse proxy if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
