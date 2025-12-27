import React, { useState } from 'react';
import { AppMenuBar } from './AppMenuBar';
import { NavIconButton } from '../ui/NavIconButton';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BookmarkIcon,
  Share1Icon,
  GearIcon,
  ReaderIcon,
  LightningBoltIcon,
  ChatBubbleIcon
} from '@radix-ui/react-icons';

interface CustomHeaderBarProps {
  onNewEntry: () => void;
  onNewTome: () => void;
  onSave: () => void;
  onSaveAll: () => void;
  onClose: () => void;
  onPreferences: () => void;
  onSearch: (query: string) => void;
  panelsVisible: boolean;
  onTogglePanels: () => void;
  onToggleAI: () => void;
  aiActive?: boolean;
  onToggleChat: () => void;
  chatActive?: boolean;
}

export default function CustomHeaderBar({
  onNewEntry,
  onNewTome,
  onSave,
  onSaveAll,
  onClose,
  onPreferences,
  onSearch,
  panelsVisible,
  onTogglePanels,
  onToggleAI,
  aiActive = false,
  onToggleChat,
  chatActive = false
}: CustomHeaderBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="custom-header-bar">
      {/* Left section: Menu and navigation */}
      <div className="header-left">
        <AppMenuBar
          onNewEntry={onNewEntry}
          onNewTome={onNewTome}
          onSave={onSave}
          onSaveAll={onSaveAll}
          onClose={onClose}
          onPreferences={onPreferences}
        />
        
        <div className="header-divider" />
        
        <NavIconButton
          icon={panelsVisible ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          onClick={onTogglePanels}
        />
      </div>

      {/* Center section: Search bar */}
      <div className="header-center">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-container">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search entries, tomes, and archives..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
        </form>
      </div>

      {/* Right section: Action buttons */}
      <div className="header-right">
        <NavIconButton
          icon={<PlusIcon />}
          onClick={onNewEntry}
        />
        <div className={`ai-toggle-button ${aiActive ? 'active' : ''}`}>
          <NavIconButton
            icon={<LightningBoltIcon />}
            onClick={onToggleAI}
          />
        </div>
        <div className={`chat-toggle-button ${chatActive ? 'active' : ''}`}>
          <NavIconButton
            icon={<ChatBubbleIcon />}
            onClick={onToggleChat}
          />
        </div>
        <NavIconButton
          icon={<BookmarkIcon />}
          onClick={() => console.log('Bookmarks')}
        />
        <NavIconButton
          icon={<Share1Icon />}
          onClick={() => console.log('Share')}
        />
        <NavIconButton
          icon={<ReaderIcon />}
          onClick={() => console.log('Reading Mode')}
        />
        <NavIconButton
          icon={<GearIcon />}
          onClick={onPreferences}
        />
      </div>
    </div>
  );
} 