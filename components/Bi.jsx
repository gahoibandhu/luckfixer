'use client';
// components/Bi.jsx — shows the Hindi or English text according to the saved app language.
// Server render = Hindi (the default); it switches after hydration if the visitor chose English.
import { useUiLang } from '@/lib/i18n';
export default function Bi({ hi, en }) {
  const lang = useUiLang();
  return <>{lang === 'en' ? en : hi}</>;
}
