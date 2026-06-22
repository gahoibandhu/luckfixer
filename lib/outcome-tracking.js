// lib/outcome-tracking.js
//
// OUTCOME TRACKING LOOP
//
// This is Luckfixer's primary long-term differentiator. After a kundli
// analysis is generated, we schedule a follow-up 3 weeks later asking
// whether the predicted events came true. Over time, this builds a
// proprietary accuracy dataset that no competitor can replicate.
//
// Integration points:
//   1. scheduleOutcomeFollowUps() — called at kundli save time
//   2. getPendingFollowUp() — called at chat init, surfaces due follow-ups
//   3. recordOutcome() — called when user answers a follow-up in chat
//   4. detectOutcomeAnswer() — deterministic yes/no/partial from user text

// ── Delay before asking follow-up (3 weeks is enough time for
//    short-window predictions like dasha sub-periods to begin manifesting)
const FOLLOW_UP_DAYS = 21;

// ── Outcome detection keywords ────────────────────────────────
const CONFIRMED_WORDS = ['haan','han ','bilkul','sahi','sach','yes','correct','right','hua','hui','ho gaya','ho gayi','theek','बिल्कुल','हाँ','हां','सही','सच','हुआ','हुई','हो गया','हो गई'];
const DENIED_WORDS    = ['nahi','nahin','no ','galat','wrong','nahi hua','nahi hui','नहीं','नही','गलत','नहीं हुआ'];
const PARTIAL_WORDS   = ['thoda','kuch','partially','aadha','kuch had tak','थोड़ा','कुछ','आधा','कुछ हद तक','thodi','थोड़ी'];

export function detectOutcomeAnswer(text) {
  if (!text) return null;
  const t = ' ' + text.trim().toLowerCase() + ' ';
  // Check partial first (most specific — "thoda haan" = partial, not just yes)
  if (PARTIAL_WORDS.some(w => t.includes(w))) return 'partial';
  if (DENIED_WORDS.some(w => t.includes(w))) return 'denied';
  if (CONFIRMED_WORDS.some(w => t.includes(w))) return 'confirmed';
  return null; // null = unclear, don't record
}

// ── Schedule follow-up tracking rows at kundli-save time ─────
// Creates one follow-up row per significant prediction area
// (career, marriage, health — only those with high confidence)
export async function scheduleOutcomeFollowUps(supabase, userId, kundliId, predictionId, factSheet, aiAnalysis) {
  const followUpAt = new Date(Date.now() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);
  const rows = [];

  // Career follow-up (only if score is notable — above 40 or below 40)
  const career = factSheet?.eventScores?.career;
  if (career && career.confidence > 50) {
    const trend = career.score >= 60 ? 'अनुकूल' : career.score <= 40 ? 'चुनौतीपूर्ण' : 'मिश्रित';
    rows.push({
      user_id:          userId,
      kundli_id:        kundliId,
      prediction_id:    predictionId,
      prediction_type:  'career',
      prediction_text:  `करियर में ${trend} समय — Score: ${career.score}/100`,
      predicted_window: factSheet.currentDashaLordHint || 'वर्तमान दशा काल',
      dasha_context:    factSheet.currentDashaLordHint,
      predicted_score:  career.score,
      follow_up_at:     followUpAt.toISOString(),
    });
  }

  // Marriage/relationship follow-up
  const marriage = factSheet?.eventScores?.marriage;
  if (marriage && marriage.confidence > 50) {
    const trend = marriage.score >= 60 ? 'अनुकूल' : marriage.score <= 40 ? 'चुनौतीपूर्ण' : 'मिश्रित';
    rows.push({
      user_id:          userId,
      kundli_id:        kundliId,
      prediction_id:    predictionId,
      prediction_type:  'marriage',
      prediction_text:  `विवाह/संबंध में ${trend} समय — Score: ${marriage.score}/100`,
      predicted_window: factSheet.currentDashaLordHint || 'वर्तमान दशा काल',
      dasha_context:    factSheet.currentDashaLordHint,
      predicted_score:  marriage.score,
      follow_up_at:     followUpAt.toISOString(),
    });
  }

  // Health follow-up (only if challenging)
  const health = factSheet?.eventScores?.health;
  if (health && health.score <= 45 && health.confidence > 50) {
    rows.push({
      user_id:          userId,
      kundli_id:        kundliId,
      prediction_id:    predictionId,
      prediction_type:  'health',
      prediction_text:  `स्वास्थ्य के लिए सतर्कता का समय — Score: ${health.score}/100`,
      predicted_window: factSheet.currentDashaLordHint || 'वर्तमान दशा काल',
      dasha_context:    factSheet.currentDashaLordHint,
      predicted_score:  health.score,
      follow_up_at:     followUpAt.toISOString(),
    });
  }

  // General dasha-event follow-up (always — based on current dasha analysis)
  if (aiAnalysis?.vedic_analysis?.dasha_hint) {
    rows.push({
      user_id:          userId,
      kundli_id:        kundliId,
      prediction_id:    predictionId,
      prediction_type:  'dasha_event',
      prediction_text:  aiAnalysis.vedic_analysis.dasha_hint.slice(0, 200),
      predicted_window: factSheet.currentDashaLordHint || 'वर्तमान दशा काल',
      dasha_context:    factSheet.currentDashaLordHint,
      predicted_score:  null,
      follow_up_at:     followUpAt.toISOString(),
    });
  }

  if (rows.length === 0) return;

  try {
    await supabase.from('outcome_tracking').insert(rows);
    console.log(`[OutcomeTracking] Scheduled ${rows.length} follow-up(s) for kundli ${kundliId}`);
  } catch (e) {
    console.warn('[OutcomeTracking] Failed to schedule follow-ups (non-fatal):', e.message);
  }
}

// ── Get the single highest-priority pending follow-up for a user ──
// Called at chat init — if a follow-up is due, we surface it in chat
// naturally rather than as a separate notification.
export async function getPendingFollowUp(supabase, userId) {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('outcome_tracking')
    .select('*')
    .eq('user_id', userId)
    .is('outcome', null)          // not yet answered
    .lte('follow_up_at', now)     // due now or overdue
    .lte('reminder_count', 2)     // don't spam — max 3 attempts
    .order('follow_up_at', { ascending: true }) // oldest first
    .limit(1)
    .maybeSingle();

  return data || null;
}

// ── Mark a follow-up as asked (so we don't ask it again this session) ──
export async function markFollowUpAsked(supabase, followUpId) {
  await supabase
    .from('outcome_tracking')
    .update({
      asked_at:       new Date().toISOString(),
      reminder_count: supabase.rpc ? undefined : undefined, // increment handled below
    })
    .eq('id', followUpId);

  // Increment reminder_count separately (Supabase doesn't support += in update)
  await supabase.rpc('increment_reminder_count', { row_id: followUpId })
    .catch(() => null); // non-fatal if RPC doesn't exist yet
}

// ── Record a user's outcome answer ────────────────────────────
export async function recordOutcome(supabase, followUpId, outcome, outcomeNote) {
  if (!['confirmed','denied','partial','skipped'].includes(outcome)) return;

  await supabase
    .from('outcome_tracking')
    .update({
      outcome:              outcome,
      outcome_note:         outcomeNote || null,
      outcome_recorded_at:  new Date().toISOString(),
    })
    .eq('id', followUpId);

  console.log(`[OutcomeTracking] Recorded outcome '${outcome}' for follow-up ${followUpId}`);
}

// ── Build the follow-up question text to show the user in chat ──
export function buildFollowUpQuestion(followUp) {
  const typeMap = {
    career:      'करियर',
    marriage:    'विवाह/संबंध',
    health:      'स्वास्थ्य',
    dasha_event: 'जीवन',
  };
  const area = typeMap[followUp.prediction_type] || 'जीवन';
  const window = followUp.predicted_window;

  return `🔮 **${window}** के बारे में एक सवाल — आपकी कुंडली में ${area} को लेकर जो देखा था: "${followUp.prediction_text.slice(0, 120)}" — क्या यह सच हुआ? (हाँ / नहीं / थोड़ा-बहुत)`;
}

// ── Get user's accuracy summary ───────────────────────────────
export async function getUserAccuracy(supabase, userId) {
  const { data } = await supabase
    .from('user_accuracy_summary')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}
