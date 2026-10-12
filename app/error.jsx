'use client';
// Route-level safety net: if a page throws while rendering or updating, show this instead of a blank screen.
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => { console.error('[app error]', error); }, [error]);
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '2rem', textAlign: 'center', color: 'var(--color-text-primary, #f1efe8)' }}>
      <p style={{ fontSize: '40px', margin: 0 }} aria-hidden="true">🪔</p>
      <h1 style={{ fontSize: '20px', margin: 0 }}>कुछ गड़बड़ हो गई / Something went wrong</h1>
      <p style={{ fontSize: '14px', margin: 0, maxWidth: '420px', lineHeight: 1.7, opacity: 0.8 }}>
        पेज दोबारा लोड करके देखें। अगर समस्या बनी रहे तो हमें बताएँ।<br />Please reload the page. If it keeps happening, let us know.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
        <button type="button" onClick={() => reset()} style={{ padding: '10px 18px', borderRadius: '10px', border: 0, background: '#f0a81c', color: '#251a00', fontWeight: 700, cursor: 'pointer' }}>दोबारा कोशिश / Try again</button>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>रीलोड / Reload</button>
      </div>
    </div>
  );
}
