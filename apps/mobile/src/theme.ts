export const colors = {
  bg: '#141810',
  bgDeep: '#0E110C',
  surface: '#1B2117',
  surfaceSolid: '#1B2117',
  surfaceRaised: '#262D20',
  ink: '#F6F1E6',
  inkSoft: '#E8E2D4',
  muted: '#9AA090',
  faint: '#6A7160',
  line: 'rgba(246, 241, 230, 0.12)',
  lineStrong: 'rgba(246, 241, 230, 0.22)',
  accent: '#4A7A42',
  accentFill: '#E8F0DC',
  accentSoft: '#7FA876',
  danger: '#C45F3F',
  camping: '#C9A66B',
  hiking: '#7FA876',
  peak: '#A3472D',
}

/** Match website: Fraunces + DM Sans */
export const fonts = {
  display: 'Fraunces, Georgia, serif',
  sans: 'DM Sans, Avenir Next, Segoe UI, sans-serif',
  mono: 'SF Mono, Consolas, monospace',
}

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
}

export const typography = {
  brand: {
    fontFamily: fonts.display,
    fontSize: 40,
    fontWeight: '600' as const,
    letterSpacing: -1.1,
    lineHeight: 44,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    fontWeight: '600' as const,
    letterSpacing: -0.7,
    lineHeight: 34,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.35,
    lineHeight: 28,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.04,
  },
  button: {
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.01,
  },
}
