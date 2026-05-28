export const surfaceIcon: Record<string, string> = {
  Clay: '🟤',
  Hard: '🔵',
  Grass: '🟢',
  Synthetic: '⚪',
  Variable: '🎾',
};

export const countryFlag: Record<string, string> = {
  Colombia: '🇨🇴',
  USA: '🇺🇸',
  Other: '🌍',
};

export function resultBadge(result: string) {
  if (result === 'W') return { label: 'W', bg: 'bg-win-light', text: 'text-win' };
  if (result === 'L') return { label: 'L', bg: 'bg-loss-light', text: 'text-loss' };
  if (result === 'WO') return { label: 'WO', bg: 'bg-win-light', text: 'text-win' };
  return { label: 'P', bg: 'bg-pending-light', text: 'text-pending' };
}

export function formatDate(d: string) {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export const SCORE_REGEX = /^(\d{1,2}-\d{1,2})(, \d{1,2}-\d{1,2})*$/;

export const ROUNDS = ['1R', '2R', '3R', 'QF', 'SF', 'F'];
export const SURFACES = ['Clay', 'Hard', 'Grass', 'Synthetic', 'Variable'];
export const COUNTRIES = ['Colombia', 'USA', 'Other'];
export const LEVELS = ['ITF G1', 'ITF G2', 'ITF G3', 'ITF G4', 'ITF G5', 'National', 'Regional', 'Club'];
