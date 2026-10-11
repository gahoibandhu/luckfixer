# Phase 1 (part 2) - day page, overlay on luckfixer2-phase1-calendar

New:     app/panchang/[date]/page.jsx   -> /panchang/2026-11-08 (own title, description, canonical; noindex outside 2026-2028)
         components/PanchangView.jsx    -> the panchang layout, now shared by /panchang and the day pages
Changed: app/panchang/page.jsx          -> today's panchang; old ?date= links redirect to the path URL
         app/calendar/page.jsx          -> dates link to /panchang/<date>
         app/sitemap.ts                 -> next 90 day pages + calendar pages
Added on the day page: "Fasts and festivals on this day" block, "See the whole month" link, WhatsApp share text.
No npm install, no SQL migration. Apply AFTER the phase0 and phase1-calendar zips (sitemap.ts here includes both).
