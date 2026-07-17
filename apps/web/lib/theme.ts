// lib/theme.ts — Accent color presets, chosen at onboarding and changeable later.
import type { AccentColor } from './storage';

export const ACCENT_COLORS: Array<{ key: AccentColor; label: string; hex: string }> = [
  { key: 'blue', label: 'Biru', hex: '#3B82F6' },
  { key: 'purple', label: 'Ungu', hex: '#8B5CF6' },
  { key: 'green', label: 'Hijau', hex: '#10B981' },
  { key: 'pink', label: 'Pink', hex: '#EC4899' },
  { key: 'orange', label: 'Oranye', hex: '#F97316' },
  { key: 'teal', label: 'Teal', hex: '#14B8A6' },
];

const ACCENT_STORAGE_KEY = 'neuropulse-accent';

export function applyAccentColor(color: AccentColor): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', color);
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
  } catch {
    // ignore write failures (private mode, quota, etc.)
  }
}

export function getStoredAccentColor(): AccentColor {
  if (typeof window === 'undefined') return 'blue';
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (ACCENT_COLORS.some((c) => c.key === stored)) return stored as AccentColor;
  } catch {
    // ignore read failures
  }
  return 'blue';
}
