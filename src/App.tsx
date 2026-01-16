import "./styles/App.css";
import { MdEditor } from "./components/editor/MpEditor";
import { useState, useEffect, useRef, useCallback } from "react";
import { NavIconButton } from "./components/ui/NavIconButton";
import { Entry } from "./types/entry";
import ArchiveTree from "./components/sidebar/ArchiveTree";
import { Tome } from "./types/tome";
import StartWindow from "./components/archive/StartWindow";
import { Archive } from "./types/archive";
import { FilePlusIcon, GearIcon } from "@radix-ui/react-icons";
import { chunkMarkdown, persistClarityFindings, createDecorationExtension } from "./utils/aiUtils";
import CustomHeaderBar from "./components/layout/CustomHeaderBar";
import { exitApp, SaveShortcut } from "./utils/appUtils";
import PreviewPanel from "./components/ui/PreviewPanel";
import NamePrompt from "./components/dialogs/NamePrompt";
import ArchivePrompt from "./components/dialogs/ArchivePrompt";
import ArchiveSelectDialog from "./components/dialogs/ArchiveSelectDialog";
import { getSyncManager, SyncStatus } from "./lib/sync";
import { getDb } from "./lib/db";
import { searchEntriesInArchive } from "./stores/dataStore";
import TabBar from "./components/layout/TabBar";
import logo from "../src-tauri/icons/icon.png";
import Preferences from "./components/dialogs/Preferences";
import AILinkSuggestions from "./components/ai/AILinkSuggestions";
import AIChatPanel from "./components/ai/AIChatPanel";
import StartupNotification from "./components/dialogs/StartupNotification";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { detectAmbiguity } from "./utils/detectAmbiguity";
import { insertAtCursor } from "./utils/editorAIActions";
import { ThemeProvider } from "./themes/themeContext";

// Custom hooks
import { usePanelLayout } from "./hooks/usePanelLayout";
import { useEntryManagement } from "./hooks/useEntryManagement";
import { useAISuggestions } from "./hooks/useAISuggestions";
import { useArchiveManagement } from "./hooks/useArchiveManagement";
import { useAIChat } from "./hooks/useAIChat";

const DIVIDER_SIZE = 2;

function App() {
  // Sync and initialization state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isInitializing: false,
    isSyncing: false,
    isReady: false,
    error: null
  });
  const isInitialized = useRef<boolean>(false);

  // UI state
  const [showPreferences, setShowPreferences] = useState(false);
  const [ShowEntryPrompt, setShowEntryPrompt] = useState(false);
  const [ShowTomePrompt, setShowTomePrompt] = useState(false);
  const [showStartWindow, setShowStartWindow] = useState(true);
  const [showArchivePrompt, setShowArchivePrompt] = useState(false);
  const [showArchiveSelect, setShowArchiveSelect] = useState(false);
  const [decorations, setDecorations] = useState<Extension[]>([]);

  // Editor view reference for AI chat integration
  const editorViewRef = useRef<EditorView | null>(null);

  const handleEditorViewReady = useCallback((view: EditorView | null) => {
    editorViewRef.current = view;
  }, []);

  // Panel layout hook
  const {
    leftWidth,
    rightWidth,
    panelsVisible,
    togglePanels,
    startDragging,
    dragging,
    rightPanelMode,
    toggleRightPanelMode,
  } = usePanelLayout();

  // Archive management hook
  const archiveManagement = useArchiveManagement({
    syncStatus,
    onArchiveOpened: () => {
      entryManagement.clearEntryState();
    },
    onTomeSelected: (_tome, entries) => {
      entryManagement.setEntries(entries);
    },
  });

  // Entry management hook
  const entryManagement = useEntryManagement({
    tome: archiveManagement.tome,
    archive: archiveManagement.archive,
    showAISuggestions: false, // Will be updated below
    onAISuggestionsRefresh: () => aiSuggestions.generateAISuggestions(),
  });

  // AI suggestions hook
  const aiSuggestions = useAISuggestions({
    entry: entryManagement.entry,
    tome: archiveManagement.tome,
    archive: archiveManagement.archive,
    onApplySuggestion: (newContent) => {
      entryManagement.setMarkdown(newContent);
      entryManagement.handleEntryChanged(newContent);
    },
  });

  // AI chat hook
  const aiChat = useAIChat({
    entry: entryManagement.entry,
    tome: archiveManagement.tome,
    archive: archiveManagement.archive,
    markdown: entryManagement.markdown,
    onApplyEdit: (newContent) => {
      entryManagement.setMarkdown(newContent);
      entryManagement.handleEntryChanged(newContent);
    },
    onInsertContent: (content) => {
      if (editorViewRef.current) {
        insertAtCursor(editorViewRef.current, content);
      }
    },
  });

  // Run clarity analysis on entry change
  useEffect(() => {
    async function runClarityAnalysis(entry: Entry) {
      if (!entry.content.trim() || entry.entry_type !== 'requirement') {
        setDecorations([]);
        return;
      }
      const chunks = chunkMarkdown(entry.content);
      const findings = await detectAmbiguity(chunks);
      await persistClarityFindings(entry.id, chunks, findings);
      const decorationExtensions = createDecorationExtension(findings);
      setDecorations(decorationExtensions);
    }

    if (entryManagement.entry) {
      runClarityAnalysis(entryManagement.entry);
    } else {
      setDecorations([]);
    }
  }, [entryManagement.entry]);

  // Keyboard shortcut for saving
  useEffect(() => {
    const handler = (e: KeyboardEvent) => SaveShortcut(e, entryManagement.entry as Entry);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [entryManagement.entry]);

  // Before unload handler
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (entryManagement.dirtyEntries.length > 0) {
        e.preventDefault();
        e.returnValue = "";
        await exitApp(entryManagement.dirtyEntries);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [entryManagement.dirtyEntries]);

  // App initialization
  useEffect(() => {
    const initializeApp = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        console.log('🚀 Initializing StackScribe...');
        const db = await getDb();
        console.log("✅ Database initialization completed successfully!");

        const tables = await db.select(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `) as Array<{ name: string }>;
        console.log('📊 Available tables:', tables);

        const syncManager = getSyncManager();
        if (syncManager) {
          const unsubscribe = syncManager.onStatusChange(setSyncStatus);
          await syncManager.waitForInitialization();
          return () => unsubscribe();
        } else {
          setSyncStatus({
            isInitializing: false,
            isSyncing: false,
            isReady: true,
            error: null
          });
        }
      } catch (error) {
        console.error("❌ Failed to initialize app:", error);
        isInitialized.current = false;
        setSyncStatus({
          isInitializing: false,
          isSyncing: false,
          isReady: true,
          error: error instanceof Error ? error.message : 'Initialization failed'
        });
      }
    };
    initializeApp();
  }, []);

  // Handlers
  const handleClose = async () => {
    await exitApp(entryManagement.dirtyEntries);
  };

  const handleArchiveCreate = async (newArchive: Archive, tomeName: string) => {
    const result = await archiveManagement.handleArchiveCreate(newArchive, tomeName);
    if (result) {
      entryManagement.setEntries([result.entry]);
      entryManagement.setEntry(result.entry);
      entryManagement.handleCreateTab(result.entry);
      entryManagement.setMarkdown(result.entry.content || "");
    }
  };

  const handleNewTome = async (newTomeName: string) => {
    const result = await archiveManagement.handleNewTome(newTomeName);
    if (result) {
      entryManagement.setEntries([result.entry]);
      entryManagement.setEntry(result.entry);
      entryManagement.handleCreateTab(result.entry);
      entryManagement.setMarkdown(result.entry.content || "");
    }
  };

  const handleNewEntry = async (name: string, entryType: Entry["entry_type"]) => {
    await entryManagement.handleNewEntry(name, entryType);
    setShowEntryPrompt(false);
  };

  return (
    <ThemeProvider>
      <StartupNotification />

      {showPreferences && (
        <Preferences onClose={() => setShowPreferences(false)} />
      )}

      {ShowEntryPrompt && (
        <NamePrompt
          title="New Entry"
          label="Entry Name"
          placeholder="Enter a name for the new entry"
          onClose={() => setShowEntryPrompt(false)}
          onConfirm={(name, entryType) => handleNewEntry(name, entryType as Entry["entry_type"])}
        />
      )}

      {ShowTomePrompt && (
        <NamePrompt
          title="New Tome"
          label="Tome Name"
          placeholder="Enter a name for the new tome"
          onClose={() => setShowTomePrompt(false)}
          onConfirm={(name) => { handleNewTome(name); setShowTomePrompt(false); }}
        />
      )}

      {showArchivePrompt && (
        <ArchivePrompt
          onClose={() => setShowArchivePrompt(false)}
          onConfirm={async (archive, tomeName) => {
            await handleArchiveCreate(archive, tomeName);
            setShowArchivePrompt(false);
          }}
        />
      )}

      {showArchiveSelect && (
        <ArchiveSelectDialog
          archives={archiveManagement.archives}
          onSelect={(archive) => {
            archiveManagement.handleArchiveOpen(archive);
            setShowArchiveSelect(false);
          }}
          onClose={() => setShowArchiveSelect(false)}
        />
      )}

      <StartWindow
        archives={archiveManagement.archives}
        onArchiveClick={archiveManagement.handleArchiveOpen}
        onCreateArchive={handleArchiveCreate}
        syncStatus={syncStatus}
        isOpen={showStartWindow}
        onOpenChange={setShowStartWindow}
      />

      <CustomHeaderBar
        onOpenArchive={async () => {
          await archiveManagement.refreshArchives();
          setShowArchiveSelect(true);
        }}
        onNewArchive={() => setShowArchivePrompt(true)}
        onNewEntry={() => setShowEntryPrompt(true)}
        onNewTome={() => setShowTomePrompt(true)}
        onSave={entryManagement.handleSave}
        onSaveAll={entryManagement.handleSaveAll}
        onClose={handleClose}
        onPreferences={() => setShowPreferences(true)}
        onSearch={async (query) => {
          if (!archiveManagement.archive) return [];
          return searchEntriesInArchive(archiveManagement.archive.id, query);
        }}
        onSearchResultClick={(entry) => {
          entryManagement.handleEntryClick(entry);
        }}
        archiveId={archiveManagement.archive?.id ?? null}
        panelsVisible={panelsVisible}
        onTogglePanels={togglePanels}
        onToggleAI={aiSuggestions.toggleAISuggestions}
        aiActive={aiSuggestions.showAISuggestions}
        onToggleChat={toggleRightPanelMode}
        chatActive={rightPanelMode === 'chat'}
      />

      <div className="app">
        {/* LEFT PANEL */}
        {panelsVisible && (
          <div className="side-panel" style={{ width: leftWidth }}>
            {archiveManagement.archive && (
              <div className="tree-view">
                <ArchiveTree
                  archive={archiveManagement.archive}
                  tomes={archiveManagement.tomes}
                  onTomeClick={(t: Tome, es: Entry[]) => archiveManagement.handleTomeClick(t, es)}
                  onEntryClick={entryManagement.handleEntryClick}
                  onRenameEntry={entryManagement.handleRenameEntry}
                  onDeleteEntry={entryManagement.handleDeleteEntry}
                  refreshKey={entryManagement.entryRefreshKey}
                  selectedTomeId={archiveManagement.tome?.id ?? null}
                  selectedEntryId={entryManagement.entry?.id ?? null}
                />
              </div>
            )}
            <div className="panel-nav">
              <NavIconButton icon={<GearIcon />} onClick={() => setShowPreferences(true)} variant="primary" />
              <NavIconButton icon={<FilePlusIcon />} onClick={() => setShowEntryPrompt(true)} variant="primary" />
            </div>
          </div>
        )}

        {/* EDITOR */}
        <div id="editor-container" className="panel" style={{ flex: 1 }}>
          <TabBar
            tabs={entryManagement.tabbedEntries}
            activeTabId={entryManagement.activeTabId}
            dirtyIds={entryManagement.dirtyEntries.map(e => e.id)}
            onSelect={entryManagement.handleTabSelect}
            onClose={entryManagement.handleTabClose}
            onReorder={entryManagement.handleTabReorder}
          />
          {entryManagement.activeTabId ? (
            entryManagement.tabbedEntries
              .filter(e => e.id === entryManagement.activeTabId)
              .map(e => (
                <MdEditor
                  key={e.id}
                  value={entryManagement.markdown}
                  onEntryChange={entryManagement.handleEntryChanged}
                  decorations={decorations}
                  onEditorViewReady={handleEditorViewReady}
                />
              ))
          ) : (
            <div className="editor-placeholder">
              <img className="logo-placeholder" src={logo} alt="StackScribe logo" width={120} height={120} />
              <p>Select a tome and entry to start writing</p>
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div
          className={`divider ${dragging === 'right' ? 'dragging' : ''}`}
          onMouseDown={() => startDragging("right")}
          style={{ width: DIVIDER_SIZE }}
        />

        {/* RIGHT PANEL - Chat or Preview */}
        <div
          id="preview-container"
          className="panel"
          style={{ width: rightWidth, overflow: "auto", padding: "0px" }}
        >
          {rightPanelMode === 'chat' ? (
            <AIChatPanel
              messages={aiChat.messages}
              status={aiChat.status}
              error={aiChat.error}
              onSendMessage={aiChat.sendMessage}
              onClearHistory={aiChat.clearHistory}
              onApplyEdit={aiChat.applyEditSuggestion}
              onRejectEdit={aiChat.rejectEditSuggestion}
              onRetry={aiChat.retryLastMessage}
              onInsertCode={(code) => {
                if (editorViewRef.current) {
                  insertAtCursor(editorViewRef.current, code);
                }
              }}
            />
          ) : (
            <>
              {aiSuggestions.showAISuggestions && (
                <AILinkSuggestions
                  suggestions={aiSuggestions.aiSuggestions}
                  isLoading={aiSuggestions.isLoadingAI}
                  minMatch={aiSuggestions.aiMinMatch}
                  onChangeMinMatch={aiSuggestions.handleChangeAiMinMatch}
                  onApplySuggestion={aiSuggestions.handleApplyAISuggestion}
                  onDismissSuggestion={aiSuggestions.handleDismissAISuggestion}
                  onRefreshSuggestions={aiSuggestions.generateAISuggestions}
                />
              )}
              <PreviewPanel markdown={entryManagement.markdown} />
            </>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
