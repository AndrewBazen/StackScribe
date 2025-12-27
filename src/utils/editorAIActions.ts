import { EditorView } from '@codemirror/view';

/**
 * Insert content at the current cursor position
 */
export function insertAtCursor(view: EditorView, content: string): void {
  const { from } = view.state.selection.main;

  view.dispatch({
    changes: { from, to: from, insert: content },
    selection: { anchor: from + content.length }
  });

  view.focus();
}

/**
 * Replace the current selection with new content
 */
export function replaceSelection(view: EditorView, content: string): void {
  const { from, to } = view.state.selection.main;

  view.dispatch({
    changes: { from, to, insert: content },
    selection: { anchor: from + content.length }
  });

  view.focus();
}

/**
 * Replace content at a specific range
 */
export function replaceRange(
  view: EditorView,
  from: number,
  to: number,
  content: string
): void {
  view.dispatch({
    changes: { from, to, insert: content },
    selection: { anchor: from + content.length }
  });

  view.focus();
}

/**
 * Append content at the end of the document
 */
export function appendToDocument(view: EditorView, content: string): void {
  const docLength = view.state.doc.length;
  const prefix = docLength > 0 ? '\n\n' : '';

  view.dispatch({
    changes: { from: docLength, to: docLength, insert: prefix + content },
    selection: { anchor: docLength + prefix.length + content.length }
  });

  view.focus();
}

/**
 * Get the current selection text and position
 */
export function getSelection(view: EditorView): {
  text: string;
  from: number;
  to: number;
} | null {
  const { from, to } = view.state.selection.main;

  if (from === to) {
    return null; // No selection
  }

  return {
    text: view.state.sliceDoc(from, to),
    from,
    to
  };
}

/**
 * Get the full document content
 */
export function getDocumentContent(view: EditorView): string {
  return view.state.doc.toString();
}
