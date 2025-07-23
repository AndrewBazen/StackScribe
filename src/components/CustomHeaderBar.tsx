import React, { useState } from 'react';
import { AppMenuBar } from './AppMenuBar';
import { NavIconButton } from './NavIconButton';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MagnifyingGlassIcon, 
  PlusIcon,
  BookmarkIcon,
  Share1Icon,
  GearIcon,
  ReaderIcon,
  LightningBoltIcon
} from '@radix-ui/react-icons';

interface CustomHeaderBarProps {
  onCreateArchive: () => void;
  onSwitchArchive: () => void;
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
}

export default function CustomHeaderBar({
  onCreateArchive,
  onSwitchArchive,
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
  aiActive = false
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
          onCreateArchive={onCreateArchive}
          onSwitchArchive={onSwitchArchive}
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