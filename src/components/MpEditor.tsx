import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { syntaxTree } from "@codemirror/language";
import { EditorView, keymap } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { basicSetup } from "codemirror";
import { TextToMarkdown } from "../Utils/MarkdownTools";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";

const md = markdown({
  base: markdownLanguage,
  codeLanguages: languages,
});

const getFence = (view: EditorView): SyntaxNode | null => {
    const { state } = view, { from } = state.selection.main;
    const tree = syntaxTree(state);
    let node: SyntaxNode | null = tree.resolve(from, -1);
    while (node && node.name !== "FencedCode") node = node.parent;
    return node;
};

const runBlock = (view: EditorView) => {
    const node = getFence(view);
    if (!node) return false;
    const code = view.state.sliceDoc(node.from, node.to).replace(
        /^```.*\n/, "").replace(/\n```$/, "");
    runCode(code);
    return true;
};

const runKeymap = keymap.of([{
    key: "Ctrl-Enter",
    run: runBlock,
}]);

async function runCode(code: string) {
    const out = await invoke<string>("run_code", { code });
    console.log(out);
}

interface MdEditorProps {
  value: string;
  onEntryChange: (nextValue: string) => void;
}

export function MdEditor({ value, onEntryChange }: MdEditorProps) {
  const [markdown, setMarkdown] = useState(value);

  // Update editor text whenever parent passes a different `value`
  useEffect(() => {
    setMarkdown(value);
  }, [value]);

    return (
    <CodeMirror
      className="editor"
      value={markdown}
      extensions={[md, runKeymap, TextToMarkdown, basicSetup, EditorView.lineWrapping]}
      onChange={(v) => {
        setMarkdown(v);
        onEntryChange(v);
      }}
      height="100vh"
      width="100%"
      theme="dark"
    />
  );
}