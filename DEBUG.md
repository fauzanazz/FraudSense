# 🔍 Debugging Connection Issues

## Common "Socket not connected" Error

### What it means:
The error occurs when the frontend tries to use the WebSocket connection before it's fully established.

### Quick Fixes:

#### 1. **Refresh the Page**
- Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- This forces a complete reload and reconnection

#### 2. **Check Backend Status**
```bash
# In terminal, check if backend is running
curl http://localhost:3001/health
# Should return: {"status":"OK","connectedUsers":X,"totalMessages":Y}
```

#### 3. **Restart Both Servers**
```bash
# Stop current servers (Ctrl+C)
# Then restart:
npm run dev
```

#### 4. **Clear Browser Cache**
- Open DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"

## Connection Status Indicators

### ✅ Green Status: Connected
- WebSocket connection is active
- Can send/receive messages
- Ready for calls

### ❌ Red Status: Disconnected
- WebSocket connection lost
- Auto-reconnect will attempt in 3 seconds
- Manual refresh may be needed

## Testing Steps

### Step 1: Verify Backend
```bash
cd backend
npm run dev
# Should see: "Server running on port 3001"
```

### Step 2: Verify Frontend
```bash
cd front-end-new
npm run dev
# Should see: "Ready - started server on 0.0.0.0:3000"
```

### Step 3: Test Connection
1. Open `http://localhost:3000/call`
2. Check browser console (F12)
3. Look for: "✅ Connected to signaling server"

### Step 4: Test with Two Users
1. **Tab 1:** Username `Alice`
2. **Tab 2:** Username `Bob`
3. Wait for both to show "🟢 Connected"
4. Try initiating call

## Browser Console Messages

### ✅ Success Messages:
```
✅ Connected to signaling server
✅ Reconnected to signaling server
```

### ❌ Error Messages:
```
❌ Connection error: [error details]
❌ Disconnected from signaling server
🔄 Attempting to reconnect...
```

### 🔧 Debug Messages:
```
Waiting for socket connection... 0
Waiting for socket connection... 1
...
Socket not connected after retries
```

## Troubleshooting Checklist

- [ ] Backend server running on port 3001
- [ ] Frontend server running on port 3000
- [ ] Browser console shows "✅ Connected"
- [ ] No firewall blocking localhost
- [ ] Using different usernames for each tab
- [ ] Allowed microphone/camera permissions

## Advanced Debugging

### Check Network Tab:
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Should see connection to `ws://localhost:3001`

### Check Socket.IO Status:
```javascript
// In browser console:
// Check if socket exists
console.log(window.socket);

// Check connection status
console.log(window.socket?.connected);
```

### Force Reconnection:
```javascript
// In browser console:
// Disconnect and reconnect
window.socket?.disconnect();
window.socket?.connect();
```

## Still Having Issues?

1. **Try Different Browser**: Chrome → Firefox or Safari
2. **Try Incognito Mode**: Eliminates cache/cookie issues
3. **Check Port Conflicts**: Make sure nothing else uses ports 3000/3001
4. **Restart Computer**: Sometimes network stack needs reset

## Emergency Reset

If nothing works:
```bash
# Kill all Node processes
pkill -f node

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
cd backend && npm install
cd ../front-end-new && npm install

# Restart servers
npm run dev
``` 