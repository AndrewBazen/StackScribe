/**
 * CodeMirror Theme Generator
 *
 * Creates native CodeMirror 6 themes from ThemeDefinition objects.
 * Uses EditorView.theme() for UI styling and HighlightStyle for syntax.
 * Supports dynamic theme switching via Compartment.
 */

import { EditorView } from '@codemirror/view';
import { Extension, Compartment } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { EditorThemeDefinition, ThemeDefinition } from './types';
import { defaultEditorDark } from './defaultEditorDark';

/**
 * Compartment for dynamic theme reconfiguration
 * This allows us to swap themes without recreating the editor
 */
export const themeCompartment = new Compartment();

/**
 * Helper to check if theme has app-level colors (ThemeDefinition)
 */
function hasAppColors(theme: EditorThemeDefinition | ThemeDefinition): theme is ThemeDefinition {
  return 'bgSecondary' in theme.colors;
}

/**
 * Create the editor UI theme (backgrounds, gutters, selection, etc.)
 */
function createEditorUITheme(theme: EditorThemeDefinition | ThemeDefinition): Extension {
  // Get app-level colors with fallbacks for EditorThemeDefinition
  const bgSecondary = hasAppColors(theme) ? theme.colors.bgSecondary : theme.colors.editorGutterBg;
  const bgElevated = hasAppColors(theme) ? theme.colors.bgElevated : theme.colors.editorBg;
  const bgActive = hasAppColors(theme) ? theme.colors.bgActive : theme.colors.editorActiveLine;
  const textPrimary = hasAppColors(theme) ? theme.colors.textPrimary : theme.colors.editorText;
  const textMuted = hasAppColors(theme) ? theme.colors.textMuted : theme.colors.editorGutterText;
  const borderPrimary = hasAppColors(theme) ? theme.colors.borderPrimary : '#333333';
  const borderSecondary = hasAppColors(theme) ? theme.colors.borderSecondary : '#3e3e3e';
  const accentPrimary = hasAppColors(theme) ? theme.colors.accentPrimary : theme.colors.editorCursor;
  const warning = hasAppColors(theme) ? theme.colors.warning : '#ffd700';
  const error = hasAppColors(theme) ? theme.colors.error : '#f14c4c';

  // Highlight colors
  const searchMatch = theme.colors.editorSearchMatch;
  const searchMatchSelected = theme.colors.editorSearchMatchSelected;
  const wordHighlight = theme.colors.editorWordHighlight;
  const bracketMatch = theme.colors.editorBracketMatch;

  return EditorView.theme(
    {
      // Root editor styles
      '&': {
        backgroundColor: theme.colors.editorBg,
        color: theme.colors.editorText,
      },

      // Content area
      '.cm-content': {
        caretColor: theme.colors.editorCursor,
      },

      // Cursor styling
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: theme.colors.editorCursor,
        borderLeftWidth: '2px',
      },

      // Selection styling - the key fix for visibility
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: `${theme.colors.editorSelection} !important`,
      },
      '.cm-selectionBackground': {
        backgroundColor: theme.colors.editorSelection,
      },
      '.cm-content ::selection': {
        backgroundColor: theme.colors.editorSelection,
      },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
        backgroundColor: `${theme.colors.editorSelection} !important`,
      },

      // Selection match highlighting (other occurrences)
      '.cm-selectionMatch': {
        backgroundColor: theme.colors.editorSelectionMatch,
      },

      // Active line highlighting
      '.cm-activeLine': {
        backgroundColor: theme.colors.editorActiveLine,
      },

      // Gutter styling
      '.cm-gutters': {
        backgroundColor: theme.colors.editorGutterBg,
        color: theme.colors.editorGutterText,
        border: 'none',
        borderRight: `1px solid ${borderPrimary}`,
      },

      // Line numbers
      '.cm-lineNumbers .cm-gutterElement': {
        color: theme.colors.editorLineNumber,
      },

      // Active line gutter
      '.cm-activeLineGutter': {
        backgroundColor: theme.colors.editorActiveLineGutter,
      },

      // Fold gutter
      '.cm-foldGutter .cm-gutterElement': {
        color: textMuted,
      },

      // Search match highlighting
      '.cm-searchMatch': {
        backgroundColor: searchMatch,
        borderRadius: '2px',
      },

      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: searchMatchSelected,
        color: theme.variant === 'dark' ? '#000' : '#fff',
      },

      // Word highlight (same word occurrences)
      '.cm-highlightSpace': {
        backgroundColor: wordHighlight,
      },

      // Matching brackets
      '&.cm-focused .cm-matchingBracket': {
        backgroundColor: bracketMatch,
        outline: `1px solid ${accentPrimary}`,
      },

      // Panels (search, etc.)
      '.cm-panels': {
        backgroundColor: bgSecondary,
        color: textPrimary,
      },

      '.cm-panel': {
        backgroundColor: bgSecondary,
      },

      '.cm-panel.cm-search': {
        backgroundColor: bgElevated,
      },

      // Tooltips
      '.cm-tooltip': {
        backgroundColor: bgElevated,
        color: textPrimary,
        border: `1px solid ${borderSecondary}`,
        borderRadius: '6px',
      },

      '.cm-tooltip-autocomplete': {
        '& > ul > li[aria-selected]': {
          backgroundColor: bgActive,
          color: textPrimary,
        },
      },

      // Placeholder text
      '.cm-placeholder': {
        color: textMuted,
        fontStyle: 'italic',
      },

      // Scroller
      '.cm-scroller': {
        fontFamily: 'JetBrainsMono Nerd Font, monospace',
      },
    },
    { dark: theme.variant === 'dark' }
  );
}

/**
 * Create syntax highlighting styles
 */
function createSyntaxHighlighting(theme: EditorThemeDefinition | ThemeDefinition): Extension {
  // Get error color with fallback
  const errorColor = hasAppColors(theme) ? theme.colors.error : '#f14c4c';

  const highlightStyle = HighlightStyle.define([
    // Comments
    { tag: t.comment, color: theme.syntax.comment, fontStyle: 'italic' },
    { tag: t.lineComment, color: theme.syntax.comment, fontStyle: 'italic' },
    { tag: t.blockComment, color: theme.syntax.comment, fontStyle: 'italic' },
    { tag: t.docComment, color: theme.syntax.comment, fontStyle: 'italic' },

    // Variables and properties
    { tag: t.variableName, color: theme.syntax.variable },
    { tag: t.propertyName, color: theme.syntax.variable },
    { tag: t.definition(t.variableName), color: theme.syntax.variable },

    // Strings
    { tag: t.string, color: theme.syntax.string },
    { tag: t.special(t.string), color: theme.syntax.string },
    { tag: t.character, color: theme.syntax.string },

    // Numbers
    { tag: t.number, color: theme.syntax.number },
    { tag: t.integer, color: theme.syntax.number },
    { tag: t.float, color: theme.syntax.number },

    // Booleans
    { tag: t.bool, color: theme.syntax.boolean },

    // Keywords
    { tag: t.keyword, color: theme.syntax.keyword },
    { tag: t.modifier, color: theme.syntax.keyword },
    { tag: t.controlKeyword, color: theme.syntax.keyword },
    { tag: t.operatorKeyword, color: theme.syntax.keyword },
    { tag: t.definitionKeyword, color: theme.syntax.keyword },
    { tag: t.moduleKeyword, color: theme.syntax.keyword },
    { tag: t.self, color: theme.syntax.keyword },
    { tag: t.null, color: theme.syntax.keyword },

    // Operators
    { tag: t.operator, color: theme.syntax.operator },
    { tag: t.compareOperator, color: theme.syntax.operator },
    { tag: t.arithmeticOperator, color: theme.syntax.operator },
    { tag: t.logicOperator, color: theme.syntax.operator },
    { tag: t.bitwiseOperator, color: theme.syntax.operator },

    // Classes and types
    { tag: t.className, color: theme.syntax.className },
    { tag: t.typeName, color: theme.syntax.typeName },
    { tag: t.definition(t.typeName), color: theme.syntax.typeDefinition },
    { tag: t.namespace, color: theme.syntax.className },

    // Functions
    { tag: t.function(t.variableName), color: theme.syntax.variable },
    { tag: t.function(t.propertyName), color: theme.syntax.variable },

    // Tags (HTML/XML)
    { tag: t.tagName, color: theme.syntax.tagName },
    { tag: t.attributeName, color: theme.syntax.attribute },
    { tag: t.attributeValue, color: theme.syntax.string },

    // Brackets and punctuation
    { tag: t.bracket, color: theme.syntax.bracket },
    { tag: t.angleBracket, color: theme.syntax.bracket },
    { tag: t.squareBracket, color: theme.syntax.bracket },
    { tag: t.paren, color: theme.syntax.bracket },
    { tag: t.brace, color: theme.syntax.bracket },
    { tag: t.separator, color: theme.syntax.punctuation },
    { tag: t.punctuation, color: theme.syntax.punctuation },

    // Markdown specific
    { tag: t.heading, color: theme.syntax.heading, fontWeight: 'bold' },
    { tag: t.heading1, color: theme.syntax.heading, fontWeight: 'bold', fontSize: '1.5em' },
    { tag: t.heading2, color: theme.syntax.heading, fontWeight: 'bold', fontSize: '1.3em' },
    { tag: t.heading3, color: theme.syntax.heading, fontWeight: 'bold', fontSize: '1.1em' },
    { tag: t.emphasis, color: theme.syntax.emphasis, fontStyle: 'italic' },
    { tag: t.strong, color: theme.syntax.strong, fontWeight: 'bold' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: theme.syntax.link, textDecoration: 'underline' },
    { tag: t.url, color: theme.syntax.link },
    { tag: t.quote, color: theme.syntax.comment, fontStyle: 'italic' },
    { tag: t.monospace, fontFamily: 'monospace' },

    // Labels and special
    { tag: t.labelName, color: theme.syntax.variable },
    { tag: t.meta, color: theme.syntax.comment },
    { tag: t.invalid, color: errorColor },
  ]);

  return syntaxHighlighting(highlightStyle);
}

/**
 * Create a complete editor theme extension from a ThemeDefinition or EditorThemeDefinition
 */
export function createEditorTheme(theme: EditorThemeDefinition | ThemeDefinition): Extension[] {
  return [createEditorUITheme(theme), createSyntaxHighlighting(theme)];
}

/**
 * Create a theme extension wrapped in the compartment for dynamic switching
 */
export function createCompartmentalizedTheme(theme: EditorThemeDefinition | ThemeDefinition): Extension {
  return themeCompartment.of(createEditorTheme(theme));
}

/**
 * Get the reconfiguration transaction for switching themes
 */
export function getThemeReconfiguration(theme: EditorThemeDefinition | ThemeDefinition) {
  return themeCompartment.reconfigure(createEditorTheme(theme));
}

/**
 * Default theme extension (dark theme)
 * Used as fallback and initial state
 */
export const defaultEditorThemeExtension = createEditorTheme(defaultEditorDark);
