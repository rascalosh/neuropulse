export const MASCOT_BY_ENERGY: Record<number, string> = {
  1: '/exhausted.png',
  2: '/lowbatery.png',
  3: '/medium.png',
  4: '/highenergy.png',
  5: '/onfire.png',
};

export function getMascotSrc(energyLevel: number): string {
  return MASCOT_BY_ENERGY[energyLevel] ?? MASCOT_BY_ENERGY[3]!;
}
