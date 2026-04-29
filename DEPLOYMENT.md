# 🚀 SPMS Deployment Guide

This guide will help you deploy your Student Progress Management System (SPMS) with backend on Render and frontend on Vercel.

## 📋 Prerequisites

- Node.js 18+ installed locally
- MongoDB Atlas account (for production database)
- Render account (for backend deployment)
- Vercel account (for frontend deployment)
- GitHub account (for version control)

## 🗂️ Project Structure

```
MIDTERM-PROJECT/
├── 📁 api/                    # Backend API (Node.js/Express)
├── 📁 src/                    # Frontend source (React/Vite)
├── 📄 render.yaml            # Render configuration
├── 📄 vercel.json            # Vercel configuration
├── 📄 .env.production        # Production environment variables
└── 📄 package.json           # Dependencies and scripts
```

## 🔧 Step 1: Backend Deployment (Render)

### 1.1 Prepare Your Repository
```bash
# Commit all changes
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 1.2 Set Up Render
1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Service Configuration:**
- **Name**: `spms-api`
- **Environment**: `Node`
- **Region**: Choose nearest to your users
- **Branch**: `main`
- **Root Directory**: `./`
- **Runtime**: `Node 18+`
- **Build Command**: `npm install`
- **Start Command**: `node api/index.js`

### 1.3 Environment Variables (Render)
Add these environment variables in Render dashboard:

```bash
NODE_ENV=production
API_PORT=10000
JWT_SECRET=your-strong-jwt-secret-here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spms?retryWrites=true&w=majority
MONGODB_DB_NAME=spms
```

### 1.4 Deploy
Click "Create Web Service" and wait for deployment. Your API will be available at:
`https://spms-api.onrender.com`

## 🎨 Step 2: Frontend Deployment (Vercel)

### 2.1 Install Vercel CLI
```bash
npm i -g vercel
```

### 2.2 Update API URL
Edit `vercel.json` and update the backend URL:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-render-app-url.onrender.com/api/$1"
    }
  ]
}
```

### 2.3 Deploy to Vercel
```bash
# Build and deploy
npm run build
vercel --prod

# Or use the automated script
npm run deploy:vercel
```

### 2.4 Vercel Environment Variables
In Vercel dashboard, add:
```bash
VITE_API_URL=https://your-render-app-url.onrender.com
```

## 🔐 Step 3: Database Setup (MongoDB Atlas)

### 3.1 Create MongoDB Atlas Cluster
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (M0 free tier is sufficient)
3. Create a database user with strong password
4. Configure IP access: `0.0.0.0/0` (allows all access)

### 3.2 Get Connection String
1. Click "Connect" → "Connect your application"
2. Copy the connection string
3. Replace `<password>` with your actual password
4. Use this in Render environment variables

## ✅ Step 4: Testing and Verification

### 4.1 Backend Health Check
```bash
curl https://spms-api.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### 4.2 Frontend Access
Visit your Vercel URL and test:
- User login/registration
- Dashboard functionality
- API calls are working

## 🔄 Step 5: CI/CD Pipeline

### 5.1 Automatic Deployments
- **Render**: Auto-deploys on push to main branch
- **Vercel**: Auto-deploys on push to main branch

### 5.2 Manual Deployments
```bash
# Deploy backend only
npm run deploy:render

# Deploy frontend only
npm run deploy:vercel
```

## 🛠️ Troubleshooting

### Common Issues:

#### 1. "Application Error" on Render
- Check logs in Render dashboard
- Ensure all environment variables are set
- Verify MongoDB connection string

#### 2. "API Not Responding" on Vercel
- Check CORS settings in backend
- Verify API URL in vercel.json
- Check Vercel function logs

#### 3. "Database Connection Failed"
- Verify MongoDB Atlas IP access
- Check connection string format
- Ensure database user has correct permissions

#### 4. "Build Failed"
- Check package.json dependencies
- Verify build scripts
- Check for missing environment variables

## 📊 Monitoring

### Render Monitoring
- Health checks: `/api/health`
- Metrics: Response time, error rate
- Logs: Available in Render dashboard

### Vercel Monitoring
- Analytics: Page views, performance
- Logs: Function logs, build logs
- Speed: Core Web Vitals

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit secrets to git
2. **JWT Secret**: Use a strong, unique secret
3. **Database**: Use MongoDB Atlas with authentication
4. **HTTPS**: Both Render and Vercel provide SSL
5. **CORS**: Configure properly for your frontend domain

## 📱 Performance Optimization

1. **Backend**: Enable gzip compression
2. **Frontend**: Vercel automatically optimizes assets
3. **Database**: Use MongoDB Atlas indexes
4. **CDN**: Vercel provides global CDN

## 🆘 Support

If you encounter issues:
1. Check Render and Vercel logs
2. Verify environment variables
3. Test locally with production settings
4. Check MongoDB Atlas connection

---

## 🎉 You're Live!

Your SPMS application is now deployed:
- **Backend**: `https://spms-api.onrender.com`
- **Frontend**: `https://your-app.vercel.app`

Remember to update any hardcoded URLs in your frontend code to use the production URLs.
