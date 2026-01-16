/**
 * Default Dark Theme
 *
 * The built-in dark theme for StackScribe.
 * Colors are extracted from the original App.css and theme.ts
 */

import type { ThemeDefinition } from './types';

export const defaultDark: ThemeDefinition = {
  id: 'default-dark',
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

    // Editor Colors
    editorBg: '#242424',
    editorText: '#e0e0e0',
    editorSelection: 'rgba(48, 239, 182, 0.3)',
    editorSelectionMatch: 'rgba(48, 239, 182, 0.2)',
    editorCursor: '#4ff7d0',
    editorActiveLine: 'rgba(14, 92, 69, 0.2)',
    editorGutterBg: '#252525',
    editorGutterText: '#0f8260',
    editorLineNumber: '#0f8260',
    editorActiveLineGutter: 'rgba(14, 92, 69, 0.3)',
    editorSearchMatch: 'rgba(255, 215, 0, 0.4)',
    editorSearchMatchSelected: '#50EFB8',
    editorWordHighlight: 'rgba(48, 239, 182, 0.25)',
    editorBracketMatch: 'rgba(48, 239, 182, 0.3)',
  },
  syntax: {
    // Code syntax highlighting
    comment: '#676767',
    variable: '#30efb6',
    string: '#ccc460',
    number: '#3cf0ff',
    boolean: '#1efdf8',
    keyword: '#8679fd',
    operator: '#ffffff',
    className: '#30efb6',
    typeName: '#dfe0e1',
    typeDefinition: '#e6e6e6',
    tagName: '#74fac5',
    attribute: '#ffffff',
    heading: '#50EFB8',
    emphasis: '#d4d4d4',
    strong: '#ffffff',
    link: '#4ff7d0',
    bracket: '#dc6a1f',
    punctuation: '#888888',
  },
};

export default defaultDark;
