// GetCollab Creator App — Design tokens
// Creator-focused: true black (OLED) + neon CTAs + Instagram-style gradient accents
// Do NOT import from @shared/constants for new screens — use this file.

export const colors = {
  // Surfaces — true black OLED (Instagram-inspired)
  bg: '#000000',
  card: '#0F0F0F',
  elevated: '#1A1A1A',

  // Borders
  border: '#262626',
  borderStrong: '#3F3F46',

  // Text
  text: '#FFFFFF',
  textMuted: '#A8A8A8',
  textSubtle: '#6E6E6E',

  // GetCollab brand
  neon: '#D9FF00',
  neonSoft: 'rgba(217,255,0,0.12)',
  blue: '#3B82F6',
  blueDeep: '#1E3A8A',
  blueSoft: 'rgba(59,130,246,0.12)',

  black: '#000000',

  // Creator-specific
  liked: '#ED4956',       // heart/liked state
  onlineGreen: '#78DE45', // online indicator

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  successSoft: 'rgba(34,197,94,0.14)',
  warningSoft: 'rgba(245,158,11,0.14)',
  errorSoft: 'rgba(239,68,68,0.14)',
} as const;

// Campaign/bid status colors — keys match API lowercase values
export const STATUS_COLORS: Record<string, { fg: string; bg: string; dot: string }> = {
  applied:   { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)',  dot: '#3B82F6' },
  accepted:  { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)',   dot: '#22C55E' },
  active:    { fg: '#22C55E', bg: 'rgba(34,197,94,0.12)',   dot: '#22C55E' },
  completed: { fg: '#A8A8A8', bg: 'rgba(168,168,168,0.12)', dot: '#A8A8A8' },
  rejected:  { fg: '#ED4956', bg: 'rgba(237,73,86,0.14)',   dot: '#ED4956' },
  cancelled: { fg: '#ED4956', bg: 'rgba(237,73,86,0.14)',   dot: '#ED4956' },
  pending:   { fg: '#F59E0B', bg: 'rgba(245,158,11,0.14)',  dot: '#F59E0B' },
  draft:     { fg: '#A8A8A8', bg: 'rgba(168,168,168,0.12)', dot: '#A8A8A8' },
};

// Instagram-inspired gradient for creator highlights (story rings, special accents)
export const creatorGradient = ['#FCAF45', '#FD1D1D', '#833AB4'] as const;

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

export function statusColor(status: string) {
  return STATUS_COLORS[status?.toLowerCase()] ?? STATUS_COLORS.pending;
}
