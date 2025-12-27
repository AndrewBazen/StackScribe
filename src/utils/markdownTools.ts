import { EditorView } from "@codemirror/view";
import TurndownService from 'turndown';

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '*' });

export const TextToMarkdown = EditorView.domEventHandlers({
  paste(e, view) {
    const html = e.clipboardData?.getData('text/html');

    if (!html) return;

    e.preventDefault();

    const insertMarkdown = (h: string) =>
      view.dispatch(view.state.replaceSelection(td.turndown(h)));

    insertMarkdown(html);
  },
});
