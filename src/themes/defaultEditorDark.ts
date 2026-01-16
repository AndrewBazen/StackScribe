/**
 * Default Dark Editor Theme
 *
 * Controls the CodeMirror editor: syntax highlighting, editor UI, etc.
 */

import type { EditorThemeDefinition } from './types';

export const defaultEditorDark: EditorThemeDefinition = {
  id: 'editor-dark',
  name: 'Dark',
  variant: 'dark',
  colors: {
    // Editor UI Colors
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
    // Highlight colors
    editorSearchMatch: 'rgba(255, 215, 0, 0.4)',
    editorSearchMatchSelected: '#50EFB8',
    editorWordHighlight: 'rgba(48, 239, 182, 0.25)',
    editorBracketMatch: 'rgba(48, 239, 182, 0.3)',
  },
  syntax: {
    // Syntax highlighting colors
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

export default defaultEditorDark;
