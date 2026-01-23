import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '../../types/chat';
import { EditSuggestionCard } from './EditSuggestionCard';

interface ChatMessageProps {
  message: ChatMessageType;
  onApplyEdit?: (suggestionId: string) => void;
  onRejectEdit?: (suggestionId: string) => void;
  onInsertCode?: (code: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onApplyEdit,
  onRejectEdit,
  onInsertCode
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Custom code block renderer that adds insert button
  const CodeBlock = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const language = className?.replace('language-', '') || '';
    const code = String(children).replace(/\n$/, '');

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
    };

    const handleInsert = () => {
      if (onInsertCode) {
        onInsertCode(code);
      }
    };

    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-language">{language || 'code'}</span>
          <div className="code-block-actions">
            <button className="code-action-btn" onClick={handleCopy} title="Copy">
              Copy
            </button>
            {onInsertCode && (
              <button className="code-action-btn insert" onClick={handleInsert} title="Insert at cursor">
                Insert
              </button>
            )}
          </div>
        </div>
        <pre className={className}>
          <code>{children}</code>
        </pre>
      </div>
    );
  };

  // Debug: log when component renders
  console.log(`🎨 ChatMessage render: role=${message.role}, contentLen=${message.content.length}`);

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-header">
        <span className="message-role">{isUser ? 'You' : 'AI'}</span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
        {isAssistant && <span className="debug-len" style={{marginLeft: '8px', fontSize: '10px', color: '#888'}}>({message.content.length} chars)</span>}
      </div>

      <div className="message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : message.content.length === 0 ? (
          <p className="streaming-placeholder">...</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                if (isInline) {
                  return <code className="inline-code" {...props}>{children}</code>;
                }
                return <CodeBlock className={className}>{children}</CodeBlock>;
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {/* Edit suggestion card if present */}
      {isAssistant && message.metadata?.editSuggestion && (
        <EditSuggestionCard
          suggestion={message.metadata.editSuggestion}
          onApply={onApplyEdit ? () => onApplyEdit(message.metadata!.editSuggestion!.id) : undefined}
          onReject={onRejectEdit ? () => onRejectEdit(message.metadata!.editSuggestion!.id) : undefined}
        />
      )}
    </div>
  );
};

export default ChatMessage;
