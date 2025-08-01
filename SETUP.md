# Quick Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn

## Installation

1. **Install all dependencies:**
```bash
npm run install:all
```

## Running the Application

### Option 1: Run Both Servers Together (Recommended)
```bash
npm run dev
```

This will start:
- Backend: http://localhost:3001
- Frontend: http://localhost:3000

### Option 2: Run Servers Separately

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

## Access the Application

- **Chat**: http://localhost:3000/chat
- **Call**: http://localhost:3000/call
- **Backend Health**: http://localhost:3001/health

## Testing Fraud Detection

### Text Messages
Try sending these messages in chat:
- **Safe**: "Hello, how are you?"
- **Fraudulent**: "URGENT: Your account suspended! Click here to verify"

### Audio Calls
- Start a call and speak normally
- The system will analyze audio characteristics
- Fraud alerts will appear if suspicious patterns are detected

## Troubleshooting

1. **Port already in use**: Change PORT in backend/.env
2. **Socket connection failed**: Ensure backend is running on port 3001
3. **CORS errors**: Check that frontend is connecting to correct backend URL

## Environment Variables

Create these files if needed:

**backend/.env:**
```
PORT=3001
NODE_ENV=development
```

**front-end-new/.env.local:**
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
``` 