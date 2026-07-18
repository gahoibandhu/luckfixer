// app/layout.jsx
import './globals.css';
import PwaRegister from '@/components/PwaRegister';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';
const SITE_URL = 'https://luckfixer.jaigahoi.in';
const DESCRIPTION = 'Parashari, Lal Kitab और Jaimini — तीन शास्त्रीय प्रणालियों पर आधारित AI ज्योतिष इंजन। कुंडली विश्लेषण, दशा भविष्य, कुंडली मिलान और सटीक उपाय — सभी के लिए।';

export const metadata = {
  title: { default: 'Luckfixer 2.0 — वैदिक ज्योतिष AI', template: '%s | Luckfixer 2.0' },
  description: DESCRIPTION,
  keywords: ['कुंडली', 'जन्म कुंडली', 'वैदिक ज्योतिष', 'लाल किताब', 'जैमिनी ज्योतिष', 'कुंडली मिलान', 'अष्टकूट', 'दशा भविष्य', 'AI Astrology', 'Vedic Astrology India', 'Kundli Online', 'Kundli Milan'],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Luckfixer',
  },
  openGraph: {
    title: 'Luckfixer 2.0 — वैदिक ज्योतिष AI',
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Luckfixer 2.0',
    images: [{ url: LOGO_URL, width: 512, height: 512, alt: 'Luckfixer 2.0' }],
    type: 'website',
    locale: 'hi_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luckfixer 2.0',
    description: DESCRIPTION,
    images: [LOGO_URL],
  },
  icons: { icon: LOGO_URL, apple: LOGO_URL },
};

export const viewport = {
  themeColor: '#0d0d0f',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <head>
        {/* Preconnect to external resources for faster load */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
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
        {children}
      </body>
    </html>
  );
}

