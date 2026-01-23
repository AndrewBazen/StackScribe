import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Entry } from "../types/entry";
import { Tome } from "../types/tome";
import { Archive } from "../types/archive";
import { ChatMessage, ChatStatus, ChatContext, EditSuggestion } from "../types/chat";

interface AIChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
  streamingContent: string;
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
  const [streamingContent, setStreamingContent] = useState<string>("");

  const lastUserMessageRef = useRef<string>("");
  const streamingContentRef = useRef<string>("");
  const rafIdRef = useRef<number | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const unlistenersRef = useRef<UnlistenFn[]>([]);

  const buildContext = useCallback((): ChatContext => {
    return {
      currentDocument: markdown,
      entryId: entry?.id,
      entryName: entry?.name,
      tomeId: tome?.id,
      archiveId: archive?.id,
    };
  }, [markdown, entry, tome, archive]);

  // Cleanup function for event listeners
  const cleanupListeners = useCallback(() => {
    unlistenersRef.current.forEach(fn => fn());
    unlistenersRef.current = [];
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupListeners();
    };
  }, [cleanupListeners]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Cleanup any previous request
    cleanupListeners();

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
      setStreamingContent("");
      streamingContentRef.current = "";

      console.log("🔄 Starting chat stream via Tauri...");

      // Start the stream and get request ID
      const requestId = await invoke<string>('start_chat_stream', {
        messages: allMessages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        context,
      });

      activeRequestIdRef.current = requestId;
      console.log("📡 Got request ID:", requestId);

      // Listen for chunk events
      const unlistenChunk = await listen<{ request_id: string; delta: string }>(
        'chat-chunk',
        (event) => {
          if (event.payload.request_id === activeRequestIdRef.current) {
            streamingContentRef.current += event.payload.delta;

            // Throttle UI updates to animation frames
            if (rafIdRef.current === null) {
              rafIdRef.current = requestAnimationFrame(() => {
                setStreamingContent(streamingContentRef.current);
                rafIdRef.current = null;
              });
            }
          }
        }
      );
      unlistenersRef.current.push(unlistenChunk);

      // Listen for completion event
      const unlistenComplete = await listen<{
        request_id: string;
        message: ChatMessage | null;
        status: string;
        error: string | null;
      }>('chat-complete', (event) => {
        if (event.payload.request_id === activeRequestIdRef.current) {
          console.log("✅ Chat complete:", event.payload.status);

          // Cancel any pending animation frame
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }

          // Cleanup listeners
          cleanupListeners();
          activeRequestIdRef.current = null;

          if (event.payload.status === "error") {
            setError(event.payload.error || "Unknown error");
            setStreamingContent("");
            setStatus("error");
          } else if (event.payload.message) {
            setMessages(prev => [...prev, event.payload.message!]);
            setStreamingContent("");
            setStatus("idle");
          }
        }
      });
      unlistenersRef.current.push(unlistenComplete);

    } catch (err) {
      cleanupListeners();
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setStreamingContent("");
      setError(errorMessage);
      setStatus("error");
    }
  }, [messages, buildContext, cleanupListeners]);

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
    streamingContent,
    sendMessage,
    clearHistory,
    applyEditSuggestion,
    rejectEditSuggestion,
    retryLastMessage,
  };
}
