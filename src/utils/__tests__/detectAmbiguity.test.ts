import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectAmbiguity } from "../detectAmbiguity";
import { settingsService } from "../../services/settingsService";
import type { Chunk } from "../../types/Chunk";
import type { Finding } from "../../types/finding";

// Mock settingsService
vi.mock("../../services/settingsService", () => ({
  settingsService: {
    getAISettings: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("detectAmbiguity", () => {
  const mockChunks: Chunk[] = [
    {
      id: "chunk-1",
      text: "The system should be fast",
      start_offset: 0,
      end_offset: 25,
    },
    {
      id: "chunk-2",
      text: "It must handle requests quickly",
      start_offset: 26,
      end_offset: 58,
    },
  ];

  const mockFindings: Finding[] = [
    {
      chunkId: "chunk-1",
      phrase: "fast",
      kind: "vague_term",
      start_offset: 21,
      end_offset: 25,
      suggestedRewrite: "Response time under 100ms",
      clarifyingQuestion: "What is the acceptable response time?",
      severity: 2,
    },
    {
      chunkId: "chunk-2",
      phrase: "quickly",
      kind: "vague_term",
      start_offset: 48,
      end_offset: 55,
      suggestedRewrite: "Within 50ms",
      clarifyingQuestion: "How fast should requests be handled?",
      severity: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.getAISettings).mockReturnValue({
      serviceUrl: "http://localhost:8000",
      enabled: true,
      provider: "local",
      model: "llama3.2:3b",
      openaiApiKey: "",
      openaiModel: "gpt-4o-mini",
      anthropicApiKey: "",
      anthropicModel: "claude-sonnet-4-20250514",
      autoSuggest: true,
      suggestDelay: 1000,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return findings from the API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFindings),
    });

    const result = await detectAmbiguity(mockChunks);

    expect(result).toEqual(mockFindings);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/detect_ambiguity",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("should return empty array for empty chunks", async () => {
    const result = await detectAmbiguity([]);

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should filter out chunks with only whitespace", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const chunksWithEmpty: Chunk[] = [
      { id: "chunk-1", text: "Valid text", start_offset: 0, end_offset: 10 },
      { id: "chunk-2", text: "   ", start_offset: 11, end_offset: 14 },
      { id: "chunk-3", text: "", start_offset: 15, end_offset: 15 },
    ];

    await detectAmbiguity(chunksWithEmpty);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.chunks).toHaveLength(1);
    expect(callBody.chunks[0].id).toBe("chunk-1");
  });

  it("should throw error when API returns non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    await expect(detectAmbiguity(mockChunks)).rejects.toThrow(
      "[Local AI] HTTP 500 - Internal Server Error",
    );
  });

  it("should throw error when service URL is not configured", async () => {
    vi.mocked(settingsService.getAISettings).mockReturnValue({
      serviceUrl: "",
      enabled: true,
      provider: "local",
      model: "llama3.2:3b",
      openaiApiKey: "",
      openaiModel: "gpt-4o-mini",
      anthropicApiKey: "",
      anthropicModel: "claude-sonnet-4-20250514",
      autoSuggest: true,
      suggestDelay: 1000,
    });

    await expect(detectAmbiguity(mockChunks)).rejects.toThrow(
      "AI service not configured",
    );
  });

  it("should return empty array when API returns non-array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ unexpected: "object" }),
    });

    const result = await detectAmbiguity(mockChunks);

    expect(result).toEqual([]);
  });

  it("should send correct chunk format to API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await detectAmbiguity(mockChunks);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.chunks[0]).toEqual({
      id: "chunk-1",
      text: "The system should be fast",
      start_offset: 0,
      end_offset: 25,
    });
  });
});
