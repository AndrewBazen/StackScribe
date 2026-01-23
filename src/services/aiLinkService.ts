import { Entry } from '../types/entry';
import { settingsService } from './settingsService';

export interface LinkSuggestion {
  targetEntryId: string;
  targetEntryName: string;
  confidence: number;
  reason: string;
  suggestedText: string;
  position?: {
    start: number;
    end: number;
  };
}

export interface AILinkRequest {
  currentEntry: Entry;
  allEntries: Entry[];
  context?: {
    archiveId?: string;
    tomeId?: string;
  };
}

export interface AILinkResponse {
  suggestions: LinkSuggestion[];
  processingTime: number;
  status: 'success' | 'error';
  error?: string;
}

// Python API types
interface PythonSuggestionRequest {
  text: string;
  current_entry_id: string;
}

interface PythonSuggestion {
  entry_id: string;
  entry_name: string;
  score: number;
  reasoning: string;
}

interface PythonIndexEntry {
  entry_id: string;
  entry_name: string;
  content: string;
  archive_id?: string;
  tome_id?: string;
}

interface PythonIndexRequest {
  entries: PythonIndexEntry[];
}

class AILinkService {
  private getServiceUrl(): string {
    const aiSettings = settingsService.getAISettings();
    if (!aiSettings.serviceUrl) {
      throw new Error('AI service not configured. Set the service URL in Preferences > AI.');
    }
    return aiSettings.serviceUrl;
  }

  private async postJson(url: string, body: unknown): Promise<Response> {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
  }

  async getSuggestions(request: AILinkRequest): Promise<AILinkResponse> {
    const startTime = Date.now();

    try {
      // Extract text content from current entry
      const text = request.currentEntry.content || '';

      // Create Python API request
      const pythonRequest: PythonSuggestionRequest = {
        text: text,
        current_entry_id: request.currentEntry.id
      };

      const serviceUrl = this.getServiceUrl();
      const response = await this.postJson(`${serviceUrl}/api/suggestions`, pythonRequest);

      if (!response.ok) {
        throw new Error(`AI service error: HTTP ${response.status}: ${response.statusText}`);
      }

      const pythonSuggestions: PythonSuggestion[] = await response.json();

      // Map the model's raw score to a stable 0..1 confidence so the UI can use percentages.
      // NOTE: The reranker produces unbounded scores; sigmoid makes it human-friendly.
      const scoreToConfidence = (score: number) => {
        const x = Math.max(-12, Math.min(12, score)); // clamp to avoid exp overflow
        return 1 / (1 + Math.exp(-x));
      };

      // Convert Python response to frontend types
      const suggestions: LinkSuggestion[] = pythonSuggestions.map((suggestion, index) => {
        return {
          targetEntryId: suggestion.entry_id || `unknown_${index}`,
          targetEntryName: suggestion.entry_name || 'Unknown',
          confidence: scoreToConfidence(suggestion.score),
          reason: suggestion.reasoning,
          suggestedText: suggestion.entry_name || '',
          position: undefined // Position detection would require additional logic
        };
      });

      const processingTime = Date.now() - startTime;

      return {
        suggestions,
        processingTime,
        status: 'success'
      };
    } catch (error) {
      console.error('Python AI Service Error:', error);
      return {
        suggestions: [],
        processingTime: Date.now() - startTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async indexEntries(entries: Entry[], context?: { archiveId?: string; tomeId?: string }): Promise<boolean> {
    try {
      const payload: PythonIndexRequest = {
        entries: entries.map((e) => ({
          entry_id: e.id,
          entry_name: e.name,
          content: e.content || '',
          archive_id: context?.archiveId,
          tome_id: context?.tomeId,
        })),
      };

      const serviceUrl = this.getServiceUrl();
      const response = await this.postJson(`${serviceUrl}/api/index_entries`, payload);
      return response.ok;
    } catch (error) {
      console.warn('Failed to index entries (local AI service):', error);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const serviceUrl = this.getServiceUrl();
      const response = await fetch(`${serviceUrl}/health`);
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

export const aiLinkService = new AILinkService();
