import React, { useState } from 'react';
import { LinkSuggestion } from '../services/aiLinkService';
import { Link2Icon, Cross2Icon, CheckIcon, LightningBoltIcon } from '@radix-ui/react-icons';

interface AILinkSuggestionsProps {
  suggestions: LinkSuggestion[];
  isLoading: boolean;
  minMatch: number; // 0..1
  onChangeMinMatch: (next: number) => void;
  onApplySuggestion: (suggestion: LinkSuggestion) => void;
  onDismissSuggestion: (suggestion: LinkSuggestion) => void;
  onRefreshSuggestions: () => void;
}

export default function AILinkSuggestions({
  suggestions,
  isLoading,
  minMatch,
  onChangeMinMatch,
  onApplySuggestion,
  onDismissSuggestion,
  onRefreshSuggestions,
}: AILinkSuggestionsProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  const filteredSuggestions = suggestions.filter(s => s.confidence >= minMatch);
  const minPercent = Math.round(minMatch * 100);

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

  if (filteredSuggestions.length === 0) {
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
          <p>No suggestions above {minPercent}% match.</p>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Min match: {minPercent}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={minPercent}
              onChange={(e) => onChangeMinMatch(Number(e.target.value) / 100)}
              style={{ width: '100%' }}
            />
          </div>
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
        <span className="ai-suggestions-count">{filteredSuggestions.length}</span>
        <button 
          onClick={onRefreshSuggestions}
          className="ai-refresh-btn"
          title="Refresh suggestions"
        >
          🔄
        </button>
      </div>

      <div style={{ padding: '0 12px 10px 12px' }}>
        <label style={{ fontSize: 12, opacity: 0.8 }}>Min match: {minPercent}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={minPercent}
          onChange={(e) => onChangeMinMatch(Number(e.target.value) / 100)}
          style={{ width: '100%' }}
        />
      </div>
      
      <div className="ai-suggestions-list">
        {filteredSuggestions.map((suggestion, index) => (
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