import { redirect, notFound } from 'next/navigation';
import { CAL_RANGE } from '@/lib/calendar-events';

// /calendar/2027 → January of that year (kept so a hand-typed or old year link still lands somewhere useful)
export const dynamicParams = false;
export function generateStaticParams() {
  const [y0, y1] = CAL_RANGE;
  return Array.from({ length: y1 - y0 + 1 }, (_, i) => ({ year: String(y0 + i) }));
}
export default async function CalendarYearPage({ params }) {
  const { year } = await params;
  const y = Number(year), [y0, y1] = CAL_RANGE;
  if (!Number.isInteger(y) || y < y0 || y > y1) notFound();
  redirect(`/calendar/${y}/1`);
}
