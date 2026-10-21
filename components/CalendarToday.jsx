'use client';
// components/CalendarToday.jsx — the month pages are pre-built (static), so "today" is marked in the browser, not on the server.
// Marks today's cell (IST). On /calendar it also moves to the right month if the pre-built page is from the previous month.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CalendarToday({ year, month, isIndex = false, y0, y1 }) {
  const router = useRouter();
  useEffect(() => {
    const t = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());   // YYYY-MM-DD in IST
    const ty = Number(t.slice(0, 4)), tm = Number(t.slice(5, 7));
    if (isIndex && (ty !== year || tm !== month) && ty >= y0 && ty <= y1) { router.replace(`/calendar/${ty}/${tm}`); return; }
    document.querySelector(`[data-d="${t}"]`)?.setAttribute('data-today', '1');
  }, [year, month, isIndex, y0, y1, router]);
  return null;
}
