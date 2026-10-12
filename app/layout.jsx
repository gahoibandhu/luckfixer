// app/layout.jsx
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import BottomNav from '@/components/BottomNav';
import SessionMark from '@/components/SessionMark';
import AppTopBar from '@/components/AppTopBar';
import { Analytics } from '@vercel/analytics/next';
import { BRAND } from '@/lib/brand';

const LOGO_URL = BRAND.ogImage;
const SITE_URL = BRAND.site;
const DESCRIPTION = 'AI ज्योतिषी से सीधे चैट करें — शादी, करियर, स्वास्थ्य, पैसा, हर सवाल का जवाब पाएं। Parashari, Lal Kitab और Jaimini — तीन शास्त्रीय प्रणालियों पर आधारित सटीक कुंडली विश्लेषण, दशा भविष्य, कुंडली मिलान और उपाय — सभी के लिए, बिल्कुल मुफ्त।';

export const metadata = {
  title: { default: 'AstroBharat — AI ज्योतिष Chat | कुंडली विश्लेषण', template: '%s | AstroBharat' },
  description: DESCRIPTION,
  keywords: ['AI ज्योतिष चैट', 'ज्योतिष चैटबॉट', 'कुंडली', 'जन्म कुंडली', 'वैदिक ज्योतिष', 'लाल किताब', 'जैमिनी ज्योतिष', 'कुंडली मिलान', 'अष्टकूट', 'दशा भविष्य', 'AI Astrology Chat', 'Astrology Chatbot', 'Vedic Astrology India', 'Kundli Online', 'Kundli Milan', 'Ask Astrologer Online'],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AstroBharat',
  },
  openGraph: {
    title: 'AstroBharat — AI ज्योतिषी से चैट करें',
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'AstroBharat',
    images: [{ url: LOGO_URL, width: 1200, height: 630, alt: 'AstroBharat — AI ज्योतिष Chat' }],
    type: 'website',
    locale: 'hi_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AstroBharat — AI ज्योतिषी से चैट करें',
    description: DESCRIPTION,
    images: [LOGO_URL],
  },
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0d0d0f',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <head>
        {/* Preconnect to external resources for faster load */}
        <link rel="preconnect" href="https://jdxrwbhspautnqetjlhg.supabase.co" />
        {/* Preload the logo so it renders instantly on all pages */}
        <link rel="preload" href={LOGO_URL} as="image" />
        {/* Devanagari font subset — only Latin+Devanagari, no CJK */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0 }}>
        <PwaRegister />
        <SessionMark />
        <AppTopBar />
        {children}
        <BottomNav />
        <Analytics />
      </body>
    </html>
  );
}

