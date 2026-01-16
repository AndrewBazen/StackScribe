import CodeMirror, { Extension } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { syntaxTree } from "@codemirror/language";
import { EditorView, keymap } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { basicSetup } from "codemirror";
import { TextToMarkdown } from "../../utils/markdownTools";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useRef, useMemo } from "react";
import { createCompartmentalizedTheme, themeCompartment, createEditorTheme } from "../../themes/editorTheme";
import { useTheme } from "../../themes/themeContext";
import { slashCommands, hideSlashCommandPopover, executeSlashCommand, setPopoverStateCallback } from "../../utils/slashCommands";
import { SlashCommandPopover } from "./SlashCommandPopover";
import "../../styles/SlashCommandPopover.css";

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
  decorations: Extension[];
  onEditorViewReady?: (view: EditorView | null) => void;
}

export function MdEditor({ value, onEntryChange, decorations, onEditorViewReady }: MdEditorProps) {
  const [markdown, setMarkdown] = useState(value);
  const [popoverState, setPopoverState] = useState<{
    visible: boolean;
    position: { top: number; left: number };
    from: number;
  } | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const editorRef = useRef<any>(null);
  const { editorTheme } = useTheme();

  // Update editor text whenever parent passes a different `value`
  useEffect(() => {
    setMarkdown(value);
  }, [value]);

  // Notify parent when editor view is ready
  useEffect(() => {
    if (editorRef.current?.view) {
      setViewReady(true);
      if (onEditorViewReady) {
        onEditorViewReady(editorRef.current.view);
      }
    }
    return () => {
      setViewReady(false);
      if (onEditorViewReady) {
        onEditorViewReady(null);
      }
    };
  }, [editorRef.current?.view, onEditorViewReady]);

  // Debug popover state changes
  useEffect(() => {
    console.log("🔥 Popover state changed:", popoverState);
  }, [popoverState]);

  // Set up callback for direct communication from CodeMirror
  useEffect(() => {
    console.log("🔥 Setting up popover state callback");
    setPopoverStateCallback((newState) => {
      console.log("🔥 React received popover state from callback:", newState);
      setPopoverState(newState);
    });

    return () => {
      setPopoverStateCallback(() => {});
    };
  }, []);

  const handlePopoverSelect = (command: string, prompt: string) => {
    console.log(`Popover select: ${command} with prompt: "${prompt}"`);
    
    if (editorRef.current?.view) {
      // Hide popover first
      editorRef.current.view.dispatch({
        effects: hideSlashCommandPopover.of()
      });
      
      // Set popover state to null immediately to prevent re-renders
      setPopoverState(null);
      
      // Execute the command after a short delay to ensure popover is hidden
      setTimeout(() => {
        executeSlashCommand(command, prompt, editorRef.current.view);
      }, 10);
    }
  };

  const handlePopoverClose = () => {
    console.log("🔥 handlePopoverClose called");
    if (editorRef.current?.view) {
      editorRef.current.view.dispatch({
        effects: hideSlashCommandPopover.of()
      });
    }
    setPopoverState(null);
  };

  // Reconfigure editor theme when theme changes or view becomes ready
  useEffect(() => {
    if (viewReady && editorRef.current?.view && editorTheme) {
      editorRef.current.view.dispatch({
        effects: themeCompartment.reconfigure(createEditorTheme(editorTheme))
      });
    }
  }, [editorTheme, viewReady]);

  // Memoize base extensions (without theme - theme is handled separately via compartment)
  const baseExtensions = useMemo(() => [
    md,
    runKeymap,
    TextToMarkdown,
    basicSetup,
    EditorView.lineWrapping,
    slashCommands(),
  ], []);

  // Store initial theme ref to avoid recreating compartment on theme changes
  const initialEditorThemeRef = useRef(editorTheme);

  // Combine all extensions - theme compartment is created once and reconfigured dynamically
  const allExtensions = useMemo(() => [
    ...baseExtensions,
    createCompartmentalizedTheme(initialEditorThemeRef.current),
    ...decorations
  ], [baseExtensions, decorations]);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <CodeMirror
        ref={editorRef}
        className="editor"
        value={markdown}
        theme="none"
        extensions={allExtensions}
        onChange={(v, viewUpdate) => {
          setMarkdown(v);
          onEntryChange(v);
        }}
        height="100vh"
        width="100%"
      />
      
      {popoverState && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          pointerEvents: 'none',
          zIndex: 1001,
          width: '100%',
          height: '100%'
        }}>
          <SlashCommandPopover
            visible={popoverState.visible}
            position={popoverState.position}
            onSelect={handlePopoverSelect}
            onClose={handlePopoverClose}
          />
        </div>
      )}
    </div>
  );
}