# Phase 1 (part 3) - Ekadashi series, overlay on phase1-daypage

New:     app/ekadashi/page.jsx            /ekadashi  (next Ekadashi, year list, all 24 by month)
         app/ekadashi/[slug]/page.jsx     26 pages: significance, short katha, 2026-2028 dates, pāraṇa window (static, SEO titles)
         lib/ekadashi.js                  names each Ekadashi in the vrat data (new moons + sankranti -> lunar month -> adhika detection)
         lib/ekadashi-content.js          26 short Hindi/English entries
         lib/ekadashi-parana.js           pāraṇa = next-day sunrise to Dwadashi end (Delhi)
Changed: lib/calendar-events.js (Ekadashis carry their real names; festival+fast = one event with `also` types),
         app/calendar/page.jsx, app/calendar/ics/route.js (type filter honours `also`),
         app/sitemap.ts (+27 URLs), app/tools/page.jsx (Ekadashi card), scripts/audit/calendar-check.mjs (+Ekadashi checks)
No npm install, no SQL migration. Apply after the daypage zip.
