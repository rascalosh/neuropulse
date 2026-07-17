'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { getStore } from '../lib/storage';
import { getMascotSrc } from '../lib/mascot';
import { createClient } from '../utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useLang } from '../contexts/providers';
import { translations } from '../lib/i18n';
import { getLevelInfo } from '../lib/gamification';
import {
  IconArrowRight, IconCheckSquare, IconGift,
  IconEye, IconMessageCircle, IconZap, IconFileText,
  IconMoon, IconSun, IconBrain, IconCheck, IconSparkles,
  IconHeart, IconLeaf, IconLightbulb, IconBatteryLow, IconBatteryFull, IconFlame,
  IconStar, IconTrophy, IconLock,
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
    sub: 'NeuroPulse memecah task besar jadi langkah kecil, memberi reward dopamin, dan menyesuaikan diri dengan energimu — bukan sebaliknya. Tanpa penilaian.',
    ctaPrimary: 'Mulai Sekarang — Gratis',
    ctaSecondary: 'Aku sudah punya akun',
    trust: ['Setup 2 menit', 'Tanpa penilaian', 'Streak tidak bisa gagal'],
    heroAlt: 'Pulse, maskot NeuroPulse — boneka otak lucu yang tersenyum',
    meetKicker: 'Kenalan dulu',
    meetTitle: 'Ini Pulse, teman barumu',
    meetDesc: 'Pulse ikut menyesuaikan diri dengan energimu — bukan memaksamu menyesuaikan diri dengannya.',
    meetPrompt: 'Coba klik level energi di bawah ini:',
    meetNote: 'Di dalam aplikasi, strategi harian dan tampilan ikut beradaptasi dengan level energimu.',
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
      { title: 'Tanpa penilaian', desc: 'Tidak ada kata "malas" di sini — hanya strategi yang belum cocok.' },
      { title: 'Istirahat itu valid', desc: 'Streak tidak bisa gagal. Jeda bukan kegagalan, tapi bagian dari ritme.' },
      { title: 'Kecil itu kuat', desc: 'Mulai dari langkah 5 menit. Momentum mengalahkan kesempurnaan.' },
    ],
    gamKicker: 'Bikin nagih (yang bagus)',
    gamTitle: 'Progresmu jadi terasa seperti game',
    gamSub: 'Tiap micro-task yang selesai kasih XP, naikin level, dan jaga streak-mu — biar otakmu dapet reward instan yang dia suka.',
    gamLevelName: 'Tunas',
    gamCards: [
      { title: 'XP & Level', desc: 'Dari "Benih" sampai "Mythic" — 8 level yang bikin progres jangka panjang kelihatan nyata.' },
      { title: 'Streak anti-gagal', desc: 'Streak tidak reset gara-gara satu hari off. Konsistensi dirayakan, bukan dihukum.' },
      { title: 'Achievement & badge', desc: 'Unlock badge kayak "Centurion" atau "Explorer" tiap kali kamu ngelewatin milestone.' },
    ],
    priceKicker: 'Harga',
    priceTitle: '4 paket, mulai dari gratis',
    priceSub: 'Semua paket punya fitur inti NeuroPulse. Makin tinggi paketnya, makin longgar batasnya — dan makin murah sesi psikolognya.',
    priceBillingNote: 'Harga per bulan, bisa cancel kapan saja.',
    plans: [
      {
        tier: 'free',
        name: 'Gratis',
        price: 'Rp0',
        period: '/selamanya',
        desc: 'Buat kenalan dulu sama NeuroPulse.',
        features: [
          'Task Decomposer 15x/bulan',
          'Bionic Reading 20x/bulan',
          '1 Laporan Klinis/bulan',
          'Focus Mirror 25 menit (fixed)',
          'Sesi psikolog pertama gratis, lalu Rp150rb/sesi',
        ],
        cta: 'Mulai Gratis',
        highlight: false,
        badge: '',
      },
      {
        tier: 'murah',
        name: 'Murah',
        price: 'Rp29rb',
        period: '/bulan',
        desc: 'Buat yang mulai kepake tiap hari.',
        features: [
          'Task Decomposer 60x/bulan',
          'Bionic Reading 100x/bulan',
          '2 Laporan Klinis/bulan',
          'Focus Mirror pilih 25/45 menit',
          'Sesi psikolog diskon 10%',
        ],
        cta: 'Pilih Murah',
        highlight: false,
        badge: '',
      },
      {
        tier: 'standar',
        name: 'Standar',
        price: 'Rp79rb',
        period: '/bulan',
        desc: 'Paling seimbang buat pemakaian rutin.',
        features: [
          'Task Decomposer & Bionic Reading tanpa batas',
          '4 Laporan Klinis/bulan',
          'Focus Mirror custom 10–90 menit',
          'Sesi psikolog diskon 25%',
        ],
        cta: 'Pilih Standar',
        highlight: true,
        badge: 'Paling populer',
      },
      {
        tier: 'mahal',
        name: 'Mahal',
        price: 'Rp199rb',
        period: '/bulan',
        desc: 'Buat yang mau dampingan psikolog rutin.',
        features: [
          'Semua fitur tanpa batas',
          'Laporan Klinis otomatis tiap sesi',
          'Focus Mirror custom 10–120 menit + preset',
          'Sesi psikolog diskon 40% + 1 gratis/bulan',
        ],
        cta: 'Pilih Mahal',
        highlight: false,
        badge: '',
      },
    ],
    priceFootnote: 'Pembayaran sekarang masih simulasi (mock) — belum ada uang beneran yang ditarik.',
    ctaTitle: 'Ready when you are',
    ctaDesc: 'Tidak perlu menunggu momen sempurna. Pulse sudah menunggumu.',
    ctaBtn: 'Mulai NeuroPulse',
    ctaHint: 'Gratis · Langsung jalan di browser',
    footerText: 'Dibuat dengan sepenuh hati untuk otak neurodivergen',
  },
  en: {
    login: 'Sign in',
    navCta: 'Start Free',
    badge: 'Designed for ADHD brains',
    titlePre: 'Work ',
    titleAccent: 'with your brain',
    titlePost: ', not against it.',
    sub: 'NeuroPulse breaks big tasks into tiny steps, rewards you with dopamine, and adapts to your energy — not the other way around. No judgment.',
    ctaPrimary: 'Start Now — Free',
    ctaSecondary: 'I already have an account',
    trust: ['2-minute setup', 'No judgment', 'Streaks can\'t break'],
    heroAlt: 'Pulse, the NeuroPulse mascot — a cute smiling brain plushie',
    meetKicker: 'Say hello',
    meetTitle: 'Meet Pulse, your new buddy',
    meetDesc: 'Pulse adapts to your energy — instead of forcing you to adapt to it.',
    meetPrompt: 'Try clicking an energy level below:',
    meetNote: 'Inside the app, your daily strategy and UI adapt to your energy level too.',
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
      { title: 'No judgment', desc: 'The word "lazy" doesn\'t exist here — only strategies that don\'t fit yet.' },
      { title: 'Rest is valid', desc: 'Streaks can\'t break. Pauses aren\'t failures — they\'re part of the rhythm.' },
      { title: 'Small is mighty', desc: 'Start with a 5-minute step. Momentum beats perfection.' },
    ],
    gamKicker: 'Made to be (a good kind of) addictive',
    gamTitle: 'Your progress feels like a game',
    gamSub: 'Every finished micro-task earns XP, levels you up, and keeps your streak alive — so your brain gets the instant reward it craves.',
    gamLevelName: 'Sprout',
    gamCards: [
      { title: 'XP & Levels', desc: 'From "Seed" to "Mythic" — 8 levels that make long-term progress feel real.' },
      { title: 'Unbreakable streaks', desc: 'One off day won\'t reset your streak. Consistency gets celebrated, not punished.' },
      { title: 'Achievements & badges', desc: 'Unlock badges like "Centurion" or "Explorer" every time you hit a milestone.' },
    ],
    priceKicker: 'Pricing',
    priceTitle: '4 plans, starting free',
    priceSub: 'Every plan gets NeuroPulse\'s core features. Higher plans get looser limits — and cheaper psychologist sessions.',
    priceBillingNote: 'Billed monthly, cancel anytime.',
    plans: [
      {
        tier: 'free',
        name: 'Free',
        price: '$0',
        period: '/forever',
        desc: 'Get to know NeuroPulse first.',
        features: [
          'Task Decomposer 15x/month',
          'Bionic Reading 20x/month',
          '1 Clinical Report/month',
          'Focus Mirror 25 min (fixed)',
          'First psychologist session free, then Rp150k/session',
        ],
        cta: 'Start Free',
        highlight: false,
        badge: '',
      },
      {
        tier: 'murah',
        name: 'Basic',
        price: 'Rp29k',
        period: '/month',
        desc: 'For when you start using it daily.',
        features: [
          'Task Decomposer 60x/month',
          'Bionic Reading 100x/month',
          '2 Clinical Reports/month',
          'Focus Mirror: choose 25/45 min',
          '10% off psychologist sessions',
        ],
        cta: 'Choose Basic',
        highlight: false,
        badge: '',
      },
      {
        tier: 'standar',
        name: 'Standard',
        price: 'Rp79k',
        period: '/month',
        desc: 'The best balance for regular use.',
        features: [
          'Unlimited Task Decomposer & Bionic Reading',
          '4 Clinical Reports/month',
          'Focus Mirror: custom 10–90 min',
          '25% off psychologist sessions',
        ],
        cta: 'Choose Standard',
        highlight: true,
        badge: 'Most popular',
      },
      {
        tier: 'mahal',
        name: 'Premium',
        price: 'Rp199k',
        period: '/month',
        desc: 'For regular psychologist support.',
        features: [
          'Everything unlimited',
          'Auto-generated Clinical Report per session',
          'Focus Mirror: custom 10–120 min + presets',
          '40% off psychologist sessions + 1 free/month',
        ],
        cta: 'Choose Premium',
        highlight: false,
        badge: '',
      },
    ],
    priceFootnote: 'Payment is currently simulated (mock) — no real money is charged yet.',
    ctaTitle: 'Ready when you are',
    ctaDesc: 'No need to wait for the perfect moment. Pulse is already waiting for you.',
    ctaBtn: 'Start NeuroPulse',
    ctaHint: 'Free · Runs right in your browser',
    footerText: 'Made with heart for neurodivergent brains',
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
const PRINCIPLE_ICONS = [IconHeart, IconLeaf, IconSparkles];

// Level 1-5: exhausted → low battery → medium → high energy → on fire.
const ENERGY_ICONS = [IconMoon, IconBatteryLow, IconZap, IconBatteryFull, IconFlame];

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
  const demoLevel = getLevelInfo(110);

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
            <span className={styles.heroBadge}><IconBrain size={14} /> {t.badge}</span>
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
                  <span className={styles.trustCheck} aria-hidden="true"><IconCheck size={12} /></span> {item}
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
            <span className={`${styles.sparkle} ${styles.sparkleA}`} aria-hidden="true"><IconSparkles size={22} /></span>
            <span className={`${styles.sparkle} ${styles.sparkleB}`} aria-hidden="true"><IconSparkles size={16} /></span>
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
                {(() => {
                  const EnergyIcon = ENERGY_ICONS[energy - 1] ?? IconZap;
                  return <EnergyIcon size={16} className={styles.bubbleIcon} />;
                })()}
                {energyInfo.desc}
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
                  const EnergyIcon = ENERGY_ICONS[lv - 1] ?? IconZap;
                  return (
                    <button
                      key={lv}
                      className={`${styles.energyBtn} ${energy === lv ? styles.energyBtnActive : ''}`}
                      onClick={() => setEnergy(lv)}
                      aria-pressed={energy === lv}
                    >
                      <span aria-hidden="true"><EnergyIcon size={14} /></span> {info.label}
                    </button>
                  );
                })}
              </div>
              <p className={styles.energyNote}><IconLightbulb size={13} className={styles.energyNoteIcon} /> {t.meetNote}</p>
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

        {/* ── Gamification showcase ── */}
        <section className={styles.section} aria-labelledby="gam-title">
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>{t.gamKicker}</span>
            <h2 id="gam-title" className={styles.sectionTitle}>{t.gamTitle}</h2>
            <p className={styles.sectionSub}>{t.gamSub}</p>
          </div>
          <div className={styles.gamPanel}>
            <div className={styles.gamShowcase}>
              <div className={styles.gamLevelBadge} style={{ '--lvl-color': demoLevel.color } as CSSProperties}>
                <IconStar size={20} />
                <span>Lvl {demoLevel.level}</span>
              </div>
              <p className={styles.gamLevelName}>{t.gamLevelName}</p>
              <div className={styles.gamXpBar}>
                <div className={styles.gamXpBarFill} style={{ width: `${demoLevel.progressPercent}%` }} />
              </div>
              <p className={styles.gamXpLabel}>
                <IconFlame size={13} className={styles.gamXpFlame} /> {demoLevel.currentXP} XP
                <span className={styles.gamXpNext}>· {demoLevel.xpToNext} {lang === 'id' ? 'lagi ke level berikutnya' : 'to next level'}</span>
              </p>
            </div>
            <div className={styles.gamCards}>
              {t.gamCards.map((card, i) => {
                const Icon = [IconStar, IconFlame, IconTrophy][i] ?? IconStar;
                return (
                  <div key={card.title} className={styles.gamCard}>
                    <div className={styles.gamCardIcon} aria-hidden="true"><Icon size={18} /></div>
                    <h3 className={styles.gamCardTitle}>{card.title}</h3>
                    <p className={styles.gamCardDesc}>{card.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Principles ── */}
        <section className={styles.section} aria-labelledby="principles-title">
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>{t.prinKicker}</span>
            <h2 id="principles-title" className={styles.sectionTitle}>{t.prinTitle}</h2>
          </div>
          <div className={styles.principlesGrid}>
            {t.principles.map((principle, i) => {
              const PrincipleIcon = PRINCIPLE_ICONS[i] ?? IconHeart;
              return (
                <div key={principle.title} className={`${styles.principleCard} ${PRINCIPLE_TINTS[i]}`}>
                  <div className={styles.principleEmoji} aria-hidden="true"><PrincipleIcon size={22} /></div>
                  <h3 className={styles.principleTitle}>{principle.title}</h3>
                  <p className={styles.principleDesc}>{principle.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className={styles.section} aria-labelledby="price-title">
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>{t.priceKicker}</span>
            <h2 id="price-title" className={styles.sectionTitle}>{t.priceTitle}</h2>
            <p className={styles.sectionSub}>{t.priceSub}</p>
          </div>
          <div className={styles.pricingGrid}>
            {t.plans.map((plan) => (
              <div
                key={plan.name}
                className={`${styles.priceCard} ${plan.highlight ? styles.priceCardHighlight : ''}`}
              >
                {plan.badge && <span className={styles.priceBadge}>{plan.badge}</span>}
                <h3 className={styles.priceName}>{plan.name}</h3>
                <p className={styles.priceAmount}>
                  {plan.price}<span className={styles.pricePeriod}>{plan.period}</span>
                </p>
                <p className={styles.priceDesc}>{plan.desc}</p>
                <ul className={styles.priceFeatures}>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <span className={styles.priceCheck} aria-hidden="true"><IconCheck size={13} /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/onboarding"
                  className={plan.highlight ? styles.btnPrimary : styles.btnSecondary}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className={styles.pricingFootnote}>
            <IconLock size={12} className={styles.pricingFootnoteIcon} /> {t.priceFootnote}
          </p>
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
            <h2 id="cta-title" className={styles.ctaTitle}>
              {t.ctaTitle} <IconHeart size={22} className={styles.ctaTitleIcon} />
            </h2>
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
        <p className={styles.footerText}>
          {t.footerText} <IconHeart size={13} className={styles.footerHeartIcon} />
        </p>
      </footer>
    </div>
  );
}
