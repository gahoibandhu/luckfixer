import PageHero from '@/components/PageHero';
import PublicShell from '@/components/PublicShell';
import Bi from '@/components/Bi';
import LibrarySearch from '@/components/LibrarySearch';
import { buildLibrary } from '@/lib/library';

export const metadata = {
  title: 'चालीसा, आरती, व्रत कथा और पूजा विधि खोजें | Search Chalisa, Aarti, Vrat Katha, Pooja Vidhi',
  description: 'हनुमान चालीसा, आरती, एकादशी और अन्य व्रत की कथा, पूजा विधि — खोजें, पढ़ें और WhatsApp पर शेयर करें। Hindi या Roman में लिखकर खोजें।',
  alternates: { canonical: '/search' },
};

export default function SearchPage() {
  const items = buildLibrary();
  return (
    <PublicShell>
      <PageHero glyph="🔍" title={<Bi hi="चालीसा, कथा और पूजा विधि खोजें" en="Search chalisa, katha and pooja vidhi" />}
        sub={<Bi hi="हर चालीसा, आरती, व्रत कथा और पूजा विधि एक ही कार्ड में — पूरा पाठ पढ़ें और सीधे WhatsApp पर शेयर करें।" en="Every chalisa, aarti, vrat katha and pooja vidhi in one card — read the full text and share it straight to WhatsApp." />} />
      <LibrarySearch items={items} />
    </PublicShell>
  );
}
