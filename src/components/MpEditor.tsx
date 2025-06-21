import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { syntaxTree } from "@codemirror/language";
import { EditorView, keymap } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { basicSetup } from "codemirror";
import { TextToMarkdown } from "../Utils/MarkdownTools";
import { invoke } from "@tauri-apps/api/core";

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
  setValue: (value: string) => void;
}

export function MdEditor({ value, setValue }: MdEditorProps) {
  return (
    <CodeMirror
      value={value}
      extensions={[md, runKeymap, TextToMarkdown, basicSetup]}
      onChange={(v) => setValue(v)}
      height="100vh"
      width="100%"
      theme="dark"
    />
  );
}