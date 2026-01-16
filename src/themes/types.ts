/**
 * Theme System Type Definitions
 *
 * Separates themes into App themes (UI) and Editor themes (CodeMirror).
 * Each can be customized independently.
 */

// ============================================================================
// APP THEME TYPES (UI: sidebar, tabs, dialogs, buttons, etc.)
// ============================================================================

/**
 * Color palette for UI backgrounds
 */
export interface AppBackgroundColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  bgHover: string;
  bgActive: string;
  bgHighlight: string;
}

/**
 * Color palette for text elements
 */
export interface AppTextColors {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textDisabled: string;
}

/**
 * Color palette for borders
 */
export interface AppBorderColors {
  borderPrimary: string;
  borderSecondary: string;
  borderFocus: string;
}

/**
 * Color palette for accent/brand colors
 */
export interface AppAccentColors {
  accentPrimary: string;
  accentPrimaryHover: string;
  accentSecondary: string;
  accentSecondaryHover: string;
}

/**
 * Semantic colors for status indicators
 */
export interface AppSemanticColors {
  warning: string;
  error: string;
  success: string;
  info: string;
}

/**
 * All App UI colors combined
 */
export interface AppThemeColors extends
  AppBackgroundColors,
  AppTextColors,
  AppBorderColors,
  AppAccentColors,
  AppSemanticColors {}

/**
 * Complete App theme definition
 */
export interface AppThemeDefinition {
  id: string;
  name: string;
  variant: ThemeVariant;
  colors: AppThemeColors;
}

/**
 * Partial App theme for user customization
 */
export interface PartialAppTheme {
  id: string;
  name: string;
  variant: ThemeVariant;
  colors?: Partial<AppThemeColors>;
}

/**
 * App theme metadata for display in UI
 */
export interface AppThemeMeta {
  id: string;
  name: string;
  variant: ThemeVariant;
  isBuiltIn: boolean;
  filePath?: string;
}

/**
 * App theme loading result
 */
export interface AppThemeLoadResult {
  success: boolean;
  theme?: AppThemeDefinition;
  error?: string;
}

// ============================================================================
// EDITOR THEME TYPES (CodeMirror: syntax highlighting, editor UI)
// ============================================================================

/**
 * Editor-specific UI colors for CodeMirror
 */
export interface EditorUIColors {
  editorBg: string;
  editorText: string;
  editorSelection: string;
  editorSelectionMatch: string;
  editorCursor: string;
  editorActiveLine: string;
  editorGutterBg: string;
  editorGutterText: string;
  editorLineNumber: string;
  editorActiveLineGutter: string;
  // Highlight colors
  editorSearchMatch: string;
  editorSearchMatchSelected: string;
  editorWordHighlight: string;
  editorBracketMatch: string;
}

/**
 * Syntax highlighting colors for code
 */
export interface SyntaxColors {
  comment: string;
  variable: string;
  string: string;
  number: string;
  boolean: string;
  keyword: string;
  operator: string;
  className: string;
  typeName: string;
  typeDefinition: string;
  tagName: string;
  attribute: string;
  heading: string;
  emphasis: string;
  strong: string;
  link: string;
  bracket: string;
  punctuation: string;
}

/**
 * Complete Editor theme definition
 */
export interface EditorThemeDefinition {
  id: string;
  name: string;
  variant: ThemeVariant;
  colors: EditorUIColors;
  syntax: SyntaxColors;
}

/**
 * Partial Editor theme for user customization
 */
export interface PartialEditorTheme {
  id: string;
  name: string;
  variant: ThemeVariant;
  colors?: Partial<EditorUIColors>;
  syntax?: Partial<SyntaxColors>;
}

/**
 * Editor theme metadata for display in UI
 */
export interface EditorThemeMeta {
  id: string;
  name: string;
  variant: ThemeVariant;
  isBuiltIn: boolean;
  filePath?: string;
}

/**
 * Editor theme loading result
 */
export interface EditorThemeLoadResult {
  success: boolean;
  theme?: EditorThemeDefinition;
  error?: string;
}

// ============================================================================
// SHARED TYPES
// ============================================================================

/**
 * Theme variant - determines base contrast and defaults
 */
export type ThemeVariant = 'dark' | 'light';

/**
 * Theme type identifier
 */
export type ThemeType = 'app' | 'editor';

// ============================================================================
// LEGACY COMBINED TYPE (for backwards compatibility during migration)
// ============================================================================

/**
 * Combined theme colors (legacy - used during migration)
 */
export interface ThemeColors extends AppThemeColors, EditorUIColors {}

/**
 * Combined theme definition (legacy - used during migration)
 */
export interface ThemeDefinition {
  id: string;
  name: string;
  variant: ThemeVariant;
  colors: ThemeColors;
  syntax: SyntaxColors;
}

/**
 * Partial theme (legacy)
 */
export interface PartialTheme {
  id: string;
  name: string;
  variant: ThemeVariant;
  colors?: Partial<ThemeColors>;
  syntax?: Partial<SyntaxColors>;
}

/**
 * Theme meta (legacy)
 */
export interface ThemeMeta {
  id: string;
  name: string;
  variant: ThemeVariant;
  isBuiltIn: boolean;
  filePath?: string;
}

/**
 * Theme load result (legacy)
 */
export interface ThemeLoadResult {
  success: boolean;
  theme?: ThemeDefinition;
  error?: string;
}

// ============================================================================
// CSS VARIABLE MAPPINGS
// ============================================================================

/**
 * CSS variable mapping for App theme colors
 */
export const APP_COLOR_TO_CSS_VAR: Record<keyof AppThemeColors, string> = {
  // Backgrounds
  bgPrimary: '--color-bg-primary',
  bgSecondary: '--color-bg-secondary',
  bgTertiary: '--color-bg-tertiary',
  bgElevated: '--color-bg-elevated',
  bgHover: '--color-bg-hover',
  bgActive: '--color-bg-active',
  bgHighlight: '--color-bg-highlight',

  // Text
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  textTertiary: '--color-text-tertiary',
  textMuted: '--color-text-muted',
  textDisabled: '--color-text-disabled',

  // Borders
  borderPrimary: '--color-border-primary',
  borderSecondary: '--color-border-secondary',
  borderFocus: '--color-border-focus',

  // Accents
  accentPrimary: '--color-accent-primary',
  accentPrimaryHover: '--color-accent-primary-hover',
  accentSecondary: '--color-accent-secondary',
  accentSecondaryHover: '--color-accent-secondary-hover',

  // Semantic
  warning: '--color-accent-warning',
  error: '--color-accent-error',
  success: '--color-accent-success',
  info: '--color-accent-info',
};

/**
 * CSS variable mapping for Editor UI colors
 */
export const EDITOR_COLOR_TO_CSS_VAR: Record<keyof EditorUIColors, string> = {
  editorBg: '--color-editor-bg',
  editorText: '--color-editor-text',
  editorSelection: '--color-editor-selection',
  editorSelectionMatch: '--color-editor-selection-match',
  editorCursor: '--color-editor-cursor',
  editorActiveLine: '--color-editor-active-line',
  editorGutterBg: '--color-editor-gutter-bg',
  editorGutterText: '--color-editor-gutter-text',
  editorLineNumber: '--color-editor-line-number',
  editorActiveLineGutter: '--color-editor-active-line-gutter',
  editorSearchMatch: '--color-editor-search-match',
  editorSearchMatchSelected: '--color-editor-search-match-selected',
  editorWordHighlight: '--color-editor-word-highlight',
  editorBracketMatch: '--color-editor-bracket-match',
};

/**
 * CSS variable mapping for syntax colors
 */
export const SYNTAX_TO_CSS_VAR: Record<keyof SyntaxColors, string> = {
  comment: '--syntax-comment',
  variable: '--syntax-variable',
  string: '--syntax-string',
  number: '--syntax-number',
  boolean: '--syntax-boolean',
  keyword: '--syntax-keyword',
  operator: '--syntax-operator',
  className: '--syntax-class',
  typeName: '--syntax-type',
  typeDefinition: '--syntax-type-definition',
  tagName: '--syntax-tag',
  attribute: '--syntax-attribute',
  heading: '--syntax-heading',
  emphasis: '--syntax-emphasis',
  strong: '--syntax-strong',
  link: '--syntax-link',
  bracket: '--syntax-bracket',
  punctuation: '--syntax-punctuation',
};

/**
 * Legacy combined color mapping (for backwards compatibility)
 */
export const COLOR_TO_CSS_VAR: Record<keyof ThemeColors, string> = {
  ...APP_COLOR_TO_CSS_VAR,
  ...EDITOR_COLOR_TO_CSS_VAR,
};
