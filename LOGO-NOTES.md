# AstroBharat logo wired in (overlay on astrobharat-rebrand)

public/brand/  logo-mark-64/128/256/512.png (transparent rounded mark), icon-192/512.png, icon-maskable-512.png, apple-touch-icon.png,
               favicon-256.png, og-share.png (1200x630), logo-full-light.png, logo-compact-light.png
public/favicon.ico, manifest.json (new icons, navy splash), offline.html (logo inlined - shows with no network)
lib/brand.js: logo, ogImage, logoFull now point to /brand/... (own domain, no Cloudinary).  All pages read BRAND.logo.
layout.jsx: favicon, apple-touch icon, WhatsApp/Facebook/Twitter share image.  notifications.js: e-mail logo = <site>/brand/logo-mark-128.png
app/api/icon: old route kept as a redirect for phones that installed the old app.
globals.css: logo styling (no white box / gold ring behind the new mark) + FIX: home hero text touched the screen edge on phones (.pub-hero-grid side padding).

Source sheet is 1254px, so the 512 icon is an upscale of a ~240px tile. For crisp icons send the original vector/PNG (>=1024px) and I will regenerate in one step.
After deploy: remove & re-add the home-screen app once on a test phone; share a link in WhatsApp (it caches old previews - use a new URL or the Facebook Sharing Debugger to refresh).
