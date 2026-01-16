/**
 * Default Light Editor Theme
 *
 * Controls the CodeMirror editor: syntax highlighting, editor UI, etc.
 */

import type { EditorThemeDefinition } from './types';

export const defaultEditorLight: EditorThemeDefinition = {
  id: 'editor-light',
  name: 'Light',
  variant: 'light',
  colors: {
    // Editor UI Colors
    editorBg: '#ffffff',
    editorText: '#1a1a1a',
    editorSelection: 'rgba(14, 138, 95, 0.25)',
    editorSelectionMatch: 'rgba(14, 138, 95, 0.15)',
    editorCursor: '#0e8a5f',
    editorActiveLine: 'rgba(14, 138, 95, 0.08)',
    editorGutterBg: '#f8f8f8',
    editorGutterText: '#0e8a5f',
    editorLineNumber: '#0e8a5f',
    editorActiveLineGutter: 'rgba(14, 138, 95, 0.12)',
    // Highlight colors
    editorSearchMatch: 'rgba(212, 160, 0, 0.3)',
    editorSearchMatchSelected: '#0e8a5f',
    editorWordHighlight: 'rgba(14, 138, 95, 0.2)',
    editorBracketMatch: 'rgba(14, 138, 95, 0.25)',
  },
  syntax: {
    // Syntax highlighting colors - designed for light backgrounds
    comment: '#6a737d',
    variable: '#0e8a5f',
    string: '#b5850b',
    number: '#0077aa',
    boolean: '#0077aa',
    keyword: '#6f42c1',
    operator: '#1a1a1a',
    className: '#0e8a5f',
    typeName: '#444444',
    typeDefinition: '#333333',
    tagName: '#22863a',
    attribute: '#1a1a1a',
    heading: '#0e8a5f',
    emphasis: '#333333',
    strong: '#1a1a1a',
    link: '#0078d4',
    bracket: '#c9510c',
    punctuation: '#6a737d',
  },
};

export default defaultEditorLight;
