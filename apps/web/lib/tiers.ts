// lib/tiers.ts — Tier limits shared between API routes and UI.
// Keep these numbers in sync with the SQL helpers in
// supabase/migrations/0001_tiers_and_marketplace.sql (_tier_limit,
// _tier_discount_pct, _tier_max_focus_minutes) — the SQL side is the
// actual enforcement, this is only for rendering consistent UI copy.

export type Tier = 'free' | 'murah' | 'standar' | 'mahal';
export type GatedFeature = 'task_decompose' | 'bionic_reading' | 'clinical_report';

export const TIERS: Tier[] = ['free', 'murah', 'standar', 'mahal'];

export const TIER_LIMITS: Record<Tier, Record<GatedFeature, number>> = {
  free: { task_decompose: 15, bionic_reading: 20, clinical_report: 1 },
  murah: { task_decompose: 60, bionic_reading: 100, clinical_report: 2 },
  standar: { task_decompose: -1, bionic_reading: -1, clinical_report: 4 },
  mahal: { task_decompose: -1, bionic_reading: -1, clinical_report: -1 },
};

export const TIER_DISCOUNT_PCT: Record<Tier, number> = {
  free: 0,
  murah: 10,
  standar: 25,
  mahal: 40,
};

export const TIER_MAX_FOCUS_MINUTES: Record<Tier, number> = {
  free: 25,
  murah: 45,
  standar: 90,
  mahal: 120,
};

export const TIER_FOCUS_DURATION_OPTIONS: Record<Tier, number[]> = {
  free: [25],
  murah: [25, 45],
  standar: [10, 15, 25, 45, 60, 90],
  mahal: [10, 15, 25, 45, 60, 90, 120],
};

export const TIER_PRICE_IDR: Record<Tier, number> = {
  free: 0,
  murah: 29000,
  standar: 79000,
  mahal: 199000,
};

export const PSYCH_BASE_PRICE_IDR = 150000;

export function psychPriceForTier(tier: Tier): number {
  return Math.round(PSYCH_BASE_PRICE_IDR * (100 - TIER_DISCOUNT_PCT[tier]) / 100);
}
