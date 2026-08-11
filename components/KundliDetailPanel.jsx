'use client';
// components/KundliDetailPanel.jsx
//
// Full kundli detail view — General analysis, Varshik (yearly), Masik
// (monthly), Saptahik (weekly) predictions, all in one tabbed panel.
// Right-docked side panel on desktop, bottom sheet on mobile (CSS in
// globals.css handles the breakpoint — this component renders once).
//
// REDESIGN NOTE: the old system-organized sections (vedic_analysis,
// lal_kitab_analysis, nadi_analysis) have been removed — they're now
// superseded by the life_domains accordion, which covers the same
// ground in more accessible language without the redundancy of
// showing the same facts three different ways. hora_analysis and
// actionable_seva_remedy are kept (genuinely distinct, actionable
// content) but restyled to feel like a natural continuation rather
// than a separate boxed section.

import { useState, useEffect } from 'react';

const LIFE_DOMAIN_LABELS = [
  ['character', 'चरित्र'],
  ['fortune_satisfaction', 'सौभाग्य व संतुष्टि'],
  ['lifestyle', 'जीवन शैली'],
  ['employment', 'रोजगार'],
  ['business', 'व्यवसाय'],
  ['health', 'स्वास्थ्य'],
  ['interests', 'रुचि'],
  ['love', 'प्रेम आदि'],
  ['financial', 'आर्थिक'],
  ['education', 'शिक्षा'],
];

function LifeDomainAccordion({ domains }) {
  const [openKey, setOpenKey] = useState('character');
  if (!domains) return null;

  return (
    <div style={{ marginBottom: '16px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '10px', overflow: 'hidden' }}>
      {LIFE_DOMAIN_LABELS.map(([key, label]) => {
        if (!domains[key]) return null;
        const isOpen = openKey === key;
        return (
          <div key={key} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <button
              onClick={() => setOpenKey(isOpen ? null : key)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 14px', background: isOpen ? 'var(--color-background-secondary)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{label}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
            </button>
            {isOpen && (
              <p style={{ margin: 0, padding: '0 14px 14px', fontSize: '13px', lineHeight: '1.75', color: 'var(--color-text-secondary)' }}>
                {domains[key]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TONE_BG = { current: 'var(--color-brand-light)', future: 'var(--color-background-secondary)' };

function GocharPhalTimeline({ timeline }) {
  const [expanded, setExpanded] = useState(false);
  if (!timeline || timeline.length === 0) return <EmptyNote text="इस कुंडली के लिए गोचर फल उपलब्ध नहीं — 'पुनः विश्लेषण करें' दबाएं (प्रोफाइल पेज पर)।" />;

  const today = new Date().toISOString().slice(0, 10);
  const current = timeline.filter(p => p.start <= today && p.end >= today);
  const upcoming = timeline.filter(p => p.start > today);
  const past = timeline.filter(p => p.end < today).slice(-3);
  const visible = expanded ? [...past, ...current, ...upcoming] : [...current, ...upcoming.slice(0, 4)];

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visible.map((p, i) => {
          const isCurrent = p.start <= today && p.end >= today;
          const isPast = p.end < today;
          return (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: '8px',
              background: isCurrent ? TONE_BG.current : TONE_BG.future,
              opacity: isPast ? 0.6 : 1,
              border: isCurrent ? '1px solid var(--color-brand)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {p.planetHi} — {p.house}वें भाव में {isCurrent && '(अभी)'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{p.start} – {p.end}</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>{p.text}</p>
            </div>
          );
        })}
      </div>
      <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: 'var(--color-text-info)', fontSize: '12px', cursor: 'pointer', marginTop: '8px', padding: 0 }}>
        {expanded ? 'कम दिखाएं' : `पूरी timeline देखें (${timeline.length} periods) →`}
      </button>
    </div>
  );
}

function EmptyNote({ text }) {
  return <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '2rem 1rem' }}>{text}</p>;
}

// ── वार्षिक (Yearly) tab — Varshaphal ────────────────────────────
function VarshikTab({ varshaphal }) {
  if (!varshaphal) return <EmptyNote text="वार्षिक फलादेश उपलब्ध नहीं — 'पुनः विश्लेषण करें' दबाएं।" />;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '16px', padding: '14px', background: 'var(--color-background-secondary)', borderRadius: '10px' }}>
        <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>वर्षेश (साल के स्वामी)</p>
        <p style={{ margin: 0, fontSize: '18px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{varshaphal.varshesh?.planetHi}</p>
      </div>
      {varshaphal.yearPrediction && (
        <p style={{ fontSize: '13px', lineHeight: '1.75', color: 'var(--color-text-primary)', marginBottom: '16px' }}>{varshaphal.yearPrediction}</p>
      )}
      {varshaphal.areas?.map((a, i) => (
        <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < varshaphal.areas.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{a.area}</p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>{a.note}</p>
        </div>
      ))}
    </div>
  );
}

// ── मासिक (Monthly) tab — Mudda Dasha ────────────────────────────
function MasikTab({ varshaphal }) {
  const mudda = varshaphal?.muddaDasha;
  if (!mudda || mudda.length === 0) return <EmptyNote text="मासिक फलादेश उपलब्ध नहीं — 'पुनः विश्लेषण करें' दबाएं।" />;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '14px', lineHeight: '1.6' }}>
        इस वर्ष के भीतर महीने-दर-महीने ग्रह-स्वामी (मुद्दा दशा) — असली classical timing, अनुमान नहीं।
      </p>
      {mudda.map((m, i) => {
        const isCurrent = m.start <= today && m.end >= today;
        return (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
            background: isCurrent ? 'var(--color-brand-light)' : 'var(--color-background-secondary)',
            border: isCurrent ? '1px solid var(--color-brand)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{m.planetHi} {isCurrent && '(अभी)'}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{m.start} – {m.end}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── साप्ताहिक (Weekly) tab ────────────────────────────────────────
function SaptahikTab({ saptahikPhal }) {
  if (!saptahikPhal?.days) return <EmptyNote text="साप्ताहिक फलादेश उपलब्ध नहीं — 'पुनः विश्लेषण करें' दबाएं।" />;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '14px', lineHeight: '1.6' }}>
        चंद्रमा के वास्तविक नक्षत्र-गोचर और दिन-स्वामी पर आधारित — यह वार्षिक फल जितना गहरा नहीं, पर वास्तविक गणना है।
      </p>
      {saptahikPhal.days.map((d, i) => {
        const isToday = d.date === today;
        return (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
            background: isToday ? 'var(--color-brand-light)' : 'var(--color-background-secondary)',
            border: isToday ? '1px solid var(--color-brand)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{d.dayName} {isToday && '(आज)'}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{d.date}</span>
            </div>
            <p style={{ margin: '0 0 2px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>🌙 चंद्र {d.nakshatra} में — {d.nakshatraNote}</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>☀️ दिन-स्वामी {d.dayLord} — {d.dayNote}</p>
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  ['general', 'सामान्य'],
  ['varshik', 'वार्षिक'],
  ['masik', 'मासिक'],
  ['saptahik', 'साप्ताहिक'],
];

export default function KundliDetailPanel({ kundli, open, onClose, initialTab = 'general' }) {
  const [tab, setTab] = useState(initialTab);

  // Keep in sync if the panel is already open and a sidebar button
  // requests a different tab (e.g. वार्षिक → साप्ताहिक) without the
  // panel closing/reopening in between — useState's initial value
  // alone wouldn't catch this since the component doesn't remount.
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  if (!open || !kundli) return null;

  const a = kundli.planet_data?.analysis;
  const yogas = kundli.planet_data?.yogas || [];
  const gocharPhal = kundli.planet_data?.gocharPhal || [];
  const varshaphal = kundli.planet_data?.varshaphal;
  const saptahikPhal = kundli.planet_data?.saptahikPhal;

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

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '10px 4px', fontSize: '12px', fontWeight: tab === key ? '600' : '400',
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === key ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                borderBottom: tab === key ? '2px solid var(--color-brand)' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {tab === 'general' && (
            <>
              {kundli.luck_score != null && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '32px', fontWeight: '500', margin: 0, color: kundli.luck_score >= 60 ? 'var(--color-text-success)' : kundli.luck_score >= 40 ? 'var(--color-text-warning)' : 'var(--color-text-danger)' }}>{kundli.luck_score}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>Luck Score</p>
                </div>
              )}

              {a?.analytical_insight && (
                <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.6', marginBottom: '16px' }}>{a.analytical_insight}</p>
              )}

              <LifeDomainAccordion domains={a?.life_domains} />

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

              {/* Practical/actionable content — kept distinct from
                  life_domains since it's genuinely different (today's
                  timing + a concrete remedy, not a descriptive read) */}
              {(a?.hora_analysis || a?.actionable_seva_remedy) && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '0 0 8px' }}>आज का व्यावहारिक मार्गदर्शन</p>
                  {a?.hora_analysis && (
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: '0 0 8px' }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>आज के स्वामी {a.hora_analysis.ruling_planet_today}:</strong> {a.hora_analysis.best_activity_now}
                    </p>
                  )}
                  {a?.actionable_seva_remedy && (
                    <div style={{ background: 'var(--color-background-secondary)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{a.actionable_seva_remedy.target_action}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>{a.actionable_seva_remedy.target_location_type}</p>
                    </div>
                  )}
                </div>
              )}

              <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-text-info)', margin: '0 0 8px' }}>गोचर फल (Transit Timeline)</p>
              <GocharPhalTimeline timeline={gocharPhal} />

              {!a && yogas.length === 0 && (
                <EmptyNote text="विस्तृत विश्लेषण उपलब्ध नहीं — पुरानी कुंडली। प्रोफाइल पेज पर 'पुनः विश्लेषण करें' दबाएं।" />
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
            </>
          )}

          {tab === 'varshik' && <VarshikTab varshaphal={varshaphal} />}
          {tab === 'masik' && <MasikTab varshaphal={varshaphal} />}
          {tab === 'saptahik' && <SaptahikTab saptahikPhal={saptahikPhal} />}
        </div>
      </div>
    </>
  );
}
