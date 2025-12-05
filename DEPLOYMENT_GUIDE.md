# 🚀 Deploy to Vercel - Complete Guide

> Your School Scheduling System goes live! Access it from ANY device worldwide 🌍

---

## 📊 Deployment Architecture

```
Your Local Machine
        ↓
   GitHub Repo
        ↓
┌──────────────────────────────────┐
│    Frontend (React/Vite)         │
│    Deploy to: Vercel ⭐          │
│    Access: yourapp.vercel.app    │
└──────────────────────────────────┘
        ↓ (API calls to)
┌──────────────────────────────────┐
│    Backend (Node.js/Express)     │
│    Deploy to: Railway/Render      │
│    Database: MongoDB Atlas        │
└──────────────────────────────────┘
```

---

## ⏱️ Time Required

- Setup MongoDB Atlas: **5 min**
- Deploy Backend: **10 min**
- Deploy Frontend: **5 min**
- Testing: **5 min**
- **TOTAL: ~25 minutes** ✅

---

## 🎯 3 Simple Steps

```
Step 1: Prepare Backend
   ↓
Step 2: Deploy Backend to Railway
   ↓
Step 3: Deploy Frontend to Vercel
   ↓
✅ LIVE!
```

---

# STEP 1: Prepare Your Backend

## 1.1 Update Environment Variables

Create/update `.env` file in your `backend/` folder:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/scheduling?retryWrites=true&w=majority

# Server
PORT=5000
NODE_ENV=production

# CORS (update with Vercel frontend URL later)
CORS_ORIGIN=*
```

> **Where to get MONGODB_URI?** → See Section 1.2 below

## 1.2 Create Free MongoDB Atlas Database

1. Go to: **https://www.mongodb.com/cloud/atlas**
2. Click **Sign Up** → Create account
3. Select **Free Cluster** (0.5GB, but plenty for your project)
4. Choose region closest to you
5. Click **Create Deployment**
6. Wait ~10 minutes for cluster to initialize

### Get Your Connection String:

1. Click **Database** → **Connect**
2. Select **Drivers** → **Node.js**
3. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/scheduling?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your MongoDB credentials
5. Paste into `.env` file as `MONGODB_URI`

### Enable Network Access:

1. Go to **Network Access**
2. Click **Add IP Address**
3. Select **Allow access from anywhere** (0.0.0.0/0)
4. Click **Confirm**

✅ **MongoDB is ready!**

---

## 1.3 Add start script to package.json

Update `backend/package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

> Change `nodemon server.js` → `node server.js` for production!

---

## 1.4 Fix CORS for Vercel

Update `backend/server.js`:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || '*'
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

---

# STEP 2: Deploy Backend to Railway

Railway = Simple hosting for Node.js + Database

### 2.1 Create Railway Account

1. Go to: **https://railway.app**
2. Click **Sign Up**
3. Use **GitHub** to sign up (easier)
4. Authorize railway.app to access GitHub

### 2.2 Deploy Your Repo

1. Click **+ New Project**
2. Select **Deploy from GitHub**
3. Select your `school-scheduling-system` repo
4. Railway auto-detects it's Node.js ✅

### 2.3 Add Environment Variables

In Railway dashboard:

1. Click your project
2. Go to **Variables**
3. Add:
   ```
   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/scheduling...
   NODE_ENV=production
   PORT=5000
   ```

4. Click **Deploy**
5. Wait for deployment (watch the logs) 🔄

### 2.4 Get Your Backend URL

After deployment completes:

1. Click **Deployments**
2. Look for **URL** section
3. Copy your backend URL (looks like: `https://your-api-abc123.railway.app`)
4. **Save this!** You need it for frontend deployment

✅ **Backend is LIVE!** 🎉

Test it:
```
https://your-api-abc123.railway.app/
```

Should show: "API running" ✅

---

# STEP 3: Deploy Frontend to Vercel

### 3.1 Update Frontend API URL

Update `frontend/scheduling/src/main.jsx` or create `.env`:

**Option A: Create `.env` file**

In `frontend/scheduling/.env`:

```env
VITE_API_URL=https://your-api-abc123.railway.app
```

**Option B: Update main.jsx/App.jsx**

Change all `http://localhost:5000` to your Railway URL:

```javascript
// Before:
const API_URL = 'http://localhost:5000';

// After:
const API_URL = process.env.VITE_API_URL || 'https://your-api-abc123.railway.app';
```

> **Do a find/replace** in your frontend code:
> - Find: `http://localhost:5000`
> - Replace: `https://your-api-abc123.railway.app`

### 3.2 Create Vercel Account

1. Go to: **https://vercel.com**
2. Click **Sign Up**
3. Use **GitHub** (easier)
4. Authorize Vercel to access GitHub

### 3.3 Deploy to Vercel

1. Click **Add New...** → **Project**
2. Select `school-scheduling-system` repo
3. Vercel auto-detects Vite setup ✅
4. **Root Directory**: Select `frontend/scheduling`
5. Click **Deploy**

Wait for build to complete 🔄 (usually 1-2 minutes)

### 3.4 Verify Frontend Deployment

After deployment:

1. Vercel gives you URL: `https://your-app.vercel.app`
2. Click the URL to test
3. Try logging in → Should work! ✅
4. Try creating schedule → Should call your Railway backend! ✅

---

## 🎯 Final Checklist

- [ ] MongoDB Atlas database created
- [ ] Backend `.env` has `MONGODB_URI`
- [ ] Backend deployed to Railway
- [ ] Backend URL is working (`/` endpoint returns "API running")
- [ ] Frontend has updated API URL (not localhost:5000)
- [ ] Frontend deployed to Vercel
- [ ] Frontend loads without errors
- [ ] Can login to frontend
- [ ] Frontend can call backend API

---

## 🌐 Your Live URLs

| Component | URL |
|-----------|-----|
| **Frontend** | https://your-app.vercel.app |
| **Backend API** | https://your-api-abc123.railway.app |
| **GitHub** | https://github.com/YOUR-USERNAME/school-scheduling-system |

---

## 🧪 Testing Your Deployment

### Test 1: Frontend Loads
```
https://your-app.vercel.app
✅ Should see login page
```

### Test 2: Backend API Responds
```
https://your-api-abc123.railway.app/
✅ Should show "API running"
```

### Test 3: Database Connection
1. Go to frontend login
2. Try creating a course
3. Go to MongoDB Atlas → Collections
4. Should see your data ✅

### Test 4: From Another Device
1. Go to `https://your-app.vercel.app` on phone/tablet
2. Login
3. Create schedule
4. Check it syncs ✅

---

## 🔒 Security Checklist

- [ ] MongoDB credentials are in `.env` (NOT in GitHub)
- [ ] `.gitignore` excludes `.env`
- [ ] Railway/Vercel environment variables are set
- [ ] CORS is configured for your Vercel URL
- [ ] Database has Network Access enabled (0.0.0.0/0)
- [ ] No secrets in code (all in `.env`)

---

## 🆘 Troubleshooting

### Frontend shows blank page
**Problem**: API URL is still localhost:5000
**Solution**: 
1. Update `.env` with correct Railway URL
2. Redeploy to Vercel

### "Connection refused" errors
**Problem**: Backend not deployed yet or crashed
**Solution**:
1. Check Railway dashboard → Deployments
2. Click latest deployment
3. View logs to see errors
4. Fix issues and redeploy

### MongoDB connection timeout
**Problem**: IP not whitelisted
**Solution**:
1. Go to MongoDB Atlas → Network Access
2. Add IP Address → Allow from anywhere (0.0.0.0/0)

### CORS errors in browser
**Problem**: Frontend domain not in CORS whitelist
**Solution**:
1. Add Vercel URL to backend CORS:
   ```javascript
   origin: ['https://your-app.vercel.app', process.env.FRONTEND_URL]
   ```
2. Redeploy backend

---

## 📈 Scaling Later (Optional)

When you grow:

- **Database**: MongoDB Atlas free tier = 512MB
  - If you hit limit → MongoDB paid tier (~$10/month)
  
- **Backend**: Railway free tier = 5GB disk, decent CPU
  - If you hit limit → Upgrade plan
  
- **Frontend**: Vercel free tier = unlimited deployments
  - Always free for open source

---

## 🚀 Next Steps After Deployment

### Option 1: Custom Domain (Optional)
Add your own domain (costs $10-15/year):
1. In Vercel: Settings → Domains
2. Add your custom domain
3. Update DNS records
4. Your app will be: `https://yourdomain.com`

### Option 2: Continuous Deployment (Automatic)
Your setup is already automatic:
- Push to GitHub → Vercel auto-deploys ✅
- Backend updates → Railway auto-deploys ✅

### Option 3: Monitor Performance
1. **Vercel Analytics**: Built-in, shows page load times
2. **Railway Metrics**: Shows API response times
3. **MongoDB Atlas**: Shows database query performance

---

## 💡 Pro Tips

✅ **Tip 1**: Share your app link with classmates/professors
✅ **Tip 2**: Use it on your phone to demo during presentation
✅ **Tip 3**: Share link on your capstone documentation
✅ **Tip 4**: Keep GitHub link in README (shows transparency)

---

## 🎓 What You Learned

- ✅ Database hosting (MongoDB Atlas)
- ✅ Backend hosting (Railway)
- ✅ Frontend hosting (Vercel)
- ✅ Environment variables in production
- ✅ CORS configuration
- ✅ Connecting services together
- ✅ Debugging deployed applications

**These are professional DevOps skills!** 💼

---

## 📞 Common Questions

**Q: Can I use free services?**
A: Yes! MongoDB Atlas (free tier), Railway (free tier), Vercel (free) all have free options

**Q: What if my app sleeps?**
A: Railway doesn't sleep. You stay online 24/7

**Q: Can I update my code?**
A: Yes! Push to GitHub → Auto-deploys to Vercel + Railway

**Q: How many users can it handle?**
A: Free tier handles 1000+ concurrent users

**Q: Do I need to pay?**
A: No! Start free, pay only if you grow

---

## 🎉 You Did It!

Your School Scheduling System is now:
- ✅ Live on the internet
- ✅ Accessible from any device
- ✅ Using a real cloud database
- ✅ Professional deployment

**Show your professors!** 🎓

---

## 📝 Deployment Summary

```
YOUR LOCAL CODE
        ↓ (git push)
   GITHUB.COM
        ↓
   RAILWAY.APP (Backend)
        ↑ (API calls)
   VERCEL.APP (Frontend)
        ↑ (browser access)
   ANY DEVICE 🌍
```

---

**Ready to deploy?** 🚀

Start with **Step 1: MongoDB Atlas** above!

Questions? Check the **Troubleshooting** section!
