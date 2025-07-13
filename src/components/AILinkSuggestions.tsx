import React, { useState } from 'react';
import { LinkSuggestion } from '../services/aiLinkService';
import { Link2Icon, Cross2Icon, CheckIcon, LightningBoltIcon } from '@radix-ui/react-icons';

interface AILinkSuggestionsProps {
  suggestions: LinkSuggestion[];
  isLoading: boolean;
  onApplySuggestion: (suggestion: LinkSuggestion) => void;
  onDismissSuggestion: (suggestion: LinkSuggestion) => void;
  onRefreshSuggestions: () => void;
}

export default function AILinkSuggestions({
  suggestions,
  isLoading,
  onApplySuggestion,
  onDismissSuggestion,
  onRefreshSuggestions,
}: AILinkSuggestionsProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="ai-suggestions-panel">
        <div className="ai-suggestions-header">
          <LightningBoltIcon className="ai-icon" />
          <h3>AI Link Suggestions</h3>
          <div className="ai-loading-spinner" />
        </div>
        <div className="ai-suggestions-loading">
          <p>Analyzing content for optimal links...</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="ai-suggestions-panel">
        <div className="ai-suggestions-header">
          <LightningBoltIcon className="ai-icon" />
          <h3>AI Link Suggestions</h3>
          <button 
            onClick={onRefreshSuggestions}
            className="ai-refresh-btn"
            title="Refresh suggestions"
          >
            🔄
          </button>
        </div>
        <div className="ai-suggestions-empty">
          <p>No link suggestions found for this content.</p>
          <button onClick={onRefreshSuggestions} className="ai-refresh-button">
            Generate Suggestions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-suggestions-panel">
      <div className="ai-suggestions-header">
        <LightningBoltIcon className="ai-icon" />
        <h3>AI Link Suggestions</h3>
        <span className="ai-suggestions-count">{suggestions.length}</span>
        <button 
          onClick={onRefreshSuggestions}
          className="ai-refresh-btn"
          title="Refresh suggestions"
        >
          🔄
        </button>
      </div>
      
      <div className="ai-suggestions-list">
        {suggestions.map((suggestion, index) => (
          <div 
            key={`${suggestion.targetEntryId}-${index}`}
            className={`ai-suggestion-item ${
              expandedSuggestion === suggestion.targetEntryId ? 'expanded' : ''
            }`}
          >
            <div className="ai-suggestion-header">
              <div className="ai-suggestion-info">
                <Link2Icon className="ai-link-icon" />
                <span className="ai-suggestion-name">
                  {suggestion.targetEntryName}
                </span>
                <span className="ai-confidence-badge">
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
              
              <div className="ai-suggestion-actions">
                <button
                  onClick={() => onApplySuggestion(suggestion)}
                  className="ai-apply-btn"
                  title="Apply this suggestion"
                >
                  <CheckIcon />
                </button>
                <button
                  onClick={() => onDismissSuggestion(suggestion)}
                  className="ai-dismiss-btn"
                  title="Dismiss this suggestion"
                >
                  <Cross2Icon />
                </button>
              </div>
            </div>
            
            {suggestion.reason && (
              <div className="ai-suggestion-reason">
                <p>{suggestion.reason}</p>
              </div>
            )}
            
            {suggestion.suggestedText && (
              <div className="ai-suggestion-text">
                <strong>Suggested text:</strong> "{suggestion.suggestedText}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 