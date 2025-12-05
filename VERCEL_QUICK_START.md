# ⚡ Vercel Deployment - Quick Checklist

## 🎯 Before You Start

**Do you have these?**
- [ ] Railway backend URL (from Railway dashboard)
- [ ] GitHub account logged in
- [ ] VS Code open to your project

---

## 📝 5-Minute Quick Start

### 1️⃣ Get Railway URL
```
Railway.app dashboard 
  → Your Project 
  → Deployments 
  → Copy URL
```
**Copy this URL:** `https://_______________`

---

### 2️⃣ Update Frontend API

**Create file:** `frontend/scheduling/.env`

**Add:**
```env
VITE_API_URL=https://YOUR-RAILWAY-URL
```

**Replace** `http://localhost:5000` everywhere:
- Ctrl+H (Find & Replace)
- Find: `http://localhost:5000`
- Replace: `https://YOUR-RAILWAY-URL`
- Replace All

---

### 3️⃣ Push to GitHub

```powershell
git add .
git commit -m "Update frontend API URL"
git push
```

✅ Done!

---

### 4️⃣ Deploy to Vercel

1. Go: **vercel.com**
2. Sign up with GitHub
3. Click: **Add New Project**
4. Select: `school-scheduling-system`
5. Set **Root Directory**: `frontend/scheduling`
6. Add Environment Variable:
   - Name: `VITE_API_URL`
   - Value: `https://YOUR-RAILWAY-URL`
7. Click: **Deploy**
8. Wait ⏳ (1-2 minutes)
9. Done! ✅

---

### 5️⃣ Update Backend CORS

Go to **Railway**:
1. Variables tab
2. Add: `FRONTEND_URL=https://your-vercel-app.vercel.app`
3. Deploy
4. Done! ✅

---

## ✅ Verification Checklist

- [ ] Vercel URL opens without errors
- [ ] Can see login page
- [ ] Can login with credentials
- [ ] Can create course/schedule
- [ ] Data appears in MongoDB Atlas
- [ ] No errors in browser console
- [ ] Works on phone too

---

## 🎉 You're Live!

**Your URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-railway-url`
- Database: MongoDB Atlas
- Code: GitHub

---

## 📱 Share It!

Send to:
- Professors ✅
- Classmates ✅
- Portfolio ✅
- Capstone docs ✅

---

**DONE!** 🚀
