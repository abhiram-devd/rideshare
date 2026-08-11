# RideShare — Deployment Guide

## Stack

| Layer | Tech | Hosting |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | **Vercel** (free) |
| Backend | FastAPI + Python | **Render** (free) |
| Database | PostgreSQL | **Supabase** (free, no expiry) |

---

## Prerequisites

- GitHub account with this repo pushed
- Free accounts on [supabase.com](https://supabase.com), [render.com](https://render.com), [vercel.com](https://vercel.com)

---

## Step 1 — Database (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string → URI**
3. Copy the URI:
   ```
   postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
   > ⚠️ Replace `[PASSWORD]` with your actual Supabase DB password

---

## Step 2 — Backend (Render)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Set:
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Start Command**: *(leave blank — Dockerfile handles it)*
4. Add these **Environment Variables**:

   | Variable | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | Supabase connection string from Step 1 |
   | `JWT_SECRET_KEY` | Run `openssl rand -hex 32` and paste result |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` |
   | `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
   | `COOKIE_SECURE` | `True` |
   | `COOKIE_SAMESITE` | `none` |
   | `FRONTEND_URL` | *(fill after Step 3)* |
   | `CORS_ORIGINS` | *(fill after Step 3)* |

5. Click **Deploy** — wait ~3 min → you'll get a URL like:
   ```
   https://ridemate-api.onrender.com
   ```
6. Verify: open `https://ridemate-api.onrender.com/health` → should return `{"status":"healthy"}`

> The Dockerfile runs `alembic upgrade head` automatically on every deploy, so all DB migrations are applied.

---

## Step 3 — Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Add New Project → Import Git Repository**
2. Select this repo
3. Set:
   - **Project Name**: `rideshare`
   - **Root Directory**: `frontend`
   - **Framework**: Vite *(auto-detected)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variable**:
   - `VITE_API_URL` = `https://ridemate-api.onrender.com/api/v1`
     *(replace with your actual Render URL)*
5. Click **Deploy** → you get:
   ```
   https://rideshare.vercel.app
   ```

---

## Step 4 — Wire Up CORS

Go back to **Render → your backend service → Environment** and update:

| Variable | Value |
|---|---|
| `FRONTEND_URL` | `https://rideshare.vercel.app` |
| `CORS_ORIGINS` | `["https://rideshare.vercel.app"]` |

Save → backend redeploys automatically (~1 min).

---

## Local Development

```bash
# 1. Start the database
docker compose up -d

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Copy `.env.example` → `.env` and fill in values before running locally.

---

## Environment Variables Reference

### Backend (`.env`)
```
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg2://...
JWT_SECRET_KEY=<openssl rand -hex 32>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=https://rideshare.vercel.app
CORS_ORIGINS=["https://rideshare.vercel.app"]
COOKIE_SECURE=True
COOKIE_SAMESITE=none
```

### Frontend (`frontend/.env.production`)
```
VITE_API_URL=https://ridemate-api.onrender.com/api/v1
```

---

## Architecture

```
Phone / Browser
      │
      ▼
┌──────────────────┐    HTTPS API calls    ┌─────────────────────┐
│  Vercel (CDN)    │ ──────────────────►  │  Render (FastAPI)   │
│  React/Vite SPA  │                       │  Docker + uvicorn   │
└──────────────────┘                       └──────────┬──────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │  Supabase PostgreSQL │
                                           │  (free, permanent)   │
                                           └──────────────────────┘
```

## Free Tier Limits

| Platform | Limit |
|---|---|
| Render | 750 compute-hours/month; sleeps after 15 min inactivity (~30s cold start) |
| Supabase | 500 MB DB, 2 GB bandwidth/month; no time expiry |
| Vercel | Unlimited static deploys, 100 GB bandwidth/month |
