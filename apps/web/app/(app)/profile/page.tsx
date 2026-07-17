'use client';
import { useEffect, useState } from 'react';
import { useStorage } from '../../../hooks/useStorage';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import { ACCENT_COLORS, applyAccentColor } from '../../../lib/theme';
import { generateKnowledgeBaseSummary } from '../../../lib/gemini';
import {
  deriveKnowledgeBaseMetrics,
  type QuestionnaireAnswers,
  type ADHDSubtype,
  type Chronotype,
  type MotivationStyle,
  type CommunicationTone,
  type SensorySensitivity,
  type AccentColor,
} from '../../../lib/storage';
import onb from '../../onboarding/onboarding.module.css';
import styles from './profile.module.css';

const AVATARS = ['🧠', '🦋', '🌈', '🐙', '🦊', '🌟', '🐢', '🔥'];
const INTEREST_OPTIONS = ['Anime', 'Game', 'Musik', 'Masak', 'Olahraga', 'Baca', 'Film', 'Seni'];
const TRIGGER_KEYS = ['kb_trigger_overwhelm', 'kb_trigger_perfectionism', 'kb_trigger_unclear', 'kb_trigger_boring', 'kb_trigger_fatigue', 'kb_trigger_fear'] as const;

export default function ProfilePage() {
  const [store, update, mounted] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];
  const t = tr.onboarding;
  const p = tr.profile;

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0] ?? '🧠');
  const [accentColor, setAccentColor] = useState<AccentColor>('blue');
  const [interests, setInterests] = useState<string[]>([]);
  const [keywordsRaw, setKeywordsRaw] = useState('');

  const [adhdSubtype, setAdhdSubtype] = useState<ADHDSubtype>('unsure');
  const [chronotype, setChronotype] = useState<Chronotype>('variable');
  const [focusSpanMinutes, setFocusSpanMinutes] = useState(20);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [motivationStyle, setMotivationStyle] = useState<MotivationStyle>('gamification');
  const [rsdSensitivity, setRsdSensitivity] = useState(3);
  const [bodyDoublingHelps, setBodyDoublingHelps] = useState(true);
  const [communicationTone, setCommunicationTone] = useState<CommunicationTone>('playful');
  const [sensorySensitivity, setSensorySensitivity] = useState<SensorySensitivity>('medium');

  // Hydrate form fields from the stored profile once storage has loaded.
  useEffect(() => {
    if (!mounted || !store.profile) return;
    const profile = store.profile;
    setName(profile.name || '');
    setAvatar(profile.avatar || AVATARS[0] || '🧠');
    setAccentColor(profile.accentColor || 'blue');
    setInterests(profile.interests || []);
    setKeywordsRaw((profile.interestKeywords || []).join(', '));

    const answers = profile.knowledgeBase?.answers;
    if (answers) {
      setAdhdSubtype(answers.adhdSubtype);
      setChronotype(answers.chronotype);
      setFocusSpanMinutes(answers.focusSpanMinutes);
      setTriggers(answers.procrastinationTriggers);
      setMotivationStyle(answers.motivationStyle);
      setRsdSensitivity(answers.rsdSensitivity);
      setBodyDoublingHelps(answers.bodyDoublingHelps);
      setCommunicationTone(answers.communicationTone);
      setSensorySensitivity(answers.sensorySensitivity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : prev.length < 4 ? [...prev, interest] : prev
    );
  };

  const toggleTrigger = (key: string) => {
    setTriggers((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = async () => {
    setSaving(true);
    applyAccentColor(accentColor);

    const answers: QuestionnaireAnswers = {
      adhdSubtype,
      chronotype,
      focusSpanMinutes,
      procrastinationTriggers: triggers,
      motivationStyle,
      rsdSensitivity,
      bodyDoublingHelps,
      communicationTone,
      sensorySensitivity,
    };
    const derived = deriveKnowledgeBaseMetrics(answers);
    const keywords = keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean);

    let summary = store.profile?.knowledgeBase?.summary ?? '';
    try {
      summary = await generateKnowledgeBaseSummary(name || (lang === 'id' ? 'Kamu' : 'You'), answers, lang);
    } catch {
      // keep previous summary if regeneration fails
    }

    update((prev) => ({
      ...prev,
      profile: {
        name: name.trim() || 'User',
        avatar,
        interests,
        interestKeywords: keywords,
        onboardingCompleted: true,
        createdAt: prev.profile?.createdAt || new Date().toISOString(),
        accentColor,
        knowledgeBase: {
          answers,
          ...derived,
          summary,
          generatedAt: new Date().toISOString(),
        },
      },
    }));

    setSaving(false);
    setToast(p.saved_toast);
    setTimeout(() => setToast(null), 3000);
  };

  if (!mounted) return null;

  return (
    <div className={styles.page}>
      {toast && <div className="toast toast--xp">{toast}</div>}

      <div className={styles.header}>
        <h1 className={styles.title}>{p.title}</h1>
        <p className={styles.desc}>{p.desc}</p>
      </div>

      {/* Basic info */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>{p.section_basic}</div>

        <div className={onb.progressLabel}>{t.step1_choose_avatar}</div>
        <div className={onb.avatarGrid}>
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              className={`${onb.avatarBtn} ${avatar === a ? onb.avatarBtnActive : ''}`}
              onClick={() => setAvatar(a)}
            >
              {a}
            </button>
          ))}
        </div>

        <label className={onb.progressLabel}>{t.step1_name_label}</label>
        <input
          className={onb.input}
          placeholder={t.step1_name_placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </section>

      {/* Accent color */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>{p.section_color}</div>
        <div className={onb.chipGrid}>
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`${onb.chip} ${accentColor === c.key ? onb.chipActive : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => {
                setAccentColor(c.key);
                applyAccentColor(c.key);
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: c.hex, display: 'inline-block', flexShrink: 0 }} />
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Interests */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>{p.section_interests}</div>
        <div className={onb.chipGrid}>
          {INTEREST_OPTIONS.map((i) => (
            <button
              key={i}
              type="button"
              className={`${onb.chip} ${interests.includes(i) ? onb.chipActive : ''}`}
              onClick={() => toggleInterest(i)}
            >
              {i}
            </button>
          ))}
        </div>

        <label className={onb.progressLabel}>{t.step2_keywords_label}</label>
        <input
          className={onb.input}
          placeholder={t.step2_keywords_placeholder}
          value={keywordsRaw}
          onChange={(e) => setKeywordsRaw(e.target.value)}
        />
        <p className={onb.sliderHint}>{t.step2_keywords_hint}</p>
      </section>

      {/* Deep questionnaire */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>{p.section_questionnaire}</div>

        <label className={onb.progressLabel}>{t.kb_q_subtype}</label>
        <div className={onb.optionList}>
          {([
            ['inattentive', t.kb_subtype_inattentive],
            ['hyperactive', t.kb_subtype_hyperactive],
            ['combined', t.kb_subtype_combined],
            ['unsure', t.kb_subtype_unsure],
          ] as [ADHDSubtype, string][]).map(([val, label]) => (
            <div key={val} className={`${onb.optionRow} ${adhdSubtype === val ? onb.optionRowActive : ''}`} onClick={() => setAdhdSubtype(val)}>
              {label}
            </div>
          ))}
        </div>

        <label className={onb.progressLabel}>{t.kb_q_chronotype}</label>
        <div className={onb.chipGrid}>
          {([
            ['morning', t.kb_chronotype_morning],
            ['afternoon', t.kb_chronotype_afternoon],
            ['night', t.kb_chronotype_night],
            ['variable', t.kb_chronotype_variable],
          ] as [Chronotype, string][]).map(([val, label]) => (
            <button key={val} type="button" className={`${onb.chip} ${chronotype === val ? onb.chipActive : ''}`} onClick={() => setChronotype(val)}>
              {label}
            </button>
          ))}
        </div>

        <label className={onb.progressLabel}>{t.kb_q_focusspan}</label>
        <div className={onb.sliderRow}>
          <div className={onb.sliderValue}>{focusSpanMinutes} min</div>
          <input type="range" min={5} max={90} step={5} value={focusSpanMinutes} className={onb.slider} onChange={(e) => setFocusSpanMinutes(Number(e.target.value))} />
          <p className={onb.sliderHint}>{t.kb_focusspan_hint}</p>
        </div>

        <label className={onb.progressLabel}>{t.kb_q_triggers}</label>
        <p className={onb.sliderHint} style={{ marginTop: -8, marginBottom: 10 }}>{t.kb_desc_triggers}</p>
        <div className={onb.chipGrid}>
          {TRIGGER_KEYS.map((key) => (
            <button key={key} type="button" className={`${onb.chip} ${triggers.includes(key) ? onb.chipActive : ''}`} onClick={() => toggleTrigger(key)}>
              {t[key]}
            </button>
          ))}
        </div>

        <label className={onb.progressLabel}>{t.kb_q_motivation}</label>
        <div className={onb.optionList}>
          {([
            ['gamification', t.kb_motivation_gamification],
            ['deadline_pressure', t.kb_motivation_deadline],
            ['social_accountability', t.kb_motivation_social],
            ['curiosity', t.kb_motivation_curiosity],
          ] as [MotivationStyle, string][]).map(([val, label]) => (
            <div key={val} className={`${onb.optionRow} ${motivationStyle === val ? onb.optionRowActive : ''}`} onClick={() => setMotivationStyle(val)}>
              {label}
            </div>
          ))}
        </div>

        <label className={onb.progressLabel}>{t.kb_q_rsd}</label>
        <div className={onb.sliderRow}>
          <div className={onb.sliderValue}>{rsdSensitivity}/5</div>
          <input type="range" min={1} max={5} step={1} value={rsdSensitivity} className={onb.slider} onChange={(e) => setRsdSensitivity(Number(e.target.value))} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className={onb.sliderHint}>{t.kb_rsd_low}</span>
            <span className={onb.sliderHint}>{t.kb_rsd_high}</span>
          </div>
        </div>

        <label className={onb.progressLabel}>{t.kb_q_bodydouble}</label>
        <div className={onb.chipGrid}>
          <button type="button" className={`${onb.chip} ${bodyDoublingHelps ? onb.chipActive : ''}`} onClick={() => setBodyDoublingHelps(true)}>{tr.common.yes}</button>
          <button type="button" className={`${onb.chip} ${!bodyDoublingHelps ? onb.chipActive : ''}`} onClick={() => setBodyDoublingHelps(false)}>{tr.common.no}</button>
        </div>

        <label className={onb.progressLabel}>{t.kb_q_tone}</label>
        <div className={onb.optionList}>
          {([
            ['playful', t.kb_tone_playful],
            ['direct', t.kb_tone_direct],
            ['gentle', t.kb_tone_gentle],
          ] as [CommunicationTone, string][]).map(([val, label]) => (
            <div key={val} className={`${onb.optionRow} ${communicationTone === val ? onb.optionRowActive : ''}`} onClick={() => setCommunicationTone(val)}>
              {label}
            </div>
          ))}
        </div>

        <label className={onb.progressLabel}>{t.kb_q_sensory}</label>
        <div className={onb.chipGrid}>
          {([
            ['low', t.kb_sensory_low],
            ['medium', t.kb_sensory_medium],
            ['high', t.kb_sensory_high],
          ] as [SensorySensitivity, string][]).map(([val, label]) => (
            <button key={val} type="button" className={`${onb.chip} ${sensorySensitivity === val ? onb.chipActive : ''}`} onClick={() => setSensorySensitivity(val)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.saveBar}>
        <button type="button" className="btn btn-primary btn-lg" disabled={saving} onClick={handleSave}>
          {saving ? p.saving : p.save_button}
        </button>
      </div>
    </div>
  );
}
