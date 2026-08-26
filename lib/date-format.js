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
