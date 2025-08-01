# 🚀 Deployment Guide - Vercel

## Overview

This project consists of two parts:
1. **Frontend**: Next.js app (deployed on Vercel)
2. **Backend**: WebSocket server (needs separate deployment)

## Option 1: Deploy Frontend Only (Recommended for Demo)

### Step 1: Deploy to Vercel

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel
```

4. **Follow the prompts**:
   - Set project name
   - Choose your account
   - Confirm deployment

### Step 2: Configure Environment Variables

In Vercel Dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-url.com
   ```

### Step 3: Deploy WebSocket Server Separately

You have several options:

#### Option A: Deploy to Railway/Render/Heroku
```bash
# Create a separate repo for the server
git clone <your-repo>
cd server-only
# Copy server.js and package.json
# Deploy to your preferred platform
```

#### Option B: Use Pusher (Recommended)
1. Sign up at [pusher.com](https://pusher.com)
2. Create a new app
3. Replace Socket.IO with Pusher in the frontend
4. Update environment variables

#### Option C: Use Vercel Edge Runtime (Advanced)
- Requires WebSocket support in Edge Runtime
- More complex setup

## Option 2: Full Stack Deployment

### Step 1: Prepare Repository

1. **Create two repositories**:
   - `frontend` (Next.js app)
   - `backend` (WebSocket server)

2. **Split the code**:
   - Move `server.js` to backend repo
   - Keep frontend code in frontend repo

### Step 2: Deploy Backend

#### Using Railway:
```bash
# In backend repo
railway login
railway init
railway up
```

#### Using Render:
```bash
# In backend repo
# Connect to Render dashboard
# Deploy from GitHub
```

### Step 3: Deploy Frontend

```bash
# In frontend repo
vercel
```

### Step 4: Update Environment Variables

Set `NEXT_PUBLIC_SOCKET_URL` to your backend URL.

## Option 3: Quick Demo with Pusher

### Step 1: Install Pusher
```bash
npm install pusher pusher-js
```

### Step 2: Replace Socket.IO with Pusher

Update the chat and call pages to use Pusher instead of Socket.IO.

### Step 3: Deploy
```bash
vercel
```

## Environment Variables

### Frontend (Vercel)
```env
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.com
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-pusher-cluster
```

### Backend (Railway/Render/Heroku)
```env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify environment variables
   - Ensure backend is running

2. **Build Errors**
   - Check for missing dependencies
   - Verify TypeScript types
   - Check import paths

3. **Runtime Errors**
   - Check browser console
   - Verify WebSocket server status
   - Check environment variables

### Debug Commands

```bash
# Check build locally
npm run build

# Test production build
npm run start

# Check environment variables
echo $NEXT_PUBLIC_SOCKET_URL
```

## Production Checklist

- [ ] Environment variables configured
- [ ] WebSocket server deployed
- [ ] CORS settings updated
- [ ] SSL certificates configured
- [ ] Domain configured (optional)
- [ ] Monitoring set up (optional)

## Support

For issues:
1. Check Vercel logs
2. Check browser console
3. Verify WebSocket server status
4. Test locally first 