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
  private readonly baseUrl = 'http://localhost:8000';

  constructor() {
    // Python AI service configuration
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

      // Make HTTP request to Python service
      const response = await fetch(`${this.baseUrl}/api/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pythonRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

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