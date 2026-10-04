import LegalPage from '@/components/LegalPage';
import { BRAND } from '@/lib/brand';
export const metadata = { title: `Terms of Use | नियम व शर्तें — ${BRAND.name}`, description: `The terms for using ${BRAND.name}.`, alternates: { canonical: '/terms' } };
export default function Terms() {
  return (
    <LegalPage titleHi="नियम व शर्तें" titleEn="Terms of Use" updated="Updated October 2026"
      summaryHi="सार: यह साइट सामान्य ज्योतिषीय मार्गदर्शन देती है, किसी परिणाम की गारंटी नहीं। इसे चिकित्सा, कानूनी या वित्तीय सलाह न मानें। साइट का दुरुपयोग न करें।"
      sections={[
        { h: 'Using the site', p: [`By using ${BRAND.name} you agree to these terms. If you do not agree, please do not use the site.`] },
        { h: 'Guidance, not advice', p: ['Content, calculations and AI replies are general guidance for reflection. We do not guarantee any outcome, and nothing here is medical, legal, financial or relationship advice. Make important decisions with qualified professionals.'] },
        { h: 'Accuracy', p: ['We work to keep calculations accurate, but almanac values can differ slightly between sources and traditions, and AI replies can be mistaken. Please verify anything important, especially dates for religious observances.'] },
        { h: 'Your account and content', p: ['You are responsible for what you enter and for the activity on your account. Enter only information you are entitled to share. We may limit or suspend use that is abusive, unlawful or harms the service, including attempts to overload it.'] },
        { h: 'Our content', p: ['The text, design and software of this site belong to us or our licensors. You may read and share pages for personal use with credit; you may not copy the site at scale or resell its content.'] },
        { h: 'Liability', p: ['To the extent the law allows, the site is provided as is, and we are not liable for losses arising from decisions made on the basis of its content.'] },
        { h: 'Changes', p: ['We may update these terms and the service from time to time; continued use means you accept the updated terms.'] },
      ]} />
  );
}
