/* ═══════════════════════════════════════════════════════════
    Cosmo AI — Theme Palette System
   ═══════════════════════════════════════════════════════════ */

export interface CosmoPalette {
  BG: string;
  SURFACE: string;
  CARD: string;
  SIDEBAR: string;
  FG: string;
  MUTED: string;
  BORDER: string;
  BORDER_SOFT: string;
  HOVER: string;
  HOVER_SOFT: string;
  SUBTLE_TEXT: string;
  OVERLAY_BG: string;
  OVERLAY_BACKDROP: string;
  SEND_IDLE: string;
  SEND_ACTIVE_FG: string;
  SCROLL_THUMB: string;
  SCROLL_THUMB_HOVER: string;
  INPUT_BG: string;
  USER_BUBBLE_BG: string;
  USER_BUBBLE_BORDER: string;
  IS_DARK: boolean;
}

export function useCosmoPalette(darkMode: boolean): CosmoPalette {
  if (darkMode) {
    return {
      BG: '#031717',
      SURFACE: '#072424',
      CARD: '#0A2D2D',
      SIDEBAR: '#051B1B',
      FG: '#FCF6EE',
      MUTED: '#8BAEAD',
      BORDER: 'rgba(42, 195, 187, 0.22)',
      BORDER_SOFT: 'rgba(42, 195, 187, 0.14)',
      HOVER: 'rgba(0, 116, 114, 0.20)',
      HOVER_SOFT: 'rgba(42, 195, 187, 0.08)',
      SUBTLE_TEXT: '#709998',
      OVERLAY_BG: '#072424',
      OVERLAY_BACKDROP: 'rgba(3, 23, 23, 0.90)',
      SEND_IDLE: '#0C3232',
      SEND_ACTIVE_FG: '#FCF6EE',
      SCROLL_THUMB: 'rgba(42, 195, 187, 0.25)',
      SCROLL_THUMB_HOVER: 'rgba(42, 195, 187, 0.45)',
      INPUT_BG: '#072424',
      USER_BUBBLE_BG: 'linear-gradient(135deg, #007472 0%, #005E5C 100%)',
      USER_BUBBLE_BORDER: 'rgba(42, 195, 187, 0.35)',
      IS_DARK: true,
    };
  }
  return {
    BG: '#F8FAFC',
    SURFACE: '#FFFFFF',
    CARD: '#FFFFFF',
    SIDEBAR: '#F1F5F9',
    FG: '#0F172A',
    MUTED: '#475569',
    BORDER: 'rgba(0, 116, 114, 0.16)',
    BORDER_SOFT: 'rgba(0, 116, 114, 0.08)',
    HOVER: 'rgba(0, 116, 114, 0.08)',
    HOVER_SOFT: 'rgba(0, 116, 114, 0.04)',
    SUBTLE_TEXT: '#64748B',
    OVERLAY_BG: '#FFFFFF',
    OVERLAY_BACKDROP: 'rgba(248, 250, 252, 0.85)',
    SEND_IDLE: '#E2E8F0',
    SEND_ACTIVE_FG: '#FCF6EE',
    SCROLL_THUMB: 'rgba(0, 116, 114, 0.20)',
    SCROLL_THUMB_HOVER: 'rgba(0, 116, 114, 0.40)',
    INPUT_BG: '#FFFFFF',
    USER_BUBBLE_BG: 'linear-gradient(135deg, #E6F4F3 0%, #D1EBE9 100%)',
    USER_BUBBLE_BORDER: 'rgba(0, 116, 114, 0.22)',
    IS_DARK: false,
  };
}
