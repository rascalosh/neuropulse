'use client';
import { useState, useRef, type ReactElement } from 'react';
import { useStorage } from '../../../hooks/useStorage';
import { DopamineReward, genId } from '../../../lib/storage';
import { XP_REWARDS } from '../../../lib/gamification';
import { useLang } from '../../../contexts/providers';
import { translations } from '../../../lib/i18n';
import {
  IconGift, IconClock, IconGamepad, IconCoffee, IconMusic, IconSmartphone, IconCookie,
  IconMoon, IconClapperboard, IconLotus, IconActivity, IconBook, IconLeaf, IconPalette,
  IconBath, IconDice, IconDance, IconSparkles, type IconProps,
} from '../../../components/Icons';
import styles from './dopamine.module.css';

const DEFAULT_EMOJIS = ['🎮','☕','🎵','📱','🍪','😴','🎬','🧘','🏃','📚','🌿','🎨','🛁','🎲','💃'];

// Reward emoji is kept in storage for backward compatibility, but rendered as a line icon — no emoji glyphs on screen.
const EMOJI_ICON_MAP: Record<string, (p: IconProps) => ReactElement> = {
  '🎮': IconGamepad, '☕': IconCoffee, '🎵': IconMusic, '📱': IconSmartphone, '🍪': IconCookie,
  '😴': IconMoon, '🎬': IconClapperboard, '🧘': IconLotus, '🏃': IconActivity, '📚': IconBook,
  '🌿': IconLeaf, '🎨': IconPalette, '🛁': IconBath, '🎲': IconDice, '💃': IconDance,
};

function RewardIcon({ emoji, size = 18 }: { emoji: string; size?: number }) {
  const Icon = EMOJI_ICON_MAP[emoji] || IconSparkles;
  return <Icon size={size} />;
}

const CAPSULE_COLORS = ['#F2703C', '#3FA85C', '#3A7BD5', '#F5C242', '#3FC1C9', '#F2785C', '#8B7FD6', '#4DB88E'];

// Cute blob faces for the capsules bouncing in the dome — playful stand-ins instead of the literal reward emoji.
const FACES: Array<'happy' | 'wink' | 'surprised' | 'sleepy'> = ['happy', 'wink', 'surprised', 'sleepy'];

export default function DopaminePage() {
  const [store, update] = useStorage();
  const { lang } = useLang();
  const tr = translations[lang];

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<DopamineReward | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎮');
  const [newDuration, setNewDuration] = useState(5);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rewards = store.dopamineRewards;

  const spin = () => {
    if (rewards.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setSpinResult(null);

    // Spin animation duration
    const duration = 2000 + Math.random() * 1000;
    setTimeout(() => {
      // Variable ratio: weighted random
      const idx = Math.floor(Math.random() * rewards.length);
      const chosen = rewards[idx];
      if (!chosen) { setIsSpinning(false); return; }
      setSpinResult(chosen);
      setIsSpinning(false);

      update((prev) => ({
        ...prev,
        dopamineHistory: [
          { id: genId(), rewardId: chosen.id, rewardTitle: chosen.title, timestamp: new Date().toISOString() },
          ...prev.dopamineHistory,
        ],
        totalXP: prev.totalXP + XP_REWARDS.DOPAMINE_SPIN,
        xpHistory: [...prev.xpHistory, { id: genId(), amount: XP_REWARDS.DOPAMINE_SPIN, reason: `Reward: ${chosen.title}`, timestamp: new Date().toISOString() }],
      }));
    }, duration);
  };

  const startTimer = (minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(minutes * 60);
    setTimerActive(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const addReward = () => {
    if (!newTitle.trim()) return;
    const reward: DopamineReward = {
      id: genId(),
      title: newTitle.trim(),
      emoji: newEmoji,
      durationMinutes: newDuration,
    };
    update((prev) => ({ ...prev, dopamineRewards: [...prev.dopamineRewards, reward] }));
    setNewTitle('');
    setShowAdd(false);
  };

  const removeReward = (id: string) => {
    update((prev) => ({ ...prev, dopamineRewards: prev.dopamineRewards.filter((r) => r.id !== id) }));
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className={styles.page}>
      <div className="container-md">
        
        {/* Header */}
        <div className={styles.header}>
          <div className="icon-box icon-box--lg" style={{ background: '#FFFBEB', color: '#D97706' }}><IconGift size={24} /></div>
          <div>
            <h1 className="text-2xl font-extrabold">{tr.dopamine.title}</h1>
            <p className="text-sub mt-2">{tr.dopamine.desc}</p>
          </div>
        </div>

        {/* Gachapon Machine */}
        <div className={styles.spinnerArea}>
          <div className={styles.machine}>
            <div className={styles.machineCap} />
            <div className={styles.machineDome}>
              <div className={styles.domeShine} />
              <div className={`${styles.capsuleField} ${isSpinning ? styles.spinning : ''}`}>
                {rewards.map((r, i) => {
                  const angle = (360 / Math.max(rewards.length, 1)) * i;
                  const radius = 62 + (i % 3) * 8;
                  const x = Math.round(108 + radius * Math.cos((angle * Math.PI) / 180) - 20);
                  const y = Math.round(100 + radius * Math.sin((angle * Math.PI) / 180) - 20);
                  const face = FACES[i % FACES.length] ?? 'happy';
                  return (
                    <div
                      key={r.id}
                      className={styles.capsule}
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        background: CAPSULE_COLORS[i % CAPSULE_COLORS.length],
                        animationDelay: `${i * 0.18}s`,
                        animationDuration: `${2.8 + (i % 3) * 0.5}s`,
                      }}
                    >
                      <span className={styles.capsuleTop} />
                      <span className={`${styles.face} ${styles[face]}`}>
                        <span className={styles.eyes}><i /><i /></span>
                        <span className={styles.mouth} />
                        {face === 'happy' && <span className={styles.cheeks}><i /><i /></span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={styles.neck} />
            <div className={styles.machineBody}>
              <div className={styles.coinSlot}>
                <div className={`${styles.crank} ${isSpinning ? styles.crankTurning : ''}`} />
                {!isSpinning && !spinResult && rewards.length > 0 && (
                  <span className={styles.tapBubble}>TAP!</span>
                )}
              </div>
              <div className={styles.chute} />
            </div>
            <div className={styles.machineBase} />
          </div>

          <div className={styles.tray}>
            {spinResult && !isSpinning ? (() => {
              const resultIdx = Math.max(rewards.findIndex((r) => r.id === spinResult.id), 0);
              const resultFace = FACES[resultIdx % FACES.length] ?? 'happy';
              return (
                <div className={`${styles.resultContent} animate-scale`}>
                  <div
                    className={styles.dispensedCapsule}
                    style={{ background: CAPSULE_COLORS[resultIdx % CAPSULE_COLORS.length] }}
                  >
                    <span className={styles.capsuleTop} />
                    <span className={`${styles.face} ${styles[resultFace]}`}>
                      <span className={styles.eyes}><i /><i /></span>
                      <span className={styles.mouth} />
                      {resultFace === 'happy' && <span className={styles.cheeks}><i /><i /></span>}
                    </span>
                  </div>
                  <div className={styles.resultTitle}>{spinResult.title}</div>
                </div>
              );
            })() : (
              <div className={styles.trayIdle}>
                <IconGift size={22} />
                <div className={styles.trayIdleLabel}>{isSpinning ? tr.dopamine.spinning : 'Tap the crank!'}</div>
              </div>
            )}
          </div>

          <button
            className={`btn btn-primary btn-xl ${styles.spinBtn}`}
            onClick={spin}
            disabled={isSpinning || rewards.length === 0}
          >
            {isSpinning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />
                {tr.dopamine.spinning}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2"><IconGift size={16} /> {tr.dopamine.spin_btn}</span>
            )}
          </button>

          {spinResult && !isSpinning && (
            <div className={`${styles.resultActions} animate-fade`}>
              <p className={styles.resultMsg}>
                {tr.dopamine.you_got} <strong>{spinResult.title}</strong>!
              </p>
              {spinResult.durationMinutes && !timerActive && (
                <button
                  className="btn btn-outline"
                  onClick={() => startTimer(spinResult.durationMinutes!)}
                >
<IconClock size={14} /> {tr.dopamine.start_timer} ({spinResult.durationMinutes}m)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active Timer */}
        {timerActive && (
          <div className={`card ${styles.timerCard} animate-scale`}>
            <div className={styles.timerLabel}>{tr.dopamine.timer_label}</div>
            <div className={styles.timerDisplay}>{mm}:{ss}</div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${(timeLeft / ((spinResult?.durationMinutes || 5) * 60)) * 100}%` }}
              />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setTimerActive(false); if (timerRef.current) clearInterval(timerRef.current); }}>
              {tr.common.close}
            </button>
          </div>
        )}

        {/* Reward List */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className="section-label">{tr.dopamine.rewards_title}</h2>
            <button className="btn btn-outline btn-sm" onClick={() => setShowAdd(!showAdd)}>{tr.dopamine.add_reward}</button>
          </div>

          {showAdd && (
            <div className={`card ${styles.addCard} animate-fade`}>
              <div className={styles.emojiPicker}>
                {DEFAULT_EMOJIS.map((e) => (
                  <button
                    key={e}
                    className={`${styles.emojiBtn} ${newEmoji === e ? styles.emojiSelected : ''}`}
                    onClick={() => setNewEmoji(e)}
                    type="button"
                    aria-label={`Select icon ${e}`}
                    aria-pressed={newEmoji === e}
                  >
                    <RewardIcon emoji={e} size={16} />
                  </button>
                ))}
              </div>
              <input
                className="input"
                placeholder={tr.dopamine.reward_name_placeholder}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addReward()}
              />
              <div className={styles.durationRow}>
                <label className="label mb-0">{tr.dopamine.duration_label}</label>
                <input
                  type="number"
                  className="input"
                  style={{ width: 80 }}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  min={1}
                  max={60}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button className="btn btn-outline" onClick={() => setShowAdd(false)}>{tr.common.cancel}</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={addReward}>{tr.common.add}</button>
              </div>
            </div>
          )}

          <div className={styles.rewardGrid}>
            {rewards.map((r) => (
              <div key={r.id} className={`card card--flat ${styles.rewardCard}`}>
                <span className={styles.rewardEmoji}><RewardIcon emoji={r.emoji} size={20} /></span>
                <div className={styles.rewardInfo}>
                  <div className={styles.rewardTitle}>{r.title}</div>
                  {r.durationMinutes && (
                    <div className={styles.rewardDuration}><IconClock size={12} /> {r.durationMinutes}m</div>
                  )}
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => removeReward(r.id)}
                  aria-label={tr.common.delete}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* History */}
        {store.dopamineHistory.length > 0 && (
          <section className="mt-8">
            <h2 className="section-label">{tr.dopamine.history_title}</h2>
            <div className={styles.historyList}>
              {store.dopamineHistory.slice(0, 5).map((h) => {
                const reward = rewards.find((r) => r.id === h.rewardId);
                return (
                  <div key={h.id} className={styles.historyItem}>
                    <span className={styles.historyIcon}><RewardIcon emoji={reward?.emoji || ''} size={16} /></span>
                    <span className={styles.historyTitle}>{h.rewardTitle}</span>
                    <span className={styles.historyDate}>
                      {new Date(h.timestamp).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
