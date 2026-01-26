import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { aiLinkService } from "../aiLinkService";
import { settingsService } from "../settingsService";
import type { Entry } from "../../types/entry";

// Mock settingsService
vi.mock("../settingsService", () => ({
  settingsService: {
    getAISettings: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("aiLinkService", () => {
  const mockEntry: Entry = {
    id: "entry-1",
    tome_id: "tome-1",
    name: "Test Entry",
    content: "This is test content for the entry",
    entry_type: "generic",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

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

  describe("getSuggestions", () => {
    it("should return suggestions on successful API call", async () => {
      const mockPythonResponse = [
        {
          entry_id: "entry-2",
          entry_name: "Related Entry",
          score: 2.5,
          reasoning: "High semantic similarity",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPythonResponse),
      });

      const result = await aiLinkService.getSuggestions({
        currentEntry: mockEntry,
        allEntries: [mockEntry],
      });

      expect(result.status).toBe("success");
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].targetEntryId).toBe("entry-2");
      expect(result.suggestions[0].targetEntryName).toBe("Related Entry");
      expect(result.suggestions[0].confidence).toBeGreaterThan(0);
      expect(result.suggestions[0].confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should return error status when API call fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await aiLinkService.getSuggestions({
        currentEntry: mockEntry,
        allEntries: [mockEntry],
      });

      expect(result.status).toBe("error");
      expect(result.suggestions).toHaveLength(0);
      expect(result.error).toContain("500");
    });

    it("should return error when service URL is not configured", async () => {
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

      const result = await aiLinkService.getSuggestions({
        currentEntry: mockEntry,
        allEntries: [mockEntry],
      });

      expect(result.status).toBe("error");
      expect(result.error).toContain("AI service not configured");
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await aiLinkService.getSuggestions({
        currentEntry: mockEntry,
        allEntries: [mockEntry],
      });

      expect(result.status).toBe("error");
      expect(result.error).toBe("Network error");
    });

    it("should apply sigmoid transformation to scores", async () => {
      const mockPythonResponse = [
        {
          entry_id: "e1",
          entry_name: "High Score",
          score: 10,
          reasoning: "test",
        },
        {
          entry_id: "e2",
          entry_name: "Low Score",
          score: -10,
          reasoning: "test",
        },
        {
          entry_id: "e3",
          entry_name: "Zero Score",
          score: 0,
          reasoning: "test",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPythonResponse),
      });

      const result = await aiLinkService.getSuggestions({
        currentEntry: mockEntry,
        allEntries: [mockEntry],
      });

      // High score should map close to 1
      expect(result.suggestions[0].confidence).toBeGreaterThan(0.9);
      // Low score should map close to 0
      expect(result.suggestions[1].confidence).toBeLessThan(0.1);
      // Zero score should map to 0.5
      expect(result.suggestions[2].confidence).toBeCloseTo(0.5, 1);
    });
  });

  describe("indexEntries", () => {
    it("should return true on successful indexing", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await aiLinkService.indexEntries([mockEntry], {
        archiveId: "archive-1",
        tomeId: "tome-1",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/index_entries",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should return false on API error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await aiLinkService.indexEntries([mockEntry]);

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await aiLinkService.indexEntries([mockEntry]);

      expect(result).toBe(false);
    });
  });

  describe("healthCheck", () => {
    it("should return true when service is healthy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "healthy" }),
      });

      const result = await aiLinkService.healthCheck();

      expect(result).toBe(true);
    });

    it("should return false when service is unhealthy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "unhealthy" }),
      });

      const result = await aiLinkService.healthCheck();

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await aiLinkService.healthCheck();

      expect(result).toBe(false);
    });
  });
});
