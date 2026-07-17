'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useStorage } from '../../../hooks/useStorage';
import { useContextSwitch } from '../../../hooks/useContextSwitch';
import { getLevelInfo, XP_REWARDS } from '../../../lib/gamification';
import { checkTaskDecay, checkChronicStuck, genId, getTodayStr, type Task } from '../../../lib/storage';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import { getMascotSrc } from '../../../lib/mascot';
import {
  IconCheckSquare, IconHeart, IconGift, IconActivity,
  IconArrowRight, IconPlus, IconPlay, IconAlertTriangle, IconClock,
  IconFlame, IconEye, IconCheck, IconMessageCircle, IconTarget, IconZap, IconCalendar, IconSmile,
} from '../../../components/Icons';
import styles from './dashboard.module.css';

const ENERGY_COLORS: Record<number, string> = {
  1: 'var(--mood-1)', 2: 'var(--mood-2)', 3: 'var(--mood-3)', 4: 'var(--mood-4)', 5: 'var(--mood-5)',
};
const MOOD_WARN_COLORS: Record<string, string> = {
  normal: 'var(--color-success)',
  at_risk: 'var(--color-warning)',
  crisis: 'var(--color-error)',
};

function EnergyMeter({ level }: { level: number }) {
  return (
    <span className={styles.energyMeter} style={{ '--energy-color': ENERGY_COLORS[level] ?? ENERGY_COLORS[3] } as CSSProperties}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`${styles.energyBar} ${i <= level ? styles.energyBarFilled : ''}`} />
      ))}
    </span>
  );
}

export default function DashboardPage() {
  const [store, update] = useStorage();
  const { switchCount, totalLostSeconds } = useContextSwitch();
  const [greeting, setGreeting] = useState('');
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  const { lang } = useLang();
  const tr = translations[lang];
  const [mounted, setMounted] = useState(false);
  const [randomQuote, setRandomQuote] = useState({ text: '', source: '' });

  useEffect(() => {
    setMounted(true);
    const quotes = lang === 'id' ? [
      {
        text: "Memiliki otak ADHD itu seperti memiliki mesin mobil balap Ferrari dengan rem sepeda mini. Kamu memiliki kapasitas luar biasa untuk berpikir kreatif dan cepat, tugasmu hanyalah belajar membangun kekuatan rem tersebut agar kamu bisa mengendalikan ke mana mesin hebatmu akan melaju.",
        source: "Dr. Edward Hallowell"
      },
      {
        text: "Jangan paksa dirimu untuk muat dalam cetakan kotak orang neurotipikal. Otakmu adalah sebuah galaksi dengan pola berputar yang unik. Rayakan setiap lompatan ide, temukan ritme kerjamu sendiri, dan biarkan keunikanmu menjadi kekuatan terbesarmu.",
        source: "Sark"
      },
      {
        text: "Prokrastinasi bagi ADHD bukanlah bentuk malas atau kurang motivasi, melainkan respons emosional saat menghadapi tugas yang terlihat luar biasa besar. Sadarilah itu, maafkan dirimu, dan mulailah memecah tugas tersebut menjadi langkah-langkah mikro yang ramah untuk otakmu.",
        source: "Dr. Tamara Rosier"
      },
      {
        text: "Setiap orang adalah jenius. Namun jika kamu menilai seekor ikan dari kemampuannya memanjat pohon, ia akan menjalani hidupnya dengan percaya bahwa ia bodoh. Temukan pohonmu sendiri, atau lebih baik lagi, berenanglah bebas di samudera luas yang menjadi tempatmu bersinar.",
        source: "Albert Einstein"
      }
    ] : [
      {
        text: "Having an ADHD brain is like having a Ferrari race car engine with bicycle brakes. You have an incredible capacity for fast, creative thinking; your only challenge is learning to build stronger brakes so you can control where that amazing engine takes you.",
        source: "Dr. Edward Hallowell"
      },
      {
        text: "Do not force yourself to fit into the square mold of neurotypical expectations. Your brain is a galaxy with unique swirling patterns. Celebrate every leap of thought, discover your own workflow rhythm, and let your uniqueness be your superpower.",
        source: "Sark"
      },
      {
        text: "Procrastination for ADHD is not laziness or lack of motivation; it is an emotional response to an overwhelming task. Recognize this, forgive yourself, and begin breaking that mountain down into small, brain-friendly micro-steps.",
        source: "Dr. Tamara Rosier"
      },
      {
        text: "Everybody is a genius. But if you judge a fish by its ability to climb a tree, it will live its whole life believing that it is stupid. Find your own tree, or better yet, swim freely in the vast ocean where you were always meant to shine.",
        source: "Albert Einstein"
      }
    ];
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setRandomQuote(quotes[randomIndex] || quotes[0]);
  }, [lang]);

  const levelInfo = getLevelInfo(store.totalXP);

  const activeTasks = store.tasks.filter((t) => t.status === 'active');
  const decayingTasks = activeTasks.filter(checkTaskDecay);
  const chronicStuckTasks = activeTasks.filter(checkChronicStuck);

  const isLowEnergy = store.currentEnergy <= 2;
  const currentFocus = isLowEnergy
    ? [...activeTasks].sort((a, b) => (a.microTasks.length - a.completedCount) - (b.microTasks.length - b.completedCount))[0]
    : activeTasks[0];
  const nextMicroTask = currentFocus?.microTasks.find((m) => !m.completed);

  const completedToday = store.tasks.filter((t) => {
    if (t.status !== 'completed') return false;
    const today = new Date().toDateString();
    return new Date(t.microTasks.find((m) => m.completedAt)?.completedAt ?? 0).toDateString() === today;
  });

  // Today's mood
  const todayMood = store.moodLog.find((m) => m.date === getTodayStr());

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting(tr.dashboard.greeting_morning);
    else if (h < 18) setGreeting(tr.dashboard.greeting_afternoon);
    else setGreeting(tr.dashboard.greeting_evening);

    const lastActive = store.lastActiveDate;
    const today = new Date().toDateString();
    if (lastActive && new Date(lastActive).toDateString() !== today) {
      update((prev) => ({
        ...prev,
        totalXP: prev.totalXP + XP_REWARDS.DAILY_LOGIN,
        lastActiveDate: new Date().toISOString(),
        xpHistory: [...prev.xpHistory, { id: genId(), amount: XP_REWARDS.DAILY_LOGIN, reason: 'Login harian', timestamp: new Date().toISOString() }],
      }));
      setXpToast(`+${XP_REWARDS.DAILY_LOGIN} XP — Login!`);
      setTimeout(() => setXpToast(null), 3000);
    }
  }, [lang, tr]);

  const lostMinutes = Math.round(totalLostSeconds / 60);
  const focusScore = Math.max(10, 100 - switchCount * 4);

  if (!mounted) return null;

  const focusPercent = currentFocus ? Math.round((currentFocus.completedCount / currentFocus.microTasks.length) * 100) : 0;
  const todayTaskCount = activeTasks.length + completedToday.length;
  const todayProgressPercent = todayTaskCount > 0 ? Math.round((completedToday.length / todayTaskCount) * 100) : 0;

  const addQuickTask = () => {
    const title = quickAddTitle.trim();
    if (!title) return;
    const taskId = genId();
    const now = new Date().toISOString();
    const microTaskId = genId();
    const newTask: Task = {
      id: taskId,
      title,
      microTasks: [{
        id: microTaskId,
        parentTaskId: taskId,
        title,
        estimatedMinutes: 10,
        completed: false,
        viewCount: 0,
        editCount: 0,
        createdAt: now,
      }],
      totalEstimatedMinutes: 10,
      completedCount: 0,
      status: 'active',
      viewCount: 0,
      lastViewedAt: now,
      createdAt: now,
    };
    update((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
    setQuickAddTitle('');
  };

  const QUICK_ACTIONS = [
    { href: '/tasks', icon: IconPlus, label: lang === 'id' ? 'Task Baru' : 'New Task', sub: lang === 'id' ? 'Pecah jadi langkah' : 'Decompose it', bg: '#EFF6FF', iconColor: '#2563EB' },
    { href: '/focus-mirror', icon: IconEye, label: lang === 'id' ? 'Focus Room' : 'Focus Room', sub: lang === 'id' ? 'Sesi 25 menit' : '25-min session', bg: '#EEF2FF', iconColor: '#6366F1' },
    { href: '/dopamine', icon: IconGift, label: lang === 'id' ? 'Hadiah' : 'Reward', sub: lang === 'id' ? 'Putar dopamine' : 'Spin dopamine', bg: '#FFF7ED', iconColor: '#EA580C' },
    { href: '/body-double', icon: IconMessageCircle, label: lang === 'id' ? 'Body Double' : 'Body Double', sub: lang === 'id' ? 'Kerja bareng' : 'Work together', bg: '#F5F3FF', iconColor: '#7C3AED' },
  ];

  return (
    <div className={styles.page}>
      {/* XP Toast */}
      {xpToast && <div className="toast toast--xp">{xpToast}</div>}

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.heroGreeting}>{greeting} <span className={styles.heroGreetingEmoji}>☀️</span></p>
          <h1 className={styles.heroName}>{lang === 'id' ? 'Hai' : 'Hi'}, {store.profile?.name || 'User'}!</h1>
          <p className={styles.heroSubtitle}>{tr.dashboard.hero_subtitle}</p>
        </div>

        <div className={styles.heroProgress}>
          <div className={styles.heroProgressLabel}>{tr.dashboard.today_progress}</div>
          <div className={styles.heroProgressValue}>{todayProgressPercent}%</div>
          <div className={styles.heroProgressHint}>
            {todayProgressPercent > 0 ? tr.dashboard.today_progress_going : tr.dashboard.today_progress_empty}
          </div>
          <div className={styles.heroProgressTrack}>
            <div className={styles.heroProgressFill} style={{ width: `${todayProgressPercent}%` }} />
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, color: 'var(--color-xp-text)', marginBottom: '6px' }}>
              <span>⭐ Lvl {levelInfo.level}</span>
              <span>{levelInfo.currentXP} XP</span>
            </div>
            <div className={styles.heroProgressTrack} style={{ height: '6px', background: 'var(--color-xp-bg)' }}>
              <div className={styles.heroProgressFill} style={{ width: `${levelInfo.progressPercent}%`, background: 'var(--color-xp)' }} />
            </div>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getMascotSrc(store.currentEnergy)} alt="" className={styles.heroMascot} />
      </div>


      {/* ── Crisis Banner (chronic stuck + crisis mood) ────── */}
      {chronicStuckTasks.length > 0 && (
        <div className={styles.crisisBanner}>
          <span className={styles.crisisBannerIcon}><IconMessageCircle size={24} /></span>
          <div className={styles.crisisBannerBody}>
            <div className={styles.crisisBannerTitle}>
              {chronicStuckTasks.length} task stuck total — AI bisa mulai duluan untuk kamu
            </div>
            <div className={styles.crisisBannerSub}>
              Buka task, klik "Biar AI Mulai Duluan" dan biarkan AI tulis draft pertamanya.
            </div>
          </div>
          <Link href="/tasks" className={styles.crisisBannerBtn}>
            Buka Tasks <IconArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ── Current Focus ─────────────────────────────────────── */}
      {currentFocus && (
        <section className={styles.focusSection}>
          <div className={styles.sectionRow}>
            <div className={styles.sectionLabel}><IconTarget size={12} /> Fokus sekarang</div>
            <Link href="/tasks" className={styles.viewAll}>
              Semua task <IconArrowRight size={12} />
            </Link>
          </div>

          <div className={styles.focusCard}>
            <div className={styles.focusTop}>
              <div className={styles.focusBadge}>
                {isLowEnergy ? <><IconZap size={11} /> TASK TERMUDAH</> : <><IconPlay size={10} /> SEDANG BERJALAN</>}
              </div>
              <span className={styles.focusSteps}>
                {currentFocus.completedCount}/{currentFocus.microTasks.length} langkah
              </span>
            </div>
            <div className={styles.focusTitle}>{currentFocus.title}</div>
            {nextMicroTask && (
              <div className={styles.focusNext}>
                Selanjutnya → {nextMicroTask.title} (~{nextMicroTask.estimatedMinutes}m)
              </div>
            )}
            <div className={styles.focusTrack}>
              <div className={styles.focusFill} style={{ width: `${focusPercent}%` }} />
            </div>
            <div className={styles.focusActions}>
              <Link href="/tasks" className={styles.focusResume}>
                <IconPlay size={14} /> Lanjutkan
              </Link>
              <Link href="/tasks" className={styles.focusStepBtn}>
                Lihat graph →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Decay Warning (jika ada, tapi bukan kronis) ──────── */}
      {decayingTasks.length > 0 && chronicStuckTasks.length === 0 && (
        <div className={styles.alertCard}>
          <div className={styles.alertIcon}><IconAlertTriangle size={22} /></div>
          <div className={styles.alertBody}>
            <div className={styles.alertTitle}>{decayingTasks.length} task butuh perhatian</div>
            <div className={styles.alertDesc}>Sudah lama tidak ada progress — yuk cek lagi</div>
          </div>
          <Link href="/tasks" className="btn btn-primary btn-sm">
            Lihat →
          </Link>
        </div>
      )}

      {/* ── Quick Actions (4-tile grid) ───────────────── */}
      <section>
        <div className={styles.sectionLabel} style={{ marginBottom: 12 }}>{lang === 'id' ? 'Aksi cepat' : 'Quick Actions'}</div>
        <div className={styles.quickScroll}>
          {QUICK_ACTIONS.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={styles.quickChip}
              >
                <span className={styles.quickChipIcon} style={{ '--quick-icon-bg': action.bg, '--quick-icon-color': action.iconColor } as CSSProperties}>
                  <ActionIcon size={18} />
                </span>
                <span className={styles.quickChipLabel}>{action.label}</span>
                <span className={styles.quickChipSub}>{action.sub}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Mood/Upcoming (left) + Quote/Energy guide (right) ── */}
      <div className={styles.upcomingRow}>
        <div className={styles.leftCol}>
          {todayMood ? (
            <div className={styles.moodCard} style={{ borderColor: MOOD_WARN_COLORS[todayMood.warningLevel ?? 'normal'] }}>
              <span className={styles.moodCardIcon}><EnergyMeter level={todayMood.energyLevel} /></span>
              <div className={styles.moodCardBody}>
                <div className={styles.moodCardTitle}>{todayMood.moodSummary ?? 'Check-in done'}</div>
                <div className={styles.moodCardSub}>{lang === 'id' ? 'Ketuk untuk edit' : 'Tap to edit'}</div>
              </div>
              <Link href="/energy-checkin" className={styles.moodCardArrow}><IconArrowRight size={16} /></Link>
            </div>
          ) : (
            <Link href="/energy-checkin" className={styles.moodCard}>
              <span className={styles.moodCardIcon}><IconHeart size={16} /></span>
              <div className={styles.moodCardBody}>
                <div className={styles.moodCardTitle}>{lang === 'id' ? 'Gimana perasaan kamu hari ini?' : 'How are you feeling today?'}</div>
                <div className={styles.moodCardSub}>{lang === 'id' ? 'Ketuk untuk check-in → dapat saran AI' : 'Tap to check in → get AI advice'}</div>
              </div>
              <span className={styles.moodCardArrow}><IconArrowRight size={16} /></span>
            </Link>
          )}

          <div className={styles.upcomingCard}>
            <div className={styles.upcomingHeader}>
              <span className={styles.upcomingTitle}>{lang === 'id' ? 'Task Mendatang' : 'Upcoming Tasks'}</span>
              <Link href="/tasks" className={styles.viewAll}>
                {lang === 'id' ? 'Semua' : 'View all'} <IconArrowRight size={12} />
              </Link>
            </div>
            {activeTasks.length === 0 ? (
              <div className={styles.upcomingEmpty}>
                <span className={styles.upcomingEmptyIcon}><IconCalendar size={18} /></span>
                <div className={styles.upcomingEmptyTitle}>{lang === 'id' ? 'Belum ada task' : 'No tasks yet'}</div>
                <div className={styles.upcomingEmptySub}>{lang === 'id' ? 'Tulis task pertamamu di bawah' : 'Write your first task below'}</div>
              </div>
            ) : (
              <ul className={styles.upcomingList}>
                {activeTasks.slice(0, 4).map((task) => (
                  <li key={task.id}>
                    <Link href="/tasks">{task.title}</Link>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.quickAddRow}>
              <input
                className={styles.quickAddInput}
                placeholder={lang === 'id' ? 'Tambah task cepat...' : 'Add a new task...'}
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addQuickTask(); }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={addQuickTask} disabled={!quickAddTitle.trim()}>
                {tr.common.save}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.quoteCardStandalone}>
            <span className={styles.quoteCardIcon}><IconSmile size={16} /></span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p className={styles.quoteText}>"{randomQuote.text}"</p>
              {randomQuote.source && <span className={styles.quoteSource}>— {randomQuote.source}</span>}
            </div>
          </div>

          <div className={styles.energyGuideCard}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getMascotSrc(store.currentEnergy)} alt="" className={styles.energyGuideMascot} />
            <div>
              <div className={styles.energyGuideTitle}>{lang === 'id' ? 'Panduan energimu' : 'Your energy guide'}</div>
              <div className={styles.energyGuideDesc}>
                {store.currentEnergy <= 2
                  ? (lang === 'id' ? 'Task kecil aja — pilih yang paling mudah.' : 'Small tasks only — pick the easiest one.')
                  : (lang === 'id' ? 'Energimu bagus — waktunya kejar target!' : 'Great energy — go chase your goals!')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
