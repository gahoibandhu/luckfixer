import PublicShell from '@/components/PublicShell';
import Bi from '@/components/Bi';
import ManglikChecker from '@/components/ManglikChecker';

export const metadata = {
  title: 'मांगलिक दोष जाँच — मंगल दोष कैलकुलेटर | Manglik Dosha Check',
  description: 'जन्म तिथि, समय और स्थान से जानें कि मंगल लग्न और चंद्रमा से किस भाव में है और मांगलिक संकेत है या नहीं। Basic Manglik check with Mars house from Lagna and Moon.',
  alternates: { canonical: '/manglik' },
};

export default function Manglik() {
  return (
    <PublicShell>
      <h1 style={{ fontSize: '24px', margin: '0 0 6px', color: 'var(--color-text-primary)' }}><Bi hi="मांगलिक दोष जाँच" en="Manglik dosha check" /></h1>
      <p style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
        <Bi hi="मंगल जन्म-कुंडली में किस भाव में है, इससे मांगलिक संकेत देखा जाता है। इसके लिए जन्म का सही समय ज़रूरी है, क्योंकि लग्न हर लगभग दो घंटे में बदलता है।"
            en="The Manglik indication is read from the house Mars occupies in the birth chart. An accurate birth time is needed, because the lagna changes about every two hours." />
      </p>
      <ManglikChecker />
    </PublicShell>
  );
}
