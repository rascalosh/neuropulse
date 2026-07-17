'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStorage } from '../../hooks/useStorage';
import { useLang } from '../../contexts/providers';
import { translations } from '../../lib/i18n';
import { seedDemoData, deriveKnowledgeBaseMetrics, type QuestionnaireAnswers, type ADHDSubtype, type Chronotype, type MotivationStyle, type CommunicationTone, type SensorySensitivity } from '../../lib/storage';
import { generateKnowledgeBaseSummary } from '../../lib/gemini';
import styles from './onboarding.module.css';

const AVATARS = ['🧠', '🦋', '🌈', '🐙', '🦊', '🌟', '🐢', '🔥'];
const INTEREST_OPTIONS = ['Anime', 'Game', 'Musik', 'Masak', 'Olahraga', 'Baca', 'Film', 'Seni'];
const TRIGGER_KEYS = ['kb_trigger_overwhelm', 'kb_trigger_perfectionism', 'kb_trigger_unclear', 'kb_trigger_boring', 'kb_trigger_fatigue', 'kb_trigger_fear'] as const;

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const router = useRouter();
  const [, update] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];
  const t = tr.onboarding;

  const [step, setStep] = useState(1);
  const [starting, setStarting] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);

  // Step 2
  const [interests, setInterests] = useState<string[]>([]);
  const [keywordsRaw, setKeywordsRaw] = useState('');

  // Step 3 — deep questionnaire (the "knowledge base" source material)
  const [adhdSubtype, setAdhdSubtype] = useState<ADHDSubtype>('unsure');
  const [chronotype, setChronotype] = useState<Chronotype>('variable');
  const [focusSpanMinutes, setFocusSpanMinutes] = useState(20);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [motivationStyle, setMotivationStyle] = useState<MotivationStyle>('gamification');
  const [rsdSensitivity, setRsdSensitivity] = useState(3);
  const [bodyDoublingHelps, setBodyDoublingHelps] = useState(true);
  const [communicationTone, setCommunicationTone] = useState<CommunicationTone>('playful');
  const [sensorySensitivity, setSensorySensitivity] = useState<SensorySensitivity>('medium');

  // Step 4 — energy
  const [energy, setEnergy] = useState(3);

  // Step 5 — knowledge base synthesis
  const [kbSummary, setKbSummary] = useState('');
  const [kbLoading, setKbLoading] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : prev.length < 4 ? [...prev, interest] : prev
    );
  };

  const toggleTrigger = (key: string) => {
    setTriggers((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const buildAnswers = (): QuestionnaireAnswers => ({
    adhdSubtype,
    chronotype,
    focusSpanMinutes,
    procrastinationTriggers: triggers,
    motivationStyle,
    rsdSensitivity,
    bodyDoublingHelps,
    communicationTone,
    sensorySensitivity,
  });

  const goToKnowledgeBaseStep = async () => {
    setStep(5);
    setKbLoading(true);
    const answers = buildAnswers();
    try {
      const summary = await generateKnowledgeBaseSummary(name || 'Kamu', answers);
      setKbSummary(summary);
    } finally {
      setKbLoading(false);
    }
  };

  const metrics = deriveKnowledgeBaseMetrics(buildAnswers());

  const finish = () => {
    setStarting(true);
    const answers = buildAnswers();
    const derived = deriveKnowledgeBaseMetrics(answers);
    const keywords = keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean);

    update((prev) => ({
      ...prev,
      currentEnergy: energy,
      profile: {
        name: name.trim() || 'User',
        avatar,
        interests,
        interestKeywords: keywords,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        knowledgeBase: {
          answers,
          ...derived,
          summary: kbSummary,
          generatedAt: new Date().toISOString(),
        },
      },
    }));
    seedDemoData();
    router.replace('/dashboard');
  };

  const canNextStep1 = name.trim().length > 0;
  const canNextStep2 = interests.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
        <div className={styles.progressLabel}>
          {t.step_of ? `${step} ${t.step_of} ${TOTAL_STEPS}` : `${step}/${TOTAL_STEPS}`}
        </div>

        {/* Step 1: Name + Avatar */}
        {step === 1 && (
          <>
            <h1 className={styles.stepTitle}>{t.step1_title}</h1>
            <p className={styles.stepDesc}>{t.step1_desc}</p>

            <div className={styles.progressLabel}>{t.step1_choose_avatar}</div>
            <div className={styles.avatarGrid}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`${styles.avatarBtn} ${avatar === a ? styles.avatarBtnActive : ''}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>

            <label className={styles.progressLabel}>{t.step1_name_label}</label>
            <input
              className={styles.input}
              placeholder={t.step1_name_placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canNextStep1) setStep(2); }}
            />

            <div className={styles.footer}>
              <button type="button" className={styles.backBtn} disabled>{tr.common.back}</button>
              <button type="button" className="btn btn-primary" disabled={!canNextStep1} onClick={() => setStep(2)}>
                {tr.common.next}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <>
            <h1 className={styles.stepTitle}>{t.step2_title}</h1>
            <p className={styles.stepDesc}>{t.step2_desc}</p>

            <div className={styles.chipGrid}>
              {INTEREST_OPTIONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.chip} ${interests.includes(i) ? styles.chipActive : ''}`}
                  onClick={() => toggleInterest(i)}
                >
                  {i}
                </button>
              ))}
            </div>

            <label className={styles.progressLabel}>{t.step2_keywords_label}</label>
            <input
              className={styles.input}
              placeholder={t.step2_keywords_placeholder}
              value={keywordsRaw}
              onChange={(e) => setKeywordsRaw(e.target.value)}
            />
            <p className={styles.sliderHint}>{t.step2_keywords_hint}</p>

            <div className={styles.footer}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>{tr.common.back}</button>
              <button type="button" className="btn btn-primary" disabled={!canNextStep2} onClick={() => setStep(3)}>
                {tr.common.next}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Deep questionnaire -> knowledge base source material */}
        {step === 3 && (
          <>
            <h1 className={styles.stepTitle}>{t.kb_title}</h1>
            <p className={styles.stepDesc}>{t.kb_desc}</p>

            <label className={styles.progressLabel}>{t.kb_q_subtype}</label>
            <div className={styles.optionList}>
              {([
                ['inattentive', t.kb_subtype_inattentive],
                ['hyperactive', t.kb_subtype_hyperactive],
                ['combined', t.kb_subtype_combined],
                ['unsure', t.kb_subtype_unsure],
              ] as [ADHDSubtype, string][]).map(([val, label]) => (
                <div key={val} className={`${styles.optionRow} ${adhdSubtype === val ? styles.optionRowActive : ''}`} onClick={() => setAdhdSubtype(val)}>
                  {label}
                </div>
              ))}
            </div>

            <label className={styles.progressLabel}>{t.kb_q_chronotype}</label>
            <div className={styles.chipGrid}>
              {([
                ['morning', t.kb_chronotype_morning],
                ['afternoon', t.kb_chronotype_afternoon],
                ['night', t.kb_chronotype_night],
                ['variable', t.kb_chronotype_variable],
              ] as [Chronotype, string][]).map(([val, label]) => (
                <button key={val} type="button" className={`${styles.chip} ${chronotype === val ? styles.chipActive : ''}`} onClick={() => setChronotype(val)}>
                  {label}
                </button>
              ))}
            </div>

            <label className={styles.progressLabel}>{t.kb_q_focusspan}</label>
            <div className={styles.sliderRow}>
              <div className={styles.sliderValue}>{focusSpanMinutes} min</div>
              <input type="range" min={5} max={90} step={5} value={focusSpanMinutes} className={styles.slider} onChange={(e) => setFocusSpanMinutes(Number(e.target.value))} />
              <p className={styles.sliderHint}>{t.kb_focusspan_hint}</p>
            </div>

            <label className={styles.progressLabel}>{t.kb_q_triggers}</label>
            <p className={styles.sliderHint} style={{ marginTop: -8, marginBottom: 10 }}>{t.kb_desc_triggers}</p>
            <div className={styles.chipGrid}>
              {TRIGGER_KEYS.map((key) => (
                <button key={key} type="button" className={`${styles.chip} ${triggers.includes(key) ? styles.chipActive : ''}`} onClick={() => toggleTrigger(key)}>
                  {t[key]}
                </button>
              ))}
            </div>

            <label className={styles.progressLabel}>{t.kb_q_motivation}</label>
            <div className={styles.optionList}>
              {([
                ['gamification', t.kb_motivation_gamification],
                ['deadline_pressure', t.kb_motivation_deadline],
                ['social_accountability', t.kb_motivation_social],
                ['curiosity', t.kb_motivation_curiosity],
              ] as [MotivationStyle, string][]).map(([val, label]) => (
                <div key={val} className={`${styles.optionRow} ${motivationStyle === val ? styles.optionRowActive : ''}`} onClick={() => setMotivationStyle(val)}>
                  {label}
                </div>
              ))}
            </div>

            <label className={styles.progressLabel}>{t.kb_q_rsd}</label>
            <div className={styles.sliderRow}>
              <div className={styles.sliderValue}>{rsdSensitivity}/5</div>
              <input type="range" min={1} max={5} step={1} value={rsdSensitivity} className={styles.slider} onChange={(e) => setRsdSensitivity(Number(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className={styles.sliderHint}>{t.kb_rsd_low}</span>
                <span className={styles.sliderHint}>{t.kb_rsd_high}</span>
              </div>
            </div>

            <label className={styles.progressLabel}>{t.kb_q_bodydouble}</label>
            <div className={styles.chipGrid}>
              <button type="button" className={`${styles.chip} ${bodyDoublingHelps ? styles.chipActive : ''}`} onClick={() => setBodyDoublingHelps(true)}>{tr.common.yes}</button>
              <button type="button" className={`${styles.chip} ${!bodyDoublingHelps ? styles.chipActive : ''}`} onClick={() => setBodyDoublingHelps(false)}>{tr.common.no}</button>
            </div>

            <label className={styles.progressLabel}>{t.kb_q_tone}</label>
            <div className={styles.optionList}>
              {([
                ['playful', t.kb_tone_playful],
                ['direct', t.kb_tone_direct],
                ['gentle', t.kb_tone_gentle],
              ] as [CommunicationTone, string][]).map(([val, label]) => (
                <div key={val} className={`${styles.optionRow} ${communicationTone === val ? styles.optionRowActive : ''}`} onClick={() => setCommunicationTone(val)}>
                  {label}
                </div>
              ))}
            </div>

            <label className={styles.progressLabel}>{t.kb_q_sensory}</label>
            <div className={styles.chipGrid}>
              {([
                ['low', t.kb_sensory_low],
                ['medium', t.kb_sensory_medium],
                ['high', t.kb_sensory_high],
              ] as [SensorySensitivity, string][]).map(([val, label]) => (
                <button key={val} type="button" className={`${styles.chip} ${sensorySensitivity === val ? styles.chipActive : ''}`} onClick={() => setSensorySensitivity(val)}>
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(2)}>{tr.common.back}</button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>{tr.common.next}</button>
            </div>
          </>
        )}

        {/* Step 4: Energy */}
        {step === 4 && (
          <>
            <h1 className={styles.stepTitle}>{t.step3_title}</h1>
            <p className={styles.stepDesc}>{t.step3_desc}</p>

            <div className={styles.energyGrid}>
              {[1, 2, 3, 4, 5].map((lvl) => {
                const e = tr.energy[String(lvl) as keyof typeof tr.energy];
                return (
                  <button key={lvl} type="button" className={`${styles.energyBtn} ${energy === lvl ? styles.energyBtnActive : ''}`} onClick={() => setEnergy(lvl)}>
                    <span className={styles.energyEmoji}>{e.emoji}</span>
                    <span className={styles.energyLabel}>{e.label}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(3)}>{tr.common.back}</button>
              <button type="button" className="btn btn-primary" onClick={goToKnowledgeBaseStep}>{tr.common.next}</button>
            </div>
          </>
        )}

        {/* Step 5: Knowledge base synthesis + review */}
        {step === 5 && (
          <>
            {kbLoading ? (
              <div className={styles.buildingWrap}>
                <div className={styles.buildingSpinner}>🧩</div>
                <h1 className={styles.stepTitle}>{t.kb_building_title}</h1>
                <p className={styles.stepDesc}>{t.kb_building_desc}</p>
              </div>
            ) : (
              <>
                <h1 className={styles.stepTitle}>{t.kb_summary_title}</h1>
                <p className={styles.stepDesc}>{t.kb_summary_desc}</p>

                <div className={styles.summaryBox}>{kbSummary}</div>

                <div className={styles.metricsGrid}>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>{t.kb_metric_focus}</div>
                    <div className={styles.metricValue}>{metrics.focusStaminaScore}/100</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>{t.kb_metric_rsd}</div>
                    <div className={styles.metricValue}>{metrics.rsdRiskScore}/100</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>{t.kb_metric_structure}</div>
                    <div className={styles.metricValue}>{metrics.structureNeedScore}/100</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>{t.kb_metric_chunk}</div>
                    <div className={styles.metricValue}>{metrics.recommendedChunkMinutes} {t.kb_metric_chunk_unit}</div>
                  </div>
                </div>

                <div className={styles.footer}>
                  <button type="button" className={styles.backBtn} onClick={() => setStep(4)}>{tr.common.back}</button>
                  <button type="button" className="btn btn-primary" onClick={() => setStep(6)}>{tr.common.next}</button>
                </div>
              </>
            )}
          </>
        )}

        {/* Step 6: Final */}
        {step === 6 && (
          <>
            <h1 className={styles.stepTitle}>{t.step4_title}</h1>
            <p className={styles.stepDesc}>{t.step4_desc}</p>

            <div className={styles.summaryBox}>
              <div style={{ marginBottom: 6 }}><strong>{t.step4_interests_label}:</strong> {interests.join(', ')}</div>
              <div><strong>{t.step4_energy_label}:</strong> {tr.energy[String(energy) as keyof typeof tr.energy].label}</div>
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(5)}>{tr.common.back}</button>
              <button type="button" className="btn btn-primary btn-lg" disabled={starting} onClick={finish}>
                {starting ? t.starting : t.start_button}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
