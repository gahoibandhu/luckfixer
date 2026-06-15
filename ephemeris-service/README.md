# Luckfixer Ephemeris Service (pyswisseph)

Real Swiss Ephemeris microservice. Deploy this folder as a **separate
service** on Render.com (free tier). The main Luckfixer app calls this
service for accurate planetary positions, falling back to
`astronomy-engine` and then a simulated engine if it's unreachable.

## Deploy steps (Render.com)

1. Push this `ephemeris-service/` folder to its own GitHub repo (or a
   subfolder of your existing repo — Render supports "Root Directory").
2. Go to https://dashboard.render.com → **New** → **Web Service**.
3. Connect your repo. If using a subfolder, set **Root Directory** to
   `ephemeris-service`.
4. Render should auto-detect `render.yaml`. If not, set manually:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
5. Click **Create Web Service**. First deploy takes ~3-5 minutes.
6. Once live, you'll get a URL like:
   `https://luckfixer-ephemeris.onrender.com`
7. Test it:
   ```bash
   curl https://luckfixer-ephemeris.onrender.com/
   # {"status":"ok","service":"luckfixer-ephemeris","engine":"pyswisseph"}

   curl -X POST https://luckfixer-ephemeris.onrender.com/positions \
     -H "Content-Type: application/json" \
     -d '{"dob":"1984-03-06","time":"10:30","lat":28.6139,"lng":77.2090,"ayanamsa":"lahiri"}'
   ```

## Connect to Luckfixer

Add this env var in **Netlify** (Site configuration → Environment variables):

```
EPHEMERIS_SERVICE_URL=https://luckfixer-ephemeris.onrender.com
```

The main app will now use this for real planetary positions. If the
service is unreachable (e.g. Render free tier "cold start" timeout —
first request after sleep can take 30-50s), it automatically falls back
to `astronomy-engine` (still real astronomical data, computed in Node.js),
and only falls back to the simulated engine if both fail.

## Notes on Render free tier

- Free services **sleep after 15 minutes of inactivity** and take
  30-50 seconds to wake up on the next request.
- The main app sets a short timeout (8s) when calling this service, so a
  sleeping service will be skipped gracefully (fallback to
  astronomy-engine) rather than making the user wait.
- To avoid cold starts entirely, consider a free uptime-pinger
  (e.g. cron-job.org hitting `/` every 10 minutes), or upgrade to a paid
  Render plan later.
