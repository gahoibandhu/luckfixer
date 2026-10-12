# Search cards + domain switch (overlay on phase1-ekadashi)

## 1. Search: /search  (chalisa, aarti, vrat katha, pooja vidhi - one shareable card each)
New:     app/search/page.jsx, components/LibrarySearch.jsx, components/LibraryCard.jsx,
         lib/library.js (builds 44 cards from aarti.js, vrat-guides.js, ekadashi-content.js - nothing copied by hand),
         lib/library-types.js, lib/library-search.js (ranking), lib/search-normalize.js (Hindi + Roman matching)
Changed: components/PublicShell.jsx (search icon in the header), app/tools/page.jsx, app/sitemap.ts,
         app/vrat/[slug]/page.jsx (#vidhi and #katha anchors, so card links land on the right section)
Card: type badge, deity/day, preview -> "Read full" expands in place, Share: WhatsApp (title + opening + link),
      phone share sheet (full text), Copy text, Copy link, Open page. Deep link: /search?id=chalisa:hanuman-chalisa
Add a new text later = add it to its data file; it appears in search automatically.

## 2. Domain: astrobharat.in
Changed: lib/brand.js (site + host now come from NEXT_PUBLIC_SITE_URL), app/layout.jsx, app/robots.ts,
         components/PanchangView.jsx, app/milan/page.jsx, app/login/page.jsx
Default stays https://luckfixer.jaigahoi.in until you set the variable - nothing changes on deploy.
NOT changed (needs your decision/DNS): lib/notifications.js (sender address + e-mail links), app/globals.css line 293 (print footer text).

Switch checklist, in this order:
 1. Vercel -> Project -> Settings -> Domains: add astrobharat.in (and www.astrobharat.in). Add the DNS records Vercel shows at your registrar.
 2. When the domain shows "Valid": Vercel -> Environment Variables: NEXT_PUBLIC_SITE_URL = https://astrobharat.in -> redeploy.
 3. Supabase -> Authentication -> URL Configuration: Site URL = https://astrobharat.in ; add https://astrobharat.in/auth/callback
    (and the www one) to Redirect URLs. Keep the old callback listed until the old domain is retired.
 4. Google Cloud OAuth client: confirm the redirect URI is still your Supabase callback (it normally is); add astrobharat.in
    under authorized origins if your client lists origins.
 5. Vercel Domains: set the old luckfixer.jaigahoi.in to redirect (301) to astrobharat.in, so links already shared keep working.
 6. Search Console: add astrobharat.in as a new property (DNS TXT), submit https://astrobharat.in/sitemap.xml.
 7. E-mail (lib/notifications.js): to send from @astrobharat.in, verify the domain with your mail provider (SPF/DKIM) first, then update FROM_EMAIL and the links.
Test after step 2: log in, refresh, open /search, share a card to WhatsApp and check the link shows astrobharat.in.
