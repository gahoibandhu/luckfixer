// lib/kundli-form-validation.js
//
// Single source of truth for "is this add-kundli form actually
// complete" — used by BOTH app/profile/page.jsx (multi-step wizard)
// and app/chat/page.jsx (single-page inline form) so the two forms
// can never silently drift out of sync on what's required.
//
// Returns an array of { field, label } for every missing/invalid
// required field, empty array if the form is complete. Callers show
// this list in a popup at submit time rather than relying only on
// per-step "disabled" buttons, which can still be bypassed (browser
// autofill, back/forward cache, a future edit that forgets to wire a
// disabled condition) — this is the actual last-line check.

export function getMissingKundliFields(k) {
  const missing = [];
  if (!k.full_name || !k.full_name.trim()) missing.push({ field: 'full_name', label: 'पूरा नाम' });
  if (!k.dob) missing.push({ field: 'dob', label: 'जन्म तिथि' });
  if (!k.birth_time) missing.push({ field: 'birth_time', label: 'जन्म समय' });
  if (!k.gender) missing.push({ field: 'gender', label: 'लिंग' });
  if (!k.birth_place || !k.birth_place.trim()) {
    missing.push({ field: 'birth_place', label: 'जन्म स्थान' });
  } else if (!k.latitude || !k.longitude) {
    // Place was typed but never resolved to coordinates (didn't press
    // "खोजें" / didn't pick a result / geocode failed silently).
    missing.push({ field: 'birth_place', label: 'जन्म स्थान (Location खोजें और चुनें)' });
  }
  return missing;
}
