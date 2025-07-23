import { useReducer, useCallback } from 'react';
import { Entry } from '../types/entry';
import { Archive } from '../types/archive';
import { Tome } from '../types/tome';
import { LinkSuggestion } from '../services/aiLinkService';
import { Extension } from '@codemirror/state';

// Define state interfaces
interface UIState {
  leftWidth: number;
  rightWidth: number;
  dragging: 'left' | 'right' | null;
  panelsVisible: boolean;
  showPreferences: boolean;
  showAISuggestions: boolean;
  isLoadingAI: boolean;
}

interface AppState {
  isInitialized: boolean;
  connectionStatus: string;
  markdown: string;
  decorations: Extension[];
}

interface DataState {
  archives: Archive[];
  archive: Archive | null;
  tomes: Tome[];
  openTome: Tome | null;
  entries: Entry[];
  openEntries: Entry[];
  openEntry: Entry | null;
  tabbedEntries: Entry[];
  activeTabId: string | null;
  dirtyEntries: Entry[];
}

interface ModalState {
  showEntryPrompt: boolean;
  showTomePrompt: boolean;
  entryToRename: Entry | null;
  entryToDelete: Entry | null;
}

interface AIState {
  suggestions: LinkSuggestion[];
}

// Reducer for complex state management
type AppAction = 
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> }
  | { type: 'SET_APP_STATE'; payload: Partial<AppState> }
  | { type: 'SET_DATA_STATE'; payload: Partial<DataState> }
  | { type: 'SET_MODAL_STATE'; payload: Partial<ModalState> }
  | { type: 'SET_AI_STATE'; payload: Partial<AIState> }
  | { type: 'ADD_DIRTY_ENTRY'; payload: Entry }
  | { type: 'REMOVE_DIRTY_ENTRY'; payload: string }
  | { type: 'CLEAR_DIRTY_ENTRIES' }
  | { type: 'ADD_TABBED_ENTRY'; payload: Entry }
  | { type: 'REMOVE_TABBED_ENTRY'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: Entry[] };

interface AppReducerState {
  ui: UIState;
  app: AppState;
  data: DataState;
  modals: ModalState;
  ai: AIState;
  searchResults: Entry[];
}

const initialState: AppReducerState = {
  ui: {
    leftWidth: 200,
    rightWidth: 300,
    dragging: null,
    panelsVisible: true,
    showPreferences: false,
    showAISuggestions: false,
    isLoadingAI: false,
  },
  app: {
    isInitialized: false,
    connectionStatus: 'disconnected',
    markdown: "# Hello, World!\n\n*Write some markdown...*",
    decorations: [],
  },
  data: {
    archives: [],
    archive: null,
    tomes: [],
    openTome: null,
    entries: [],
    openEntries: [],
    openEntry: null,
    tabbedEntries: [],
    activeTabId: null,
    dirtyEntries: [],
  },
  modals: {
    showEntryPrompt: false,
    showTomePrompt: false,
    entryToRename: null,
    entryToDelete: null,
  },
  ai: {
    suggestions: [],
  },
  searchResults: [],
};

function appReducer(state: AppReducerState, action: AppAction): AppReducerState {
  switch (action.type) {
    case 'SET_UI_STATE':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };
    case 'SET_APP_STATE':
      return {
        ...state,
        app: { ...state.app, ...action.payload }
      };
    case 'SET_DATA_STATE':
      return {
        ...state,
        data: { ...state.data, ...action.payload }
      };
    case 'SET_MODAL_STATE':
      return {
        ...state,
        modals: { ...state.modals, ...action.payload }
      };
    case 'SET_AI_STATE':
      return {
        ...state,
        ai: { ...state.ai, ...action.payload }
      };
    case 'ADD_DIRTY_ENTRY':
      return {
        ...state,
        data: {
          ...state.data,
          dirtyEntries: state.data.dirtyEntries.some(e => e.id === action.payload.id) 
            ? state.data.dirtyEntries 
            : [...state.data.dirtyEntries, action.payload]
        }
      };
    case 'REMOVE_DIRTY_ENTRY':
      return {
        ...state,
        data: {
          ...state.data,
          dirtyEntries: state.data.dirtyEntries.filter(e => e.id !== action.payload)
        }
      };
    case 'CLEAR_DIRTY_ENTRIES':
      return {
        ...state,
        data: {
          ...state.data,
          dirtyEntries: []
        }
      };
    case 'ADD_TABBED_ENTRY':
      return {
        ...state,
        data: {
          ...state.data,
          tabbedEntries: state.data.tabbedEntries.some(e => e.id === action.payload.id)
            ? state.data.tabbedEntries
            : [...state.data.tabbedEntries, action.payload],
          activeTabId: action.payload.id
        }
      };
    case 'REMOVE_TABBED_ENTRY':
      const remainingTabs = state.data.tabbedEntries.filter(e => e.id !== action.payload);
      return {
        ...state,
        data: {
          ...state.data,
          tabbedEntries: remainingTabs,
          // If we're removing the active tab, set the last remaining tab as active
          activeTabId: state.data.activeTabId === action.payload 
            ? (remainingTabs.length > 0 ? remainingTabs[0].id : null)
            : state.data.activeTabId
        }
      };
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        data: {
          ...state.data,
          activeTabId: action.payload
        }
      };
    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload
      };
    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Destructure state for easier access
  const { ui, app, data, modals, ai, searchResults } = state;

  // Helper functions to update state
  const updateUI = useCallback((updates: Partial<UIState>) => 
    dispatch({ type: 'SET_UI_STATE', payload: updates }), []);
  
  const updateApp = useCallback((updates: Partial<AppState>) => 
    dispatch({ type: 'SET_APP_STATE', payload: updates }), []);
  
  const updateData = useCallback((updates: Partial<DataState>) => 
    dispatch({ type: 'SET_DATA_STATE', payload: updates }), []);
  
  const updateModals = useCallback((updates: Partial<ModalState>) => 
    dispatch({ type: 'SET_MODAL_STATE', payload: updates }), []);
  
  const updateAI = useCallback((updates: Partial<AIState>) => 
    dispatch({ type: 'SET_AI_STATE', payload: updates }), []);

  // Specific action helpers
  const addDirtyEntry = useCallback((entry: Entry) => 
    dispatch({ type: 'ADD_DIRTY_ENTRY', payload: entry }), []);
  
  const removeDirtyEntry = useCallback((entryId: string) => 
    dispatch({ type: 'REMOVE_DIRTY_ENTRY', payload: entryId }), []);
  
  const clearDirtyEntries = useCallback(() => 
    dispatch({ type: 'CLEAR_DIRTY_ENTRIES' }), []);
  
  const addTabbedEntry = useCallback((entry: Entry) => 
    dispatch({ type: 'ADD_TABBED_ENTRY', payload: entry }), []);
  
  const removeTabbedEntry = useCallback((entryId: string) => 
    dispatch({ type: 'REMOVE_TABBED_ENTRY', payload: entryId }), []);
  
  const setActiveTab = useCallback((tabId: string) => 
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId }), []);

  const setSearchResults = useCallback((results: Entry[]) => 
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results }), []);

  return {
    // State
    ui,
    app,
    data,
    modals,
    ai,
    searchResults,

    // Update functions
    updateUI,
    updateApp,
    updateData,
    updateModals,
    updateAI,
    
    // Specific actions
    addDirtyEntry,
    removeDirtyEntry,
    clearDirtyEntries,
    addTabbedEntry,
    removeTabbedEntry,
    setActiveTab,
    setSearchResults,
  };
} 