# Month view for festivals + Pradosh / Purnima / Amavasya / Sankashti series (overlay on astrobharat-shiv-chalisa.zip)

1 /tyohar now shows, for every month, a calendar GRID (festival names in the cells, weekday headers) above the list; list cards show the weekday for single days and
  "Sat - Tue" style for multi-day festivals; a button opens the full calendar filtered to festivals; ICS button. The grid is a shared component (components/MonthGrid.jsx) also used by /calendar.
2 New pages: /pradosh (+ /pradosh/som, /bhauma, /shani), /purnima (+ 13 month pages incl. adhik), /amavasya (Somvati / Shani marked, festival tags), /sankashti (Angarki marked).
  Every row: weekday + date, tithi window (IST), and Delhi times (Pradosh Kaal / moonrise). The calendar now shows the real names ("Som Pradosh", "Ashadha Purnima",
  "Angarki Sankashti Chaturthi") and links to these pages; Sankashti is a new filter chip; a Sankashti search card was added; sitemap updated.
3 Sankashti is computed here with astronomy-engine (moonrise + tithi, Delhi) by scripts/generate/sankashti.mjs -> lib/sankashti-data.js (37 days 2026-2028; the script is not part of the site and needs  npm i -D astronomy-engine  only if you regenerate).
  Rule: Krishna Chaturthi present at moonrise; if it falls between two moonrises, the day with the most evening coverage; if present at moonrise on two days both are listed and the page says so.
  Independent check: all 6 Karwa Chauth / Sakat Chauth dates (computed by your other pipeline) are exact Sankashti days here. Other months use the same method but have no second source - confirm 2-3 against a printed panchang.
4 Golden check (scripts/audit/calendar-check.mjs) now also verifies yearly counts, month assignment, Purnima-festival windows and the Karwa/Sakat agreement. Passes.
5 lib/lunar-months.js (new) + lib/ekadashi.js (refactored to use it) were never shipped in an earlier zip - they are included here. Ekadashi schedule verified identical before/after.
Not tested here: nothing beyond local build + browser checks. No SQL, no npm install.
