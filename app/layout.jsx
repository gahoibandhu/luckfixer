// app/layout.jsx
import './globals.css';

const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';
const SITE_URL = 'https://luckfix.netlify.app';
const DESCRIPTION = 'Vedic, Lal Kitab, Nadi और Hora — चार प्रणालियों पर आधारित आपका व्यक्तिगत जीवन-सुधार AI इंजन। अपनी कुंडली का गहन विश्लेषण और सटीक उपाय पाएं।';

export const metadata = {
  title: 'Luckfixer 2.0',
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Luckfixer 2.0',
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
  icons: {
    icon: LOGO_URL,
    apple: LOGO_URL,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
