// lib/app-config.js
// General-purpose, live-editable site config (key/value), e.g. the bot's
// display name. Same 60s-cache pattern as getPlanConfig in usage-guard.js
// — admin changes apply within a minute, no redeploy needed.

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const DEFAULTS = {
  bot_display_name: 'Luckfixer',
};

let configCache = null;
let configCacheTime = 0;

export async function getAppConfig() {
  const now = Date.now();
  if (configCache && now - configCacheTime < 60000) return configCache;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('app_config').select('key, value');

  const merged = { ...DEFAULTS };
  for (const row of data || []) merged[row.key] = row.value;

  configCache = merged;
  configCacheTime = now;
  return merged;
}

export async function getBotDisplayName() {
  const config = await getAppConfig();
  return config.bot_display_name || DEFAULTS.bot_display_name;
}

// Admin panel calls this after a PATCH so the change is visible
// immediately rather than waiting up to 60s for the cache to expire.
export function invalidateAppConfigCache() {
  configCache = null;
  configCacheTime = 0;
}
