# 🚀 Simple Deployment Guide

## Step 1: Deploy Backend to Railway

1. **Go to Railway**: https://railway.app
2. **Sign up** with your GitHub account
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository**
6. **Set Root Directory**: `backend`
7. **Click "Deploy"**
8. **Wait for deployment** (2-3 minutes)
9. **Copy the URL** (e.g., `https://your-app.railway.app`)

## Step 2: Deploy Frontend to Vercel

1. **Go to Vercel**: https://vercel.com
2. **Sign up** with your GitHub account
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure project**:
   - Framework: Next.js
   - Root Directory: `front-end-new`
   - Build Command: `npm run build`
6. **Add Environment Variable**:
   - Name: `NEXT_PUBLIC_SOCKET_URL`
   - Value: `https://your-app.railway.app` (from Step 1)
7. **Click "Deploy"**

## Step 3: Test Your App

1. **Frontend URL**: `https://your-app.vercel.app`
2. **Backend Health**: `https://your-app.railway.app/health`
3. **Test Chat**: Go to `/chat` on frontend
4. **Test Call**: Go to `/call` on frontend

## That's It! 🎉

Your app is now live on the internet!

## Troubleshooting

### If Backend Won't Deploy:
- Check that `backend/package.json` exists
- Ensure `npm start` script is in package.json
- Check Railway logs for errors

### If Frontend Won't Deploy:
- Check that `front-end-new/package.json` exists
- Verify environment variable is set correctly
- Check Vercel build logs

### If WebSocket Won't Connect:
- Verify backend URL in environment variable
- Check that backend is running (visit health URL)
- Ensure CORS is configured correctly

## Need Help?

1. Check the logs in Railway/Vercel dashboards
2. Test locally first: `npm run dev`
3. Verify all files are committed to GitHub 