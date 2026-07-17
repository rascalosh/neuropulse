// lib/storage.ts — Typed localStorage helpers for NeuroPulse

export type Interest = string;

export interface UserProfile {
  name: string;
  avatar: string; // emoji
  interests: Interest[];
  interestKeywords: string[]; // specific keywords e.g. "Naruto", "Masterchef"
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface MicroTask {
  id: string;
  parentTaskId: string;
  title: string;
  reframedTitle?: string; // interest-based reframing
  estimatedMinutes: number;
  completed: boolean;
  viewCount: number;
  editCount: number;
  completedAt?: string;
  createdAt: string;
  // graph metadata
  group?: string; // which phase/group this belongs to
  dependsOn?: string[]; // ids of micro-tasks this depends on
  parallel?: boolean; // can be done in parallel with siblings
}

export interface TaskGroup {
  label: string; // e.g. "Fase 1: Persiapan"
  microTaskIds: string[];
  type: 'sequential' | 'parallel' | 'optional';
}

export interface Task {
  id: string;
  title: string;
  microTasks: MicroTask[];
  groups?: TaskGroup[]; // task graph groupings
  totalEstimatedMinutes: number;
  completedCount: number;
  status: 'active' | 'completed' | 'decaying' | 'abandoned';
  viewCount: number;
  lastViewedAt: string;
  createdAt: string;
  calendarEventId?: string; // Google Calendar (mocked)
  calendarSynced?: boolean;
}

export interface RSDEvent {
  id: string;
  triggers: string[];
  note?: string;
  energyLevel: number;
  timestamp: string;
}

export interface DopamineReward {
  id: string;
  title: string;
  emoji: string;
  durationMinutes?: number;
}

export interface DopamineSpin {
  id: string;
  rewardId: string;
  rewardTitle: string;
  timestamp: string;
}

export interface TimeEstimate {
  id: string;
  taskTitle: string;
  estimatedMinutes: number;
  actualMinutes: number;
  calibrationFactor: number;
  timestamp: string;
}

export interface ContextSwitch {
  timestamp: string;
  durationSeconds: number;
}

export interface MoodLog {
  timestamp: string;
  date: string; // YYYY-MM-DD — for dedup (one per day)
  energyLevel: number;
  moodText?: string; // raw user input
  moodSummary?: string; // Gemini summary
  suggestion?: string; // Gemini suggestion
  affirmation?: string; // Gemini affirmation
  warningLevel?: 'normal' | 'at_risk' | 'crisis';
}

export interface XPEntry {
  id: string;
  amount: number;
  reason: string;
  timestamp: string;
}

export interface AppSettings {
  cameraAccess: boolean;
  reduceMotion: boolean;
  darkMode: boolean;
  familyViewSharing: boolean;
  rewardSounds: boolean;
}

export interface NeuroPulseStore {
  profile?: UserProfile;
  tasks: Task[];
  rsdEvents: RSDEvent[];
  dopamineRewards: DopamineReward[];
  dopamineHistory: DopamineSpin[];
  timeEstimates: TimeEstimate[];
  contextSwitches: ContextSwitch[];
  moodLog: MoodLog[];
  xpHistory: XPEntry[];
  currentEnergy: number;
  totalXP: number;
  streak: number;
  lastActiveDate: string;
  settings: AppSettings;
}

const DEFAULT_REWARDS: DopamineReward[] = [
  { id: 'r1', title: 'Stretching 5 menit', emoji: '🧘', durationMinutes: 5 },
  { id: 'r2', title: 'Minum sesuatu yang enak', emoji: '☕', durationMinutes: 5 },
  { id: 'r3', title: 'Scroll sosmed bebas', emoji: '📱', durationMinutes: 10 },
  { id: 'r4', title: 'Dengerin 1 lagu favorit', emoji: '🎵', durationMinutes: 5 },
  { id: 'r5', title: 'Rebahan sebentar', emoji: '😴', durationMinutes: 10 },
  { id: 'r6', title: 'Makan camilan', emoji: '🍪', durationMinutes: 5 },
];

export const DEFAULT_STORE: NeuroPulseStore = {
  tasks: [],
  rsdEvents: [],
  dopamineRewards: DEFAULT_REWARDS,
  dopamineHistory: [],
  timeEstimates: [],
  contextSwitches: [],
  moodLog: [],
  xpHistory: [],
  currentEnergy: 3,
  totalXP: 0,
  streak: 0,
  lastActiveDate: '',
  settings: {
    cameraAccess: false,
    reduceMotion: false,
    darkMode: false,
    familyViewSharing: true,
    rewardSounds: true,
  },
};

// Seeded data for demo purposes
const SEEDED_STORE: Partial<NeuroPulseStore> = {
  rsdEvents: [
    {
      id: 'rsd-demo-1',
      triggers: ['kritik dari orang lain', 'merasa tidak cukup baik'],
      note: 'Presentasi tadi dikomentari keras oleh dosen',
      energyLevel: 2,
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rsd-demo-2',
      triggers: ['perbandingan dengan orang lain'],
      note: 'Lihat teman posting achievement di Instagram',
      energyLevel: 1,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rsd-demo-3',
      triggers: ['takut salah', 'overwhelm'],
      note: 'Deadline menumpuk, tidak tahu mulai dari mana',
      energyLevel: 2,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rsd-demo-4',
      triggers: ['kritik dari orang lain'],
      energyLevel: 3,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  moodLog: [
    { date: toDateStr(-6), timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), energyLevel: 2, moodText: 'Agak lelah', moodSummary: 'Energi rendah hari ini', warningLevel: 'at_risk' },
    { date: toDateStr(-5), timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), energyLevel: 3, moodText: 'Lumayan oke', moodSummary: 'Mood stabil', warningLevel: 'normal' },
    { date: toDateStr(-4), timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), energyLevel: 4, moodText: 'Produktif!', moodSummary: 'Energi bagus', warningLevel: 'normal' },
    { date: toDateStr(-3), timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), energyLevel: 1, moodText: 'Berat banget', moodSummary: 'Hari yang berat', warningLevel: 'crisis' },
    { date: toDateStr(-2), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), energyLevel: 3, moodText: 'Recovering', moodSummary: 'Mulai pulih', warningLevel: 'normal' },
    { date: toDateStr(-1), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), energyLevel: 4, moodText: 'Lebih baik', moodSummary: 'Mood membaik', warningLevel: 'normal' },
  ],
  contextSwitches: Array.from({ length: 12 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 45 * 60 * 1000).toISOString(),
    durationSeconds: Math.floor(Math.random() * 180 + 30),
  })),
  timeEstimates: [
    { id: 'te-1', taskTitle: 'Buat slide presentasi', estimatedMinutes: 30, actualMinutes: 95, calibrationFactor: 3.17, timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'te-2', taskTitle: 'Balas email', estimatedMinutes: 10, actualMinutes: 28, calibrationFactor: 2.8, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'te-3', taskTitle: 'Baca artikel', estimatedMinutes: 15, actualMinutes: 35, calibrationFactor: 2.33, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  ],
};

function toDateStr(dayOffset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const KEY = 'neuropulse_store';

function isServer(): boolean {
  return typeof window === 'undefined';
}

export function getStore(): NeuroPulseStore {
  if (isServer()) return DEFAULT_STORE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STORE;
    return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STORE;
  }
}

export const STORE_CHANGE_EVENT = 'neuropulse-store-change';

export function setStore(updater: (prev: NeuroPulseStore) => NeuroPulseStore): void {
  if (isServer()) return;
  try {
    const current = getStore();
    const next = updater(current);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
  } catch (e) {
    console.error('[NeuroPulse] Failed to write storage:', e);
  }
}

export function clearStore(): void {
  if (isServer()) return;
  localStorage.removeItem(KEY);
}

// Seed demo data if store is empty / just onboarded
export function seedDemoData(): void {
  setStore((prev) => ({
    ...prev,
    rsdEvents: prev.rsdEvents.length === 0 ? (SEEDED_STORE.rsdEvents ?? []) : prev.rsdEvents,
    moodLog: prev.moodLog.length === 0 ? (SEEDED_STORE.moodLog ?? []) : prev.moodLog,
    contextSwitches: prev.contextSwitches.length === 0 ? (SEEDED_STORE.contextSwitches ?? []) : prev.contextSwitches,
    timeEstimates: prev.timeEstimates.length === 0 ? (SEEDED_STORE.timeEstimates ?? []) : prev.timeEstimates,
  }));
}

export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Task decay: a task is "decaying" if viewed >5 times with 0 completions
export function checkTaskDecay(task: Task): boolean {
  return task.viewCount > 5 && task.completedCount === 0;
}

// Check if task is chronically stuck (crisis level)
export function checkChronicStuck(task: Task): boolean {
  return task.viewCount > 8 && task.completedCount === 0;
}

// Calculate average calibration factor
export function getCalibrationFactor(estimates: TimeEstimate[]): number {
  if (estimates.length === 0) return 2.5; // ADHD default multiplier
  const avg = estimates.reduce((sum, e) => sum + e.calibrationFactor, 0) / estimates.length;
  return Math.round(avg * 10) / 10;
}

// Get last 7 days mood — one per day
export function getLast7DaysMood(moodLog: MoodLog[]): MoodLog[] {
  const today = new Date();
  const result: MoodLog[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Find the latest mood entry for this date
    const entry = [...moodLog].reverse().find((m) => m.date === dateStr);
    if (entry) {
      result.push(entry);
    } else {
      result.push({ date: dateStr, timestamp: d.toISOString(), energyLevel: 0 });
    }
  }

  return result;
}
