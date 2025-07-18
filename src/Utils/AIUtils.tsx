import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { getDb } from "../lib/db";
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
    const db = await getDb();

    try {
        await db.execute(
            `BEGIN TRANSACTION`
        );
        await db.execute(
            `DELETE FROM requirement_chunk WHERE note_id = ?`,
            [entryId]
        );
        await db.execute(
            `DELETE FROM ambiguity_finding WHERE chunk_id IN (SELECT chunk_id FROM requirement_chunk WHERE note_id = ?)`,
            [entryId]
        );
        for (const chunk of chunks) {
            await db.execute(
                `INSERT OR IGNORE INTO requirement_chunk (note_id, text, start_offset, end_offset) VALUES (?, ?, ?, ?)`,
                [entryId, chunk.text, chunk.start_offset, chunk.end_offset]
            );
        }
        for (const finding of findings) {
            await db.execute(
                `INSERT OR IGNORE INTO ambiguity_finding (chunk_id, kind, phrase, suggested_rewrite, clarifying_q, severity) VALUES (?, ?, ?, ?, ?, ?)`,
                [finding.start_offset, finding.kind, finding.suggestedRewrite, finding.suggestedRewrite, finding.suggestedRewrite, 1]
            );
        }
        await db.execute(`COMMIT`);
    }
    catch (error) {
        console.error("Error persisting clarity findings:", error);
        await db.execute(`ROLLBACK`);
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