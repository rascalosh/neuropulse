// lib/gamification.ts — XP, levels, streaks, achievements

export const LEVELS = [
  { level: 1, name: 'Benih 🌱', minXP: 0, maxXP: 100, color: '#94B78F' },
  { level: 2, name: 'Tunas 🌿', minXP: 100, maxXP: 300, color: '#7FA48C' },
  { level: 3, name: 'Explorer 🔭', minXP: 300, maxXP: 600, color: '#6B93B8' },
  { level: 4, name: 'Petualang ⚡', minXP: 600, maxXP: 1000, color: '#A99BC9' },
  { level: 5, name: 'Warrior 🛡️', minXP: 1000, maxXP: 1500, color: '#E3B76E' },
  { level: 6, name: 'Champion 🏆', minXP: 1500, maxXP: 2200, color: '#D98E7E' },
  { level: 7, name: 'Legend ⭐', minXP: 2200, maxXP: 3000, color: '#2F4A5E' },
  { level: 8, name: 'Mythic 🌟', minXP: 3000, maxXP: 999999, color: '#6B93B8' },
];

export interface LevelInfo {
  level: number;
  name: string;
  color: string;
  currentXP: number;
  levelMinXP: number;
  levelMaxXP: number;
  progressPercent: number;
  xpToNext: number;
}

export function getLevelInfo(totalXP: number): LevelInfo {
  let currentLevel = LEVELS[0]!;
  for (const l of LEVELS) {
    if (totalXP >= l.minXP) currentLevel = l;
    else break;
  }
  const progressPercent = Math.min(
    100,
    Math.round(((totalXP - currentLevel.minXP) / (currentLevel.maxXP - currentLevel.minXP)) * 100)
  );
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    color: currentLevel.color,
    currentXP: totalXP,
    levelMinXP: currentLevel.minXP,
    levelMaxXP: currentLevel.maxXP,
    progressPercent,
    xpToNext: Math.max(0, currentLevel.maxXP - totalXP),
  };
}

export const XP_REWARDS = {
  MICROTASK_COMPLETE: 15,
  TASK_COMPLETE: 50,
  RSD_LOG: 10,
  TIME_ESTIMATE: 10,
  DOPAMINE_SPIN: 5,
  REPORT_GENERATED: 30,
  DAILY_LOGIN: 10,
  STREAK_BONUS: 5, // per day
} as const;

export const ACHIEVEMENTS = [
  { id: 'first_task', title: 'Langkah Pertama', emoji: '🎯', description: 'Buat task pertamamu', xpThreshold: 0 },
  { id: 'first_microtask', title: 'Pecahan Kecil', emoji: '✅', description: 'Selesaikan micro-task pertama', xpThreshold: 15 },
  { id: 'rsd_aware', title: 'Sadar Diri', emoji: '💙', description: 'Log RSD event pertama', xpThreshold: 10 },
  { id: 'century', title: 'Centurion', emoji: '💯', description: 'Capai 100 XP', xpThreshold: 100 },
  { id: 'three_hundred', title: 'Explorer', emoji: '🔭', description: 'Capai 300 XP', xpThreshold: 300 },
];

export function checkNewAchievements(totalXP: number, prev: number): typeof ACHIEVEMENTS {
  return ACHIEVEMENTS.filter((a) => a.xpThreshold > prev && a.xpThreshold <= totalXP);
}

export function calculateStreak(lastActiveDate: string): { streak: number; isToday: boolean } {
  if (!lastActiveDate) return { streak: 0, isToday: false };
  const last = new Date(lastActiveDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = last.toDateString() === today.toDateString();
  const isYesterday = last.toDateString() === yesterday.toDateString();

  return { streak: isToday || isYesterday ? 1 : 0, isToday };
}

export function getEnergyLabel(level: number): { label: string; emoji: string; description: string } {
  const labels = [
    { label: 'Crash Mode', emoji: '🌫️', description: 'Istirahat dulu. Tugas nanti.' },
    { label: 'Low Battery', emoji: '🔋', description: 'Hanya task paling penting.' },
    { label: 'Normal', emoji: '⚡', description: 'Pace biasa, bisa mulai.' },
    { label: 'Charged', emoji: '🔥', description: 'Mood baik! Serang task utama.' },
    { label: 'Hyperfocus', emoji: '🚀', description: 'Gunakan energi ini dengan bijak!' },
  ];
  return labels[Math.max(0, Math.min(4, level - 1))]!;
}
