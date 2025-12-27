import React from 'react';
import { ChatStatus } from '../../types/chat';

interface ChatStatusIndicatorProps {
  status: ChatStatus;
  error?: string | null;
  onRetry?: () => void;
}

export const ChatStatusIndicator: React.FC<ChatStatusIndicatorProps> = ({
  status,
  error,
  onRetry
}) => {
  if (status === 'idle') {
    return null;
  }

  const getStatusContent = () => {
    switch (status) {
      case 'thinking':
        return (
          <div className="chat-status thinking">
            <span className="status-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
            <span className="status-text">Thinking...</span>
          </div>
        );
      case 'generating':
        return (
          <div className="chat-status generating">
            <span className="status-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
            <span className="status-text">Generating response...</span>
          </div>
        );
      case 'error':
        return (
          <div className="chat-status error">
            <span className="status-icon">!</span>
            <span className="status-text">{error || 'An error occurred'}</span>
            {onRetry && (
              <button className="retry-button" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="chat-status-indicator">{getStatusContent()}</div>;
};

export default ChatStatusIndicator;
