// lib/usage-guard.js
// Flexible plan enforcement: 'chat' mode, 'time' mode, 'both' mode, or 'demo' (unlimited)

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── Plan config cache (60s) ───────────────────────────────────
let planCache = null;
let planCacheTime = 0;

export async function getPlanConfig(planName = 'free') {
  const now = Date.now();
  if (planCache && now - planCacheTime < 60000) return planCache;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('plan_config')
    .select('*')
    .eq('plan_name', planName)
    .single();

  planCache = data || { free_mins_day: 5, free_chats_day: 10, charge_per_min: 1.0, plan_type: 'chat' };
  planCacheTime = now;
  return planCache;
}

// ── Check if user is on demo plan (unlimited) ────────────────
async function isDemoUser(userId) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('demo_users')
    .select('id, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return false;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false;
  return true;
}

// ── Today's usage ─────────────────────────────────────────────
export async function getTodayUsage(userId) {
  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('usage_log')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today)
    .maybeSingle();

  return data || { chat_count: 0, free_mins_used: 0, paid_mins_used: 0, total_tokens: 0 };
}

// ── Main guard ────────────────────────────────────────────────
export async function checkUsageAllowed(userId) {
  // Demo users get unlimited access
  const demo = await isDemoUser(userId);
  if (demo) {
    return {
      allowed: true,
      isDemo: true,
      freeChatsLeft: 999,
      freeMinsLeft: 999,
      plan: { plan_type: 'demo', free_chats_day: 999, free_mins_day: 999 },
      usage: { chat_count: 0, free_mins_used: 0 },
    };
  }

  const [plan, usage] = await Promise.all([
    getPlanConfig('free'),
    getTodayUsage(userId),
  ]);

  const planType = plan.plan_type || 'chat';
  const freeChatsLeft = plan.free_chats_day - (usage.chat_count || 0);
  const freeMinsLeft  = plan.free_mins_day  - parseFloat(usage.free_mins_used || 0);

  // ── Chat-based plan ───────────────────────────────────────
  if (planType === 'chat') {
    if (freeChatsLeft <= 0) {
      return {
        allowed: false,
        reason: `आज की ${plan.free_chats_day} free chats खत्म हो गई हैं। कल फिर आएं। 🙏`,
        usage, plan,
      };
    }
    return { allowed: true, freeChatsLeft, freeMinsLeft: 999, plan, usage };
  }

  // ── Time-based plan ───────────────────────────────────────
  if (planType === 'time') {
    if (freeMinsLeft <= 0) {
      return {
        allowed: false,
        reason: `आज के ${plan.free_mins_day} free minutes खत्म हो गए हैं। कल फिर आएं। 🙏`,
        usage, plan,
      };
    }
    return { allowed: true, freeChatsLeft: 999, freeMinsLeft: parseFloat(freeMinsLeft.toFixed(2)), plan, usage };
  }

  // ── Both (chat count AND time) ────────────────────────────
  if (freeChatsLeft <= 0) {
    return {
      allowed: false,
      reason: `आज की ${plan.free_chats_day} free chats खत्म हो गई हैं। कल फिर आएं। 🙏`,
      usage, plan,
    };
  }
  if (freeMinsLeft <= 0) {
    return {
      allowed: false,
      reason: `आज के ${plan.free_mins_day} free minutes खत्म हो गए हैं। कल फिर आएं। 🙏`,
      usage, plan,
    };
  }

  return {
    allowed: true,
    freeChatsLeft,
    freeMinsLeft: parseFloat(freeMinsLeft.toFixed(2)),
    plan, usage,
  };
}

// ── Record usage ──────────────────────────────────────────────
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
