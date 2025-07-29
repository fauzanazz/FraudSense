# Chat Backend Server

A Node.js backend server with Socket.IO for real-time chat functionality and fraud detection.

## Features

- Real-time messaging using Socket.IO
- Fraud detection pipeline for text messages
- User room management
- Message feedback system
- REST API endpoints for health checks

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```
PORT=3001
NODE_ENV=development
```

3. Start the development server:
```bash
npm run dev
```

4. Start the production server:
```bash
npm start
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /users` - Get connected users

## WebSocket Events

### Client to Server:
- `joinRoom` - Join a chat room
- `sendMessage` - Send a message
- `sendFeedback` - Send feedback on fraud detection

### Server to Client:
- `message` - New message received
- `fraudResult` - Fraud detection result
- `feedbackUpdate` - Feedback update
- `userJoined` - User joined the room
- `userLeft` - User left the room

## Fraud Detection

The server includes a simplified fraud detection system that analyzes messages for:
- Suspicious keywords
- Pattern matching (SSN, credit card numbers, etc.)
- Urgency indicators
- Confidence scoring

## Development

The server runs on port 3001 by default and accepts connections from `http://localhost:3000`. 