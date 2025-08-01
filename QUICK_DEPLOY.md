# 🚀 Quick Deployment Guide - Vercel

## Prerequisites
- [Vercel Account](https://vercel.com) (Free)
- [GitHub Account](https://github.com)
- Node.js installed locally

## Option 1: Deploy Backend to Railway (Recommended)

### Step 1: Deploy Backend
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Set the root directory to `backend`
6. Railway will automatically detect Node.js and deploy

### Step 2: Get Backend URL
- After deployment, Railway will give you a URL like: `https://your-app.railway.app`
- Copy this URL for frontend configuration

## Option 2: Deploy Backend to Render

### Step 1: Deploy Backend
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `fraud-detection-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 2: Get Backend URL
- After deployment, Render will give you a URL like: `https://your-app.onrender.com`

## Deploy Frontend to Vercel

### Step 1: Prepare Frontend
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `front-end-new`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 2: Set Environment Variables
In Vercel dashboard, go to your project → Settings → Environment Variables:

```
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.railway.app
```

### Step 3: Deploy
Click "Deploy" and wait for the build to complete.

## Alternative: Deploy Both to Vercel (Advanced)

### Step 1: Create Monorepo Structure
Create a new repository with this structure:

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
└── vercel.json
```

### Step 2: Convert Backend to Vercel Functions
Create `api/socket.js`:
```javascript
const { Server } = require('socket.io');

module.exports = (req, res) => {
  // Handle WebSocket connections
  if (req.method === 'GET') {
    return res.json({ status: 'WebSocket server running' });
  }
  
  res.status(404).json({ error: 'Not found' });
};
```

### Step 3: Deploy to Vercel
```bash
vercel
```

## Environment Variables Setup

### Backend (Railway/Render)
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
```

## Quick Test Commands

### Test Backend
```bash
curl https://your-backend.railway.app/health
```

### Test Frontend
Visit: `https://your-frontend.vercel.app`

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS settings in backend
   - Verify backend URL in frontend
   - Ensure WebSocket support

2. **Build Failures**
   - Check Node.js version (use 16+)
   - Verify all dependencies are installed
   - Check build logs in Vercel dashboard

3. **Environment Variables Not Working**
   - Restart deployment after adding variables
   - Check variable names (case sensitive)
   - Verify in Vercel dashboard

### Debug Commands

```bash
# Test local deployment
vercel dev

# Check deployment status
vercel ls

# View logs
vercel logs
```

## Final URLs

After successful deployment:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.railway.app`
- **Health Check**: `https://your-app.railway.app/health`

## Next Steps

1. **Test the Application**
   - Open frontend URL
   - Try chat and call features
   - Test fraud detection

2. **Custom Domain** (Optional)
   - Add custom domain in Vercel dashboard
   - Update environment variables

3. **Monitoring**
   - Set up Vercel Analytics
   - Monitor Railway/Render usage

## Cost Estimation

### Free Tier Limits
- **Vercel**: 100GB bandwidth/month
- **Railway**: $5 credit/month
- **Render**: 750 hours/month

### Typical Usage
- Small to medium traffic: Free tier sufficient
- High traffic: Consider paid plans

## Support

If you encounter issues:
1. Check deployment logs
2. Verify environment variables
3. Test locally first
4. Check service status pages 