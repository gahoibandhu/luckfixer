# Phase 1 (part 1) - Hindu calendar, overlay on luckfixer2-phase0

New:     app/calendar/page.jsx (Year / Month / List views, type filters, tap a date -> /panchang?date=)
         app/calendar/ics/route.js (ICS export, hi/en, filter-aware)
         lib/calendar-events.js (one event list built from festival-data, vrat-data, sankrantis)
         scripts/audit/calendar-check.mjs (golden check vs PUBLISHED_2026)
Changed: components/PublicShell.jsx (Calendar in top menu), app/tools/page.jsx (Calendar card), app/sitemap.ts

No npm install, no SQL migration. Dates cover 2026-2028, Delhi reference (same data as /tyohar and /vrat-calendar).
