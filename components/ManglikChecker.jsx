'use client';
import { useState } from 'react';
import Link from 'next/link';
import BirthForm from '@/components/BirthForm';
import { useUiLang } from '@/lib/i18n';

const card = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px' };
const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];   // the common rule; some traditions leave out the 2nd house

export default function ManglikChecker() {
  const en = useUiLang() === 'en';
  const [busy, setBusy] = useState(false), [res, setRes] = useState(null), [err, setErr] = useState('');
  async function run(v) {
    setBusy(true); setErr(''); setRes(null);
    try {
      const r = await fetch('/api/public/sky', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      const d = await r.json();
      if (!r.ok) setErr(d.error || 'Error'); else setRes(d);
    } catch { setErr(en ? 'Could not reach the server' : 'सर्वर से संपर्क नहीं हो पाया'); }
    setBusy(false);
  }
  const hl = res?.marsHouseFromLagna, hm = res?.marsHouseFromMoon;
  const byLagna = hl ? MANGLIK_HOUSES.includes(hl) : null, byMoon = MANGLIK_HOUSES.includes(hm);
  return (
    <div>
      <div style={{ ...card, marginBottom: '14px' }}>
        <BirthForm onSubmit={run} busy={busy} timeRequired submitLabel={en ? 'Check Manglik' : 'मांगलिक जाँचें'} />
      </div>
      {err && <p style={{ ...card, color: 'var(--color-text-danger)', fontSize: '14px' }}>{err}</p>}
      {res && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={card}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{en ? 'Mars from the Lagna (main method)' : 'लग्न से मंगल (मुख्य विधि)'}</div>
            <div style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0', color: byLagna ? 'var(--color-text-warning)' : 'var(--color-text-success)' }}>
              {en ? `Mars is in house ${hl} — ${byLagna ? 'Manglik indication' : 'no Manglik indication'}` : `मंगल ${hl}वें भाव में — ${byLagna ? 'मांगलिक संकेत' : 'मांगलिक संकेत नहीं'}`}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{en ? `From the Moon: house ${hm} — ${byMoon ? 'indicates' : 'does not indicate'} Manglik.` : `चंद्रमा से: ${hm}वाँ भाव — ${byMoon ? 'संकेत है' : 'संकेत नहीं'}।`}</div>
          </div>
          <p style={{ ...card, margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>
            {en
              ? 'Common rule used: Mars in the 1st, 2nd, 4th, 7th, 8th or 12th house. Traditions differ (some omit the 2nd house), and several cancellations exist — Mars in its own or exalted sign, aspects from Jupiter, a Manglik partner, age beyond 28 and more. Only a full chart can judge these. This is a basic indication, not a verdict, and should never be the sole basis of a marriage decision.'
              : 'प्रयुक्त सामान्य नियम: मंगल लग्न से 1, 2, 4, 7, 8 या 12वें भाव में। परंपराओं में अंतर है (कुछ 2रा भाव नहीं गिनते) और कई परिहार भी हैं — मंगल का स्वराशि/उच्च होना, गुरु की दृष्टि, जीवनसाथी का मांगलिक होना, 28 वर्ष के बाद आदि। इन्हें केवल पूरी कुंडली से परखा जा सकता है। यह एक बुनियादी संकेत है, अंतिम निर्णय नहीं, और इसे विवाह के निर्णय का एकमात्र आधार न बनाएँ।'}
          </p>
          <div style={{ ...card, background: 'var(--color-background-info)' }}>
            <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-info)' }}>{en ? '→ Get the full chart with cancellation checks' : '→ परिहार सहित पूरी कुंडली देखें'}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
