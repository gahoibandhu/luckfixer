// lib/ai-providers.js
//
// Admin-managed AI providers/keys (table: ai_provider_keys, migration_023).
// These are ADDED to the built-in env-var fallback chain in lib/ai-engine.js —
// the env-based providers still work exactly as before, and if this table is
// empty, missing, or the DB is down, nothing changes (every function here
// fails safe to "no extra providers").
//
// All dynamic providers speak the OpenAI-compatible /chat/completions
// protocol (SambaNova, Groq, OpenRouter, HuggingFace router, Together, and
// Google's Gemini OpenAI-compat endpoint all do), so one generic caller
// covers them.

import { createClient } from '@supabase/supabase-js';
import { decryptKey } from './ai-key-vault';

export const PROVIDER_PRESETS = {
  sambanova:   { label: 'SambaNova',   base_url: 'https://api.sambanova.ai/v1',                                model: 'Meta-Llama-3.3-70B-Instruct' },
  groq:        { label: 'Groq',        base_url: 'https://api.groq.com/openai/v1',                             model: 'openai/gpt-oss-120b' },
  openrouter:  { label: 'OpenRouter',  base_url: 'https://openrouter.ai/api/v1',                               model: 'openrouter/free' },
  huggingface: { label: 'HuggingFace', base_url: 'https://router.huggingface.co/v1',                           model: 'meta-llama/Llama-3.1-8B-Instruct' },
  gemini:      { label: 'Gemini',      base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',    model: 'gemini-3.1-flash-lite' },
  together:    { label: 'Together',    base_url: 'https://api.together.xyz/v1',                                model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  custom:      { label: 'Custom (OpenAI-compatible)', base_url: '', model: '' },
};

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cache = null;
let cacheTime = 0;

export function invalidateProviderCache() { cache = null; cacheTime = 0; }

// Returns usable entries: enabled, key decryptable, not cooling down.
// Shape: { id, provider, label, model, base_url, priority, apiKey }
export async function getDynamicProviders() {
  const now = Date.now();
  if (cache && now - cacheTime < 60000) return cache;
  try {
    const { data, error } = await getAdminDb()
      .from('ai_provider_keys')
      .select('id, provider, label, api_key_enc, model, base_url, priority, enabled, cooldown_until')
      .eq('enabled', true)
      .order('priority', { ascending: true });
    if (error) throw error;

    const out = [];
    for (const row of data || []) {
      if (row.cooldown_until && new Date(row.cooldown_until).getTime() > now) continue;
      try {
        out.push({
          id: row.id, provider: row.provider, label: row.label || row.provider,
          model: row.model, base_url: row.base_url, priority: row.priority ?? 100,
          apiKey: decryptKey(row.api_key_enc),
        });
      } catch (e) {
        // Undecryptable (secret changed / corrupted) — mark and skip, never crash the chain.
        reportProviderResult(row.id, false, 'Key could not be decrypted — re-enter it', 'invalid');
      }
    }
    cache = out; cacheTime = now;
    return out;
  } catch (e) {
    console.warn('[AI providers] load failed (using env chain only):', e.message);
    return [];
  }
}

// Fire-and-forget health update. 401/403 -> disable ("invalid"); 429 -> 5 min
// cooldown; 3 consecutive other failures -> 2 min cooldown.
export function reportProviderResult(id, ok, errorMsg, forceStatus) {
  (async () => {
    try {
      const db = getAdminDb();
      const nowIso = new Date().toISOString();
      if (ok) {
        await db.from('ai_provider_keys').update({
          status: 'ok', last_error: null, fail_count: 0, cooldown_until: null, last_used_at: nowIso,
        }).eq('id', id);
        return;
      }
      const msg = String(errorMsg || 'error').slice(0, 300);
      const isAuth = forceStatus === 'invalid' || /\b(401|403)\b/.test(msg);
      const isRate = /\b429\b|rate.?limit/i.test(msg);
      const { data: row } = await db.from('ai_provider_keys').select('fail_count').eq('id', id).maybeSingle();
      const failCount = (row?.fail_count || 0) + 1;
      const update = { last_error: msg, fail_count: failCount, last_used_at: nowIso };
      if (isAuth) { update.enabled = false; update.status = 'invalid'; }
      else if (isRate) { update.status = 'rate_limited'; update.cooldown_until = new Date(Date.now() + 5 * 60000).toISOString(); }
      else { update.status = 'error'; if (failCount >= 3) update.cooldown_until = new Date(Date.now() + 2 * 60000).toISOString(); }
      await db.from('ai_provider_keys').update(update).eq('id', id);
      invalidateProviderCache();
    } catch (e) {
      console.warn('[AI providers] health update failed (non-fatal):', e.message);
    }
  })();
}

// Generic OpenAI-compatible call. Throws Error('<status> ...') on failure so
// reportProviderResult can classify it.
export async function callOpenAICompatible(entry, systemPrompt, userMessage, jsonMode, signal) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: jsonMode
        ? userMessage + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks.'
        : userMessage },
  ];
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${entry.apiKey}` };
  if (entry.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://luckfixer.jaigahoi.in';
    headers['X-Title'] = 'Luckfixer 2.0';
  }
  const res = await fetch(entry.base_url.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST', headers, signal,
    body: JSON.stringify({ model: entry.model, messages, temperature: 0.4, max_tokens: 2000, stream: false }),
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 160);
    throw new Error(`${entry.label} ${res.status}: ${body}`);
  }
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${entry.label}: empty response`);
  const modelLabel = `${entry.provider}/${(data.model || entry.model || '').split('/').pop()}`;
  if (jsonMode) {
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return { content: JSON.parse(text), model: modelLabel };
  }
  return { content: text, model: modelLabel };
}
