import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { persistClarityFindings as persistClarityFindingsToDb } from "../services/rustDatabaseService";
import type { Chunk } from "../types/Chunk";
import type { Finding } from "../types/finding";
import type { Requirement } from "../types/requirement";

export function chunkMarkdown(markdown: string): Chunk[] {
    const lines = markdown.split('\n');
    const chunks: Chunk[] = [];
    let currentChunk: Chunk | null = null;
    let currentOffset = 0;

    for (const line of lines) {
        const lineOffset = currentOffset;
        currentOffset += line.length + 1; // +1 for the newline character

        if (line.trim() === '') continue; // Skip empty lines but still count their offset

        if (currentChunk === null) {
            currentChunk = { id: crypto.randomUUID(), text: line, start_offset: lineOffset, end_offset: lineOffset + line.length };
            chunks.push(currentChunk);
        } else {
            currentChunk.text += '\n' + line;
            currentChunk.end_offset = lineOffset + line.length;
        }
    }

    return chunks;
}

export async function outputRequirements(requirements: Requirement[], editor: EditorView) {
    editor.dispatch({
        changes: {
            from: 0,
            to: editor.state.doc.length,
            insert: requirements.map(r => r.title).join('\n')
        }
    });
}






export function makeDecorations(findings: Finding[]) {
    const decorations = findings.map(f => 
        Decoration.mark({
            class: 'ambiguous-phrase',
            attributes: { title: `${f.kind}: ${f.suggestedRewrite}`}
        }).range(f.start_offset, f.end_offset)
    );
    return Decoration.set(decorations, true);
}

export function createDecorationExtension(findings: Finding[]) {
    console.log("🎨 Creating decoration extension for findings:", findings);
    
    if (findings.length === 0) {
        console.log("🎨 No findings, returning empty extension");
        return [highlightField];
    }
    
    const decorations = makeDecorations(findings);
    console.log("🎨 Created decorations:", decorations);
    
    return [
        highlightField,
        EditorView.decorations.of(decorations)
    ];
}

export async function persistClarityFindings(entryId: string, chunks: Chunk[], findings: Finding[]) {
    try {
        const chunksData = chunks.map(c => ({
            text: c.text,
            start_offset: c.start_offset,
            end_offset: c.end_offset
        }));
        
        const findingsData = findings.map(f => ({
            kind: f.kind,
            suggestedRewrite: f.suggestedRewrite,
            severity: 1
        }));
        
        await persistClarityFindingsToDb(entryId, chunksData, findingsData);
    } catch (error) {
        console.error("Error persisting clarity findings:", error);
    }
}

export const setHighlights = StateEffect.define<DecorationSet>();
export const highlightField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (deco, tr) => {
        for (const effect of tr.effects) {
            if (effect.is(setHighlights)) return effect.value;
        }
        return deco.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});