'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setStore, seedDemoData, genId } from '../../lib/storage';
import { XP_REWARDS } from '../../lib/gamification';
import { useLang } from '../../contexts/providers';
import { translations } from '../../lib/i18n';
import styles from './onboarding.module.css';

const AVATARS = ['🧠', '🦋', '⚡', '🌊', '🔥', '🌙', '🦄', '🎯'];

const INTEREST_OPTIONS = [
  { id: 'anime', label: 'Anime / Manga', emoji: '⚔️' },
  { id: 'game', label: 'Gaming', emoji: '🎮' },
  { id: 'masak', label: 'Memasak', emoji: '🍳' },
  { id: 'musik', label: 'Musik', emoji: '🎵' },
  { id: 'olahraga', label: 'Olahraga', emoji: '💪' },
  { id: 'film', label: 'Film / Series', emoji: '🎬' },
  { id: 'baca', label: 'Membaca', emoji: '📚' },
  { id: 'seni', label: 'Seni / Desain', emoji: '🎨' },
  { id: 'tech', label: 'Teknologi', emoji: '💻' },
  { id: 'travel', label: 'Traveling', emoji: '✈️' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { lang } = useLang();
  const tr = translations[lang];

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🧠');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestKeywords, setInterestKeywords] = useState('');
  const [energy, setEnergy] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    const keywords = interestKeywords.split(',').map((s) => s.trim()).filter(Boolean);

    setStore((prev) => ({
      ...prev,
      profile: {
        name: name.trim() || 'User',
        avatar,
        interests: selectedInterests,
        interestKeywords: keywords.length > 0 ? keywords : selectedInterests,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
      },
      currentEnergy: energy,
      totalXP: XP_REWARDS.DAILY_LOGIN,
      lastActiveDate: new Date().toISOString(),
      streak: 1,
      xpHistory: [
        {
          id: genId(),
          amount: XP_REWARDS.DAILY_LOGIN,
          reason: 'Welcome to NeuroPulse! 🎉',
          timestamp: new Date().toISOString(),
        },
      ],
    }));
    seedDemoData();
    router.push('/dashboard');
  };

  const ENERGY_OPTIONS = [1, 2, 3, 4, 5] as const;

  return (
    <div className={styles.container}>
      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <div className={styles.inner}>
        {/* Step 1 — Name & Avatar */}
        {step === 1 && (
          <div className={`${styles.step} animate-fade`}>
            <div className={styles.stepBadge}>1 {tr.onboarding.step_of} 4</div>
            <h1 className={styles.heading}>{tr.onboarding.step1_title} 👋</h1>
            <p className={styles.sub}>{tr.onboarding.step1_desc}</p>

            <div className={styles.avatarGrid}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  className={`${styles.avatarBtn} ${avatar === a ? styles.avatarSelected : ''}`}
                  onClick={() => setAvatar(a)}
                  type="button"
                  aria-label={`Select avatar ${a}`}
                  aria-pressed={avatar === a}
                >
                  {a}
                </button>
              ))}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{tr.onboarding.step1_name_label}</label>
              <input
                className="input"
                type="text"
                placeholder={tr.onboarding.step1_name_placeholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
              />
            </div>

            <button className="btn btn-primary btn-lg btn-full" onClick={() => setStep(2)}>
              {tr.common.next} →
            </button>
          </div>
        )}

        {/* Step 2 — Interests */}
        {step === 2 && (
          <div className={`${styles.step} animate-fade`}>
            <div className={styles.stepBadge}>2 {tr.onboarding.step_of} 4</div>
            <h1 className={styles.heading}>{tr.onboarding.step2_title} ✨</h1>
            <p className={styles.sub}>{tr.onboarding.step2_desc}</p>

            <div className={styles.interestGrid}>
              {INTEREST_OPTIONS.map((opt) => {
                const isSelected = selectedInterests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    className={`${styles.interestCard} ${isSelected ? styles.interestSelected : ''}`}
                    onClick={() => toggleInterest(opt.id)}
                    type="button"
                    aria-pressed={isSelected}
                  >
                    <span className={styles.interestEmoji}>{opt.emoji}</span>
                    <span className={styles.interestLabel}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{tr.onboarding.step2_keywords_label} <span className="text-muted">(optional)</span></label>
              <input
                className="input"
                type="text"
                placeholder={tr.onboarding.step2_keywords_placeholder}
                value={interestKeywords}
                onChange={(e) => setInterestKeywords(e.target.value)}
              />
              <p className="hint">{tr.onboarding.step2_keywords_hint}</p>
            </div>

            <div className="flex gap-3">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(1)}>← {tr.common.back}</button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setStep(3)}>
                {tr.common.next} →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Energy */}
        {step === 3 && (
          <div className={`${styles.step} animate-fade`}>
            <div className={styles.stepBadge}>3 {tr.onboarding.step_of} 4</div>
            <h1 className={styles.heading}>{tr.onboarding.step3_title} 🔋</h1>
            <p className={styles.sub}>{tr.onboarding.step3_desc}</p>

            <div className={styles.energyGrid}>
              {ENERGY_OPTIONS.map((level) => {
                const opt = tr.energy[String(level) as keyof typeof tr.energy];
                const isSelected = energy === level;
                return (
                  <button
                    key={level}
                    className={`${styles.energyCard} ${isSelected ? styles.energySelected : ''}`}
                    onClick={() => setEnergy(level)}
                    type="button"
                    aria-pressed={isSelected}
                  >
                    <span className={styles.energyEmoji}>{opt.emoji}</span>
                    <div className={styles.energyText}>
                      <div className={styles.energyLabel}>{opt.label}</div>
                      <div className={styles.energyDesc}>{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button className="btn btn-outline btn-lg" onClick={() => setStep(2)}>← {tr.common.back}</button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setStep(4)}>
                {tr.common.next} →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Final */}
        {step === 4 && (
          <div className={`${styles.step} ${styles.finalStep} animate-fade`}>
            <div className={styles.stepBadge}>4 {tr.onboarding.step_of} 4</div>
            <div className={styles.finalAvatar}>{avatar}</div>
            <h1 className={styles.heading}>
              {name.trim() || 'Hey'},<br />{tr.onboarding.step4_title} 💛
            </h1>
            <p className={styles.sub}>{tr.onboarding.step4_desc}</p>

            <div className={styles.summaryCards}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>✨ {tr.onboarding.step4_interests_label}</span>
                <span className={styles.summaryValue}>
                  {selectedInterests.length > 0
                    ? selectedInterests.map((id) => INTEREST_OPTIONS.find((o) => o.id === id)?.emoji).join(' ')
                    : '—'}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>⚡ {tr.onboarding.step4_energy_label}</span>
                <span className={styles.summaryValue}>{tr.energy[String(energy) as keyof typeof tr.energy].label}</span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-xl btn-full"
              onClick={handleComplete}
              disabled={isSubmitting}
            >
              {isSubmitting ? tr.onboarding.starting : tr.onboarding.start_button}
            </button>

            <p className="hint" style={{ textAlign: 'center', marginTop: '1rem' }}>
              {tr.onboarding.tagline}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
