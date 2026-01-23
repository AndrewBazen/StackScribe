import type { Chunk } from "../types/Chunk";
import type { Requirement } from "../types/requirement";
import { settingsService } from "../services/settingsService";

function getAIServiceUrl(): string {
    const aiSettings = settingsService.getAISettings();
    if (!aiSettings.serviceUrl) {
        throw new Error('AI service not configured. Set the service URL in Preferences > AI.');
    }
    return aiSettings.serviceUrl;
}

export async function generateRequirements(chunks: Chunk[], prompt?: string): Promise<Requirement[]> {
    const nonEmpty = chunks.filter((c) => c.text.trim());
    if (nonEmpty.length === 0) return [];

    const res = await fetch(`${getAIServiceUrl()}/api/generate_requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chunks: nonEmpty.map((c) => ({
                id: c.id,
                text: c.text,
                start_offset: c.start_offset,
                end_offset: c.end_offset,
            })),
            prompt: prompt || undefined,
        }),
    });

    if (!res.ok) {
        throw new Error(`[Local AI] HTTP ${res.status} - ${await res.text()}`);
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data as Requirement[];
}