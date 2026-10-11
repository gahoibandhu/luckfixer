import { redirect } from 'next/navigation';
import PanchangView from '@/components/PanchangView';
import { todayIST } from '@/lib/rashifal';

export const metadata = {
  title: 'आज का पंचांग — तिथि, नक्षत्र, योग, राहुकाल, चौघड़िया | Daily Panchang',
  description: 'अपने शहर का आज का पंचांग: तिथि, नक्षत्र, योग, करण, सूर्योदय-सूर्यास्त, राहुकाल, यमगण्ड, गुलिक, अभिजित मुहूर्त और दिन का चौघड़िया। Daily panchang with exact tithi, nakshatra, yoga and karana timings.',
  alternates: { canonical: '/panchang' },
};

export default async function PanchangPage({ searchParams }) {
  const sp = await searchParams;
  const city = typeof sp?.city === 'string' && sp.city ? `?city=${encodeURIComponent(sp.city)}` : '';
  // old links (?date=YYYY-MM-DD) and the date form go to the clean path URL
  if (/^\d{4}-\d{2}-\d{2}$/.test(sp?.date || '')) redirect(`/panchang/${sp.date}${city}`);
  return <PanchangView iso={todayIST().iso} citySlug={sp?.city} />;
}
