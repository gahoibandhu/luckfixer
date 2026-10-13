// app/api/admin/health/route.js — "what is slow or broken, measured from inside production".
// Open https://<your-site>/api/admin/health while logged in as admin. It times the database, Supabase Auth and every AI provider with a tiny
// request (a few tokens), runs them in parallel, and prints a plain-language readout. Nothing is written anywhere.
import { createClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { estimatePromptTokens } from '@/lib/ai-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

async function timed(label, fn, ms = 20000) {
  const t0 = Date.now();
  try {
    const extra = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error(`no answer within ${ms}ms`)), ms))]);
    return { label, ok: true, ms: Date.now() - t0, ...(extra || {}) };
  } catch (e) {
    return { label, ok: false, ms: Date.now() - t0, error: String(e.message || e).slice(0, 220) };
  }
}
const httpCheck = async (url, init, ms = 10000) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  const body = (await res.text()).slice(0, 160).replace(/\s+/g, ' ');
  if (!res.ok) throw new Error(`HTTP ${res.status} ${body}`);
  return { status: res.status };
};

export async function GET() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const big = ('आपकी कुंडली में गुरु की महादशा चल रही है और शनि का गोचर कर्म भाव से हो रहा है। ').repeat(120);   // ~ a real chat prompt
  const bigTokens = estimatePromptTokens(big);

  const checks = await Promise.all([
    timed('db: tiny read (plan_config)', async () => { const r = await db.from('plan_config').select('plan_name').limit(1); if (r.error) throw new Error(r.error.message); }, 12000),
    timed('db: count user_profiles', async () => { const r = await db.from('user_profiles').select('*', { count: 'exact', head: true }); if (r.error) throw new Error(r.error.message); return { rows: r.count }; }, 12000),
    timed('db: latest chat_messages row', async () => { const r = await db.from('chat_messages').select('id').order('id', { ascending: false }).limit(1); if (r.error) throw new Error(r.error.message); }, 12000),
    timed('supabase auth: list 1 user', async () => { const r = await db.auth.admin.listUsers({ page: 1, perPage: 1 }); if (r.error) throw new Error(r.error.message); }, 12000),

    timed(`gemini ${GEMINI_MODEL}: tiny prompt`, async () => {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const r = await ai.models.generateContent({ model: GEMINI_MODEL, contents: 'Reply with the single word OK.', config: { thinkingConfig: { thinkingLevel: 'low' } } });
      return { reply: (r.text || '').slice(0, 30) };
    }, 25000),
    timed(`gemini ${GEMINI_MODEL}: ~${bigTokens}-token prompt (like a real chat)`, async () => {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const r = await ai.models.generateContent({ model: GEMINI_MODEL, contents: 'Say OK in one word.', config: { systemInstruction: big, thinkingConfig: { thinkingLevel: 'low' } } });
      return { reply: (r.text || '').slice(0, 30) };
    }, 40000),
    timed(`groq ${GROQ_MODEL}: tiny prompt`, () => httpCheck('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: 'Reply OK' }], max_tokens: 16 }) }, 15000), 16000),
    timed('openrouter: key status', () => httpCheck('https://openrouter.ai/api/v1/auth/key', { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } })),
    timed('sambanova: key status', () => httpCheck('https://api.sambanova.ai/v1/models', { headers: { Authorization: `Bearer ${process.env.SAMBANOVA_API_KEY || process.env.SAMBANOVA_API_KEY_1 || ''}` } })),
    timed('huggingface: token status', () => httpCheck('https://huggingface.co/api/whoami-v2', { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || ''}` } })),
  ]);

  const by = (p) => checks.find(c => c.label.startsWith(p));
  const read = [];
  const dbChecks = checks.filter(c => c.label.startsWith('db:') || c.label.startsWith('supabase auth'));
  const dbBad = dbChecks.filter(c => !c.ok), dbSlow = dbChecks.filter(c => c.ok && c.ms > 1500);
  if (dbBad.length === dbChecks.length) read.push('DATABASE/AUTH: every check failed or timed out -> Supabase itself is unresponsive from here (paused project, exhausted resources, a stuck query, or a Supabase incident). Run supabase/diagnose_db.sql in the Supabase SQL editor and look at the dashboard Reports.');
  else if (dbBad.length) read.push(`DATABASE/AUTH: ${dbBad.length} of ${dbChecks.length} checks failed (${dbBad.map(c => c.label).join('; ')}).`);
  else if (dbSlow.length) read.push(`DATABASE: reachable but slow (${dbSlow.map(c => `${c.label} ${c.ms}ms`).join('; ')}). Healthy is < ~300ms.`);
  else read.push('DATABASE/AUTH: healthy.');
  const gs = by('gemini ' + GEMINI_MODEL + ': tiny'), gb = checks.find(c => c.label.includes('-token prompt'));
  if (gs && !gs.ok) read.push(`GEMINI: even a tiny prompt fails (${gs.error}) -> key, quota/billing, model name (GEMINI_MODEL=${GEMINI_MODEL}) or Google-side issue.`);
  else if (gb && !gb.ok) read.push(`GEMINI: tiny prompt OK (${gs?.ms}ms) but the real-sized prompt fails (${gb.error}) -> the prompt is too heavy for the time budget; trim the chat prompt or raise GEMINI_CHAT_TIMEOUT_MS.`);
  else if (gb && gb.ms > 8000) read.push(`GEMINI: works, but a chat-sized prompt takes ${gb.ms}ms (tiny: ${gs?.ms}ms). Slow rather than broken; the 25s chat budget should cover it.`);
  else read.push(`GEMINI: healthy (tiny ${gs?.ms}ms, chat-sized ${gb?.ms}ms).`);
  for (const [k, name] of [['groq', 'GROQ'], ['openrouter', 'OPENROUTER'], ['sambanova', 'SAMBANOVA'], ['huggingface', 'HUGGINGFACE']]) {
    const c = checks.find(x => x.label.startsWith(k));
    if (c && !c.ok) read.push(`${name}: ${c.error}`);
  }
  return Response.json({
    when: new Date().toISOString(),
    runtime: { node: process.version, region: process.env.VERCEL_REGION || null, geminiModel: GEMINI_MODEL, geminiChatTimeoutMs: Number(process.env.GEMINI_CHAT_TIMEOUT_MS) || 25000, groqMaxPromptTokens: Number(process.env.GROQ_MAX_PROMPT_TOKENS) || 5500 },
    keysPresent: { GEMINI_API_KEY: !!process.env.GEMINI_API_KEY, GROQ_API_KEY: !!process.env.GROQ_API_KEY, OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY, SAMBANOVA: !!(process.env.SAMBANOVA_API_KEY || process.env.SAMBANOVA_API_KEY_1), HUGGINGFACE: !!(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN) },
    readout: read,
    checks,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
