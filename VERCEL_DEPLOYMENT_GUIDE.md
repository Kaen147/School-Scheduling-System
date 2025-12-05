# 🚀 Vercel Deployment - Clear Step-by-Step Guide

> Deploy your frontend in 5 minutes! 🎯

---

## 📋 What You Need Before Starting

- ✅ Your Railway backend URL (you should have this from Railway dashboard)
- ✅ Your GitHub account (same one you used for Railway)
- ✅ Vercel account (we'll create during deployment)

---

## 🎯 The 5 Steps

```
Step 1: Find your Railway backend URL
   ↓
Step 2: Update frontend API URL
   ↓
Step 3: Push to GitHub
   ↓
Step 4: Deploy to Vercel
   ↓
✅ LIVE!
```

---

# STEP 1️⃣: Get Your Railway Backend URL

## Where to Find It

1. Open **Railway Dashboard**: https://railway.app
2. Click **Your Project** (School-Scheduling-System)
3. Click the **Deployments** tab
4. Click the latest deployment (green checkmark ✅)
5. Look for **URL** on the right side
6. **Copy the URL** - looks like: `https://school-scheduling-system-production-xxxx.railway.app`

**Save this URL!** You need it for the next step.

---

# STEP 2️⃣: Update Frontend API URL

Your frontend needs to know where the backend is.

## In Your VS Code:

### Create a `.env` file in `frontend/scheduling/`

1. **Open VS Code**
2. **Navigate to**: `frontend/scheduling/`
3. **Right-click** → **New File**
4. **Name it**: `.env`
5. **Add this line**:
   ```env
   VITE_API_URL=https://your-railway-url
   ```

**Replace `https://your-railway-url` with your actual Railway URL!**

### Example:
```env
VITE_API_URL=https://school-scheduling-system-production-abc123.railway.app
```

---

## Also Update Your Source Files

Find all places where you call the API and replace `http://localhost:5000`:

### Quick Method (Find & Replace):

1. **Ctrl + H** (Open Find & Replace in VS Code)
2. **Find**: `http://localhost:5000`
3. **Replace with**: `https://your-railway-url` (your actual Railway URL)
4. **Click "Replace All"**

### Files it will find in:
- `src/context/AuthContext.jsx` ← Authentication API calls
- `src/pages/AdminDashboard.jsx` ← Admin page API calls
- `src/pages/TeacherDashboard.jsx` ← Teacher page API calls
- `src/components/*.jsx` ← Component API calls
- All other `.jsx` files with axios calls

---

# STEP 3️⃣: Push Changes to GitHub

In your terminal:

```powershell
# Navigate to project root
cd "c:\Users\User\Documents\4th Year\Capstone 2\School Scheduling System Final Revision\School Scheduling System Final"

# Add all changes
git add .

# Commit with message
git commit -m "Update frontend API URL for Vercel deployment"

# Push to GitHub
git push
```

✅ Your code is now on GitHub with the new API URL

---

# STEP 4️⃣: Deploy to Vercel

## 4.1 Create Vercel Account

1. Go to: **https://vercel.com**
2. Click **Sign Up**
3. Click **Continue with GitHub** (use same GitHub account)
4. **Authorize Vercel** to access your GitHub repos

---

## 4.2 Deploy Your Project

1. After signing in, you'll see **Vercel Dashboard**
2. Click **Add New...** → **Project**
3. You should see your `school-scheduling-system` repo in the list
4. **Click on it** to select it

---

## 4.3 Configure for Deployment

Now Vercel asks you to configure:

```
Project Name: school-scheduling-system (or your preferred name)
Framework Preset: Vite ✅ (should auto-detect)
Root Directory: frontend/scheduling ⭐ THIS IS IMPORTANT!
```

### 🔴 IMPORTANT: Set Root Directory

1. Scroll down to **Root Directory**
2. Click the input field
3. Type: `frontend/scheduling`
4. Vercel will show: ✅ "frontend/scheduling"

---

## 4.4 Add Environment Variables

Scroll down and look for **Environment Variables** section:

1. Click **Add Environment Variable**
2. **Name**: `VITE_API_URL`
3. **Value**: `https://your-railway-url` (your actual Railway URL)
4. Click **Add**

Example:
```
Name: VITE_API_URL
Value: https://school-scheduling-system-production-abc123.railway.app
```

---

## 4.5 Deploy!

1. Click the **Deploy** button
2. Wait for it to build (usually 1-2 minutes)
3. You'll see a progress bar
4. When done, you'll see ✅ **"Congratulations! Your project has been deployed"**

---

# ✅ STEP 5️⃣: Your Frontend is LIVE!

Vercel will give you a URL like:
```
https://school-scheduling-system.vercel.app
```

---

## 🧪 Test It!

1. **Copy your Vercel URL**
2. **Open it in a browser**
3. **Try to login** → Should work! ✅
4. **Create a course** → Should save to database! ✅

---

## 📊 Your Complete Setup Now

```
┌─────────────────────────────┐
│ Frontend (React/Vite)       │
│ URL: vercel.app             │
└──────────────┬──────────────┘
               │ (API calls)
               ↓
┌─────────────────────────────┐
│ Backend (Node.js/Express)   │
│ URL: railway.app            │
└──────────────┬──────────────┘
               │ (Stores data)
               ↓
┌─────────────────────────────┐
│ Database (MongoDB Atlas)    │
│ Cloud Database              │
└─────────────────────────────┘

ALL 3 PARTS RUNNING ON THE CLOUD! ☁️
```

---

## 🎯 Your Final URLs

| Component | URL |
|-----------|-----|
| **Frontend** | `https://your-app.vercel.app` |
| **Backend** | `https://your-api-railway.app` |
| **Database** | MongoDB Atlas (cloud) |
| **Code** | GitHub.com/your-username/school-scheduling-system |

---

## 🔒 Important: Update Backend CORS

Now that your frontend is live on Vercel, you need to tell your backend to accept calls from it.

### Go back to Railway:

1. Open **Railway Dashboard**
2. Click **Your Project**
3. Go to **Variables** tab
4. Add: `FRONTEND_URL=https://your-vercel-url`
5. Example: `FRONTEND_URL=https://school-scheduling-system.vercel.app`
6. Click **Deploy** (Railway auto-redeploys)

This tells the backend: "Only accept calls from this Vercel URL"

---

## 🆘 Common Issues

### Issue: "Cannot find module"
**Solution**: Make sure `Root Directory` is set to `frontend/scheduling` (not `frontend`)

### Issue: "404 Not Found"
**Solution**: Your API calls might still be pointing to `localhost:5000`. Run Find & Replace again.

### Issue: "CORS Error in browser console"
**Solution**: Add your Vercel URL to Railway Variables as `FRONTEND_URL`

### Issue: "Build failed"
**Solution**: 
1. Go to Vercel Dashboard
2. Click your project
3. Click **Deployments** tab
4. Click the failed deployment
5. Scroll down to see the error
6. Fix the error in your code
7. Push to GitHub
8. Vercel auto-redeploys

---

## ✨ Congratulations!

Your School Scheduling System is now:
- ✅ **Live on Vercel** (frontend)
- ✅ **Live on Railway** (backend)
- ✅ **Connected to MongoDB Atlas** (database)
- ✅ **Accessible from anywhere in the world** 🌍

---

## 📱 Test From Your Phone

1. Go to your Vercel URL on your phone's browser
2. Login
3. Create a schedule
4. See it appear in your database ✅

**You've successfully deployed a full-stack application!** 🎓

---

## 🎉 Share Your Work!

Send your Vercel URL to:
- ✅ Your professors
- ✅ Your classmates
- ✅ Your friends
- ✅ Add to your capstone documentation
- ✅ Add to your GitHub README

---

## 📝 What Happens Next?

Every time you:
1. **Push to GitHub** → Vercel auto-deploys your frontend changes ✅
2. **Update Railway variables** → Railway auto-redeploys your backend ✅
3. **Add data in MongoDB** → Changes appear everywhere ✅

**No manual deployment needed!** 🤖

---

**Your project is now LIVE!** 🚀

Enjoy your deployed School Scheduling System!
