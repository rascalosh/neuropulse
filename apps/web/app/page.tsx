'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStore } from '../lib/storage';
import { getMascotSrc } from '../lib/mascot';
import { createClient } from '../utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useLang } from '../contexts/providers';
import { translations } from '../lib/i18n';
import {
  IconArrowRight, IconCheckSquare, IconGift,
  IconEye, IconMessageCircle, IconZap, IconFileText,
  IconMoon, IconSun,
} from '../components/Icons';
import styles from './landing.module.css';

const COPY = {
  id: {
    login: 'Masuk',
    navCta: 'Mulai Gratis',
    badge: 'Dirancang untuk otak ADHD',
    titlePre: 'Kerja ',
    titleAccent: 'bareng otakmu',
    titlePost: ', bukan melawannya.',
    sub: 'NeuroPulse memecah task besar jadi langkah kecil, memberi reward dopamin, dan menyesuaikan diri dengan energimu — bukan sebaliknya. Tanpa penilaian. 💛',
    ctaPrimary: 'Mulai Sekarang — Gratis',
    ctaSecondary: 'Aku sudah punya akun',
    trust: ['Setup 2 menit', 'Tanpa penilaian', 'Streak tidak bisa gagal'],
    heroAlt: 'Pulse, maskot NeuroPulse — boneka otak lucu yang tersenyum',
    meetKicker: 'Kenalan dulu',
    meetTitle: 'Ini Pulse, teman barumu 👋',
    meetDesc: 'Pulse ikut menyesuaikan diri dengan energimu — bukan memaksamu menyesuaikan diri dengannya.',
    meetPrompt: 'Coba klik level energi di bawah ini:',
    meetNote: '💡 Di dalam aplikasi, strategi harian dan tampilan ikut beradaptasi dengan level energimu.',
    featKicker: 'Fitur',
    featTitle: 'Dibuat untuk cara kerja otakmu',
    featSub: 'Bukan aplikasi produktivitas biasa — setiap fitur dirancang dari pola ADHD yang nyata.',
    features: [
      { title: 'Task Decomposer', desc: 'Tulis task besar, AI memecahnya jadi langkah 5-menit yang langsung bisa dikerjakan.' },
      { title: 'Dopamine Menu', desc: 'Reward acak ala gacha tiap menyelesaikan sesuatu. Otakmu suka kejutan.' },
      { title: 'Focus Mirror', desc: 'Pantau pola fokusmu langsung di perangkat — tanpa data yang dikirim keluar.' },
      { title: 'Body Double', desc: 'Kerja bareng orang lain secara virtual. Kehadiran bikin mulai jadi lebih gampang.' },
      { title: 'Energy Check-in', desc: 'Cek energi harianmu, dan biarkan strategi hari itu menyesuaikan — bukan memaksa.' },
      { title: 'Laporan Klinis', desc: 'Rangkuman perilaku yang siap dibagikan ke psikolog atau psikiatermu.' },
    ],
    prinKicker: 'Prinsip kami',
    prinTitle: 'Tanpa rasa bersalah. Serius.',
    principles: [
      { emoji: '💛', title: 'Tanpa penilaian', desc: 'Tidak ada kata "malas" di sini — hanya strategi yang belum cocok.' },
      { emoji: '🌱', title: 'Istirahat itu valid', desc: 'Streak tidak bisa gagal. Jeda bukan kegagalan, tapi bagian dari ritme.' },
      { emoji: '✨', title: 'Kecil itu kuat', desc: 'Mulai dari langkah 5 menit. Momentum mengalahkan kesempurnaan.' },
    ],
    ctaTitle: 'Ready when you are 💛',
    ctaDesc: 'Tidak perlu menunggu momen sempurna. Pulse sudah menunggumu.',
    ctaBtn: 'Mulai NeuroPulse',
    ctaHint: 'Gratis · Langsung jalan di browser',
    footerText: 'Dibuat dengan 💛 untuk otak neurodivergen',
  },
  en: {
    login: 'Sign in',
    navCta: 'Start Free',
    badge: 'Designed for ADHD brains',
    titlePre: 'Work ',
    titleAccent: 'with your brain',
    titlePost: ', not against it.',
    sub: 'NeuroPulse breaks big tasks into tiny steps, rewards you with dopamine, and adapts to your energy — not the other way around. No judgment. 💛',
    ctaPrimary: 'Start Now — Free',
    ctaSecondary: 'I already have an account',
    trust: ['2-minute setup', 'No judgment', 'Streaks can\'t break'],
    heroAlt: 'Pulse, the NeuroPulse mascot — a cute smiling brain plushie',
    meetKicker: 'Say hello',
    meetTitle: 'Meet Pulse, your new buddy 👋',
    meetDesc: 'Pulse adapts to your energy — instead of forcing you to adapt to it.',
    meetPrompt: 'Try clicking an energy level below:',
    meetNote: '💡 Inside the app, your daily strategy and UI adapt to your energy level too.',
    featKicker: 'Features',
    featTitle: 'Built for how your brain works',
    featSub: 'Not your average productivity app — every feature is designed around real ADHD patterns.',
    features: [
      { title: 'Task Decomposer', desc: 'Write a big task and AI breaks it into 5-minute steps you can start right away.' },
      { title: 'Dopamine Menu', desc: 'Gacha-style random rewards every time you finish something. Your brain loves surprises.' },
      { title: 'Focus Mirror', desc: 'See your focus patterns, processed entirely on your device — nothing sent out.' },
      { title: 'Body Double', desc: 'Work alongside others virtually. Presence makes starting so much easier.' },
      { title: 'Energy Check-in', desc: 'Check your daily energy and let the day\'s strategy adapt — no forcing.' },
      { title: 'Clinical Report', desc: 'A behavioral summary ready to share with your psychologist or psychiatrist.' },
    ],
    prinKicker: 'Our principles',
    prinTitle: 'Guilt-free. Seriously.',
    principles: [
      { emoji: '💛', title: 'No judgment', desc: 'The word "lazy" doesn\'t exist here — only strategies that don\'t fit yet.' },
      { emoji: '🌱', title: 'Rest is valid', desc: 'Streaks can\'t break. Pauses aren\'t failures — they\'re part of the rhythm.' },
      { emoji: '✨', title: 'Small is mighty', desc: 'Start with a 5-minute step. Momentum beats perfection.' },
    ],
    ctaTitle: 'Ready when you are 💛',
    ctaDesc: 'No need to wait for the perfect moment. Pulse is already waiting for you.',
    ctaBtn: 'Start NeuroPulse',
    ctaHint: 'Free · Runs right in your browser',
    footerText: 'Made with 💛 for neurodivergent brains',
  },
} as const;

const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;

const FEATURE_ICONS = [
  { Icon: IconCheckSquare, tint: styles.tintBlue },
  { Icon: IconGift, tint: styles.tintPink },
  { Icon: IconEye, tint: styles.tintPurple },
  { Icon: IconMessageCircle, tint: styles.tintGreen },
  { Icon: IconZap, tint: styles.tintAmber },
  { Icon: IconFileText, tint: styles.tintSky },
];

const PRINCIPLE_TINTS = [styles.tintAmber, styles.tintGreen, styles.tintPurple];

export default function LandingPage() {
  const { lang, setLang } = useLang();
  const t = COPY[lang];
  const tr = translations[lang];
  const [energy, setEnergy] = useState(3);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [user, setUser] = useState<User | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Same key + light-first default as the in-app TopBar toggle, so the
  // preference carries over between the landing page and the app
  useEffect(() => {
    const saved = localStorage.getItem('neuropulse-theme');
    const initial = saved === 'dark' ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('neuropulse-theme', next);
  };

  // Check login and onboarding completion status
  useEffect(() => {
    const store = getStore();
    setOnboardingCompleted(!!store.profile?.onboardingCompleted);

    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        // Supabase unavailable / not signed in — show the landing page
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const energyInfo = tr.energy[String(energy) as keyof typeof tr.energy];

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="NeuroPulse">
            <span className={styles.brandIcon} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className={styles.brandLogo} />
            </span>
            <span className={styles.brandName}>NeuroPulse</span>
          </Link>
          <div className={styles.headerRight}>
            <div className={styles.langToggle} role="group" aria-label="Language switcher">
              <button
                className={`${styles.langBtn} ${lang === 'id' ? styles.langActive : ''}`}
                onClick={() => setLang('id')}
                aria-pressed={lang === 'id'}
                lang="id"
              >
                ID
              </button>
              <button
                className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                lang="en"
              >
                EN
              </button>
            </div>
            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-pressed={theme === 'dark'}
              aria-label={
                theme === 'dark'
                  ? lang === 'id' ? 'Ganti ke mode terang' : 'Switch to light mode'
                  : lang === 'id' ? 'Ganti ke mode gelap' : 'Switch to dark mode'
              }
              title={
                theme === 'dark'
                  ? lang === 'id' ? 'Mode terang' : 'Light mode'
                  : lang === 'id' ? 'Mode gelap' : 'Dark mode'
              }
            >
              {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </button>
            {!loading && user ? (
              <Link
                href={onboardingCompleted ? '/dashboard' : '/onboarding'}
                className={`${styles.btnPrimary} ${styles.btnSm}`}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.loginLink}>{t.login}</Link>
                <Link href="/onboarding" className={`${styles.btnPrimary} ${styles.btnSm}`}>
                  {t.navCta}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>🧠 {t.badge}</span>
            <h1 className={styles.heroTitle}>
              {t.titlePre}
              <span className={styles.accent}>{t.titleAccent}</span>
              {t.titlePost}
            </h1>
            <p className={styles.heroSub}>{t.sub}</p>
            <div className={styles.ctaRow}>
              {!loading && user ? (
                <Link
                  href={onboardingCompleted ? '/dashboard' : '/onboarding'}
                  className={styles.btnPrimary}
                >
                  {lang === 'id' ? 'Ke Dashboard' : 'Go to Dashboard'} <IconArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link href="/onboarding" className={styles.btnPrimary}>
                    {t.ctaPrimary} <IconArrowRight size={18} />
                  </Link>
                  <Link href="/login" className={styles.btnSecondary}>{t.ctaSecondary}</Link>
                </>
              )}
            </div>
            <div className={styles.trustRow}>
              {t.trust.map((item) => (
                <span key={item} className={styles.trustItem}>
                  <span className={styles.trustCheck} aria-hidden="true">✓</span> {item}
                </span>
              ))}
            </div>
          </div>
          <div className={styles.heroArt} aria-hidden="false">
            <div className={styles.heroGlow} aria-hidden="true" />
            <span className={`${styles.dot} ${styles.dotMint}`} aria-hidden="true" />
            <span className={`${styles.dot} ${styles.dotPeach}`} aria-hidden="true" />
            <span className={`${styles.dot} ${styles.dotYellow}`} aria-hidden="true" />
            <span className={`${styles.dot} ${styles.dotBlue}`} aria-hidden="true" />
            <span className={`${styles.sparkle} ${styles.sparkleA}`} aria-hidden="true">✨</span>
            <span className={`${styles.sparkle} ${styles.sparkleB}`} aria-hidden="true">✨</span>
            <img
              src="/brainlandingpage.png"
              alt={t.heroAlt}
              className={styles.mascotHero}
              width={575}
              height={567}
            />
          </div>
        </section>

        {/* ── Meet Pulse: interactive energy demo ── */}
        <section className={styles.section} aria-labelledby="meet-title">
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>{t.meetKicker}</span>
            <h2 id="meet-title" className={styles.sectionTitle}>{t.meetTitle}</h2>
            <p className={styles.sectionSub}>{t.meetDesc}</p>
          </div>
          <div className={styles.energyPanel}>
            <div className={styles.energyStage}>
              <div key={energy} className={styles.bubble}>
                {energyInfo.emoji} {energyInfo.desc}
              </div>
              {ENERGY_LEVELS.map((lv) => {
                const info = tr.energy[String(lv) as keyof typeof tr.energy];
                return (
                  <img
                    key={lv}
                    src={getMascotSrc(lv)}
                    alt={energy === lv ? `Pulse — ${info.label}` : ''}
                    className={`${styles.energyImg} ${energy === lv ? styles.energyImgActive : ''}`}
                    width={575}
                    height={567}
                    loading="lazy"
                  />
                );
              })}
            </div>
            <div className={styles.energyControls}>
              <p className={styles.energyPrompt}>{t.meetPrompt}</p>
              <div className={styles.energyBtns} role="group" aria-label="Energy level demo">
                {ENERGY_LEVELS.map((lv) => {
                  const info = tr.energy[String(lv) as keyof typeof tr.energy];
                  return (
                    <button
                      key={lv}
                      className={`${styles.energyBtn} ${energy === lv ? styles.energyBtnActive : ''}`}
                      onClick={() => setEnergy(lv)}
                      aria-pressed={energy === lv}
                    >
                      <span aria-hidden="true">{info.emoji}</span> {info.label}
                    </button>
                  );
                })}
              </div>
              <p className={styles.energyNote}>{t.meetNote}</p>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className={styles.section} aria-labelledby="features-title">
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>{t.featKicker}</span>
            <h2 id="features-title" className={styles.sectionTitle}>{t.featTitle}</h2>
            <p className={styles.sectionSub}>{t.featSub}</p>
          </div>
          <div className={styles.featuresGrid}>
            {t.features.map((feature, i) => {
              const { Icon, tint } = FEATURE_ICONS[i]!;
              return (
                <div key={feature.title} className={`${styles.featureCard} ${tint}`}>
                  <div className={styles.featureIcon} aria-hidden="true"><Icon size={20} /></div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDesc}>{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Principles ── */}
        <section className={styles.section} aria-labelledby="principles-title">
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>{t.prinKicker}</span>
            <h2 id="principles-title" className={styles.sectionTitle}>{t.prinTitle}</h2>
          </div>
          <div className={styles.principlesGrid}>
            {t.principles.map((principle, i) => (
              <div key={principle.title} className={`${styles.principleCard} ${PRINCIPLE_TINTS[i]}`}>
                <div className={styles.principleEmoji} aria-hidden="true">{principle.emoji}</div>
                <h3 className={styles.principleTitle}>{principle.title}</h3>
                <p className={styles.principleDesc}>{principle.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className={styles.ctaSection} aria-labelledby="cta-title">
          <div className={styles.ctaCard}>
            <span className={styles.ctaClip} aria-hidden="true">
              <span className={`${styles.ctaDeco} ${styles.ctaDecoA}`} />
              <span className={`${styles.ctaDeco} ${styles.ctaDecoB}`} />
            </span>
            <img
              src="/onfire.png"
              alt=""
              aria-hidden="true"
              className={styles.ctaMascot}
              width={575}
              height={567}
              loading="lazy"
            />
            <h2 id="cta-title" className={styles.ctaTitle}>{t.ctaTitle}</h2>
            <p className={styles.ctaDesc}>{t.ctaDesc}</p>
            {!loading && user ? (
              <Link
                href={onboardingCompleted ? '/dashboard' : '/onboarding'}
                className={styles.ctaBtn}
              >
                {lang === 'id' ? 'Ke Dashboard' : 'Go to Dashboard'} <IconArrowRight size={18} />
              </Link>
            ) : (
              <Link href="/onboarding" className={styles.ctaBtn}>
                {t.ctaBtn} <IconArrowRight size={18} />
              </Link>
            )}
            <span className={styles.ctaHint}>{t.ctaHint}</span>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.brandIcon} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className={styles.brandLogo} />
          </span>
          NeuroPulse
        </div>
        <p className={styles.footerText}>{t.footerText}</p>
      </footer>
    </div>
  );
}
