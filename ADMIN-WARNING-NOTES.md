# Admin warning now shows the real cause (overlay on astrobharat-chat-rules-2.zip) - files: app/api/admin/stats/route.js, app/admin/page.jsx

Before: two labels were hard-wired as "model breakdown (run migration_026)" and "ai usage ledger (run migration_027)", and the banner always said
"migration_026 chalayein" - even when the query had merely timed out. With migrations already applied up to 027 that pointed at the wrong fix.
Now: the stats route returns warningDetails (label + the actual error text) and needsMigration (true ONLY when Postgres says a function/table does not exist).
The banner shows the first real error, says "database slow / not answering - refresh later and open /api/admin/health" for timeouts,
and the migration hint appears only when something is really missing. It also says when the numbers are the saved copy ("stale, N minutes old").
