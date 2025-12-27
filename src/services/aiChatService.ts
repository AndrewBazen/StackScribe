import { ChatMessage, ChatContext, ChatRequest, ChatResponse, StreamingChunk } from '../types/chat';

class AIChatService {
  private localUrl: string = 'http://localhost:8000';
  private azureUrl: string = 'https://stackscribe-ai-service-prod.azurecontainerapps.io';
  private enableAzure: boolean = false;

  constructor() {
    this.initializeServiceUrl();
  }

  private initializeServiceUrl() {
    const enableAzureSync = localStorage.getItem('enableAzureSync');
    this.enableAzure = enableAzureSync ? JSON.parse(enableAzureSync) : false;
    console.log('AI Chat Service config:', { enableAzure: this.enableAzure, localUrl: this.localUrl });
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

  private async tryWithFallback(endpoint: string, request: ChatRequest): Promise<Response> {
    try {
      const response = await this.postJson(`${this.localUrl}${endpoint}`, request);

      if (response.ok) {
        return response;
      }

      if (this.enableAzure) {
        console.warn('Local AI service returned error, trying Azure:', response.status, response.statusText);
        const azureResponse = await this.postJson(`${this.azureUrl}${endpoint}`, request);
        if (azureResponse.ok) return azureResponse;
        throw new Error(`Azure error: HTTP ${azureResponse.status}: ${azureResponse.statusText}`);
      }

      throw new Error(`Local service error: HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (this.enableAzure) {
        console.warn('Local AI service request failed, trying Azure:', error);
        const azureResponse = await this.postJson(`${this.azureUrl}${endpoint}`, request);
        if (azureResponse.ok) return azureResponse;
        throw new Error(`Azure error: HTTP ${azureResponse.status}: ${azureResponse.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Send a chat message and get a complete response
   */
  async sendMessage(messages: ChatMessage[], context: ChatContext): Promise<ChatResponse> {
    const request: ChatRequest = {
      messages,
      context,
      stream: false
    };

    try {
      const response = await this.tryWithFallback('/api/chat', request);
      const data: ChatResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Chat error:', error);
      return {
        message: {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        },
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send a chat message with streaming response
   * Returns an async generator that yields chunks
   */
  async *streamMessage(
    messages: ChatMessage[],
    context: ChatContext
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    const request: ChatRequest = {
      messages,
      context,
      stream: true
    };

    try {
      const response = await fetch(`${this.localUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr) {
              try {
                const chunk: StreamingChunk = JSON.parse(dataStr);
                yield chunk;
              } catch (e) {
                console.warn('Failed to parse SSE chunk:', dataStr, e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      yield {
        done: true,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Health check for the chat service
   */
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

export const aiChatService = new AIChatService();
