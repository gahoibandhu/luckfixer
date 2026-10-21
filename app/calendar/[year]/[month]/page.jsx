import { notFound } from 'next/navigation';
import HinduMonth from '@/components/HinduMonth';
import { CAL_RANGE } from '@/lib/calendar-events';
import { MON } from '@/lib/calendar-month';

// All 36 months (2026–2028) are built ahead of time. Anything else is a 404 — no per-request rendering, and a fixed, small set of URLs.
export const dynamicParams = false;

export function generateStaticParams() {
  const [y0, y1] = CAL_RANGE, out = [];
  for (let y = y0; y <= y1; y++) for (let m = 1; m <= 12; m++) out.push({ year: String(y), month: String(m) });
  return out;
}

export async function generateMetadata({ params }) {
  const { year, month } = await params;
  const m = Number(month);
  const mn = MON[m - 1] || ['', ''];
  return {
    title: `हिंदू कैलेंडर ${mn[0]} ${year} — तिथि, नक्षत्र, व्रत-त्योहार | Hindu Calendar ${mn[1]} ${year}`,
    description: `${mn[0]} ${year} का हिंदू कैलेंडर: हर दिन की तिथि, नक्षत्र, एकादशी, प्रदोष, पूर्णिमा, अमावस्या और त्योहार। Hindu calendar for ${mn[1]} ${year} with tithi, nakshatra, fasts and festivals for every day.`,
    alternates: { canonical: `/calendar/${year}/${m}` },
  };
}

export default async function CalendarMonthPage({ params }) {
  const { year, month } = await params;
  const y = Number(year), m = Number(month), [y0, y1] = CAL_RANGE;
  if (!Number.isInteger(y) || !Number.isInteger(m) || y < y0 || y > y1 || m < 1 || m > 12) notFound();
  return <HinduMonth year={y} month={m} />;
}
