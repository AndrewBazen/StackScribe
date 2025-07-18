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
  current_note: string;
}

interface PythonSuggestion {
  note: string;
  score: number;
  reasoning: string;
}

class AILinkService {
  private baseUrl: string = 'http://localhost:8000';

  constructor() {
    this.initializeServiceUrl();
  }

  private initializeServiceUrl() {
    // Check if user has Azure sync enabled (indicating they're authenticated)
    const enableAzureSync = localStorage.getItem('enableAzureSync');
    const isAzureEnabled = enableAzureSync ? JSON.parse(enableAzureSync) : false;
    
    if (isAzureEnabled) {
      // Use Azure AI service in production
      this.baseUrl = 'https://stackscribe-ai-service-prod.azurecontainerapps.io';
      console.log('Using Azure AI Service:', this.baseUrl);
    } else {
      // Use local Docker service
      this.baseUrl = 'http://localhost:8000';
      console.log('Using local AI Service:', this.baseUrl);
    }
  }

  private async tryWithFallback(pythonRequest: PythonSuggestionRequest): Promise<Response> {
    try {
      // Try primary service (Azure if authenticated, local otherwise)
      const response = await fetch(`${this.baseUrl}/api/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pythonRequest)
      });

      if (response.ok) {
        return response;
      }

      // If primary service fails and we were trying Azure, fallback to local
      if (this.baseUrl.includes('azurecontainerapps.io')) {
        console.warn('Azure AI service unavailable, falling back to local service');
        return await this.tryLocalService(pythonRequest);
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      // If Azure service fails, try local service
      if (this.baseUrl.includes('azurecontainerapps.io')) {
        console.warn('Azure AI service error, falling back to local service:', error);
        return await this.tryLocalService(pythonRequest);
      }
      throw error;
    }
  }

  private async tryLocalService(pythonRequest: PythonSuggestionRequest): Promise<Response> {
    const localResponse = await fetch('http://localhost:8000/api/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pythonRequest)
    });

    if (!localResponse.ok) {
      throw new Error(`Local service error: HTTP ${localResponse.status}: ${localResponse.statusText}`);
    }

    return localResponse;
  }

  async getSuggestions(request: AILinkRequest): Promise<AILinkResponse> {
    const startTime = Date.now();
    
    try {
      // Extract text content from current entry
      const text = request.currentEntry.content || '';
      const currentNote = request.currentEntry.name || 'untitled';

      // Create Python API request
      const pythonRequest: PythonSuggestionRequest = {
        text: text,
        current_note: currentNote
      };

      // Try primary service first, then fallback
      const response = await this.tryWithFallback(pythonRequest);
      const pythonSuggestions: PythonSuggestion[] = await response.json();
      
      // Convert Python response to frontend types
      const suggestions: LinkSuggestion[] = pythonSuggestions.map((suggestion, index) => {
        // Find the corresponding entry by name
        const targetEntry = request.allEntries.find(entry => 
          entry.name === suggestion.note || 
          entry.name === suggestion.note.replace(/\.[^/.]+$/, '') // Remove extension
        );

        return {
          targetEntryId: targetEntry?.id || `unknown_${index}`,
          targetEntryName: suggestion.note,
          confidence: suggestion.score,
          reason: suggestion.reasoning,
          suggestedText: suggestion.note.replace(/\.[^/.]+$/, ''), // Remove extension for display
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

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
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