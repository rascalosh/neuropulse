'use client';
import { useState, useEffect } from 'react';
import { useStorage } from '../../../hooks/useStorage';
import { useLang } from '../../../contexts/providers';
import { analyzeMood, MoodAnalysisResult } from '../../../lib/gemini';
import { genId, getTodayStr, getLast7DaysMood } from '../../../lib/storage';
import { XP_REWARDS } from '../../../lib/gamification';
import { IconCheck, IconAlertTriangle, IconHeart, IconMessageCircle, IconSparkles, IconFileText, IconClock } from '../../../components/Icons';
import { getMascotSrc } from '../../../lib/mascot';
import { translations } from '../../../lib/i18n';
import styles from './energycheckin.module.css';

const ENERGY_HINT: Record<number, { id: string; en: string }> = {
  1: { id: 'Istirahat dulu — jangan paksa otakmu hari ini.', en: 'Rest first — don\'t push your brain today.' },
  2: { id: 'Task kecil aja — pilih yang paling mudah.', en: 'Small tasks only — pick the easiest one.' },
  3: { id: 'Kamu bisa jalan normal, tetap pakai jeda.', en: 'You can move at a normal pace, still take breaks.' },
  4: { id: 'Energi bagus — kejar task yang tertunda.', en: 'Good energy — tackle what\'s been delayed.' },
  5: { id: 'On fire! Manfaatkan buat task terberat.', en: 'On fire! Use it for your hardest task.' },
};

const ENERGY_COLORS: Record<number, string> = {
  0: 'var(--gray-200)',
  1: 'var(--mood-1)',
  2: 'var(--blue-300)',
  3: 'var(--mood-3)',
  4: 'var(--color-warning)',
  5: 'var(--color-error)',
};

const PASTEL_DAY_COLORS = ['#AFC6EF', '#F3A9A3', '#AFC6EF', '#9DD3F5', '#C6B6E8', '#F6DA9B'];
const TODAY_COLOR = '#2563EB';

const MASCOT_THEME: Record<number, { border: string; bg: string }> = {
  1: { border: '#94A3B8', bg: '#F1F5F9' },
  2: { border: '#FB923C', bg: '#FFF7ED' },
  3: { border: '#3B82F6', bg: '#EFF6FF' },
  4: { border: '#10B981', bg: '#ECFDF5' },
  5: { border: '#EF4444', bg: '#FEF2F2' },
};

const WARNING_CONFIG = {
  normal: { color: 'var(--color-success)', bg: '#ECFDF5', label: 'Mood stabil', icon: IconCheck },
  at_risk: { color: 'var(--color-warning)', bg: '#FFFBEB', label: 'Butuh perhatian', icon: IconAlertTriangle },
  crisis: { color: 'var(--color-error)', bg: '#FEF2F2', label: 'Perlu dukungan ekstra', icon: IconHeart },
};

const MOOD_STARTERS = [
  'Hari ini gue ngerasa...',
  'Lagi overwhelm sama...',
  'Gue stuck di...',
  'Energi gue hari ini...',
  'Yang bikin berat...',
];

const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const WARNING_TAG: Record<'normal' | 'at_risk' | 'crisis', { id: string; en: string; color: string; bg: string }> = {
  normal: { id: 'stabil', en: 'stable', color: 'var(--color-success)', bg: '#ECFDF5' },
  at_risk: { id: 'butuh perhatian', en: 'needs attention', color: 'var(--color-warning)', bg: '#FFFBEB' },
  crisis: { id: 'berat', en: 'heavy', color: 'var(--color-error)', bg: '#FEF2F2' },
};

function formatLogDate(dateStr: string, today: string, lang: 'id' | 'en'): string {
  if (dateStr === today) return lang === 'id' ? 'Hari ini' : 'Today';
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().slice(0, 10)) return lang === 'id' ? 'Kemarin' : 'Yesterday';
  return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' });
}

export default function MoodCheckinPage() {
  const [store, update] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];
  const [moodText, setMoodText] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MoodAnalysisResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'write' | 'logbook'>('write');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check if already submitted today
    const today = getTodayStr();
    const todayMood = store.moodLog.find((m) => m.date === today);
    if (todayMood?.moodSummary) {
      setSubmitted(true);
      setResult({
        summary: todayMood.moodSummary!,
        suggestion: todayMood.suggestion ?? '',
        affirmation: todayMood.affirmation ?? '',
        warningLevel: todayMood.warningLevel ?? 'normal',
      });
    }
  }, []);

  const last7 = mounted ? getLast7DaysMood(store.moodLog) : [];
  const today = getTodayStr();
  const todayMood = store.moodLog.find((m) => m.date === today);

  const handleSubmit = async () => {
    if (!moodText.trim()) return;
    setIsAnalyzing(true);

    try {
      const analysis = await analyzeMood(moodText, energyLevel);
      setResult(analysis);
      setSubmitted(true);

      const now = new Date().toISOString();
      update((prev) => {
        // Remove today's existing entry if any, then add new one
        const filtered = prev.moodLog.filter((m) => m.date !== today);
        return {
          ...prev,
          currentEnergy: energyLevel,
          moodLog: [
            ...filtered,
            {
              timestamp: now,
              date: today,
              energyLevel,
              moodText: moodText.trim(),
              moodSummary: analysis.summary,
              suggestion: analysis.suggestion,
              affirmation: analysis.affirmation,
              warningLevel: analysis.warningLevel,
            },
          ],
          totalXP: prev.totalXP + XP_REWARDS.MICROTASK_COMPLETE,
          xpHistory: [
            ...prev.xpHistory,
            {
              id: genId(),
              amount: XP_REWARDS.MICROTASK_COMPLETE,
              reason: 'Mood check-in harian ✨',
              timestamp: now,
            },
          ],
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setResult(null);
    setMoodText('');
  };

  if (!mounted) return null;

  const warnCfg = result ? WARNING_CONFIG[result.warningLevel] : null;

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerEyebrow}>{lang === 'id' ? 'CHECK-IN' : 'CHECK-IN'}</div>
          <h1 className={styles.headerTitle}>{lang === 'id' ? 'Energy Check-in' : 'Energy Check-in'}</h1>
          <p className={styles.headerDesc}>
            {lang === 'id'
              ? 'Ceritain ke AI gimana perasaan kamu — dapat saran personal dari NeuroPalls!'
              : 'Tell the AI how you\'re feeling — get personal advice from NeuroPalls!'}
          </p>
        </div>

        <div className={styles.layout}>
        <div className={styles.mainCol}>

        {/* Tabs */}
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={view === 'write'}
            className={`${styles.tabBtn} ${view === 'write' ? styles.tabBtnActive : ''}`}
            onClick={() => setView('write')}
          >
            {lang === 'id' ? 'Tulis' : 'Write'}
          </button>
          <button
            role="tab"
            aria-selected={view === 'logbook'}
            className={`${styles.tabBtn} ${view === 'logbook' ? styles.tabBtnActive : ''}`}
            onClick={() => setView('logbook')}
          >
            {lang === 'id' ? 'Logbook' : 'Logbook'}
          </button>
        </div>

        {view === 'logbook' ? (
          <div className={styles.logbook}>
            {[...store.moodLog].reverse().map((m) => {
              const tag = m.warningLevel ? WARNING_TAG[m.warningLevel] : null;
              return (
                <div key={m.timestamp} className={styles.logEntry}>
                  <span className={styles.logDot} style={{ background: ENERGY_COLORS[m.energyLevel] }} />
                  <div className={styles.logContent}>
                    <div className={styles.logTop}>
                      <span className={styles.logDate}>
                        <IconClock size={11} /> {formatLogDate(m.date, today, lang)}
                      </span>
                      {tag && (
                        <span className={styles.logTag} style={{ color: tag.color, background: tag.bg }}>
                          {lang === 'id' ? tag.id : tag.en}
                        </span>
                      )}
                      <a href="/report" className={styles.logReportLink}>
                        <IconFileText size={11} /> {lang === 'id' ? 'Lap. Klinis' : 'Clinical Report'}
                      </a>
                    </div>
                    {m.moodText && <p className={styles.logText}>{m.moodText}</p>}
                  </div>
                </div>
              );
            })}
            {store.moodLog.length === 0 && (
              <p className={styles.logEmpty}>
                {lang === 'id' ? 'Belum ada catatan. Mulai dari tab Tulis.' : 'No entries yet. Start from the Write tab.'}
              </p>
            )}
          </div>
        ) : submitted && result && warnCfg ? (
          <div className={styles.resultSection}>
            <div
              className={styles.resultCard}
              style={{ borderColor: warnCfg.color, background: warnCfg.bg }}
            >
              <div className={styles.resultHeader}>
                <span className={styles.resultIcon} style={{ color: warnCfg.color }}>
                  <warnCfg.icon size={20} />
                </span>
                <div>
                  <div className={styles.resultWarnLabel} style={{ color: warnCfg.color }}>
                    {warnCfg.label}
                  </div>
                  <div className={styles.resultSummary}>{result.summary}</div>
                </div>
              </div>

              <div className={styles.resultBlock}>
                <div className={styles.resultBlockLabel}><IconSparkles size={12} /> Saran Gemini untuk kamu</div>
                <p className={styles.resultBlockText}>{result.suggestion}</p>
              </div>

              <div className={styles.affirmationBox}>
                <IconHeart size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <em>{result.affirmation}</em>
              </div>

              {result.warningLevel === 'crisis' && (
                <div className={styles.crisisBanner}>
                  <div className={styles.crisisBannerIcon}><IconMessageCircle size={20} /></div>
                  <div>
                    <div className={styles.crisisBannerTitle}>
                      Paralysis parah? Biar AI yang mulai duluan.
                    </div>
                    <div className={styles.crisisBannerDesc}>
                      Pergi ke Task Decomposer — AI akan ambil alih friction awal dan taruh konten langsung di layarmu.
                    </div>
                  </div>
                  <a href="/tasks" className={styles.crisisBannerBtn}>
                    Buka Tasks →
                  </a>
                </div>
              )}
            </div>

            {todayMood?.moodText && (
              <div className={styles.todayQuote}>
                <span className={styles.todayQuoteLabel}>Kamu tulis tadi:</span>
                <blockquote className={styles.todayQuoteText}>"{todayMood.moodText}"</blockquote>
              </div>
            )}

            <button className={`btn btn-outline btn-full`} onClick={handleReset} style={{ marginTop: 8 }}>
              Update Mood Hari Ini
            </button>
          </div>
        ) : (
          /* Input Form */
          <div className={styles.inputSection}>
            {/* Energy Picker */}
            <div className={styles.energyPicker}>
              <div className={styles.energyPickerLabel}>{lang === 'id' ? 'Energi fisik sekarang' : 'Physical energy now'}</div>
              <div className={styles.mascotGrid}>
                {([1, 2, 3, 4, 5] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`${styles.mascotCard} ${energyLevel === lvl ? styles.mascotCardActive : ''}`}
                    onClick={() => {
                      setEnergyLevel(lvl);
                      update((prev) => ({ ...prev, currentEnergy: lvl }));
                    }}
                    aria-pressed={energyLevel === lvl}
                    style={energyLevel === lvl ? { borderColor: MASCOT_THEME[lvl]!.border, background: MASCOT_THEME[lvl]!.bg } : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getMascotSrc(lvl)} alt="" className={styles.mascotCardImg} />
                    <span className={styles.mascotCardLabel}>{tr.energy[String(lvl) as keyof typeof tr.energy].label}</span>
                  </button>
                ))}
              </div>
              <div className={styles.energyHintBox}>
                {lang === 'id' ? ENERGY_HINT[energyLevel]!.id : ENERGY_HINT[energyLevel]!.en}
              </div>
            </div>

            {/* Mood Text */}
            <div className={styles.moodInputWrap}>
              <label className={styles.moodLabel}>
                Ceritain perasaan kamu hari ini ke AI
              </label>
              <textarea
                className={styles.moodTextarea}
                placeholder="Tulis bebas... gimana hari ini? Ada yang berat? Atau lagi on fire?"
                value={moodText}
                onChange={(e) => setMoodText(e.target.value)}
                rows={4}
              />
              <div className={styles.starterChips}>
                {MOOD_STARTERS.map((s) => (
                  <button
                    key={s}
                    className="chip"
                    onClick={() => setMoodText(s + ' ')}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`btn btn-primary btn-full ${styles.submitBtn}`}
              onClick={handleSubmit}
              disabled={isAnalyzing || !moodText.trim()}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  Gemini lagi analisis...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <IconSparkles size={14} /> Kirim ke Gemini
                </span>
              )}
            </button>
          </div>
        )}

        </div>

        <div className={styles.sideCol}>
          <div className={styles.historyCard}>
            <div className={styles.historyTitle}>7 Hari Terakhir</div>
            <div className={styles.historyChart}>
              {last7.map((m, i) => {
                const d = new Date(m.date);
                const dayLabel = DAY_SHORT[d.getDay()];
                const isToday = m.date === today;
                const hasMood = m.energyLevel > 0;

                const barColor = isToday ? TODAY_COLOR : PASTEL_DAY_COLORS[i % PASTEL_DAY_COLORS.length];

                return (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.historyDayCol} ${selectedDay === m.date ? styles.historyDayColActive : ''}`}
                    onClick={() => hasMood && setSelectedDay(selectedDay === m.date ? null : m.date)}
                    disabled={!hasMood}
                    aria-pressed={selectedDay === m.date}
                  >
                    <div className={styles.historyBarWrap}>
                      {hasMood ? (
                        <div
                          className={styles.historyBar}
                          style={{
                            height: `${Math.max(m.energyLevel * 12, 36)}px`,
                            background: barColor,
                            opacity: selectedDay === m.date ? 0.85 : 1,
                          }}
                          title={m.moodSummary ?? `Energi ${m.energyLevel}/5`}
                        />
                      ) : (
                        <div className={styles.historyBarEmpty} />
                      )}
                    </div>
                    <div className={`${styles.historyDayLabel} ${isToday ? styles.historyDayToday : ''}`}>
                      {isToday ? 'Hari\nIni' : dayLabel}
                    </div>
                    {m.warningLevel === 'crisis' && (
                      <div className={styles.crisisMarker} title="Hari berat" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className={styles.historyLegend}>
              <span>Rendah</span>
              <div className={styles.historyLegendGrad} />
              <span>Tinggi</span>
            </div>

            {selectedDay && (() => {
              const dayEntry = last7.find((m) => m.date === selectedDay);
              if (!dayEntry || dayEntry.energyLevel === 0) return null;
              return (
                <div className={`${styles.dayDetail} animate-in`}>
                  <div className={styles.dayDetailTop}>
                    <span className={styles.dayDetailDate}>{formatLogDate(selectedDay, today, lang)}</span>
                    <span
                      className={styles.dayDetailEnergy}
                      style={{ color: ENERGY_COLORS[dayEntry.energyLevel] }}
                    >
                      {tr.energy[String(dayEntry.energyLevel) as keyof typeof tr.energy].label}
                    </span>
                  </div>
                  {dayEntry.moodText && <p className={styles.dayDetailText}>"{dayEntry.moodText}"</p>}
                  {dayEntry.moodSummary && !dayEntry.moodText && (
                    <p className={styles.dayDetailText}>{dayEntry.moodSummary}</p>
                  )}
                </div>
              );
            })()}
          </div>

          <div className={styles.sideLogbook}>
            <div className={styles.sideLogbookTitle}>{lang === 'id' ? 'Logbook' : 'Logbook'}</div>
            <div className={styles.sideLogbookList}>
              {[...store.moodLog].reverse().map((m) => {
                const tag = m.warningLevel ? WARNING_TAG[m.warningLevel] : null;
                return (
                  <div key={m.timestamp} className={styles.logEntry}>
                    <span className={styles.logDot} style={{ background: ENERGY_COLORS[m.energyLevel] }} />
                    <div className={styles.logContent}>
                      <div className={styles.logTop}>
                        <span className={styles.logDate}>
                          <IconClock size={11} /> {formatLogDate(m.date, today, lang)}
                        </span>
                        {tag && (
                          <span className={styles.logTag} style={{ color: tag.color, background: tag.bg }}>
                            {lang === 'id' ? tag.id : tag.en}
                          </span>
                        )}
                      </div>
                      {m.moodText && <p className={styles.logText}>{m.moodText}</p>}
                    </div>
                  </div>
                );
              })}
              {store.moodLog.length === 0 && (
                <p className={styles.logEmpty}>
                  {lang === 'id' ? 'Belum ada catatan.' : 'No entries yet.'}
                </p>
              )}
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}
