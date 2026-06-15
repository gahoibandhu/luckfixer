// lib/usage-guard.js
// Checks user's daily usage against admin-configured plan limits

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // service role for server-side
  );
}

// ── Get current plan config (admin-configurable, cached 60s) ──
let planCache = null;
let planCacheTime = 0;

export async function getPlanConfig(planName = 'free') {
  const now = Date.now();
  if (planCache && now - planCacheTime < 60000) return planCache;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('plan_config')
    .select('*')
    .eq('plan_name', planName)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { free_mins_day: 10, free_chats_day: 5, charge_per_min: 0 };
  }

  planCache = data;
  planCacheTime = now;
  return data;
}

// ── Get today's usage for a user ──────────────────────────────
export async function getTodayUsage(userId) {
  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('usage_log')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today)
    .maybeSingle();

  return data || { chat_count: 0, free_mins_used: 0, paid_mins_used: 0 };
}

// ── Main guard — call before each chat request ─────────────────
export async function checkUsageAllowed(userId) {
  const [plan, usage] = await Promise.all([
    getPlanConfig('free'),
    getTodayUsage(userId),
  ]);

  const freeChatsLeft = plan.free_chats_day - usage.chat_count;
  const freeMinsLeft  = plan.free_mins_day  - parseFloat(usage.free_mins_used);

  if (freeChatsLeft <= 0) {
    return {
      allowed: false,
      reason: `आज की ${plan.free_chats_day} free chats खत्म हो गई हैं। कल फिर आएं।`,
      usage,
      plan,
    };
  }

  if (freeMinsLeft <= 0) {
    return {
      allowed: false,
      reason: `आज के ${plan.free_mins_day} free minutes खत्म हो गए हैं।`,
      usage,
      plan,
    };
  }

  return {
    allowed: true,
    freeChatsLeft,
    freeMinsLeft: parseFloat(freeMinsLeft.toFixed(2)),
    plan,
    usage,
  };
}

// ── Record usage after a chat response ────────────────────────
export async function recordUsage(userId, durationMins, tokensUsed) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_mins:    durationMins,
    p_tokens:  tokensUsed,
  });
  if (error) console.error('[Usage] Failed to record:', error.message);
}

export { getSupabaseAdmin };
