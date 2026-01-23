import { ChatMessage, ChatContext, ChatRequest, ChatResponse, StreamingChunk } from '../types/chat';
import { settingsService } from './settingsService';

class AIChatService {
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
      const serviceUrl = this.getServiceUrl();
      const response = await this.postJson(`${serviceUrl}/api/chat`, request);

      if (!response.ok) {
        throw new Error(`AI service error: HTTP ${response.status}: ${response.statusText}`);
      }

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
    context: ChatContext,
    signal?: AbortSignal
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    const request: ChatRequest = {
      messages,
      context,
      stream: true
    };

    try {
      const serviceUrl = this.getServiceUrl();
      const response = await fetch(`${serviceUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal
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
      let receivedCompletion = false;

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
          console.log('📡 SSE line:', line);
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr) {
              try {
                const chunk: StreamingChunk = JSON.parse(dataStr);
                console.log('✅ Parsed chunk:', chunk);
                if (chunk.done) {
                  receivedCompletion = true;
                }
                yield chunk;
              } catch (e) {
                console.warn('Failed to parse SSE chunk:', dataStr, e);
              }
            }
          }
        }
      }

      // If stream closed without a completion chunk, yield one to prevent stuck UI
      if (!receivedCompletion) {
        console.warn('Stream ended without completion chunk, yielding fallback');
        yield {
          done: true,
          status: 'error',
          error: 'Stream ended unexpectedly'
        };
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

export const aiChatService = new AIChatService();
