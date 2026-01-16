import React, { useState, useEffect, useRef } from 'react';
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
import SearchResults from './SearchResults';
import { Entry } from '../../types/entry';

interface SearchResult extends Entry {
  tomeName: string;
}

interface CustomHeaderBarProps {
  onOpenArchive: () => void;
  onNewArchive: () => void;
  onNewEntry: () => void;
  onNewTome: () => void;
  onSave: () => void;
  onSaveAll: () => void;
  onClose: () => void;
  onPreferences: () => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSearchResultClick: (entry: Entry) => void;
  archiveId?: string | null;
  panelsVisible: boolean;
  onTogglePanels: () => void;
  onToggleAI: () => void;
  aiActive?: boolean;
  onToggleChat: () => void;
  chatActive?: boolean;
}

export default function CustomHeaderBar({
  onOpenArchive,
  onNewArchive,
  onNewEntry,
  onNewTome,
  onSave,
  onSaveAll,
  onClose,
  onPreferences,
  onSearch,
  onSearchResultClick,
  archiveId,
  panelsVisible,
  onTogglePanels,
  onToggleAI,
  aiActive = false,
  onToggleChat,
  chatActive = false
}: CustomHeaderBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setShowResults(true);

    debounceRef.current = setTimeout(async () => {
      if (!archiveId) return;

      setIsSearching(true);
      try {
        const results = await onSearch(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleResultClick = (entry: Entry) => {
    onSearchResultClick(entry);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleCloseResults = () => {
    setShowResults(false);
  };

  return (
    <div className="custom-header-bar">
      {/* Left section: Menu and navigation */}
      <div className="header-left">
        <AppMenuBar
          onOpenArchive={onOpenArchive}
          onNewArchive={onNewArchive}
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
      <div className="header-center" ref={searchContainerRef}>
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-container">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder={archiveId ? "Search entries..." : "Select an archive to search"}
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
              disabled={!archiveId}
            />
          </div>
        </form>
        {showResults && (
          <SearchResults
            results={searchResults}
            isLoading={isSearching}
            query={searchQuery}
            onResultClick={handleResultClick}
            onClose={handleCloseResults}
          />
        )}
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