// app/api/admin/ai-keys/route.js
// Admin CRUD + test for admin-managed AI provider keys (table ai_provider_keys).
// Auth: logged-in admin only (server-side requireAdmin). The API NEVER returns a
// full key — only key_last4.
//
//   GET                       -> { keys: [...], presets, vaultConfigured }
//   POST   {provider,label,api_key,model?,base_url?,priority?}   -> add
//   PATCH  {id, enabled?, priority?, label?, model?, base_url?, api_key?, resetStatus?}
//   DELETE ?id=...
//   PUT    {id}               -> test the stored key with a tiny live call

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { encryptKey, isVaultConfigured, lastFour, decryptKey } from '@/lib/ai-key-vault';
import { PROVIDER_PRESETS, invalidateProviderCache, callOpenAICompatible } from '@/lib/ai-providers';

export const dynamic = 'force-dynamic';

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
async function guard() {
  const supabase = await createServerClient();
  return await requireAdmin(supabase);
}
const forbidden = () => Response.json({ error: 'Forbidden' }, { status: 403 });

const PUBLIC_COLS = 'id, provider, label, key_last4, model, base_url, priority, enabled, status, last_error, fail_count, cooldown_until, last_used_at, created_at';

function validBaseUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:'; } catch { return false; }
}

export async function GET() {
  if (!(await guard())) return forbidden();
  const { data, error } = await db().from('ai_provider_keys').select(PUBLIC_COLS).order('priority', { ascending: true });
  if (error) return Response.json({ error: error.message, hint: 'migration_023 run kiya?' }, { status: 500 });
  return Response.json({ keys: data || [], presets: PROVIDER_PRESETS, vaultConfigured: isVaultConfigured() });
}

export async function POST(req) {
  if (!(await guard())) return forbidden();
  if (!isVaultConfigured()) {
    return Response.json({ error: 'KEY_ENCRYPTION_SECRET Vercel env mein set karein (kam se kam 16 characters), phir redeploy.' }, { status: 400 });
  }
  const b = await req.json();
  const preset = PROVIDER_PRESETS[b.provider];
  if (!preset) return Response.json({ error: 'Unknown provider' }, { status: 400 });
  const apiKey = String(b.api_key || '').trim();
  if (apiKey.length < 8) return Response.json({ error: 'API key missing/too short' }, { status: 400 });

  const base_url = String(b.base_url || preset.base_url).trim();
  const model = String(b.model || preset.model).trim();
  if (!validBaseUrl(base_url)) return Response.json({ error: 'base_url must be a valid https:// URL' }, { status: 400 });
  if (!model) return Response.json({ error: 'model required' }, { status: 400 });

  const row = {
    provider: b.provider,
    label: String(b.label || preset.label).trim().slice(0, 60),
    api_key_enc: encryptKey(apiKey),
    key_last4: lastFour(apiKey),
    model, base_url,
    priority: Number.isFinite(Number(b.priority)) ? Math.round(Number(b.priority)) : 100,
  };
  const { data, error } = await db().from('ai_provider_keys').insert(row).select(PUBLIC_COLS).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  invalidateProviderCache();
  return Response.json({ success: true, key: data });
}

export async function PATCH(req) {
  if (!(await guard())) return forbidden();
  const b = await req.json();
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 });

  const update = { updated_at: new Date().toISOString() };
  if (typeof b.enabled === 'boolean') update.enabled = b.enabled;
  if (b.priority !== undefined && Number.isFinite(Number(b.priority))) update.priority = Math.round(Number(b.priority));
  if (typeof b.label === 'string') update.label = b.label.trim().slice(0, 60);
  if (typeof b.model === 'string' && b.model.trim()) update.model = b.model.trim();
  if (typeof b.base_url === 'string' && b.base_url.trim()) {
    if (!validBaseUrl(b.base_url.trim())) return Response.json({ error: 'base_url must be a valid https:// URL' }, { status: 400 });
    update.base_url = b.base_url.trim();
  }
  if (typeof b.api_key === 'string' && b.api_key.trim()) {
    if (!isVaultConfigured()) return Response.json({ error: 'KEY_ENCRYPTION_SECRET not set' }, { status: 400 });
    update.api_key_enc = encryptKey(b.api_key.trim());
    update.key_last4 = lastFour(b.api_key.trim());
    update.status = 'new'; update.last_error = null; update.fail_count = 0; update.cooldown_until = null;
  }
  // Re-enabling / resetting clears the health state so a fixed key gets a clean start.
  if (b.resetStatus || update.enabled === true) {
    update.status = update.status || 'new'; update.last_error = null; update.fail_count = 0; update.cooldown_until = null;
  }
  const { data, error } = await db().from('ai_provider_keys').update(update).eq('id', b.id).select(PUBLIC_COLS).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  invalidateProviderCache();
  return Response.json({ success: true, key: data });
}

export async function DELETE(req) {
  if (!(await guard())) return forbidden();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const { error } = await db().from('ai_provider_keys').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  invalidateProviderCache();
  return Response.json({ success: true });
}

// PUT — live test of a stored key (tiny 1-line prompt, 12s cap).
export async function PUT(req) {
  if (!(await guard())) return forbidden();
  const { id } = await req.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const { data: row, error } = await db().from('ai_provider_keys').select('*').eq('id', id).maybeSingle();
  if (error || !row) return Response.json({ error: 'Key not found' }, { status: 404 });

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const entry = { ...row, apiKey: decryptKey(row.api_key_enc), label: row.label || row.provider };
    const res = await callOpenAICompatible(entry, 'You are a test. Reply with the single word: OK', 'ping', false, controller.signal);
    const ms = Date.now() - started;
    await db().from('ai_provider_keys').update({ status: 'ok', last_error: null, fail_count: 0, cooldown_until: null, enabled: true, last_used_at: new Date().toISOString() }).eq('id', id);
    invalidateProviderCache();
    return Response.json({ ok: true, ms, model: res.model, reply: String(res.content).slice(0, 40) });
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'Timed out after 12s' : e.message;
    const isAuth = /\b(401|403)\b/.test(msg);
    await db().from('ai_provider_keys').update({ status: isAuth ? 'invalid' : 'error', last_error: String(msg).slice(0, 300), ...(isAuth ? { enabled: false } : {}) }).eq('id', id);
    invalidateProviderCache();
    return Response.json({ ok: false, error: msg }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
