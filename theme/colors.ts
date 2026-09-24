const lightColors = {
  // Base colors — Anthropic ivory / slate
  background: '#FAF9F5',
  foreground: '#141413',

  // Card colors
  card: '#F0EEE6',
  cardForeground: '#141413',

  // Popover colors
  popover: '#F0EEE6',
  popoverForeground: '#141413',

  // Primary colors — Claude clay
  primary: '#D97757',
  primaryForeground: '#FAF9F5',

  // Secondary colors
  secondary: '#E8E6DC',
  secondaryForeground: '#141413',

  // Muted colors
  muted: '#E8E6DC',
  mutedForeground: '#87867F',

  // Accent colors
  accent: '#F0EEE6',
  accentForeground: '#141413',

  // Destructive colors
  destructive: '#C46686',
  destructiveForeground: '#FAF9F5',

  // Border and input
  border: '#E8E6DC',
  input: '#E8E6DC',
  ring: '#D97757',

  // Text colors
  text: '#141413',
  textMuted: '#87867F',

  // Legacy support for existing components
  tint: '#D97757',
  icon: '#5E5D59',
  tabIconDefault: '#B0AEA5',
  tabIconSelected: '#D97757',

  // Accent scale
  blue: '#6A9BCC',
  green: '#788C5D',
  red: '#C46686',
  orange: '#D97757',
  yellow: '#EBDBBC',
  pink: '#C46686',
  purple: '#8B7AB8',
  teal: '#4A9B9B',
  indigo: '#6A9BCC',

  // Semantic states
  success: '#788C5D',
  successForeground: '#FAF9F5',
  warning: '#D4A27F',
  warningForeground: '#141413',
  info: '#6A9BCC',
  infoForeground: '#FAF9F5',
  error: '#C46686',
  errorForeground: '#FAF9F5',
};

const darkColors = {
  // Base colors
  background: '#141413',
  foreground: '#FAF9F5',

  // Card colors
  card: '#1C1C1A',
  cardForeground: '#FAF9F5',

  // Popover colors
  popover: '#1C1C1A',
  popoverForeground: '#FAF9F5',

  // Primary colors — Claude clay
  primary: '#D97757',
  primaryForeground: '#FAF9F5',

  // Secondary colors
  secondary: '#2A2926',
  secondaryForeground: '#FAF9F5',

  // Muted colors
  muted: '#2A2926',
  mutedForeground: '#B0AEA5',

  // Accent colors
  accent: '#2A2926',
  accentForeground: '#FAF9F5',

  // Destructive colors
  destructive: '#C46686',
  destructiveForeground: '#FAF9F5',

  // Border and input
  border: '#5E5D59',
  input: 'rgba(250, 249, 245, 0.12)',
  ring: '#D97757',

  // Text colors
  text: '#FAF9F5',
  textMuted: '#B0AEA5',

  // Legacy support for existing components
  tint: '#D97757',
  icon: '#B0AEA5',
  tabIconDefault: '#87867F',
  tabIconSelected: '#D97757',

  // Accent scale
  blue: '#6A9BCC',
  green: '#788C5D',
  red: '#C46686',
  orange: '#D97757',
  yellow: '#EBDBBC',
  pink: '#C46686',
  purple: '#8B7AB8',
  teal: '#4A9B9B',
  indigo: '#6A9BCC',

  // Semantic states
  success: '#788C5D',
  successForeground: '#FAF9F5',
  warning: '#D4A27F',
  warningForeground: '#141413',
  info: '#6A9BCC',
  infoForeground: '#FAF9F5',
  error: '#C46686',
  errorForeground: '#FAF9F5',
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
