# 🔧 Fix Vercel Environment Variable Error

## Problem
Error: `Environment Variable "NEXT_PUBLIC_SOCKET_URL" references Secret "socket_url", which does not exist.`

## Solution

### Step 1: Remove Environment Variable from vercel.json
The `vercel.json` file should NOT contain environment variables. I've already fixed this.

### Step 2: Set Environment Variable in Vercel Dashboard

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**
3. **Go to Settings** → **Environment Variables**
4. **Add new variable**:
   - **Name**: `NEXT_PUBLIC_SOCKET_URL`
   - **Value**: `https://your-backend-url.railway.app` (replace with your actual backend URL)
   - **Environment**: Production, Preview, Development (select all)
5. **Click "Save"**

### Step 3: Redeploy

After adding the environment variable:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on your latest deployment
3. Or push a new commit to trigger auto-deploy

## Alternative: Use .env.local for Local Development

Create `front-end-new/.env.local` (this file is ignored by git):

```bash
# Local development
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Environment Variable Setup Guide

### For Local Development
```bash
# In front-end-new directory
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:3001" > .env.local
```

### For Production (Vercel Dashboard)
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
```

### For Preview/Staging
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend-staging.railway.app
```

## Common Issues and Solutions

### Issue 1: Environment Variable Not Working
- **Solution**: Redeploy after adding environment variable
- **Check**: Verify variable name is exactly `NEXT_PUBLIC_SOCKET_URL`

### Issue 2: Backend URL Not Accessible
- **Solution**: Test backend URL directly: `https://your-backend.railway.app/health`
- **Check**: Ensure backend is deployed and running

### Issue 3: CORS Errors
- **Solution**: Update backend CORS settings to include your Vercel domain
- **Check**: Backend should allow requests from `https://your-app.vercel.app`

## Verification Steps

1. **Check Environment Variable**:
   ```bash
   # In Vercel dashboard, the variable should show:
   NEXT_PUBLIC_SOCKET_URL = https://your-backend.railway.app
   ```

2. **Test Backend**:
   ```bash
   curl https://your-backend.railway.app/health
   ```

3. **Test Frontend**:
   - Visit your Vercel app
   - Open browser console
   - Check for WebSocket connection errors

## Complete Deployment Checklist

- [ ] Backend deployed to Railway/Render
- [ ] Backend URL is accessible
- [ ] Environment variable set in Vercel dashboard
- [ ] Frontend redeployed after setting environment variable
- [ ] WebSocket connection working
- [ ] Chat and call features functional

## Need Help?

If you're still having issues:

1. **Check Vercel logs**: Go to deployment → Functions → View Function Logs
2. **Check browser console**: Look for connection errors
3. **Verify backend**: Test backend health endpoint
4. **Test locally**: Run `npm run dev` to test locally first 