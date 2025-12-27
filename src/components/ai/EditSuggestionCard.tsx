import React from 'react';
import { EditSuggestion } from '../../types/chat';
import { CheckIcon, Cross2Icon } from '@radix-ui/react-icons';

interface EditSuggestionCardProps {
  suggestion: EditSuggestion;
  onApply?: () => void;
  onReject?: () => void;
}

export const EditSuggestionCard: React.FC<EditSuggestionCardProps> = ({
  suggestion,
  onApply,
  onReject
}) => {
  const isApplied = suggestion.status === 'applied';
  const isRejected = suggestion.status === 'rejected';
  const isPending = suggestion.status === 'pending';

  return (
    <div className={`edit-suggestion-card ${suggestion.status}`}>
      <div className="edit-suggestion-header">
        <span className="edit-suggestion-label">Suggested Edit</span>
        {suggestion.description && (
          <span className="edit-suggestion-description">{suggestion.description}</span>
        )}
      </div>

      <div className="edit-suggestion-content">
        {suggestion.originalContent && (
          <div className="edit-original">
            <div className="edit-label">Original:</div>
            <pre className="edit-text">{suggestion.originalContent}</pre>
          </div>
        )}
        <div className="edit-suggested">
          <div className="edit-label">Suggested:</div>
          <pre className="edit-text">{suggestion.suggestedContent}</pre>
        </div>
      </div>

      {isPending && (
        <div className="edit-suggestion-actions">
          {onApply && (
            <button className="edit-action-btn apply" onClick={onApply}>
              <CheckIcon />
              Apply
            </button>
          )}
          {onReject && (
            <button className="edit-action-btn reject" onClick={onReject}>
              <Cross2Icon />
              Dismiss
            </button>
          )}
        </div>
      )}

      {isApplied && (
        <div className="edit-suggestion-status applied">
          <CheckIcon /> Applied
        </div>
      )}

      {isRejected && (
        <div className="edit-suggestion-status rejected">
          <Cross2Icon /> Dismissed
        </div>
      )}
    </div>
  );
};

export default EditSuggestionCard;
