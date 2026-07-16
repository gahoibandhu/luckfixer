# Luckfixer 2.0 — Vercel Setup Guide

## Architecture

- Frontend + API routes -> Vercel (full Next.js SSR support, no separate functions setup needed)
- Database + Auth -> Supabase
- Ephemeris microservice -> Render (Python/pyswisseph)

---

## Step 1 - Install dependencies

```bash
npm install
```

This installs Next.js, React, Supabase client, Gemini SDK, Groq SDK, astronomy-engine.

---

## Step 2 - Supabase setup

1. Create a project at supabase.com
2. Go to SQL Editor -> run, in order: `supabase/schema.sql`, then each `migration_00X_*.sql` file in `supabase/`
3. Go to Authentication -> Providers -> enable Google OAuth
   - Add Google Client ID + Secret from Google Cloud Console
4. Authentication -> URL Configuration:
   - Site URL = your Vercel URL (set after first deploy, e.g. https://your-project.vercel.app)
   - Redirect URLs = https://your-project.vercel.app/auth/callback
5. Project Settings -> API -> copy:
   - Project URL
   - anon public key
   - service_role key (keep secret)

---

## Step 3 - Get AI API keys (fallback chain, in priority order)

| Key | Where to get it |
|---|---|
| GEMINI_API_KEY | aistudio.google.com -> Get API Key |
| SAMBANOVA_API_KEY_1 / _2 | cloud.sambanova.ai/apis |
| OPENROUTER_API_KEY | openrouter.ai/keys |
| HF_TOKEN | huggingface.co/settings/tokens |
| GROQ_API_KEY | console.groq.com -> API Keys |

Only `GEMINI_API_KEY` is required to run; the rest are optional fallbacks but strongly recommended for reliability.

---

## Step 4 - Local environment file

```bash
cp .env.local.example .env.local
```

Fill in all values from steps 2 and 3, plus `EPHEMERIS_SERVICE_URL` (Render URL, see Step 9) and `ADMIN_SECRET`.

---

## Step 5 - Test locally

```bash
npm run dev
```

Visit http://localhost:3000/login

---

## Step 6 - Deploy to Vercel

### Option A: Vercel CLI (simplest)

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts — Vercel auto-detects Next.js, no build config needed (`vercel.json` only sets function timeouts for the AI routes).

```bash
vercel --prod
```

### Option B: Vercel Dashboard (GitHub) — recommended for ongoing development

1. Push this project to a GitHub repo
2. Go to vercel.com/new -> Import Git Repository
3. Select your repo — Vercel auto-detects the Next.js framework preset
4. Add environment variables (Step 7) before first deploy, or right after
5. Click Deploy

Every `git push` to your main branch auto-deploys after this.

---

## Step 7 - Set environment variables on Vercel

Project -> Settings -> Environment Variables -> add each of these (apply to Production, Preview, and Development):

| Variable | Value |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | from Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | from Supabase |
| SUPABASE_SERVICE_ROLE_KEY | from Supabase (secret) |
| GEMINI_API_KEY | from Google AI Studio |
| SAMBANOVA_API_KEY_1 | from SambaNova |
| SAMBANOVA_API_KEY_2 | from SambaNova |
| OPENROUTER_API_KEY | from OpenRouter |
| HF_TOKEN | from HuggingFace |
| GROQ_API_KEY | from Groq Cloud |
| EPHEMERIS_SERVICE_URL | your Render service URL |
| ADMIN_SECRET | any password you choose |
| RESEND_API_KEY | from resend.com (for email notifications — outcome follow-ups, transit alerts) |
| CRON_SECRET | any random string — protects the /api/cron/daily-digest endpoint from external triggering |

After adding variables, trigger a redeploy: Deployments -> latest -> ⋯ -> Redeploy.

---

## Step 8 - Update Supabase redirect URL

Once you have your real Vercel URL (or custom domain, e.g. https://luckfixer.jaigahoi.in):

1. Supabase -> Authentication -> URL Configuration
2. Site URL = https://luckfixer.jaigahoi.in
3. Redirect URLs = https://luckfixer.jaigahoi.in/auth/callback

If using a custom domain, add it in Vercel: Project -> Settings -> Domains.

---

## Step 9 - Ephemeris microservice (Render)

The `ephemeris-service/` folder is a separate Python (FastAPI + pyswisseph) service, deployed independently on Render — it is NOT part of the Vercel deployment.

1. On Render: New -> Web Service -> connect this repo
2. Root Directory = `ephemeris-service`
3. Build/start commands are auto-detected from `render.yaml`
4. Copy the resulting `https://your-service.onrender.com` URL into `EPHEMERIS_SERVICE_URL` on Vercel

If this service is down or cold-starting, the app gracefully falls back to the astronomy-engine tier (Tier 2), so it is not a hard dependency — just improves precision.

---

## Step 10 - Admin: change free tier limits

```bash
curl -X PATCH https://luckfixer.jaigahoi.in/api/admin/plan \
  -H "x-admin-secret: your-admin-secret" \
  -H "Content-Type: application/json" \
  -d "{\"plan_type\": \"chat\", \"free_chats_day\": 8, \"free_mins_day\": 15}"
```

Changes apply within 60 seconds. No redeploy needed. (Easier: use the Admin panel UI at `/admin` -> Plan Config tab.)

---

## Re-deploying after changes

```bash
git push          # auto-deploys if using GitHub integration
```

or

```bash
vercel --prod      # if using CLI
```

---

## Pages and routes

| Route | Purpose |
|---|---|
| /login | Google OAuth + Email OTP |
| /profile | Edit profile, view + add kundlis |
| /chat?kundliId=X | AI chat with kundli context |
| /admin | Admin panel (stats, chat audit, plan config, demo users, kundli migration) |
| /auth/callback | OAuth redirect handler |
| /api/chat | Chat API (usage-guarded, 5-provider AI fallback) |
| /api/kundli | Save/list kundlis with deterministic fact-sheet + AI analysis |
| /api/admin/plan | Admin: configure free tier limits |
| /api/admin/demo | Admin: grant unlimited demo access by email |
| /api/admin/migrate-kundlis | Admin: backfill lagna/houses/event-scores on old kundlis |

---

## Cost (free tier limits)

| Service | Free tier |
|---|---|
| Vercel (Hobby) | 100GB bandwidth/month, 4 hrs active CPU/month, 60s max function duration — non-commercial use only per Vercel ToS |
| Render | 750 hrs/month free web service (spins down when idle, cold-starts ~30-60s) |
| Supabase | 500MB DB, 50,000 monthly active users |
| Gemini 2.0 Flash Lite | generous free tier, rate-limited |
| SambaNova / OpenRouter / HuggingFace / Groq | each has its own free tier, used as fallback chain |

Note: Vercel's Hobby plan free tier is for personal/non-commercial projects. If Luckfixer starts generating revenue or serving paying customers, upgrade to Vercel Pro ($20/month) per their terms of service.
