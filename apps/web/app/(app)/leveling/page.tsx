'use client';
import type { CSSProperties } from 'react';
import { useStorage } from '../../../hooks/useStorage';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import { LEVELS, ACHIEVEMENTS, getLevelInfo } from '../../../lib/gamification';
import {
  IconStar, IconTrophy, IconFlame, IconCheck, IconLock,
  IconTarget, IconCheckSquare, IconHeart, IconSparkles, IconZap,
} from '../../../components/Icons';
import styles from './leveling.module.css';

const ACHIEVEMENT_ICONS: Record<string, typeof IconStar> = {
  first_task: IconTarget,
  first_microtask: IconCheckSquare,
  rsd_aware: IconHeart,
  century: IconTrophy,
  three_hundred: IconSparkles,
};

export default function LevelingPage() {
  const [store, , mounted] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];

  if (!mounted) return null;

  const levelInfo = getLevelInfo(store.totalXP);
  const recentXp = [...store.xpHistory].reverse().slice(0, 10);

  return (
    <div className={`container-md ${styles.page}`}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <IconStar size={24} />
        </div>
        <div>
          <h1 className={styles.title}>Leveling</h1>
          <p className={styles.desc}>
            {lang === 'id' ? 'Progres XP, level, dan achievement kamu di NeuroPulse.' : 'Your XP progress, level, and achievements in NeuroPulse.'}
          </p>
        </div>
      </div>

      {/* Hero: current level ring */}
      <div className={styles.hero}>
        <div className={styles.heroRing} style={{ '--pct': levelInfo.progressPercent } as CSSProperties}>
          <div className={styles.heroRingInner} style={{ '--ring-color': levelInfo.color } as CSSProperties}>
            <span className={styles.heroRingLevel}>{levelInfo.level}</span>
            <span className={styles.heroRingLabel}>Lvl</span>
          </div>
        </div>
        <div className={styles.heroBody}>
          <div className={styles.heroName}>{tr.levels[levelInfo.level as keyof typeof tr.levels]}</div>
          <div className={styles.heroXp}>
            {levelInfo.currentXP} XP
            {levelInfo.xpToNext > 0 && ` · ${levelInfo.xpToNext} ${lang === 'id' ? 'lagi ke level berikutnya' : 'to next level'}`}
          </div>
          <div className={styles.heroTrack}>
            <div className={styles.heroFill} style={{ width: `${levelInfo.progressPercent}%` }} />
          </div>
          {store.streak > 0 && (
            <span className={styles.heroStreak}>
              <IconFlame size={14} /> {store.streak} {lang === 'id' ? 'hari streak' : 'day streak'}
            </span>
          )}
        </div>
      </div>

      {/* All levels */}
      <h2 className={styles.sectionTitle}>
        <IconZap size={15} /> {lang === 'id' ? 'Semua Level' : 'All Levels'}
      </h2>
      <div className={styles.levelsGrid}>
        {LEVELS.map((l) => {
          const isCurrent = l.level === levelInfo.level;
          const isUnlocked = store.totalXP >= l.minXP;
          return (
            <div
              key={l.level}
              className={`${styles.levelCard} ${!isUnlocked ? styles.levelCardLocked : ''} ${isCurrent ? styles.levelCardCurrent : ''}`}
              style={{ '--lvl-color': l.color } as CSSProperties}
            >
              <span className={styles.levelBadge}>{isUnlocked ? l.level : <IconLock size={14} />}</span>
              <div>
                <div className={styles.levelName}>{tr.levels[l.level as keyof typeof tr.levels]}</div>
                <div className={styles.levelRange}>{l.minXP}–{l.maxXP >= 999999 ? '∞' : l.maxXP} XP</div>
              </div>
              {isCurrent && (
                <span className={styles.levelNowTag}>
                  <IconStar size={11} /> {lang === 'id' ? 'Sekarang' : 'Now'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Achievements */}
      <h2 className={styles.sectionTitle}>
        <IconTrophy size={15} /> {lang === 'id' ? 'Achievement' : 'Achievements'}
      </h2>
      <div className={styles.achGrid}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = store.totalXP >= a.xpThreshold;
          const Icon = ACHIEVEMENT_ICONS[a.id] ?? IconStar;
          return (
            <div key={a.id} className={`${styles.achCard} ${!unlocked ? styles.achCardLocked : ''}`}>
              <span className={`${styles.achIcon} ${!unlocked ? styles.achIconLocked : ''}`}>
                {unlocked ? <Icon size={18} /> : <IconLock size={16} />}
              </span>
              <div>
                <div className={styles.achTitle}>{a.title}</div>
                <div className={styles.achDesc}>{a.description}</div>
              </div>
              {unlocked && <span className={styles.achCheck}><IconCheck size={16} /></span>}
            </div>
          );
        })}
      </div>

      {/* Recent XP */}
      <h2 className={styles.sectionTitle}>
        <IconFlame size={15} /> {lang === 'id' ? 'XP Terbaru' : 'Recent XP'}
      </h2>
      <div className={styles.xpList}>
        {recentXp.length === 0 ? (
          <p className={styles.emptyState}>{lang === 'id' ? 'Belum ada aktivitas.' : 'No activity yet.'}</p>
        ) : (
          recentXp.map((x) => (
            <div key={x.id} className={styles.xpRow}>
              <span className={styles.xpRowIcon}><IconStar size={13} /></span>
              <span className={styles.xpRowReason}>{x.reason}</span>
              <span className={styles.xpRowAmount}>+{x.amount} XP</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
