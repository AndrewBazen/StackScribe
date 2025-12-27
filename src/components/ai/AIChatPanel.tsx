import React, { useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType, ChatStatus } from '../../types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatStatusIndicator } from './ChatStatusIndicator';
import { TrashIcon, ChatBubbleIcon } from '@radix-ui/react-icons';
import '../../styles/AIChatPanel.css';

interface AIChatPanelProps {
  messages: ChatMessageType[];
  status: ChatStatus;
  error: string | null;
  onSendMessage: (content: string) => Promise<void>;
  onClearHistory: () => void;
  onApplyEdit: (suggestionId: string) => void;
  onRejectEdit: (suggestionId: string) => void;
  onRetry: () => Promise<void>;
  onInsertCode?: (code: string) => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  messages,
  status,
  error,
  onSendMessage,
  onClearHistory,
  onApplyEdit,
  onRejectEdit,
  onRetry,
  onInsertCode
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'thinking' || status === 'generating';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  return (
    <div className="ai-chat-panel">
      <div className="chat-header">
        <div className="chat-header-left">
          <ChatBubbleIcon className="chat-header-icon" />
          <h3>AI Assistant</h3>
        </div>
        <div className="chat-header-right">
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
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <ChatBubbleIcon />
            </div>
            <h4>Start a conversation</h4>
            <p>Ask questions about your document, request edits, or generate new content.</p>
            <div className="chat-suggestions">
              <button onClick={() => onSendMessage("Summarize this document")}>
                Summarize this document
              </button>
              <button onClick={() => onSendMessage("Improve the writing in this document")}>
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
                key={message.id}
                message={message}
                onApplyEdit={onApplyEdit}
                onRejectEdit={onRejectEdit}
                onInsertCode={onInsertCode}
              />
            ))}
          </>
        )}

        <ChatStatusIndicator
          status={status}
          error={error}
          onRetry={onRetry}
        />

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
