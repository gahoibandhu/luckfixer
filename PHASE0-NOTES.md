# Phase 0 update (overlay on luckfixer2-revamp-v8)

New: proxy.js (Next 16 name for middleware), components/ChatLink.jsx
Changed: app/page.jsx, app/layout.jsx, app/login/page.jsx, app/panchang/page.jsx, app/tools/page.jsx,
         app/rashifal/[sign]/page.jsx, components/PublicShell.jsx, lib/date-format.js, package.json

Deploy: copy over the project, run `npm install` (adds @vercel/analytics 2.0.1), push to GitHub.
Then in Vercel -> project -> Analytics tab -> Enable. No SQL migration needed.
