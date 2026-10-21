import HinduMonth from '@/components/HinduMonth';
import { todayIST } from '@/lib/rashifal';
import { CAL_RANGE } from '@/lib/calendar-events';

// /calendar = the current month. Built ahead of time and refreshed at most once an hour (no per-request work, no query parameters);
// the page itself also moves to the right month in the browser if the pre-built copy is from the previous month.
export const revalidate = 3600;

export const metadata = {
  title: 'हिंदू कैलेंडर — तिथि, नक्षत्र, व्रत, त्योहार | Hindu Calendar',
  description: 'हर दिन की तिथि, नक्षत्र और व्रत-त्योहार वाला हिंदू कैलेंडर — एकादशी, प्रदोष, पूर्णिमा, अमावस्या, संकष्टी। Google/Apple Calendar में जोड़ें। Monthly Hindu calendar with tithi, nakshatra, fasts and festivals for every day.',
  alternates: { canonical: '/calendar' },
};

export default function CalendarPage() {
  const [y0, y1] = CAL_RANGE;
  const t = todayIST().iso;
  let year = Number(t.slice(0, 4)), month = Number(t.slice(5, 7));
  if (year < y0) { year = y0; month = 1; } else if (year > y1) { year = y1; month = 12; }
  return <HinduMonth year={year} month={month} isIndex />;
}
