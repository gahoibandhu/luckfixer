// lib/ai-usage-log.js
// Non-fatal per-call token ledger for AI features other than live chat.
// Tokens are an ESTIMATE (characters / 4) — free providers don't all report counts.
import { createClient } from '@supabase/supabase-js';

export function estimateTokens(...parts) {
  const chars = parts.reduce((n, p) => n + (typeof p === 'string' ? p.length : p ? JSON.stringify(p).length : 0), 0);
  return Math.ceil(chars / 4);
}

export async function logAiUsage({ userId, feature, model, tokens }) {
  try {
    if (!feature || !tokens) return;
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await admin.from('ai_usage_log').insert({
      user_id: userId || null, feature, model: model || null, tokens_est: Math.round(tokens),
    });
    if (error) console.error('[AI usage] log failed (run migration_027?):', error.message);
  } catch (e) {
    console.error('[AI usage] log error (non-fatal):', e.message);
  }
}
