import LegalPage from '@/components/LegalPage';
import { BRAND } from '@/lib/brand';
export const metadata = { title: `Privacy Policy | गोपनीयता नीति — ${BRAND.name}`, description: `What data ${BRAND.name} collects, why, who processes it and your choices.`, alternates: { canonical: '/privacy' } };
export default function Privacy() {
  return (
    <LegalPage titleHi="गोपनीयता नीति" titleEn="Privacy Policy" updated="Updated October 2026"
      summaryHi="सार: मुफ़्त सार्वजनिक टूल में आपका जन्म-विवरण सहेजा नहीं जाता। लॉगिन करने पर आपकी कुंडली, चैट और खाते की जानकारी सहेजी जाती है और जवाब बनाने के लिए तीसरे पक्ष की AI सेवाओं को भेजी जा सकती है। आप अपनी कुंडलियाँ और चैट ऐप में हटा सकते हैं।"
      sections={[
        { h: 'Free public tools (no login)', p: ['When you use tools such as My Rashi, Manglik check, Panchang, Moolank, Sade Sati or Ram Shalaka, the details you enter are used only to produce your result. We do not store them. Moolank, Lo Shu, Sade Sati and Ram Shalaka run in your browser. For My Rashi and Manglik, your date, time and place of birth are sent to our server to calculate the result and are not saved.', 'To limit abuse we keep a short-lived, in-memory count of requests per IP address. It is not written to a database. If you search for a place, the text you type is sent through our server to the OpenStreetMap Nominatim service.'] },
        { h: 'When you create an account', p: ['You can sign in with Google or with an email one-time code. We then store:'], ul: ['your email address, and the name and picture from your sign-in provider if available; mobile number if you add it;', 'the kundlis you create: name, date, time and place of birth, gender, optional marital and children details, life events you enter, and the generated chart and analysis;', 'your chats: messages and the replies produced;', 'usage information: number of chats, time used and an estimate of AI tokens;', 'ratings, feedback and support messages you send;', 'remedies you choose to track.'] },
        { h: 'AI processing', p: ['To answer your questions we send your messages and the relevant kundli details to third-party AI providers (for example Google Gemini and Groq, and fallback providers). They process that content under their own terms. We ask them only to explain your chart; please do not enter sensitive details you do not want processed this way.'] },
        { h: 'Who else handles data', p: ['We use Supabase (database and sign-in), a hosting provider for the website, and a separate service that calculates planetary positions. Birth details sent for calculation are used for that purpose.'] },
        { h: 'Review by our team', p: ['Our administrators can view chat sessions and support messages to keep the service safe, fix problems and improve answers. When you delete a chat from your own list, a copy may be retained by us for safety and audit purposes.'] },
        { h: 'Cookies and local storage', p: ['We use a sign-in session cookie and keep small preferences, such as your language, in your browser’s local storage. If we show advertising on our public pages, advertising partners such as Google may use cookies; we will ask for consent where the law requires it and explain the choices at that time.'] },
        { h: 'Your choices', ul: ['Delete your kundlis and chats inside the app.', 'Ask us to delete your account and associated data using the contact below.', 'Do not enter birth details of other people without their permission.', `${BRAND.name} is not meant for children under 18.`] },
        { h: 'Changes', p: ['We may update this policy and will change the date above when we do.'] },
      ]} />
  );
}
