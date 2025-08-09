# FraudSense Frontend Deployment Guide

## Environment Variables for Production

### Required Variables
```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

### Optional TURN Server Fallback
The frontend primarily gets TURN configuration from the backend via WebSocket. However, you can set fallback environment variables:

```env
# TURN server fallback (only used if backend config fails)
VITE_TURN_SERVER=your-server-ip-or-domain.com
VITE_TURN_USER=fraudsense
VITE_TURN_SECRET=fraudsense123

# Advanced WebRTC settings
VITE_ICE_RELAY_ONLY=0  # Set to 1 to force TURN relay only
VITE_USE_TWILIO_STUN=0 # Set to 1 to enable additional STUN servers
```

## Deployment Notes

### TURN Configuration Priority
1. **Primary**: Backend provides TURN config via `get-turn-config` socket event
2. **Fallback**: Environment variables (`VITE_TURN_*`)
3. **Default**: Google STUN servers only

### Production Considerations
- The frontend will automatically request TURN configuration from your backend
- Ensure your backend has proper TURN environment variables set
- TURN fallback environment variables are only used if backend config fails
- For security, avoid hardcoding TURN credentials in the frontend

### Testing TURN Configuration
1. Open browser developer tools
2. Look for console logs showing TURN configuration
3. Check WebRTC connection states in console
4. Verify ICE candidates include relay types when TURN is working

### WebRTC Debug Information
The VideoCall component includes debug information showing:
- Number of local/remote stream tracks
- Video/audio enabled status
- Audio level monitoring
- ICE connection states

### Common Issues
- **No video/audio**: Check HTTPS requirement for getUserMedia
- **Connection fails**: Verify TURN server credentials and ports
- **Audio detection not working**: Ensure backend AI services are running