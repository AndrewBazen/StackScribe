export type ChatMessageRole = 'user' | 'assistant' | 'system';
export type ChatStatus = 'idle' | 'thinking' | 'generating' | 'error';

export interface EditSuggestion {
  id: string;
  originalContent: string;
  suggestedContent: string;
  position?: { start: number; end: number };
  status: 'pending' | 'applied' | 'rejected';
  description: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  insertable: boolean;
}

export interface ChatMessageMetadata {
  editSuggestion?: EditSuggestion;
  codeBlock?: CodeBlock;
  command?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
  metadata?: ChatMessageMetadata;
}

export interface ChatContext {
  currentDocument: string;
  entryId?: string;
  entryName?: string;
  tomeId?: string;
  archiveId?: string;
  selection?: { start: number; end: number };
}

export interface ChatRequest {
  messages: ChatMessage[];
  context: ChatContext;
  stream?: boolean;
}

export interface ChatResponse {
  message: ChatMessage;
  status: 'success' | 'error';
  error?: string;
}

export interface StreamingChunk {
  delta?: string;
  message?: ChatMessage;
  done: boolean;
  status?: 'success' | 'error';
  error?: string;
}
