'use client';
// Last-resort boundary (replaces the root layout when the layout itself fails).
export default function GlobalError({ reset }) {
  return (
    <html lang="hi" translate="no">
      <body style={{ margin: 0, background: '#0d0d0f', color: '#f1efe8', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', margin: 0 }}>कुछ गड़बड़ हो गई / Something went wrong</h1>
          <p style={{ fontSize: '14px', margin: 0, opacity: 0.8 }}>पेज रीलोड करें / Please reload the page.</p>
          <button type="button" onClick={() => reset()} style={{ padding: '10px 18px', borderRadius: '10px', border: 0, background: '#f0a81c', color: '#251a00', fontWeight: 700, cursor: 'pointer' }}>दोबारा कोशिश / Try again</button>
        </div>
      </body>
    </html>
  );
}
