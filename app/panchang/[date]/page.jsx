import { notFound } from 'next/navigation';
import PanchangView from '@/components/PanchangView';
import { inRange } from '@/lib/panchang-engine';
import { VAAR } from '@/lib/public-content';
import { formatDateLong } from '@/lib/date-format';

const valid = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;

export async function generateMetadata({ params }) {
  const { date } = await params;
  if (!valid(date)) return {};
  const [y, m, d] = date.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return {
    title: `पंचांग ${formatDateLong(y, m, d, 'hi')} (${VAAR[wd].hi}) — तिथि, नक्षत्र, राहुकाल | Panchang ${formatDateLong(y, m, d, 'en')}`,
    description: `${formatDateLong(y, m, d, 'hi')} का पंचांग: तिथि, नक्षत्र, योग, करण, राहुकाल, अभिजित मुहूर्त, चौघड़िया और उस दिन के व्रत-त्योहार। Panchang for ${formatDateLong(y, m, d, 'en')}: tithi, nakshatra, Rahu Kaal, choghadiya and the day's fasts and festivals.`,
    alternates: { canonical: `/panchang/${date}` },
    robots: inRange(y) ? undefined : { index: false },
  };
}

export default async function PanchangDay({ params, searchParams }) {
  const { date } = await params;
  const sp = await searchParams;
  if (!valid(date)) notFound();
  return <PanchangView iso={date} citySlug={sp?.city} />;
}
