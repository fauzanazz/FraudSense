# WebRTC Deployment Guide for FraudSense

This guide covers deploying your WebRTC voice call application with TURN server support on DigitalOcean using Dokploy.

## 🚀 Quick Setup Overview

1. **DigitalOcean Droplet** with Docker + Dokploy
2. **TURN Server** (Coturn) for NAT traversal  
3. **WebRTC Signaling** via Socket.IO (already implemented)
4. **Domain & SSL** setup for production

---

## 📋 Prerequisites

- DigitalOcean account
- Domain name pointing to your droplet
- Basic Docker knowledge

---

## 🛠️ Infrastructure Setup

### 1. Create DigitalOcean Droplet

```bash
# Recommended specs:
# - Ubuntu 22.04 LTS
# - 2GB RAM minimum (4GB+ for production)
# - Static IP assigned
```

### 2. Open Required Ports

In DigitalOcean firewall settings, ensure these ports are open:

```bash
# HTTP/HTTPS
TCP 80, 443

# TURN Server
TCP/UDP 3478

# TURN Relay Ports (UDP range for media)
UDP 49152-65535

# Application ports (if needed)
TCP 3001 (Backend API)
TCP 5173 (Frontend - dev only)
```

### 3. Install Dokploy

SSH into your droplet and install Dokploy:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

---

## 📦 Docker Configuration

### 1. Environment Setup

Copy and customize the production environment:

```bash
cp .env.production .env
```

Edit `.env` with your domain and credentials:

```bash
# Your domain configuration
TURN_REALM=your-domain.com
TURN_SERVER_URL=your-domain.com:3478
TURN_SERVER_PUBLIC_URL=your-domain.com:3478

# Generate strong secret
TURN_SECRET=$(openssl rand -hex 32)

# Your domains
FRONTEND_URL=https://app.your-domain.com
BACKEND_URL=https://api.your-domain.com
SOCKETIO_CORS_ORIGINS=https://app.your-domain.com,https://your-domain.com
```

### 2. Deploy with Docker Compose

The included `docker-compose.yml` provides:

- **Coturn TURN Server** - NAT traversal for WebRTC
- **Backend API** - Socket.IO signaling + fraud detection
- **Frontend** - React app with WebRTC client
- **MongoDB** - Database
- **Mongo Express** - Database admin (optional)

Deploy the stack:

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f turnserver
docker compose logs -f backend
```

---

## 🔧 TURN Server Configuration

### Coturn Settings

The TURN server is configured with:

- **Port 3478** - Main TURN port
- **UDP Range 49152-65535** - Media relay ports
- **Authentication** - Shared secret based
- **Security** - Private IP ranges blocked

### Testing TURN Server

```bash
# Test TURN connectivity
docker exec fraudsense-turnserver turnutils_uclient -t -u temp-user -w YOUR_TURN_SECRET YOUR_DOMAIN 3478

# Monitor TURN server logs
docker logs fraudsense-turnserver -f
```

---

## 🌐 Domain & SSL Setup

### 1. DNS Configuration

Set up A records pointing to your droplet IP:

```bash
# Main domain
your-domain.com       A    YOUR_DROPLET_IP

# Subdomains
api.your-domain.com   A    YOUR_DROPLET_IP
app.your-domain.com   A    YOUR_DROPLET_IP
turn.your-domain.com  A    YOUR_DROPLET_IP  # Optional separate TURN domain
```

### 2. SSL with Dokploy

In Dokploy dashboard:

1. Create new project: **fraudsense**
2. Add services from docker-compose.yml
3. Configure domains:
   - Backend: `api.your-domain.com`
   - Frontend: `app.your-domain.com`
4. Enable SSL certificates (automatic via Let's Encrypt)

---

## ✅ Validation & Testing

### 1. Service Health Checks

```bash
# Check all services are running
docker compose ps

# Test backend API
curl https://api.your-domain.com/api/users

# Test WebSocket connection
curl -H "Connection: Upgrade" -H "Upgrade: websocket" https://api.your-domain.com/socket.io/
```

### 2. WebRTC Connectivity Testing

1. **Local Network**: Test calls between devices on same network
2. **Cross-NAT**: Test calls between different networks
3. **Monitor ICE candidates**: Check browser developer console for:
   - `host` candidates (direct connection)
   - `srflx` candidates (STUN-discovered)
   - `relay` candidates (TURN-relayed) ⭐

### 3. TURN Server Validation

In browser developer console during a call:

```javascript
// Check ICE candidates include TURN relays
pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('ICE Candidate:', event.candidate.type, event.candidate.candidate);
    // Look for "typ relay" in candidate strings
  }
};
```

---

## 📊 Production Monitoring

### 1. TURN Server Logs

Monitor TURN usage and errors:

```bash
# Real-time TURN logs
docker logs fraudsense-turnserver -f | grep -E "(allocation|relay|error)"

# TURN statistics
docker exec fraudsense-turnserver turnutils_cli -p 5766 stats
```

### 2. Application Metrics

Key metrics to monitor:

- **WebRTC connection success rate**
- **ICE gathering time**
- **TURN bandwidth usage**
- **Call quality metrics**

### 3. Resource Usage

```bash
# Container resource usage
docker stats

# Network ports in use
netstat -tulpn | grep -E "(3478|49152)"
```

---

## 🔒 Security Best Practices

### 1. TURN Server Security

- ✅ **Shared secret authentication** (implemented)
- ✅ **Private IP blocking** (implemented)  
- ✅ **User quotas and rate limiting** (implemented)
- 🔄 **Regular secret rotation** (manual process)

### 2. Application Security

- ✅ **CORS configuration** (implemented)
- ✅ **HTTPS enforcement** (via Dokploy/SSL)
- 🔄 **MongoDB authentication** (configure for production)
- 🔄 **API rate limiting** (implement if needed)

---

## 🚨 Troubleshooting

### Common Issues

#### TURN Server Not Working
```bash
# Check TURN server is binding to ports
docker exec fraudsense-turnserver netstat -tulpn

# Test TURN server externally
telnet YOUR_DOMAIN 3478
```

#### WebRTC Connection Failures
```bash
# Enable verbose logging in browser console
localStorage.setItem('debug', 'socket.io-client:socket');

# Check ICE candidate types
# Should see: host, srflx (STUN), and relay (TURN) candidates
```

#### NAT/Firewall Issues
```bash
# Verify UDP port range is open
# Test with: nc -u YOUR_DOMAIN 49152
# Common issue: VPS providers blocking UDP ranges
```

### Log Locations

```bash
# Application logs
docker logs fraudsense-backend -f
docker logs fraudsense-frontend -f

# TURN server logs
docker logs fraudsense-turnserver -f

# System logs
journalctl -u docker -f
```

---

## 📈 Scaling Considerations

For high-traffic production deployments:

1. **Load Balancer**: Distribute WebRTC signaling
2. **Multiple TURN Servers**: Geographic distribution
3. **Database Clustering**: MongoDB replica sets
4. **CDN**: Static asset delivery
5. **Monitoring**: Prometheus + Grafana setup

---

## 🎯 Quick Commands Reference

```bash
# Deploy/Update
docker compose up -d --build

# View all logs
docker compose logs -f

# Restart specific service
docker compose restart turnserver

# Scale backend instances
docker compose up -d --scale backend=2

# Database backup
docker exec fraudsense-mongodb mongodump --out /backup

# SSL certificate renewal (Dokploy handles this automatically)
docker restart dokploy-proxy
```

---

## 📞 Support

For issues:
1. Check the troubleshooting section above
2. Review Docker logs: `docker compose logs [service]`
3. Test TURN connectivity with external tools
4. Verify firewall/port settings on DigitalOcean

**Ready to deploy!** 🚀