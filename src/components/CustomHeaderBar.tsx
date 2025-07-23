import React, { useEffect, useState } from 'react';
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
import { useEntrySearch } from '../hooks/useEntrySearch';
import { Entry } from '../types/entry';
import ResultsPane from './ResultsPane';

interface CustomHeaderBarProps {
  onCreateArchive: () => void;
  onSwitchArchive: () => void;
  onNewEntry: () => void;
  onNewTome: () => void;
  onSave: () => void;
  onSaveAll: () => void;
  onClose: () => void;
  onPreferences: () => void;
  onSearch: (results: Entry[]) => void;
  onSearchResultClick?: (entry: Entry) => void;
  panelsVisible: boolean;
  onTogglePanels: () => void;
  onToggleAI: () => void;
  aiActive?: boolean;
  entries: Entry[]; // Add entries prop
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
  onSearchResultClick,
  panelsVisible,
  onTogglePanels,
  onToggleAI,
  aiActive = false,
  entries
}: CustomHeaderBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useEntrySearch(searchQuery, entries);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(searchResults);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchResults);
  };

  useEffect(() => onSearch && onSearch(searchResults), [searchResults, onSearch]);

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
        {/* Search results dropdown */}
        <ResultsPane 
          results={searchResults} 
          onResultClick={(entry: Entry) => {
            onSearchResultClick?.(entry);
          }}
        />
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