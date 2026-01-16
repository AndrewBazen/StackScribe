/**
 * Default Dark App Theme
 *
 * Controls the application UI: sidebar, tabs, dialogs, buttons, etc.
 */

import type { AppThemeDefinition } from './types';

export const defaultAppDark: AppThemeDefinition = {
  id: 'app-dark',
  name: 'Dark',
  variant: 'dark',
  colors: {
    // Background Colors
    bgPrimary: '#111111',
    bgSecondary: '#1e1e1e',
    bgTertiary: '#222222',
    bgElevated: '#252526',
    bgHover: '#2d2d2d',
    bgActive: '#333333',
    bgHighlight: '#3e3e3e',

    // Text Colors
    textPrimary: '#ffffff',
    textSecondary: '#d4d4d4',
    textTertiary: '#cccccc',
    textMuted: '#888888',
    textDisabled: '#666666',

    // Border Colors
    borderPrimary: '#333333',
    borderSecondary: '#3e3e3e',
    borderFocus: '#007acc',

    // Accent Colors
    accentPrimary: '#50EFB8',
    accentPrimaryHover: '#3CBA8E',
    accentSecondary: '#007acc',
    accentSecondaryHover: '#0098ff',

    // Semantic Colors
    warning: '#ffd700',
    error: '#f14c4c',
    success: '#4ec9b0',
    info: '#007acc',
  },
};

export default defaultAppDark;
