/**
 * Minimal & Clean White Theme with Green Accents:
 * - Base background & card fill: Pure White (#FFFFFF)
 * - Accent color for buttons, links, active tabs & icons: Dusty Olive Green (#748B75)
 * - Soft sage secondary touch: #92AD94
 * - Crisp text & neutral hairlines (#E5E7EB)
 */

const lightColors = {
  // Base colors — Pure White canvas
  background: '#FFFFFF',
  foreground: '#111827',

  // Card & Popover colors — White fill (no heavy green tints)
  card: '#FFFFFF',
  cardForeground: '#111827',
  popover: '#FFFFFF',
  popoverForeground: '#111827',

  // Primary accent — Dusty Olive Green (#748B75) for buttons, links, icons only
  primary: '#748B75',
  primaryForeground: '#FFFFFF',

  // Secondary colors — Full #748B75 Dusty Olive Green fill for header & navbar
  secondary: '#748B75',
  secondaryForeground: '#FFFFFF',

  // Muted colors
  muted: '#F3F4F6',
  mutedForeground: '#6B7280',

  // Accent colors
  accent: '#F3F6F3',
  accentForeground: '#748B75',

  // Destructive colors
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',

  // Border and input — Crisp light hairlines
  border: '#E5E7EB',
  input: '#F9FAFB',
  ring: '#748B75',

  // Text colors — High-contrast clean typography
  text: '#111827',
  textMuted: '#6B7280',

  // Legacy support for existing components
  tint: '#748B75',
  icon: '#748B75',
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#748B75',

  // Accent scale — Disciplined green accents
  blue: '#748B75',
  green: '#748B75',
  red: '#DC2626',
  orange: '#748B75',
  yellow: '#92AD94',
  pink: '#748B75',
  purple: '#748B75',
  teal: '#92AD94',
  indigo: '#748B75',

  // Semantic states
  success: '#748B75',
  successForeground: '#FFFFFF',
  warning: '#748B75',
  warningForeground: '#111827',
  info: '#748B75',
  infoForeground: '#FFFFFF',
  error: '#DC2626',
  errorForeground: '#FFFFFF',
};

const darkColors = {
  // Base colors — Sleek Modern Dark
  background: '#0F1210',
  foreground: '#F9FAFB',

  // Card & Popover colors — Elevated Dark Slate
  card: '#151A16',
  cardForeground: '#F9FAFB',
  popover: '#151A16',
  popoverForeground: '#F9FAFB',

  // Primary accent — Muted Sage Green (#92AD94)
  primary: '#92AD94',
  primaryForeground: '#0F1210',

  // Secondary colors — Dark Neutral fill for header/footer
  secondary: '#161D17',
  secondaryForeground: '#F9FAFB',

  // Muted colors
  muted: '#1A211B',
  mutedForeground: '#9CA3AF',

  // Accent colors
  accent: '#1A211B',
  accentForeground: '#92AD94',

  // Destructive colors
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',

  // Border and input — Subtle dark hairlines
  border: '#242F26',
  input: '#151A16',
  ring: '#92AD94',

  // Text colors
  text: '#F9FAFB',
  textMuted: '#9CA3AF',

  // Legacy support for existing components
  tint: '#92AD94',
  icon: '#92AD94',
  tabIconDefault: '#6B7280',
  tabIconSelected: '#92AD94',

  // Accent scale
  blue: '#92AD94',
  green: '#92AD94',
  red: '#EF4444',
  orange: '#92AD94',
  yellow: '#92AD94',
  pink: '#92AD94',
  purple: '#92AD94',
  teal: '#92AD94',
  indigo: '#92AD94',

  // Semantic states
  success: '#92AD94',
  successForeground: '#0F1210',
  warning: '#92AD94',
  warningForeground: '#F9FAFB',
  info: '#92AD94',
  infoForeground: '#0F1210',
  error: '#EF4444',
  errorForeground: '#FFFFFF',
};

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

export { darkColors, lightColors };

export type ColorKeys = keyof typeof lightColors;

export const withOpacity = (color: string, opacity: number) => {
  if (color.startsWith('rgba')) {
    return color;
  }

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
};
