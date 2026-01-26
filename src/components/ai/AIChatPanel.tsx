import React, { useRef, useEffect } from "react";
import { ChatMessage as ChatMessageType, ChatStatus } from "../../types/chat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatStatusIndicator } from "./ChatStatusIndicator";
import { TrashIcon, ChatBubbleIcon } from "@radix-ui/react-icons";
import "../../styles/AIChatPanel.css";

interface ModelOption {
  id: string;
  name: string;
}

interface AIChatPanelProps {
  messages: ChatMessageType[];
  status: ChatStatus;
  error: string | null;
  streamingContent: string;
  onSendMessage: (content: string) => Promise<void>;
  onClearHistory: () => void;
  onApplyEdit: (suggestionId: string) => void;
  onRejectEdit: (suggestionId: string) => void;
  onRetry: () => Promise<void>;
  onInsertCode?: (code: string) => void;
  // Model selection props
  model?: string;
  availableModels?: ModelOption[];
  onModelChange?: (model: string) => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  messages,
  status,
  error,
  streamingContent,
  onSendMessage,
  onClearHistory,
  onApplyEdit,
  onRejectEdit,
  onRetry,
  onInsertCode,
  model,
  availableModels,
  onModelChange,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "thinking" || status === "generating";

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, streamingContent]);

  return (
    <div className="ai-chat-panel">
      <div className="chat-header">
        <div className="chat-header-left">
          <ChatBubbleIcon className="chat-header-icon" />
          <h3>AI Assistant</h3>
        </div>
        <div className="chat-header-right">
          {/* Model selector dropdown */}
          {availableModels && availableModels.length > 0 && onModelChange && (
            <select
              className="chat-model-select"
              value={model || ""}
              onChange={(e) => onModelChange(e.target.value)}
              title="Select AI model"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          {messages.length > 0 && (
            <button
              className="chat-header-btn"
              onClick={onClearHistory}
              title="Clear chat history"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !streamingContent ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <ChatBubbleIcon />
            </div>
            <h4>Start a conversation</h4>
            <p>
              Ask questions about your document, request edits, or generate new
              content.
            </p>
            <div className="chat-suggestions">
              <button onClick={() => onSendMessage("Summarize this document")}>
                Summarize this document
              </button>
              <button
                onClick={() =>
                  onSendMessage("Improve the writing in this document")
                }
              >
                Improve the writing
              </button>
              <button onClick={() => onSendMessage("What are the key points?")}>
                What are the key points?
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={`${message.id}-${message.content.length}`}
                message={message}
                onApplyEdit={onApplyEdit}
                onRejectEdit={onRejectEdit}
                onInsertCode={onInsertCode}
              />
            ))}
          </>
        )}

        {/* Streaming content - rendered independently of message history */}
        {streamingContent && (
          <div className="chat-message assistant streaming">
            <div className="message-header">
              <span className="message-role">AI</span>
              <span className="streaming-indicator">typing...</span>
            </div>
            <div className="message-content">
              <p>{streamingContent}</p>
            </div>
          </div>
        )}

        <ChatStatusIndicator status={status} error={error} onRetry={onRetry} />

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={onSendMessage}
        disabled={isLoading}
        placeholder={isLoading ? "Waiting for response..." : undefined}
      />
    </div>
  );
};

export default AIChatPanel;
