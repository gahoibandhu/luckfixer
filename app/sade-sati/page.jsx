import PageHero from '@/components/PageHero';
import PublicShell from '@/components/PublicShell';
import Bi from '@/components/Bi';
import SadeSatiChecker from '@/components/SadeSatiChecker';

export const metadata = {
  title: 'साढ़ेसाती और ढैया जाँच — तारीखों सहित | Sade Sati & Dhaiya Checker',
  description: 'अपनी राशि चुनें और जानें कि साढ़ेसाती या शनि की ढैया आज चल रही है या नहीं, और अगला चक्र कब से कब तक है। Sade Sati and Dhaiya dates from Saturn’s real transit.',
  alternates: { canonical: '/sade-sati' },
};

export default function SadeSati() {
  return (
    <PublicShell>
      <PageHero glyph="♄"
        title={<><Bi hi="साढ़ेसाती और ढैया जाँच" en="Sade Sati & Dhaiya checker" /></>}
        sub={<><Bi hi="शनि के असली गोचर (निरयन/लाहिड़ी राशि) के आधार पर तारीखें निकाली गई हैं। अपनी चंद्र राशि चुनें।" en="Dates are worked out from Saturn’s actual transit (sidereal / Lahiri signs). Pick your Moon sign." /></>} />
      <SadeSatiChecker />
    </PublicShell>
  );
}
