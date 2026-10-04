'use client';
import { useUiLang, setSavedUiLang } from '@/lib/i18n';
export default function LangToggle() {
  const lang = useUiLang();
  return (
    <button type="button" onClick={() => setSavedUiLang(lang === 'en' ? 'hi' : 'en')} aria-label="Switch language"
      style={{ fontSize: '12px', fontWeight: 600, padding: '6px 10px', cursor: 'pointer', color: 'var(--color-text-secondary)', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)' }}>
      {lang === 'en' ? 'हिंदी' : 'EN'}
    </button>
  );
}
