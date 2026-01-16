/**
 * Default Light App Theme
 *
 * Controls the application UI: sidebar, tabs, dialogs, buttons, etc.
 */

import type { AppThemeDefinition } from './types';

export const defaultAppLight: AppThemeDefinition = {
  id: 'app-light',
  name: 'Light',
  variant: 'light',
  colors: {
    // Background Colors
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f5',
    bgTertiary: '#fafafa',
    bgElevated: '#ffffff',
    bgHover: '#e8e8e8',
    bgActive: '#d4d4d4',
    bgHighlight: '#e0e0e0',

    // Text Colors
    textPrimary: '#1a1a1a',
    textSecondary: '#333333',
    textTertiary: '#555555',
    textMuted: '#777777',
    textDisabled: '#aaaaaa',

    // Border Colors
    borderPrimary: '#e0e0e0',
    borderSecondary: '#d0d0d0',
    borderFocus: '#0078d4',

    // Accent Colors
    accentPrimary: '#0e8a5f',
    accentPrimaryHover: '#0a6b4a',
    accentSecondary: '#0078d4',
    accentSecondaryHover: '#006cc1',

    // Semantic Colors
    warning: '#d4a000',
    error: '#d32f2f',
    success: '#2e7d32',
    info: '#0078d4',
  },
};

export default defaultAppLight;
