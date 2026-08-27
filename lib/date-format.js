// lib/date-format.js
//
// Single shared helper to render ISO (yyyy-mm-dd) dates as dd-mm-yyyy
// for display. All internal date math/comparisons across the app
// (gochar-phal.js, varshaphal.js, saptahik-phal.js, KundliDetailPanel)
// continue to use ISO strings — this is a DISPLAY-ONLY formatter,
// applied at the last step before rendering to the user.

export function formatDateDDMMYYYY(isoDateStr) {
  if (!isoDateStr) return '';
  const datePart = String(isoDateStr).slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d || y.length !== 4) return isoDateStr; // not ISO — pass through unchanged
  return `${d}-${m}-${y}`;
}

// ── Hindi weekday name, matching the exact strings used in
// specialist-rules.js's LAL_KITAB_REMEDIES table (day: 'शनिवार' etc.)
// so remedy.day_of_week can be compared directly against "today".
const HINDI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

export function getHindiWeekday(date = new Date()) {
  return HINDI_WEEKDAYS[date.getDay()];
}

// ── Remedy time-window status (see migration_017) ──────────────────
// A remedy only has a start_date once the user has explicitly hit
// "शुरू करें" — before that it's 'not_started'. duration_days is
// user-set and editable, not asserted by the system.
export function getRemedyTimeStatus(remedy, today = new Date()) {
  if (!remedy.start_date) return { phase: 'not_started' };

  const start = new Date(remedy.start_date + 'T00:00:00');
  const todayMidnight = new Date(today.toISOString().slice(0, 10) + 'T00:00:00');

  if (!remedy.duration_days) {
    // No fixed duration — ongoing until the user marks it done.
    return { phase: 'active', daysRemaining: null };
  }

  const end = new Date(start);
  end.setDate(end.getDate() + remedy.duration_days);

  const daysRemaining = Math.ceil((end - todayMidnight) / 86400000);

  if (daysRemaining < 0) return { phase: 'expired', daysRemaining: 0 };
  return { phase: 'active', daysRemaining };
}
