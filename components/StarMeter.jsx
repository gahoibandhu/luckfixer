// Small 1-5 star bar. Decorative; the number is also given in aria-label.
export default function StarMeter({ stars }) {
  return (
    <span aria-label={`${stars} / 5`} style={{ letterSpacing: '2px', color: 'var(--color-text-warning)', fontSize: '13px' }}>
      {'★'.repeat(stars)}<span style={{ color: 'var(--color-border-secondary)' }}>{'★'.repeat(5 - stars)}</span>
    </span>
  );
}
