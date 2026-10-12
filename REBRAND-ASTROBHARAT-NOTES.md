# Rebrand: Luckfixer -> AstroBharat (overlay on phase1-search-domain)

Changed: every visible name (page titles, OG/Twitter cards, PWA manifest + offline page, login/chat/admin/support/milan/numerology text,
email display name + alt text, AI prompts and OpenRouter X-Title, geocoder User-Agent). lib/brand.js name = 'AstroBharat'.
Service-worker cache renamed (astrobharat-v1) so phones pick up the new name and icons.

Deliberately NOT renamed (invisible, renaming risks breakage): function/constant names (getLuckfixerResponse ...), database tables/keys,
package.json name, CSS class prefix lf-, comments.

Do these yourself:
 1. Admin panel -> bot name setting: it is stored in the database and overrides the code default, so set it to "AstroBharat"
    (the AI introduces itself with this name).
 2. Logo: upload the AstroBharat logo to the SAME Cloudinary link used in lib/brand.js (or send the new link) - favicon, emails, share cards read it.
 3. Google Cloud -> OAuth consent screen: change the app name (users see it on "Sign in with Google").
 4. Supabase -> Authentication -> Email templates / SMTP sender name: still say Luckfixer until you change them there (OTP e-mail).
 5. Set NEXT_PUBLIC_SITE_URL=https://astrobharat.in in Vercel once the domain is live (canonical/OG/sitemap still use the old address until then).
 6. Email sender address (lib/notifications.js) is unchanged: verify astrobharat.in with your mail provider before switching it.
