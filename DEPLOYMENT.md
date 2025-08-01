# Deployment Guide - Vercel (Frontend & Backend Separate)

## Overview
This guide explains how to deploy the fraud detection application to Vercel with:
- **Frontend**: Next.js app on Vercel
- **Backend**: Node.js API on Vercel (using Vercel Serverless Functions)

## Prerequisites
- Vercel account (free tier available)
- GitHub repository with your code
- Node.js installed locally

## Option 1: Deploy Backend as Vercel Serverless Functions

### Step 1: Prepare Backend for Vercel

Create a new directory structure for Vercel deployment:

```bash
mkdir vercel-backend
cd vercel-backend
```

### Step 2: Create Vercel Configuration

Create `vercel.json` in the backend directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/socket.io/(.*)",
      "dest": "/api/socket"
    },
    {
      "src": "/(.*)",
      "dest": "/api/$1"
    }
  ],
  "functions": {
    "api/socket.js": {
      "maxDuration": 30
    }
  }
}
```

### Step 3: Convert Backend to Vercel Functions

Create `api/socket.js` (converted from server.js):

```javascript
const { Server } = require('socket.io');

// Store connected users and messages (in production, use Redis or database)
const connectedUsers = new Map();
const messages = new Map();

// Fraud detection functions (same as original)
function detectFraud(text) {
  // ... (copy from original server.js)
}

function detectAudioFraud(audioData) {
  // ... (copy from original server.js)
}

// Vercel serverless function handler
module.exports = (req, res) => {
  // Handle HTTP requests
  if (req.method === 'GET') {
    if (req.url === '/health') {
      return res.json({ 
        status: 'OK', 
        connectedUsers: connectedUsers.size,
        totalMessages: messages.size 
      });
    }
    if (req.url === '/users') {
      return res.json(Array.from(connectedUsers.values()));
    }
    if (req.url === '/call-users') {
      const callUsers = Array.from(connectedUsers.values())
        .filter(user => user.room === 'call')
        .map(user => user.username);
      return res.json(callUsers);
    }
  }

  // For WebSocket connections, we need a different approach
  res.status(404).json({ error: 'Not found' });
};
```

### Step 4: Create API Routes

Create `api/health.js`:
```javascript
module.exports = (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
};
```

Create `api/users.js`:
```javascript
// In production, this would fetch from a database
module.exports = (req, res) => {
  res.json([]);
};
```

### Step 5: Deploy Backend to Vercel

```bash
cd backend
vercel
```

Follow the prompts:
- Link to existing project or create new
- Set project name (e.g., `fraud-detection-backend`)
- Deploy

## Option 2: Deploy Backend to Railway/Render (Recommended)

Since Vercel has limitations with WebSocket connections, consider these alternatives:

### Railway Deployment

1. **Create Railway Account**: https://railway.app
2. **Connect GitHub Repository**
3. **Deploy Backend**:
   ```bash
   cd backend
   # Add railway.json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "healthcheckPath": "/health",
       "healthcheckTimeout": 300,
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

### Render Deployment

1. **Create Render Account**: https://render.com
2. **Create Web Service**:
   - Connect GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
   - Plan: Free

## Step 6: Deploy Frontend to Vercel

### Prepare Frontend

1. **Update Environment Variables**:
   Create `.env.production` in frontend:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.railway.app
   # or
   NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.render.com
   ```

2. **Update Socket Connection**:
   Ensure frontend connects to production backend URL.

### Deploy to Vercel

```bash
cd front-end-new
vercel
```

Or connect GitHub repository to Vercel dashboard.

## Option 3: Full Vercel Deployment (Advanced)

### Create Monorepo Structure

```
vercel-app/
├── api/
│   ├── socket.js
│   ├── health.js
│   └── users.js
├── frontend/
│   ├── app/
│   ├── components/
│   └── package.json
├── package.json
└── vercel.json
```

### Root vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ]
}
```

## Environment Variables Setup

### Backend Environment Variables

**Railway/Render:**
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

**Vercel:**
```
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### Frontend Environment Variables

**Vercel:**
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## Production Considerations

### 1. Database Integration
- Replace in-memory storage with Redis or MongoDB
- Use connection pooling
- Implement proper error handling

### 2. WebSocket Limitations
- Vercel has WebSocket limitations
- Consider using Pusher or Socket.io Cloud
- Implement fallback to HTTP polling

### 3. Security
- Add authentication
- Implement rate limiting
- Use HTTPS/WSS
- Add input validation

### 4. Monitoring
- Add logging (Winston, Pino)
- Set up error tracking (Sentry)
- Monitor performance

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify backend URL
   - Ensure WebSocket support

2. **Environment Variables Not Working**
   - Check Vercel dashboard settings
   - Verify variable names
   - Restart deployment

3. **Build Failures**
   - Check Node.js version
   - Verify dependencies
   - Check build logs

### Debug Commands

```bash
# Check Vercel deployment status
vercel ls

# View deployment logs
vercel logs

# Test local deployment
vercel dev
```

## Cost Optimization

### Free Tier Limits
- **Vercel**: 100GB bandwidth/month
- **Railway**: $5 credit/month
- **Render**: 750 hours/month

### Scaling Considerations
- Use CDN for static assets
- Implement caching strategies
- Monitor usage and costs

## Final URLs

After deployment, you'll have:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.railway.app` (or Render)
- **Health Check**: `https://your-backend.railway.app/health`

## Next Steps

1. Set up custom domains
2. Add SSL certificates
3. Implement CI/CD pipeline
4. Add monitoring and analytics
5. Set up backup strategies 