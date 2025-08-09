# FraudSense Backend Deployment Guide

## Dokploy Deployment Setup

### 1. Prerequisites
- Dokploy instance running
- Domain name configured
- SSL certificates (optional for TURN over TLS)

### 2. Environment Variables for Dokploy

Set these environment variables in your Dokploy project:

```env
# Server Configuration
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb://admin:password123@mongodb:27017/chatapp?authSource=admin

# CORS / Socket (replace with your actual domains)
SOCKETIO_CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# TURN Server Configuration
TURN_DOMAIN=your-server-ip-or-domain.com
TURN_PORT=3478
TURN_TLS_PORT=5349
TURN_USER=fraudsense
TURN_PASSWORD=fraudsense123
TURN_ENABLE_TLS=false

# AI Services (if applicable)
SAILOR2_ENDPOINT=http://sailor2:8000
QWEN2_AUDIO_ENDPOINT=http://qwen2audio:8001

# Fraud Analysis
FRAUD_ANALYSIS_DEBOUNCE=3000
ENABLE_REAL_TIME_ALERTS=true
STORE_FRAUD_RESULTS=true
```

### 3. Docker Compose Configuration

The provided `docker-compose.yml` includes:
- **app**: Your Node.js application
- **coturn**: TURN server for WebRTC relay

### 4. Network Ports to Open

Ensure these ports are accessible on your server:
- **3001**: Node.js application (HTTP)
- **3478**: TURN server (UDP/TCP)
- **5349**: TURN server TLS (TCP) - if TLS enabled
- **10000-20000**: TURN relay ports (UDP)

### 5. Deployment Steps

1. **Upload files to your repository**:
   - `docker-compose.yml`
   - `turnserver-prod.conf`
   - Updated `.env.example`

2. **Configure Dokploy project**:
   - Create new Docker Compose project
   - Set environment variables
   - Configure domain routing

3. **Deploy**:
   - Push changes to your repository
   - Trigger deployment in Dokploy

### 6. TURN Server Configuration

The TURN server is configured with:
- **Username**: `fraudsense`
- **Password**: `fraudsense123`
- **Realm**: `fraudsense`
- **Ports**: 3478 (STUN/TURN), 5349 (TURNS), 10000-20000 (relay)

**Security Note**: Change the default username and password in production!

### 7. Testing TURN Server

To test if TURN server is working:
```bash
# Test STUN binding
turnutils_stunclient your-server-domain.com

# Test TURN allocation
turnutils_uclient -t -u fraudsense -w fraudsense123 your-server-domain.com
```

### 8. Troubleshooting

**TURN Server Issues**:
- Check if ports 3478 and UDP range 10000-20000 are open
- Verify firewall settings
- Check docker logs: `docker logs container_name`

**WebRTC Connection Issues**:
- Verify TURN credentials in environment variables
- Check browser console for ICE connection errors
- Test with STUN only first, then add TURN

**Performance Optimization**:
- Use `network_mode: host` for TURN server if needed
- Configure external IP in turnserver config
- Monitor resource usage

### 9. SSL/TLS Configuration (Optional)

For TURN over TLS, add certificates to the turnserver config:
```conf
cert=/etc/ssl/certs/turn_server_cert.pem
pkey=/etc/ssl/private/turn_server_pkey.pem
```

Then set `TURN_ENABLE_TLS=true` in environment variables.

### 10. Monitoring

Monitor these metrics:
- TURN server connection count
- WebRTC connection success rate
- Audio processing performance
- Fraud detection accuracy