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
