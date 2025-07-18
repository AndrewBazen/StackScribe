import type { Chunk } from "../types/Chunk";
import type { Finding } from "../types/finding";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_ENDPOINT = import.meta.env.VITE_OPENAI_ENDPOINT;

const MAX_TOKENS_PER_REQUEST = 800;

export async function detectAmbiguity(chunks: Chunk[]): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const chunk of chunks) {
        if (!chunk.text.trim()) continue;

        const payload = {
            messages: [
                {
                    role: "system",
                    content: 
                        "You are a rigorous requirements-engineering assistant. " +
                        "When a text chunk may be ambiguous, you return ONLY a JSON array " +
                        "whose items have keys: phrase, kind, suggestedRewrite, clarifyingQuestion. " +
                        "Valid kinds: VAGUENESS|MISSING_REF|QUANTIFIER|ANAPHORA|TBD. " +
                        "If no ambiguity is detected, return an empty JSON array []. " +
                        "IMPORTANT: never wrap the JSON in markdown fences."
                },
                {
                    role: "user",
                    content: `<<<CHUNK>>>\n${chunk.text}\n<<<END>>>`
                }
            ],
            max_tokens: MAX_TOKENS_PER_REQUEST,
            temperature: 0.2,
        };

        try {
            if (!OPENAI_ENDPOINT) {
                throw new Error("OPENAI_ENDPOINT environment variable is not set");
            }
            if (!OPENAI_API_KEY) {
                throw new Error("OPENAI_API_KEY environment variable is not set");
            }
            
            const res = await fetch(OPENAI_ENDPOINT, {
                method: "POST",
                headers: {
                    "api-key": OPENAI_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error(`[AI] HTTP ${res.status} - ${await res.text()}`);
                continue;
            }
            
            type AzureChoice = { message: { content: string } };
            const data: { choices: AzureChoice[] } = await res.json();
            const raw = data.choices[0].message.content.trim();

            const json = raw.startsWith("```") ? raw.replace(/```[^\n]*\n?/, "").replace(/```$/, "") : raw;
            const parsed: Omit<Finding, "chunkId" | "id" | "start_offset" | "end_offset" | "severity">[] = JSON.parse(json);

            parsed.forEach((f) => {
                // Find the phrase in the chunk text to get its position
                const phraseIndex = chunk.text.indexOf(f.phrase);
                if (phraseIndex !== -1) {
                    findings.push({
                        ...f,
                        chunkId: chunk.id,
                        start_offset: chunk.start_offset + phraseIndex,
                        end_offset: chunk.start_offset + phraseIndex + f.phrase.length,
                        severity: scoreSeverity(f.kind),
                    });
                } else {
                    console.warn(`Could not find phrase "${f.phrase}" in chunk text`);
                }
            });
        } catch (error) {
            console.error(`[AI] Error parsing ambiguity findings:`, error);
        }
    }

    return findings;
}

function scoreSeverity(kind: string): number {
    switch (kind) {
        case "VAGUENESS":
        case "QUANTIFIER": 
            return 2;
        case "MISSING_REF":
        case "ANAPHORA":
            return 3;
        default:
            return 1;
    }
}