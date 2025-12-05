# ⚡ Quick Deployment Checklist

## 🎯 Before You Deploy - 3 Files to Update

### File 1: `backend/package.json`

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

**Why**: Railway needs to run `npm start` command

---

### File 2: `backend/.env`

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/scheduling?retryWrites=true&w=majority
NODE_ENV=production
PORT=5000
CORS_ORIGIN=*
```

**Where to get MONGODB_URI**: MongoDB Atlas → Connect → Copy connection string

---

### File 3: `frontend/scheduling/.env` (CREATE THIS)

```env
VITE_API_URL=https://YOUR-RAILWAY-BACKEND-URL
```

**Example**:
```env
VITE_API_URL=https://school-api-prod.railway.app
```

---

## 📝 Find & Replace All API URLs

In your frontend code, replace all:

```
http://localhost:5000
```

With:

```
https://YOUR-RAILWAY-BACKEND-URL
```

### Files to Update:

- `src/components/**/*.jsx` (all axios calls)
- `src/pages/**/*.jsx` (all axios calls)
- `src/context/AuthContext.jsx`

**Quick way**: 
1. Ctrl+H (Find & Replace)
2. Find: `http://localhost:5000`
3. Replace: `https://your-railway-url`
4. Replace All

---

## 🚀 Deployment Order

```
1️⃣  Create MongoDB Atlas account + database
    ↓
2️⃣  Get connection string
    ↓
3️⃣  Update backend/.env
    ↓
4️⃣  Deploy backend to Railway
    ↓
5️⃣  Copy Railway URL
    ↓
6️⃣  Update frontend API URLs
    ↓
7️⃣  Deploy frontend to Vercel
    ↓
✅ LIVE!
```

---

## ⏱️ Time: ~25 Minutes Total

| Step | Time |
|------|------|
| MongoDB setup | 5 min |
| Backend deployment | 10 min |
| Frontend update | 5 min |
| Frontend deployment | 5 min |
| **TOTAL** | **~25 min** |

---

## 📱 After Deployment

**Test on any device:**

```
https://your-app.vercel.app
```

Login → Create schedule → Should work! ✅

---

## 📞 Support

See **DEPLOYMENT_GUIDE.md** for detailed instructions!
