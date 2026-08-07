'use client';
// components/KundliDetailPanel.jsx
//
// Shows full kundli analysis (yogas, vedic/lal-kitab/nadi/hora sections)
// without leaving the chat. Same content that used to live only on the
// /profile page's expand-in-place card — now reusable so chat can show
// it too.
//
// Responsive by design, not by separate components: renders as a
// right-docked side panel on desktop (matches the Claude-style "canvas"
// pattern) and a bottom sheet on mobile (where a side panel wouldn't
// fit next to the chat). The CSS in globals.css (.lf-detail-panel /
// .lf-detail-overlay) handles the breakpoint — this component just
// renders the content once.

function AnalysisSection({ title, color, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '1.5px', textTransform: 'uppercase', color, margin: '0 0 6px' }}>{title}</p>
      <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
        {children}
      </div>
    </div>
  );
}

export default function KundliDetailPanel({ kundli, open, onClose }) {
  if (!open || !kundli) return null;

  const a = kundli.planet_data?.analysis;
  const yogas = kundli.planet_data?.yogas || [];

  return (
    <>
      <div className="lf-detail-overlay" onClick={onClose} />
      <div className="lf-detail-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontWeight: '500', fontSize: '15px', color: 'var(--color-text-primary)' }}>{kundli.label || kundli.full_name}</p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{kundli.dob} · {kundli.birth_place}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '4px 8px', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {kundli.luck_score != null && (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '32px', fontWeight: '500', margin: 0, color: kundli.luck_score >= 60 ? 'var(--color-text-success)' : kundli.luck_score >= 40 ? 'var(--color-text-warning)' : 'var(--color-text-danger)' }}>{kundli.luck_score}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>Luck Score</p>
            </div>
          )}

          {a?.analytical_insight && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.6', marginBottom: '16px' }}>{a.analytical_insight}</p>
          )}

          {yogas.length > 0 && (
            <div style={{ marginBottom: '16px', background: 'var(--color-background-secondary)', borderRadius: '10px', padding: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-text-info)', margin: '0 0 8px' }}>पहचाने गए शास्त्रीय योग</p>
              {yogas.filter(y => !y.isChallenging).map((y, i) => (
                <div key={i} style={{ marginBottom: '8px', fontSize: '13px' }}>
                  <p style={{ margin: '0 0 2px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{y.name}</p>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{y.description}</p>
                </div>
              ))}
            </div>
          )}

          {a?.vedic_analysis && (
            <AnalysisSection title="वैदिक विश्लेषण" color="var(--color-text-info)">
              <p style={{ margin: '0 0 4px' }}>{a.vedic_analysis.lagna_summary}</p>
              <p style={{ margin: '0 0 4px' }}><strong>सबसे मजबूत:</strong> {a.vedic_analysis.strongest_planet}</p>
              <p style={{ margin: '0 0 4px' }}><strong>सबसे कमजोर:</strong> {a.vedic_analysis.weakest_planet}</p>
              <p style={{ margin: 0 }}>{a.vedic_analysis.dasha_hint}</p>
            </AnalysisSection>
          )}

          {a?.lal_kitab_analysis && (
            <AnalysisSection title="लाल किताब" color="var(--color-text-warning)">
              <p style={{ margin: '0 0 4px' }}>{a.lal_kitab_analysis.key_observation}</p>
              <p style={{ margin: '0 0 4px' }}><strong>उपाय:</strong> {a.lal_kitab_analysis.remedy}</p>
              <p style={{ margin: '0 0 4px' }}><strong>समय:</strong> {a.lal_kitab_analysis.timing}</p>
            </AnalysisSection>
          )}

          {a?.nadi_analysis && (
            <AnalysisSection title="नाड़ी ज्योतिष" color="var(--color-text-success)">
              <p style={{ margin: '0 0 4px' }}>{a.nadi_analysis.karmic_theme}</p>
              <p style={{ margin: '0 0 4px' }}><strong>क्षेत्र:</strong> {a.nadi_analysis.life_area_focus}</p>
              <p style={{ margin: 0 }}><strong>उपाय:</strong> {a.nadi_analysis.nadi_remedy}</p>
            </AnalysisSection>
          )}

          {a?.hora_analysis && (
            <AnalysisSection title="होरा" color="var(--color-text-danger)">
              <p style={{ margin: '0 0 4px' }}><strong>आज के स्वामी:</strong> {a.hora_analysis.ruling_planet_today}</p>
              <p style={{ margin: '0 0 4px' }}>{a.hora_analysis.best_activity_now}</p>
              <p style={{ margin: 0, color: 'var(--color-text-tertiary)' }}>{a.hora_analysis.avoid_now}</p>
            </AnalysisSection>
          )}

          {a?.actionable_seva_remedy && (
            <div style={{ background: 'var(--color-background-secondary)', borderRadius: '10px', padding: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '0 0 4px' }}>सुझाई गई सेवा</p>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{a.actionable_seva_remedy.target_action}</p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>{a.actionable_seva_remedy.target_location_type}</p>
            </div>
          )}

          {!a && yogas.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '2rem' }}>विस्तृत विश्लेषण उपलब्ध नहीं — पुरानी कुंडली।</p>
          )}

          {kundli.planet_data?.closingVerse && (
            <div style={{ marginTop: '20px', padding: '14px', borderTop: '0.5px dashed var(--color-border-tertiary)', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--color-text-primary)', fontStyle: 'italic', margin: '0 0 6px' }}>
                {kundli.planet_data.closingVerse.verse}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                — {kundli.planet_data.closingVerse.source}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
