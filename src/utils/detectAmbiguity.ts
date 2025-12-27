import type { Chunk } from "../types/Chunk";
import type { Finding } from "../types/finding";

const LOCAL_AI_BASE = import.meta.env.VITE_LOCAL_AI_BASE ?? "http://localhost:8000";

export async function detectAmbiguity(chunks: Chunk[]): Promise<Finding[]> {
  const nonEmpty = chunks.filter((c) => c.text.trim());
  if (nonEmpty.length === 0) return [];

  const res = await fetch(`${LOCAL_AI_BASE}/api/detect_ambiguity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chunks: nonEmpty.map((c) => ({
        id: c.id,
        text: c.text,
        start_offset: c.start_offset,
        end_offset: c.end_offset,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`[Local AI] HTTP ${res.status} - ${await res.text()}`);
  }

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as Finding[]) : [];
}