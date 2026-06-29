// GetCollab Brand App — Design tokens
// See DESIGN.md for full usage rules.
// Do NOT import colors from @shared/constants — use this file instead.

export const colors = {
  bg: '#0A0A0A',
  card: '#111111',
  elevated: '#171717',
  border: '#262626',
  borderStrong: '#3F3F46',

  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  textSubtle: '#71717A',

  blue: '#3B82F6',
  blueDeep: '#1E3A8A',
  blueSoft: 'rgba(59,130,246,0.12)',

  black: '#000000',
  neon: '#D9FF00',
  neonSoft: 'rgba(217,255,0,0.15)',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  successSoft: 'rgba(34,197,94,0.14)',
  warningSoft: 'rgba(245,158,11,0.14)',
  errorSoft: 'rgba(239,68,68,0.14)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  family: 'Inter',
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

// Keys match API values (lowercase). Use STATUS_COLORS[status] ?? STATUS_COLORS.draft as fallback.
export const STATUS_COLORS: Record<string, { fg: string; bg: string; dot: string }> = {
  active:    { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)',    dot: '#22C55E' },
  review:    { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)',   dot: '#F59E0B' },
  draft:     { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.12)', dot: '#A1A1AA' },
  completed: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)',   dot: '#3B82F6' },
  paused:    { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)',   dot: '#F59E0B' },
  cancelled: { fg: '#EF4444', bg: 'rgba(239,68,68,0.14)',    dot: '#EF4444' },
};

export function matchScoreColor(score: number): string {
  if (score >= 90) return colors.success;
  if (score >= 80) return colors.blue;
  return colors.warning;
}
