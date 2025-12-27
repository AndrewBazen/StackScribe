import React, { useState, useRef, useEffect } from 'react';

interface SlashCommandPopoverProps {
  position: { top: number; left: number };
  onSelect: (command: string, prompt: string) => void;
  onClose: () => void;
  visible: boolean;
}

const commands = [
  { id: 'requirements', name: 'Generate Requirements', description: 'Generate structured requirements from content' },
  // Add more commands here in the future
];

export function SlashCommandPopover({ position, onSelect, onClose, visible }: SlashCommandPopoverProps) {
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    console.log("🔥 SlashCommandPopover visible changed:", visible);
    if (visible) {
      setSelectedCommand(null);
      setPrompt('');
      setSelectedIndex(0);
      // Focus the popover for keyboard navigation
      setTimeout(() => {
        if (popoverRef.current) {
          popoverRef.current.focus();
        }
      }, 0);
    }
  }, [visible]);

  useEffect(() => {
    if (selectedCommand && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedCommand]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCommand) {
      // Command selection mode
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(Math.min(commands.length - 1, selectedIndex + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setSelectedCommand(commands[selectedIndex].id);
      } else if (e.key === 'Escape') {
        onClose();
      }
    } else {
      // Prompt input mode
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter or Cmd+Enter to submit
        e.preventDefault();
        onSelect(selectedCommand, prompt);
      } else if (e.key === 'Enter' && !e.shiftKey && prompt.trim() === '') {
        // Enter on empty prompt submits
        e.preventDefault();
        onSelect(selectedCommand, prompt);
      } else if (e.key === 'Escape') {
        setSelectedCommand(null);
        setPrompt('');
      }
      // Regular Enter or Shift+Enter adds newline (handled by textarea)
    }
  };

  console.log("🔥 SlashCommandPopover render - visible:", visible, "position:", position);

  if (!visible) {
    console.log("🔥 SlashCommandPopover - not visible, returning null");
    return null;
  }

  console.log("🔥 SlashCommandPopover - rendering popover");

  return (
    <div
      ref={popoverRef}
      className="slash-command-popover"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1002,
        visibility: 'visible',
        display: 'block',
        pointerEvents: 'auto'
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {!selectedCommand ? (
        <div className="command-list">
          <div className="popover-header" style={{ backgroundColor: '#007acc', color: 'white', padding: '12px' }}>
            🚀 Select a command
          </div>
          {commands.map((command, index) => (
            <div
              key={command.id}
              className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => setSelectedCommand(command.id)}
              style={{ backgroundColor: index === selectedIndex ? '#007acc' : 'transparent', color: index === selectedIndex ? 'white' : 'inherit' }}
            >
              <div className="command-name">{command.name}</div>
              <div className="command-description">{command.description}</div>
            </div>
          ))}
          <div className="popover-footer" style={{ backgroundColor: '#f0f0f0', padding: '8px' }}>
            <span>↑↓ to navigate • Enter to select • Esc to close</span>
          </div>
        </div>
      ) : (
        <div className="prompt-input-container">
          <div className="popover-header">
            {commands.find(c => c.id === selectedCommand)?.name}
          </div>
          <textarea
            ref={textareaRef}
            className="prompt-textarea"
            placeholder="Enter your prompt (optional)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          <div className="popover-footer">
            <span>Ctrl+Enter to execute • Esc to go back</span>
          </div>
        </div>
      )}
    </div>
  );
} 