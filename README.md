# Real-time Chat with Fraud Detection

A modern real-time chat application built with Next.js and Socket.IO, featuring an integrated fraud detection pipeline that analyzes messages in real-time.

## Features

### Frontend (Next.js)
- 🎨 Modern, responsive UI with Tailwind CSS
- 💬 Real-time messaging with WebSocket
- 👤 User authentication with username
- 🚨 Live fraud detection results
- 👍👎 Feedback system for classification accuracy
- ⚡ Smooth animations and transitions
- 📱 Mobile-friendly design

### Backend (Node.js + Socket.IO)
- 🔌 WebSocket server for real-time communication
- 🛡️ Text-based fraud detection pipeline
- 📊 Confidence scoring for classifications
- 👥 Multi-user room management
- 📝 Message history and feedback tracking
- 🏥 Health check endpoints

### Fraud Detection Features
- **Keyword Analysis**: Detects suspicious terms like "password", "credit card", "urgent"
- **Pattern Matching**: Identifies SSN, credit card numbers, phone numbers
- **Urgency Indicators**: Flags messages with excessive punctuation or urgency
- **Confidence Scoring**: Provides percentage-based confidence for each classification
- **Real-time Processing**: Analyzes messages within 1 second of sending

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

1. **Open the application** at http://localhost:3000
2. **Enter your username** in the join modal
3. **Start chatting** - messages are analyzed automatically
4. **View fraud results** - each message shows a classification badge
5. **Provide feedback** - use thumbs up/down buttons to rate accuracy

## Testing Fraud Detection

Try these example messages to test the fraud detection:

### Safe Messages:
- "Hello, how are you today?"
- "Let's meet for coffee tomorrow"
- "Thanks for the help!"

### Fraudulent Messages:
- "URGENT: Your account has been suspended! Click here to verify"
- "You've won $1,000,000! Send your credit card details"
- "I'm a Nigerian prince and need your bank account number"
- "Your SSN 123-45-6789 needs verification"

## Project Structure

```
datathon-final/
├── front-end-new/           # Next.js frontend
│   ├── app/
│   │   ├── chat/page.tsx    # Main chat interface
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── ChatMessage.tsx  # Individual message component
│   │   ├── ChatInput.tsx    # Message input component
│   │   └── UserJoinModal.tsx # Username entry modal
│   └── package.json
├── backend/                  # Node.js backend
│   ├── server.js            # Socket.IO server
│   ├── package.json
│   └── README.md
└── package.json             # Root package.json
```

## API Endpoints

### Backend REST API
- `GET /health` - Server health check
- `GET /users` - List connected users

### WebSocket Events

**Client → Server:**
- `joinRoom` - Join chat room
- `sendMessage` - Send message
- `sendFeedback` - Submit fraud detection feedback

**Server → Client:**
- `message` - New message received
- `fraudResult` - Fraud analysis result
- `feedbackUpdate` - Feedback count update
- `userJoined` - User joined notification
- `userLeft` - User left notification

## Customization

### Fraud Detection Rules
Edit `backend/server.js` to modify fraud detection logic:
- Add/remove keywords in `fraudKeywords` array
- Adjust pattern matching in `suspiciousPatterns`
- Modify scoring algorithm in `detectFraud()` function

### UI Styling
- Modify Tailwind classes in component files
- Update animations in `frontend/app/globals.css`
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License - see LICENSE file for details. 