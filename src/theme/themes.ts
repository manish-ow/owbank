// Shared theme definitions — no 'use client' so usable on both server and client

export interface ThemeConfig {
  id: string;
  logo: string;
  logoUrl: string;
  fullName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textOnPrimary: string;
  assistantName: string;
  accountPrefix: string;
}

export const themes: Record<string, ThemeConfig> = {
  OWBANK: {
    id: 'OWBANK',
    logo: 'OW',
    logoUrl: '/logos/owbank.svg',
    fullName: 'OW Bank',
    tagline: 'Banking made intelligent',
    primaryColor: '#002C77',
    secondaryColor: '#009DE0',
    accentColor: '#009DE0',
    textOnPrimary: '#FFFFFF',
    assistantName: 'OW AI Assistant',
    accountPrefix: 'OW',
  },
  DBS: {
    id: 'DBS',
    logo: 'DBS',
    logoUrl: '/logos/dbs.png',
    fullName: 'DBS Bank',
    tagline: 'Live more, Bank less',
    primaryColor: '#FF3333',
    secondaryColor: '#000000',
    accentColor: '#FF3333',
    textOnPrimary: '#FFFFFF',
    assistantName: 'DBS AI Assistant',
    accountPrefix: 'OW',
  },
  HSBC: {
    id: 'HSBC',
    logo: 'HSBC',
    logoUrl: '/logos/hsbc.png',
    fullName: 'HSBC',
    tagline: 'Opening up a world of opportunity',
    primaryColor: '#DB0011',
    secondaryColor: '#000000',
    accentColor: '#DB0011',
    textOnPrimary: '#FFFFFF',
    assistantName: 'HSBC AI Assistant',
    accountPrefix: 'OW',
  },
  SCB: {
    id: 'SCB',
    logo: 'SCB',
    logoUrl: '/logos/scb.png',
    fullName: 'Standard Chartered',
    tagline: 'Here for good',
    primaryColor: '#0072AA',
    secondaryColor: '#21AA47',
    accentColor: '#21AA47',
    textOnPrimary: '#FFFFFF',
    assistantName: 'SCB AI Assistant',
    accountPrefix: 'OW',
  },
  MAYB: {
    id: 'MAYB',
    logo: 'MAY',
    logoUrl: '/logos/maybank.png',
    fullName: 'Maybank',
    tagline: 'Humanising Financial Services',
    primaryColor: '#FDB813',
    secondaryColor: '#000000',
    accentColor: '#FDB813',
    textOnPrimary: '#000000',
    assistantName: 'Maybank AI Assistant',
    accountPrefix: 'OW',
  },
  UOB: {
    id: 'UOB',
    logo: 'UOB',
    logoUrl: '/logos/uob.png',
    fullName: 'UOB',
    tagline: 'Right by You',
    primaryColor: '#005EB8',
    secondaryColor: '#ED1C24',
    accentColor: '#ED1C24',
    textOnPrimary: '#FFFFFF',
    assistantName: 'UOB AI Assistant',
    accountPrefix: 'OW',
  },
  FUSION: {
    id: 'FUSION',
    logo: 'Fusion',
    logoUrl: '/logos/fusion.png',
    fullName: 'Fusion',
    tagline: 'Make Things Happen',
    primaryColor: '#004B23',
    secondaryColor: '#000000',
    accentColor: '#B3D235',
    textOnPrimary: '#FFFFFF',
    assistantName: 'Enbi AI Assistant',
    accountPrefix: 'OW',
  },
};

// Client + server: reads NEXT_PUBLIC_THEME
export function getThemeConfig(themeId?: string): ThemeConfig {
  const key = (themeId || process.env.NEXT_PUBLIC_THEME || 'FUSION').toUpperCase();
  return themes[key] || themes['FUSION'];
}

// Server-only: reads THEME env var (for API routes, gemini, layout, etc.)
export function getServerThemeConfig(): ThemeConfig {
  const key = (process.env.THEME || process.env.NEXT_PUBLIC_THEME || 'FUSION').toUpperCase();
  return themes[key] || themes['FUSION'];
}
