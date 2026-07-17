'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useA11y } from '../contexts/providers';
import { useLang } from '../contexts/providers';
import { translations } from '../lib/i18n';
import { IconLightbulb, IconActivity, IconBoldText, IconVolume, IconSettings } from './Icons';
import styles from './AccessibilityPanel.module.css';

const FAB_POS_KEY = 'np-a11y-fab-pos';

export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const { fontSize, highContrast, reduceMotion, bionic, tts, setFontSize, toggleContrast, toggleMotion, toggleBionic, toggleTts, bionicQuotaExceeded } = useA11y();
  const { lang } = useLang();
  const a11y = translations[lang].a11y;

  const fabRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ dragging: boolean; moved: boolean; offsetX: number; offsetY: number }>({
    dragging: false,
    moved: false,
    offsetX: 0,
    offsetY: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem(FAB_POS_KEY);
    if (saved) {
      try {
        setPos(JSON.parse(saved));
      } catch {
        // ignore invalid saved position
      }
    }
  }, []);

  const clampPos = (x: number, y: number) => {
    const el = fabRef.current;
    const w = el?.offsetWidth ?? 48;
    const h = el?.offsetHeight ?? 48;
    return {
      x: Math.min(Math.max(x, 8), window.innerWidth - w - 8),
      y: Math.min(Math.max(y, 8), window.innerHeight - h - 8),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = fabRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      dragging: true,
      moved: false,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragState.current.dragging) return;
    dragState.current.moved = true;
    const next = clampPos(e.clientX - dragState.current.offsetX, e.clientY - dragState.current.offsetY);
    setPos(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    fabRef.current?.releasePointerCapture(e.pointerId);
    setPos((current) => {
      if (current) localStorage.setItem(FAB_POS_KEY, JSON.stringify(current));
      return current;
    });
  };

  const handleFabClick = useCallback(() => {
    if (dragState.current.moved) {
      dragState.current.moved = false;
      return;
    }
    setOpen(true);
  }, []);

  const panelStyle = (() => {
    const el = fabRef.current;
    if (!pos || !el) return undefined;
    const panelWidth = 320;
    const panelMaxHeight = 520;
    const x = Math.min(Math.max(pos.x, 8), window.innerWidth - panelWidth - 8);
    const spaceBelow = window.innerHeight - (pos.y + el.offsetHeight);
    const openUp = spaceBelow < panelMaxHeight;
    const y = openUp ? Math.max(pos.y - panelMaxHeight - 8, 8) : pos.y + el.offsetHeight + 8;
    return { left: x, top: y, bottom: 'auto', right: 'auto' };
  })();

  const fontOptions = [
    { key: 'normal' as const, label: 'A', size: 14 },
    { key: 'large' as const, label: 'A', size: 18 },
    { key: 'xlarge' as const, label: 'A', size: 22 },
  ];

  const fontOptionLabel = {
    normal: a11y.font_normal,
    large: a11y.font_large,
    xlarge: a11y.font_xlarge,
  } as const;

  return (
    <>
      {/* Floating button — draggable anywhere on screen */}
      <button
        ref={fabRef}
        className={styles.fab}
        style={pos ? { left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' } : undefined}
        onClick={handleFabClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label={a11y.open}
        aria-expanded={open}
        aria-controls="a11y-panel"
      >
        <IconSettings size={18} />
        <span className={styles.fabLabel}>{a11y.panel_title.toUpperCase()}</span>
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id="a11y-panel"
            role="dialog"
            aria-label={a11y.panel_title}
            className={`${styles.panel} animate-in`}
            style={panelStyle}
            data-no-bionic
            data-no-tts
          >
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderIcon} aria-hidden="true"><IconSettings size={18} /></div>
              <h2 className={styles.panelTitle}>{a11y.panel_title}</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setOpen(false)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className={styles.panelBody}>
              <div className={styles.group}>
                <div className={styles.groupLabel}>{a11y.group_display}</div>

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>{a11y.font_size}</div>
                  <div className={styles.fontOptions}>
                    {fontOptions.map((opt) => (
                      <button
                        key={opt.key}
                        className={`${styles.fontBtn} ${fontSize === opt.key ? styles.fontBtnActive : ''}`}
                        onClick={() => setFontSize(opt.key)}
                        aria-pressed={fontSize === opt.key}
                        aria-label={fontOptionLabel[opt.key]}
                      >
                        <span style={{ fontSize: opt.size }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className={`${styles.feature} ${styles.accentAmber}`}>
                  <span className={styles.featureIcon} aria-hidden="true"><IconLightbulb size={18} /></span>
                  <span className={styles.featureInfo}>
                    <span className={styles.featureLabel}>{a11y.contrast}</span>
                    <span className={styles.featureDesc}>{a11y.contrast_desc}</span>
                  </span>
                  <button
                    role="switch"
                    aria-checked={highContrast}
                    className={`${styles.switch} ${highContrast ? styles.switchOn : ''}`}
                    onClick={toggleContrast}
                  >
                    <span className={styles.switchThumb} />
                  </button>
                </label>

                <label className={`${styles.feature} ${styles.accentTeal}`}>
                  <span className={styles.featureIcon} aria-hidden="true"><IconActivity size={18} /></span>
                  <span className={styles.featureInfo}>
                    <span className={styles.featureLabel}>{a11y.motion}</span>
                    <span className={styles.featureDesc}>{a11y.motion_desc}</span>
                  </span>
                  <button
                    role="switch"
                    aria-checked={reduceMotion}
                    className={`${styles.switch} ${reduceMotion ? styles.switchOn : ''}`}
                    onClick={toggleMotion}
                  >
                    <span className={styles.switchThumb} />
                  </button>
                </label>
              </div>

              <div className={styles.group}>
                <div className={styles.groupLabel}>{a11y.group_reading}</div>

                <div className={`${styles.card} ${styles.accentViolet} ${bionic ? styles.cardOn : ''}`}>
                  <label className={styles.feature}>
                    <span className={styles.featureIcon} aria-hidden="true"><IconBoldText size={18} /></span>
                    <span className={styles.featureInfo}>
                      <span className={styles.featureLabel}>{a11y.bionic}</span>
                      <span className={styles.featureDesc}>{a11y.bionic_desc}</span>
                    </span>
                    <button
                      role="switch"
                      aria-checked={bionic}
                      className={`${styles.switch} ${bionic ? styles.switchOn : ''}`}
                      onClick={toggleBionic}
                    >
                      <span className={styles.switchThumb} />
                    </button>
                  </label>
                  <p className={`${styles.bionicPreview} ${bionic ? styles.bionicPreviewOn : ''}`}>
                    <BionicPreviewText text={a11y.bionic_preview} />
                  </p>
                  {bionicQuotaExceeded && (
                    <p style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#92400E' }}>
                      {lang === 'id'
                        ? `Kuota bulan ini (${bionicQuotaExceeded.limit}x, paket ${bionicQuotaExceeded.tier}) habis. `
                        : `This month's quota (${bionicQuotaExceeded.limit}x, ${bionicQuotaExceeded.tier} plan) is used up. `}
                      <a href="/pricing" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                        {lang === 'id' ? 'Upgrade' : 'Upgrade'}
                      </a>
                    </p>
                  )}
                </div>

                <label className={`${styles.feature} ${styles.accentBlue}`}>
                  <span className={styles.featureIcon} aria-hidden="true"><IconVolume size={18} /></span>
                  <span className={styles.featureInfo}>
                    <span className={styles.featureLabel}>{a11y.tts}</span>
                    <span className={styles.featureDesc}>{a11y.tts_desc}</span>
                  </span>
                  <button
                    role="switch"
                    aria-checked={tts}
                    className={`${styles.switch} ${tts ? styles.switchOn : ''}`}
                    onClick={toggleTts}
                  >
                    <span className={styles.switchThumb} />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Renders the preview sentence with each word's first ~40% bolded — a static
// stand-in for the real CSS Highlight API effect (see ReadingAids.tsx), just
// so the toggle's effect is obvious immediately instead of needing a demo elsewhere.
function BionicPreviewText({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, i) => {
        const cut = word.length <= 3 ? 1 : Math.ceil(word.length * 0.4);
        return (
          <span key={i}>
            <strong>{word.slice(0, cut)}</strong>
            {word.slice(cut)}{' '}
          </span>
        );
      })}
    </>
  );
}
