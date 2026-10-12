# Fix: chat crash "removeChild ... not a child of this node" + og-share preload warning (overlay on the Ekadashi-katha zip)

Cause 1 (crash, /chat): TypewriterText rendered a bare text node + a cursor <span> that React adds/removes. When a browser/extension (Chrome translate
  is the usual one - the page is lang="hi") replaces that text node, React's removeChild throws and the whole page goes blank.
  Reproduced in a test page: the old structure throws the identical error; the new structure does not.
  Fix: text always lives inside stable <span translate="no"> wrappers; the cursor is always present and only shown/hidden with CSS.
Cause 2: no error boundary existed, so any such error = blank screen. Added app/error.jsx and app/global-error.jsx (try-again / reload screen).
Cause 3: in the logo update I pointed the preload at the 1200x630 share image by mistake. layout.jsx now preloads the small header logo;
  the share image is used only for og:image / twitter.
Also: html translate="no" + <meta name="google" content="notranslate"> (the site has its own Hindi/English switch),
  and the home page now has og:image too (it was missing).

Files: app/chat/page.jsx, app/layout.jsx, app/error.jsx (new), app/global-error.jsx (new), app/page.jsx
