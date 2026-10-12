// /calendar/ics?y=2026&t=ekadashi,tyohar — downloadable / subscribable iCalendar (all-day events, IST civil dates)
import { eventsForYear, matchesTypes, CAL_RANGE, TYPE_ORDER, addDays } from '@/lib/calendar-events';
import { BRAND } from '@/lib/brand';

export const dynamic = 'force-dynamic';
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const ymd = (iso) => iso.replace(/-/g, '');

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const [y0, y1] = CAL_RANGE;
  const wanted = sp.get('y') === 'all' ? null : Number(sp.get('y'));
  const years = wanted && wanted >= y0 && wanted <= y1 ? [wanted] : Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
  const types = (sp.get('t') || '').split(',').filter(t => TYPE_ORDER.includes(t));
  const lang = sp.get('l') === 'en' ? 'en' : 'hi';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${BRAND.name}//Hindu calendar//${lang.toUpperCase()}`, 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(BRAND.name + (lang === 'en' ? ' — Hindu calendar' : ' — हिंदू कैलेंडर'))}`];
  for (const y of years) for (const e of eventsForYear(y)) {
    if (!matchesTypes(e, types)) continue;
    lines.push('BEGIN:VEVENT',
      `UID:${ymd(e.date)}-${e.type}-${esc(e.en).replace(/[^A-Za-z0-9]/g, '').toLowerCase()}@${new URL(req.url).host}`,
      `DTSTAMP:20260101T000000Z`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(e.to, 1))}`,
      `SUMMARY:${esc(e[lang])}`,
      `DESCRIPTION:${esc((lang === 'en' ? 'Computed by ' : 'गणना: ') + BRAND.name + (lang === 'en' ? ' for Delhi (IST). Please confirm with your local panchang or pandit.' : ' — दिल्ली (IST) के लिए। कृपया अपने स्थानीय पंचांग या पंडित से पुष्टि करें।'))}`,
      'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="hindu-calendar.ics"', 'Cache-Control': 'public, s-maxage=86400' },
  });
}
