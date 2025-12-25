import { Entry } from '../types/entry';

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
  private localUrl: string = 'http://localhost:8000';
  private azureUrl: string = 'https://stackscribe-ai-service-prod.azurecontainerapps.io';
  private enableAzure: boolean = false;

  constructor() {
    this.initializeServiceUrl();
  }

  private initializeServiceUrl() {
    // Check if user has Azure sync enabled (indicating they're authenticated)
    const enableAzureSync = localStorage.getItem('enableAzureSync');
    this.enableAzure = enableAzureSync ? JSON.parse(enableAzureSync) : false;
    // Prefer local when it's available; we only fall back to Azure if enabled and local isn't reachable.
    console.log('AI Service config:', { enableAzure: this.enableAzure, localUrl: this.localUrl, azureUrl: this.azureUrl });
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

  private async tryWithFallback(pythonRequest: PythonSuggestionRequest): Promise<Response> {
    try {
      // Try local service first (best UX for desktop/local-ai).
      const response = await this.postJson(`${this.localUrl}/api/suggestions`, pythonRequest);

      if (response.ok) {
        return response;
      }

      // If local fails and Azure is enabled, try Azure.
      if (this.enableAzure) {
        console.warn('Local AI service returned error, trying Azure:', response.status, response.statusText);
        const azureResponse = await this.postJson(`${this.azureUrl}/api/suggestions`, pythonRequest);
        if (azureResponse.ok) return azureResponse;
        throw new Error(`Azure error: HTTP ${azureResponse.status}: ${azureResponse.statusText}`);
      }

      throw new Error(`Local service error: HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      // If local call threw and Azure is enabled, attempt Azure.
      if (this.enableAzure) {
        console.warn('Local AI service request failed, trying Azure:', error);
        const azureResponse = await this.postJson(`${this.azureUrl}/api/suggestions`, pythonRequest);
        if (azureResponse.ok) return azureResponse;
        throw new Error(`Azure error: HTTP ${azureResponse.status}: ${azureResponse.statusText}`);
      }
      throw error;
    }
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

      // Try primary service first, then fallback
      const response = await this.tryWithFallback(pythonRequest);
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

      const response = await this.postJson(`${this.localUrl}/api/index_entries`, payload);
      return response.ok;
    } catch (error) {
      console.warn('Failed to index entries (local AI service):', error);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.localUrl}/health`);
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