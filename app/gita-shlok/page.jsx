import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PublicShell, { card } from '@/components/PublicShell';
import Bi from '@/components/Bi';
import { GITA, gitaOfDay } from '@/lib/gita';
import { todayIST } from '@/lib/rashifal';

export const revalidate = 3600;
export const metadata = {
  title: 'आज का गीता श्लोक — अर्थ सहित | Bhagavad Gita Verse of the Day',
  description: 'रोज़ एक भगवद्गीता श्लोक, सरल हिंदी और English अर्थ के साथ। A Bhagavad Gita verse every day with a simple meaning.',
  alternates: { canonical: '/gita-shlok' },
};

export default function GitaShlok() {
  const { iso } = todayIST();
  const g = gitaOfDay(iso);
  return (
    <PublicShell>
      <PageHero glyph="☸"
        title={<><Bi hi="आज का गीता श्लोक" en="Gita verse of the day" /></>}
        sub={<>{iso} · <Bi hi="भगवद्गीता" en="Bhagavad Gita" /> {g.ref}</>} />
      <section style={{ ...card, marginBottom: '12px' }}>
        <p style={{ margin: 0, fontSize: '19px', lineHeight: 2, whiteSpace: 'pre-line', color: 'var(--color-text-primary)', textAlign: 'center' }}>{g.sa}</p>
      </section>
      <section style={{ ...card, marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi="सरल अर्थ" en="Simple meaning" /></h2>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}><Bi hi={g.hi} en={g.en} /></p>
      </section>
      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}><Bi hi="संस्कृत पाठ भगवद्गीता का मूल पाठ है। अर्थ इस साइट के लिए सरल शब्दों में लिखे गए भाव हैं, किसी प्रकाशित टीका का अनुवाद नहीं।" en="The Sanskrit is the original text of the Gita. The meanings are plain-word reflections written for this site, not a translation of any published commentary." /></p>
      <section style={{ ...card, marginTop: '12px' }}>
        <h2 style={{ fontSize: '14px', margin: '0 0 8px', color: 'var(--color-text-primary)' }}><Bi hi="और श्लोक" en="More verses" /></h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {GITA.map(v => <span key={v.ref} style={{ padding: '4px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: '999px' }}>{v.ref}</span>)}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '13px' }}><Link href="/aaj-ka-upay" style={{ color: 'var(--color-text-info)' }}><Bi hi="→ आज का उपाय देखें" en="→ See today’s practice" /></Link></p>
      </section>
    </PublicShell>
  );
}
