# Luckfixer 2.0 — Netlify Setup Guide

## Architecture

- Frontend + API routes -> Netlify (full Next.js SSR support, no separate functions setup needed)
- Database + Auth -> Supabase

---

## Step 1 - Install dependencies

```bash
npm install
```

This installs Next.js, React, Supabase client, Gemini SDK, Groq SDK.

---

## Step 2 - Supabase setup

1. Create a project at supabase.com
2. Go to SQL Editor -> paste contents of supabase/schema.sql -> Run
3. Go to Authentication -> Providers -> enable Google OAuth
   - Add Google Client ID + Secret from Google Cloud Console
4. Authentication -> URL Configuration:
   - Site URL = your Netlify URL (set after first deploy, e.g. https://your-site.netlify.app)
   - Redirect URLs = https://your-site.netlify.app/auth/callback
5. Project Settings -> API -> copy:
   - Project URL
   - anon public key
   - service_role key (keep secret)

---

## Step 3 - Get free AI API keys

| Key | Where to get it |
|---|---|
| GEMINI_API_KEY | aistudio.google.com -> Get API Key |
| GROQ_API_KEY | console.groq.com -> API Keys |

---

## Step 4 - Local environment file

```bash
cp .env.local.example .env.local
```

Fill in all values from steps 2 and 3.

---

## Step 5 - Test locally

```bash
npm run dev
```

Visit http://localhost:3000/login

---

## Step 6 - Deploy to Netlify

### Option A: Netlify CLI (simplest)

```bash
npm install -g netlify-cli
netlify login
netlify init
```

When prompted:
- "Create & configure a new site" -> Yes
- Build command -> npm run build (already in netlify.toml)
- Publish directory -> .next (already in netlify.toml)

```bash
netlify deploy --prod
```

### Option B: Netlify Dashboard (GitHub)

1. Push this project to a GitHub repo
2. Go to app.netlify.com -> Add new site -> Import an existing project
3. Connect your GitHub repo
4. Build settings are auto-detected from netlify.toml
5. Click Deploy

---

## Step 7 - Set environment variables on Netlify

Go to: Site settings -> Environment variables -> Add each of these:

| Variable | Value |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | from Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | from Supabase |
| SUPABASE_SERVICE_ROLE_KEY | from Supabase (secret) |
| GEMINI_API_KEY | from Google AI Studio |
| GROQ_API_KEY | from Groq Cloud |
| ADMIN_SECRET | any password you choose |

After adding variables, trigger a redeploy: Deploys -> Trigger deploy -> Deploy site

---

## Step 8 - Update Supabase redirect URL

Once you have your real Netlify URL (e.g. https://luckfixer2.netlify.app):

1. Supabase -> Authentication -> URL Configuration
2. Site URL = https://luckfixer2.netlify.app
3. Redirect URLs = https://luckfixer2.netlify.app/auth/callback

---

## Step 9 - Admin: change free tier limits

```bash
curl -X PATCH https://luckfixer2.netlify.app/api/admin/plan \
  -H "x-admin-secret: your-admin-secret" \
  -H "Content-Type: application/json" \
  -d "{\"free_mins_day\": 15, \"free_chats_day\": 8}"
```

Changes apply within 60 seconds. No redeploy needed.

---

## Re-deploying after changes

```bash
git push          # if using GitHub integration (auto-deploys)
```

or

```bash
netlify deploy --prod    # if using CLI
```

---

## Pages and routes

| Route | Purpose |
|---|---|
| /login | Google OAuth + Email OTP |
| /profile | Edit profile, view + add kundlis |
| /chat?kundliId=X | AI chat with kundli context |
| /auth/callback | OAuth redirect handler |
| /api/chat | Chat API (usage-guarded, AI fallback) |
| /api/kundli | Save/list kundlis with AI analysis |
| /api/admin/plan | Admin: configure free tier limits |

---

## Cost (free tier limits)

| Service | Free tier |
|---|---|
| Netlify | 100GB bandwidth/month, 300 build min/month |
| Supabase | 500MB DB, 50,000 monthly active users |
| Gemini 1.5 Flash | 15 requests/minute |
| Groq Llama3 70B | ~30 requests/minute |

All Rs 0 for small-to-medium usage.
"# luckfixer" 
