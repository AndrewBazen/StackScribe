import { useState, useCallback, useRef } from "react";
import { Entry } from "../types/entry";
import { Tome } from "../types/tome";
import { Archive } from "../types/archive";
import { ChatMessage, ChatStatus, ChatContext, EditSuggestion } from "../types/chat";
import { aiChatService } from "../services/aiChatService";

interface AIChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
}

interface AIChatActions {
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  applyEditSuggestion: (suggestionId: string) => void;
  rejectEditSuggestion: (suggestionId: string) => void;
  retryLastMessage: () => Promise<void>;
}

interface UseAIChatOptions {
  entry: Entry | null;
  tome: Tome | null;
  archive: Archive | null;
  markdown: string;
  onApplyEdit: (newContent: string) => void;
  onInsertContent: (content: string, position?: number) => void;
}

export function useAIChat(
  options: UseAIChatOptions
): AIChatState & AIChatActions {
  const { entry, tome, archive, markdown, onApplyEdit, onInsertContent } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const lastUserMessageRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildContext = useCallback((): ChatContext => {
    return {
      currentDocument: markdown,
      entryId: entry?.id,
      entryName: entry?.name,
      tomeId: tome?.id,
      archiveId: archive?.id,
    };
  }, [markdown, entry, tome, archive]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    lastUserMessageRef.current = content;
    setError(null);
    setStatus("thinking");

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const context = buildContext();
      const allMessages = [...messages, userMessage];

      setStatus("generating");

      // Use non-streaming for now (simpler)
      const response = await aiChatService.sendMessage(allMessages, context);

      if (response.status === "success") {
        setMessages(prev => [...prev, response.message]);
        setStatus("idle");
      } else {
        setError(response.error || "Unknown error");
        setStatus("error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");
    }
  }, [messages, buildContext]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setError(null);
  }, []);

  const findEditSuggestion = useCallback((suggestionId: string): { message: ChatMessage; suggestion: EditSuggestion } | null => {
    for (const msg of messages) {
      if (msg.metadata?.editSuggestion?.id === suggestionId) {
        return { message: msg, suggestion: msg.metadata.editSuggestion };
      }
    }
    return null;
  }, [messages]);

  const applyEditSuggestion = useCallback((suggestionId: string) => {
    const found = findEditSuggestion(suggestionId);
    if (!found) return;

    const { suggestion } = found;

    if (suggestion.position && markdown) {
      // Replace at specific position
      const newContent =
        markdown.slice(0, suggestion.position.start) +
        suggestion.suggestedContent +
        markdown.slice(suggestion.position.end);
      onApplyEdit(newContent);
    } else {
      // Insert the suggested content
      onInsertContent(suggestion.suggestedContent);
    }

    // Update suggestion status
    setMessages(prev =>
      prev.map(msg => {
        if (msg.metadata?.editSuggestion?.id === suggestionId) {
          return {
            ...msg,
            metadata: {
              ...msg.metadata,
              editSuggestion: {
                ...msg.metadata.editSuggestion,
                status: "applied" as const,
              },
            },
          };
        }
        return msg;
      })
    );
  }, [findEditSuggestion, markdown, onApplyEdit, onInsertContent]);

  const rejectEditSuggestion = useCallback((suggestionId: string) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.metadata?.editSuggestion?.id === suggestionId) {
          return {
            ...msg,
            metadata: {
              ...msg.metadata,
              editSuggestion: {
                ...msg.metadata.editSuggestion!,
                status: "rejected" as const,
              },
            },
          };
        }
        return msg;
      })
    );
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) return;

    // Remove the last assistant message if it exists
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg?.role === "assistant") {
        return prev.slice(0, -1);
      }
      return prev;
    });

    // Retry with the last user message
    await sendMessage(lastUserMessageRef.current);
  }, [sendMessage]);

  return {
    messages,
    status,
    error,
    sendMessage,
    clearHistory,
    applyEditSuggestion,
    rejectEditSuggestion,
    retryLastMessage,
  };
}
