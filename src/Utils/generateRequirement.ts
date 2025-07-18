import type { Chunk } from "../types/Chunk";
import type { Requirement } from "../types/requirement";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_ENDPOINT = import.meta.env.VITE_OPENAI_ENDPOINT;

const MAX_TOKENS_PER_REQUEST = 800;

export async function generateRequirements(chunks: Chunk[]): Promise<Requirement[]> {
    const requirements: Requirement[] = [];

    for (const chunk of chunks) {
        if (!chunk.text.trim()) continue;

        const payload = {
            messages: [
                {
                    role: "system",
                    content: "You are a rigorous requirements-engineering assistant. " +
                        "You are given a text chunk that represents part of a project scope. " +
                        "Your task is to generate concise, clear, and actionable requirements from this text. " +
                        "You must return ONLY a JSON array of requirement objects with the following structure: " +
                        "Each requirement object must have these exact keys: title, description, acceptanceCriteria, nonFunctionalRequirements, constraints, dependencies, risks, assumptions. " +
                        "Guidelines: " +
                        "1. title: A concise and clear title that captures the main idea of the requirement " +
                        "2. description: A detailed description of the requirement " +
                        "3. acceptanceCriteria: List of specific, testable acceptance criteria " +
                        "4. nonFunctionalRequirements: Performance, security, usability requirements " +
                        "5. constraints: Technical or business constraints " +
                        "6. dependencies: What this requirement depends on " +
                        "7. risks: Potential risks or challenges " +
                        "8. assumptions: Assumptions made about the requirement " +
                        "Use clear, actionable language. Format functional requirements as 'The system shall [action]'. " +
                        "If no requirements can be derived from the text, return an empty array []. " +
                        "IMPORTANT: Return only valid JSON, no markdown formatting or code blocks."
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
            }

            type AzureChoice = { message: { content: string } };
            const data: { choices: AzureChoice[] } = await res.json();
            const raw = data.choices[0].message.content.trim();

            // Clean up potential markdown wrapping
            const json = raw.startsWith("```") ? raw.replace(/```[^\n]*\n?/, "").replace(/```$/, "") : raw;
            const parsed: Omit<Requirement, "chunkId" | "start_offset" | "end_offset">[] = JSON.parse(json);

            parsed.forEach((r) => {
                requirements.push({
                    ...r,
                    chunkId: chunk.id,
                    start_offset: chunk.start_offset,
                    end_offset: chunk.end_offset,
                });
            });
        } catch (error) {
            console.error(`[AI] Error generating requirements:`, error);
        }
    }

    return requirements;
}