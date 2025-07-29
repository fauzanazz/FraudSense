# 🧪 Testing Guide - Video Call Feature

## Prerequisites
- Backend server running on `http://localhost:3001`
- Frontend running on `http://localhost:3000`

## How to Test Video Calls

### Method 1: Multiple Browser Tabs
1. **Start Backend & Frontend:**
   ```bash
   npm run dev
   ```

2. **Open First Tab:**
   - Go to `http://localhost:3000/call`
   - Enter username: `Alice`
   - Click "Join Call Room"

3. **Open Second Tab:**
   - Go to `http://localhost:3000/call`
   - Enter username: `Bob`
   - Click "Join Call Room"

4. **Initiate Call:**
   - In Alice's tab, select "Bob" from dropdown
   - Choose call type (Audio/Video)
   - Click "Start Call"
   - Bob will receive call request and can accept

### Method 2: Different Browsers
1. **Chrome:** Open with username `Alice`
2. **Firefox/Safari:** Open with username `Bob`
3. Follow same steps as above

### Method 3: Incognito Mode
1. **Normal Window:** Username `Alice`
2. **Incognito Window:** Username `Bob`

## Expected Behavior

### ✅ Success Scenarios:
- Both users see each other in video call
- Audio fraud detection shows results every 3-5 seconds
- Call timer increases
- Mute/Video toggle works
- End call works for both users

### ❌ Common Issues & Solutions:

**"Socket not connected"**
- Make sure backend is running: `cd backend && npm run dev`
- Check browser console for connection errors

**"No other users available"**
- Open another tab/window with different username
- Wait 5 seconds for user list to refresh

**"You cannot call yourself"**
- Use different usernames for each tab/window

**MediaRecorder errors**
- Application will use fallback simulation
- Check browser permissions for microphone/camera

**WebRTC connection fails**
- Check STUN server connectivity
- Try different browsers or incognito mode

## Testing Fraud Detection

### Text-based (Chat):
- Try keywords: "password", "credit card", "bank account", "social security"
- Check for red "Fraud" badges on messages

### Audio-based (Video Call):
- Speak normally - should show "Safe" most times
- Speak suspicious phrases - may trigger "Fraud Detected"
- Fallback simulation runs every 5 seconds if MediaRecorder fails

## Debug Information

### Backend Logs:
```bash
cd backend
npm run dev
# Watch for connection logs and fraud detection results
```

### Frontend Console:
- Open DevTools (F12)
- Check Console tab for connection status
- Network tab shows WebSocket connections

### Health Check:
```bash
curl http://localhost:3001/health
# Should return: {"status":"OK","connectedUsers":X,"totalMessages":Y}
```

## Troubleshooting

1. **Backend not starting:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend not starting:**
   ```bash
   cd front-end-new
   npm install
   npm run dev
   ```

3. **Port conflicts:**
   - Backend: Change port in `backend/server.js`
   - Frontend: Change port in `front-end-new/package.json`

4. **Browser permissions:**
   - Allow microphone/camera access
   - Check browser settings for media permissions 