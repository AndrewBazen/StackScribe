/**
 * Default Light Theme
 *
 * The built-in light theme for StackScribe.
 * Designed with good contrast ratios for accessibility.
 */

import type { ThemeDefinition } from './types';

export const defaultLight: ThemeDefinition = {
  id: 'default-light',
  name: 'Light',
  variant: 'light',
  colors: {
    // Background Colors (light to dark progression)
    bgPrimary: '#ffffff',
    bgSecondary: '#f8f9fa',
    bgTertiary: '#f1f3f5',
    bgElevated: '#ffffff',
    bgHover: '#e9ecef',
    bgActive: '#dee2e6',
    bgHighlight: '#ced4da',

    // Text Colors (dark to light progression)
    textPrimary: '#1a1a1a',
    textSecondary: '#495057',
    textTertiary: '#6c757d',
    textMuted: '#868e96',
    textDisabled: '#adb5bd',

    // Border Colors
    borderPrimary: '#dee2e6',
    borderSecondary: '#ced4da',
    borderFocus: '#228be6',

    // Accent Colors (slightly darker for light bg contrast)
    accentPrimary: '#12b886',
    accentPrimaryHover: '#0ca678',
    accentSecondary: '#228be6',
    accentSecondaryHover: '#1c7ed6',

    // Semantic Colors (adjusted for light mode)
    warning: '#fab005',
    error: '#e03131',
    success: '#2f9e44',
    info: '#228be6',

    // Editor Colors
    editorBg: '#ffffff',
    editorText: '#1a1a1a',
    editorSelection: 'rgba(18, 184, 134, 0.25)',
    editorSelectionMatch: 'rgba(18, 184, 134, 0.15)',
    editorCursor: '#12b886',
    editorActiveLine: 'rgba(18, 184, 134, 0.08)',
    editorGutterBg: '#f8f9fa',
    editorGutterText: '#868e96',
    editorLineNumber: '#868e96',
    editorActiveLineGutter: 'rgba(18, 184, 134, 0.12)',
    editorSearchMatch: 'rgba(250, 176, 5, 0.3)',
    editorSearchMatchSelected: '#12b886',
    editorWordHighlight: 'rgba(18, 184, 134, 0.2)',
    editorBracketMatch: 'rgba(18, 184, 134, 0.25)',
  },
  syntax: {
    // Code syntax highlighting (adjusted for light backgrounds)
    comment: '#868e96',
    variable: '#0ca678',
    string: '#e67700',
    number: '#0c8599',
    boolean: '#1098ad',
    keyword: '#7048e8',
    operator: '#1a1a1a',
    className: '#0ca678',
    typeName: '#495057',
    typeDefinition: '#343a40',
    tagName: '#2f9e44',
    attribute: '#495057',
    heading: '#12b886',
    emphasis: '#495057',
    strong: '#1a1a1a',
    link: '#1c7ed6',
    bracket: '#d9480f',
    punctuation: '#6c757d',
  },
};

export default defaultLight;
