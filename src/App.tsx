import "./Styles/App.css";
import { MdEditor } from "./components/MpEditor";
import { useState, useEffect, useRef } from "react";
import { NavIconButton } from "./components/NavIconButton";
import EntryView from "./components/EntryView";
import { Entry } from "./types/entry";
import ArchiveTree from "./components/ArchiveTree";
import { Tome } from "./types/tome";  
import StartWindow from "./components/StartWindow";
import { Archive } from "./types/archive";
import { FilePlusIcon, GearIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { AppMenuBar } from "./components/AppMenuBar";
import { chunkMarkdown, persistClarityFindings, createDecorationExtension } from "./Utils/AIUtils";
import CustomHeaderBar from "./components/CustomHeaderBar";
import { 
   CreateTome, CreateEntry, saveLocalEntry, saveAllEntries, exitApp,
   SaveShortcut,
   OpenArchive, CreateArchive,
   GetArchives,
   } from "./Utils/AppUtils";
import PreviewPanel from "./components/PreviewPanel";
import NamePrompt from "./components/NamePrompt";
import { getSyncManager, SyncStatus } from "./lib/sync";
import { getDb } from "./lib/db";
import { getTomesByArchiveId, saveEntry, getEntriesByTomeId } from "./stores/dataStore";
import TabBar from "./components/TabBar";
import logo from "../src-tauri/icons/icon.png";
import Preferences from "./components/Preferences";
import AILinkSuggestions from "./components/AILinkSuggestions";
import { aiLinkService, LinkSuggestion } from "./services/aiLinkService";
import StartupNotification from "./components/StartupNotification";
import { Extension } from "@codemirror/state";
import { detectAmbiguity } from "./Utils/detectAmbiguity";
import { generateRequirements } from "./Utils/generateRequirement";

const DIVIDER_SIZE = 2; // px

type DragTarget = null | "left" | "right";

function App() {
  const [leftWidth, setLeftWidth] = useState(200);   // side panel
  const [rightWidth, setRightWidth] = useState(300); // preview panel
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [markdown, setMarkdown] = useState("# Hello, World!\n\n*Write some markdown...*");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tome, setTome] = useState<Tome | null>(null);
  const [tomes, setTomes] = useState<Tome[]>([]);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [archive, setArchive] = useState<Archive | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [dirtyEntries, setDirtyEntries] = useState<Entry[]>([]);
  const [ShowEntryPrompt, setShowEntryPrompt] = useState<boolean>(false);
  const [ShowTomePrompt, setShowTomePrompt] = useState<boolean>(false);
  const [tabbedEntries, setTabbedEntries] = useState<Entry[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [panelsVisible, setPanelsVisible] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isInitializing: false,
    isSyncing: false,
    isReady: false,
    error: null
  });
  const [preview, setPreview] = useState<boolean>(false);
  const [themes, setThemes] = useState<{ [key: string]: string }>({});
  const [plugins, setPlugins] = useState<{ [key: string]: string }>({});
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  // Azure Sync preference (persisted in localStorage)
  const [enableAzureSync, setEnableAzureSync] = useState<boolean>(() => {
    const stored = localStorage.getItem('enableAzureSync');
    return stored ? JSON.parse(stored) : false;
  });
  // AI Link suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<LinkSuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [showAISuggestions, setShowAISuggestions] = useState<boolean>(false);
  // Track initialization to prevent multiple sync operations
  const isInitialized = useRef<boolean>(false);
  // Decorations for requirement clarity
  const [decorations, setDecorations] = useState<Extension[]>([]);
  // open an archive
  const handleArchiveOpen = async (selectedArchive: Archive) => {
    // Prevent archive opening if sync is not ready
    if (!syncStatus.isReady) {
      console.warn('⚠️ Cannot open archive while sync is in progress');
      return;
    }

    // set the archive
    setArchive(await OpenArchive(selectedArchive));

    // get and set the tomes
    const openedTomes = await getTomesByArchiveId(selectedArchive.id);
    setTomes(openedTomes);
    // Clear any currently selected tome and entries; user will choose
    setTome(null);
    setEntries([]);
    setEntry(null);
    setTabbedEntries([]);
  };

  // create a new archive and a new tome with an untitled entry
  const handleArchiveCreate = async (newArchive: Archive, tomeName: string) => {
    // Prevent archive creation if sync is not ready
    if (!syncStatus.isReady) {
      console.warn('⚠️ Cannot create archive while sync is in progress');
      return;
    }

    // Create the archive and persist it
    const createdArchive = await CreateArchive(newArchive);
    if (!createdArchive) {
      console.error("Failed to create archive:", newArchive);
      return;
    }
    setArchive(createdArchive);

    // Create a new tome in the archive using the proper NewTome function
    const createdTome = await CreateTome(createdArchive, tomeName);
    if (!createdTome) {
      console.error("Failed to create tome: ", tomeName);
      return;
    }
    setTomes([createdTome]);
    setTome(createdTome);
    
    // Create a default untitled entry in the new tome
    const createdEntry = await CreateEntry(createdTome, "Untitled Entry", "generic");
    if (!createdEntry) {
      console.error("Failed to create entry: Untitled_Entry.md")
    }
    setEntries([createdEntry]);
    setEntry(createdEntry);
    setTabbedEntries([...tabbedEntries, createdEntry]);
    handleCreateTab(createdEntry);
    // Ensure markdown state is set correctly
    setMarkdown(createdEntry.content || "");
  };

  const handleCreateTab = (entry: Entry) => {
    setTabbedEntries(prev => {
      if (prev.some(e => e.id === entry.id)) return prev;
      return [...prev, entry];
    });
    setActiveTabId(entry.id);
  }

  // When user clicks a tab in the TabBar
  const handleTabSelect = (id: string) => {
    setActiveTabId(id);
    const selected = tabbedEntries.find(e => e.id === id);
    if (selected) {
      setEntry(selected);
      setMarkdown(selected.content ?? "");
    }
  };

  // Close (remove) a tab
  const handleTabClose = (id: string) => {
    setTabbedEntries(prev => {
      const remaining = prev.filter(e => e.id !== id);
      // Update active tab if needed
      if (id === activeTabId) {
        if (remaining.length > 0) {
          const newActive = remaining[remaining.length - 1];
          setActiveTabId(newActive.id);
          setEntry(newActive);
          setMarkdown(newActive.content ?? "");
        } else {
          setActiveTabId(null);
          setEntry(null);
          setMarkdown("");
        }
      }
      return remaining;
    });
  };

  // Drag-to-reorder tabs
  const handleTabReorder = (dragId: string, targetId: string) => {
    setTabbedEntries(prev => {
      const dragIndex = prev.findIndex(e => e.id === dragId);
      const targetIndex = prev.findIndex(e => e.id === targetId);
      if (dragIndex === -1 || targetIndex === -1) return prev;
      const reordered = [...prev];
      const [dragged] = reordered.splice(dragIndex, 1);
      reordered.splice(targetIndex, 0, dragged);
      return reordered;
    });
  };

  // open a tome
  const handleTomeClick = async (clickedTome: Tome, entries: Entry[]) => {
    if (!clickedTome) {
      console.error("Selected tome does not exist.");
      return;
    }
    if (tome?.id !== clickedTome.id) {
      // If a different tome is selected, set it as the new selected tome
      setTome(clickedTome);
      const tomeEntries = entries as Entry[];
       setEntries(tomeEntries);
    } else {
      console.warn("selected tome is already open: ", clickedTome.name)
      return;
    }
  };

  // open an entry
  const handleEntryClick = async (e: Entry) => {
    
    setEntry(e);
    handleCreateTab(e);
    setMarkdown(e.content ?? "");
  };

  // save the entry when the user presses Ctrl+S
  const handleSave = async () => {
      if (!entry) return;
      // Ensure entry timestamp is fresh so saveEntry persists the new content
      entry.updated_at = new Date().toISOString();
      let result = await saveEntry(entry as Entry);
      if (result) {
        // If the entry was saved successfully, remove it from dirty entries
        setDirtyEntries(dirtyEntries.filter(e => e.id !== (entry as Entry).id));
        console.log(`Entry ${entry?.name} saved successfully`);
        console.log("DirtyEntries:")
        for (var e of dirtyEntries) {
          console.log(`Entry: ${e.name}`);
        }
      } else {
        // If the save failed, log an error
        console.error("Failed to save entry ", entry?.name);
      }
  };

  const handleSaveAll = async () => {
    setDirtyEntries(await saveAllEntries(dirtyEntries as Entry[]));
  };

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEntryChanged = async (content: string) => {
     // update markdown shown in preview
     setMarkdown(content);

     if (!entry) return;

     // update entry object
     entry.content = content;
     entry.updated_at = new Date().toISOString();

     // add to dirty list if not present
     setDirtyEntries(prev => {
       if (prev.some(e => e.id === entry.id)) return prev;
       return [...prev, entry];
     });

     // debounce save
     if (saveTimeout.current) {
       clearTimeout(saveTimeout.current);
     }
     saveTimeout.current = setTimeout(async () => {
       await saveLocalEntry(entry);
       setDirtyEntries(prev => prev.filter(e => e.id !== entry.id));
     }, 1000); // save 1s after typing stops
   };

  //------ CREATE NEW TOME/ENTRY ------

  const handleNewTome = async (newTomeName: string) => {
    if (archive && !tomes.some(tome => tome.name === newTomeName)) {
      const newTome = await CreateTome(archive as Archive, newTomeName);
       setTomes([...tomes, newTome]);
       setTome(newTome);
      // Automatically create a default entry in the new tome
      const defaultEntry = await CreateEntry(newTome, "Untitled Entry", "generic");
      setEntries([defaultEntry]);
      setEntry(defaultEntry);
      setTabbedEntries([...tabbedEntries, defaultEntry]);
      setActiveTabId(defaultEntry.id)
      setMarkdown(defaultEntry.content || "");
    }
  };

  const handleNewEntry = async (newEntryName: string, entry_type: "generic" | "requirement" | "specification" | "meeting" | "design" | "implementation" | "test" | "other") => {
    //
    if (tome && !entries.some(e => e.name === newEntryName)) {
      const newEntry = await CreateEntry(tome, newEntryName, entry_type);
       setEntries([...entries, newEntry]);
       setEntry(newEntry);
       handleCreateTab(newEntry);
      setMarkdown(newEntry.content || "");
      handleShowEntryPrompt(false);
    }
  };

  // Handle closing the app
  // This will prompt the user to save changes if there are dirty entries
  const handleClose = async () => {
    await exitApp(dirtyEntries as Entry[]);
  };

  // Handle preferences dialog
  const togglePreferences = () => {
    setShowPreferences(!showPreferences);
  };

  const handlePreferencesApply = (themes: { [key: string]: string }, plugins: { [key: string]: string }) => {
    console.log("Preferences applied:", themes, plugins);
  }

  const handlePreferencesClose = () => {
    setShowPreferences(false);
  }

  const handleTogglePreview = (preview: boolean) => {
    setPreview(preview);
  }

  const handleTogglePlugin = (plugin: string, checked: boolean) => {
    console.log("Toggle plugin:", plugin, checked);
  }

  // Toggle Azure Sync preference
  const handleToggleAzureSync = (checked: boolean) => {
    setEnableAzureSync(checked);
    localStorage.setItem('enableAzureSync', JSON.stringify(checked));
    // Reload to allow Auth component to pick up the new preference
    window.location.reload();
  }

  const handleSelectTheme = (theme: string) => {
    console.log("Select theme:", theme);
  }

  const togglePanels = () => {
    setPanelsVisible(prev => !prev);
  };

  const handleSearch = (query: string) => {
    console.log("Search query:", query);
    // TODO: Implement search functionality
    // This could search through entries, tomes, and archives
  };

  // AI Link Suggestions Functions
  const generateAISuggestions = async () => {
    if (!entry || !tome) return;
    
    setIsLoadingAI(true);
    setShowAISuggestions(true);
    
    try {
      // Get all entries from the current tome to provide context
      const allEntries = await getEntriesByTomeId(tome.id);
      
      const response = await aiLinkService.getSuggestions({
        currentEntry: entry,
        allEntries: allEntries,
        context: {
          archiveId: archive?.id,
          tomeId: tome.id,
        },
      });
      
      if (response.status === 'success') {
        setAiSuggestions(response.suggestions);
      } else {
        console.error('AI suggestions failed:', response.error);
        setAiSuggestions([]);
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setAiSuggestions([]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Run clarity analysis on an entry
  async function runClarityAnalysis(entry: Entry) {
    console.log("🔍 Running clarity analysis for entry:", entry.name, "type:", entry.entry_type);
    if (!entry.content.trim() || entry.entry_type !== 'requirement') {
      console.log("Clarity analysis not supported for non-requirement entries");
      setDecorations([]); // Clear decorations for non-requirement entries
      return;
    }
    const chunks = chunkMarkdown(entry.content);
    console.log("📄 Chunks:", chunks);
    console.log("📝 Original content:", entry.content);
    const findings = await detectAmbiguity(chunks);
    console.log("🔍 Findings:", findings);
    await persistClarityFindings(entry.id, chunks, findings);
    const decorationExtensions = createDecorationExtension(findings);
    console.log("🎨 Decoration extensions:", decorationExtensions);
    setDecorations(decorationExtensions);
  }

  // Apply an AI suggestion to the current entry
  const handleApplyAISuggestion = (suggestion: LinkSuggestion) => {
    if (!entry) return;
    
    // Apply the suggestion to the current entry content
    const linkText = suggestion.suggestedText || suggestion.targetEntryName;
    const linkMarkdown = `[${linkText}](entry://${suggestion.targetEntryId})`;
    
    // If position is specified, insert at that position
    if (suggestion.position) {
      const content = entry.content;
      const newContent = 
        content.slice(0, suggestion.position.start) +
        linkMarkdown +
        content.slice(suggestion.position.end);
      
      setMarkdown(newContent);
      handleEntryChanged(newContent);
    } else {
      // Append to the end of the content
      const newContent = entry.content + '\n\n' + linkMarkdown;
      setMarkdown(newContent);
      handleEntryChanged(newContent);
    }
    
    // Remove the applied suggestion
    setAiSuggestions(prev => 
      prev.filter(s => s.targetEntryId !== suggestion.targetEntryId)
    );
  };

  // Dismiss an AI suggestion
  const handleDismissAISuggestion = (suggestion: LinkSuggestion) => {
    setAiSuggestions(prev => 
      prev.filter(s => s.targetEntryId !== suggestion.targetEntryId)
    );
  };

  // Toggle AI suggestions
  const toggleAISuggestions = () => {
    setShowAISuggestions(!showAISuggestions);
    if (!showAISuggestions && aiSuggestions.length === 0) {
      generateAISuggestions();
    }
  };

  // Show the entry prompt
  const handleShowEntryPrompt = (show: boolean) => {
    setShowEntryPrompt(show);
  }

  // Show the tome prompt
  const handleShowTomePrompt = (show: boolean) => {
    setShowTomePrompt(show);
  };

  // Rename an entry
  const handleRenameEntry = async (entry: Entry) => {
    const newName = prompt("New entry name", entry.name);
    if (!newName || newName === entry.name) return;
    entry.name = newName;
    entry.updated_at = new Date().toISOString();
    await saveEntry(entry);
    setEntries([...entries]);          // refresh list
  };

  // Delete an entry
  const handleDeleteEntry = async (entry: Entry) => {
    if (confirm(`Delete "${entry.name}"?`)) {
      await saveEntry(entry); // Assuming deleteEntry is a function that saves the updated entry
      setEntries(entries.filter((e) => e.id !== entry.id));
      setTabbedEntries(tabbedEntries.filter((e) => e.id !== entry.id));
      if (activeTabId === entry.id) setActiveTabId(null);
    }
  };

  // Handle entry saving via keyboard shortcut
  // This will save the current entry when the user presses Ctrl+S
  useEffect(() => {
    window.addEventListener("keydown", (e) => SaveShortcut(e, entry as Entry));
    return () => {
      window.removeEventListener("keydown", (e) => SaveShortcut(e, entry as Entry));
    };
  }, [entry]);

  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (dirtyEntries.length > 0) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to trigger confirmation dialog
        await exitApp(dirtyEntries as Entry[]);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirtyEntries]);

  // Initialize the app on first load
  // This will set up the database and sync data from the server
  useEffect(() => {
    const initializeApp = async () => {
      // Prevent multiple initializations
      if (isInitialized.current) {
        console.log('⚠️ App already initialized, skipping...');
        return;
      }
      
      isInitialized.current = true;
      
      try {
        console.log('🚀 Initializing StackScribe...');
        
        // Initialize the database (migrations will run automatically via Tauri)
        const db = await getDb();
        
        console.log("✅ Database initialization completed successfully!");
        
        // Test basic database operations
        try {
          const tables = await db.select(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
          `) as Array<{ name: string }>;
          console.log('📊 Available tables:', tables);
          
          if (tables.length === 0) {
            console.warn('⚠️ No tables found! Migration may have failed.');
          }
        } catch (tableError) {
          console.error('❌ Failed to query tables:', tableError);
        }
        
        // Initialize sync manager and wait for it to be ready
        const syncManager = getSyncManager();
        if (syncManager) {
          // Subscribe to sync status changes
          const unsubscribe = syncManager.onStatusChange(setSyncStatus);
          
          // Wait for initialization to complete
          await syncManager.waitForInitialization();
          
          // Cleanup subscription when component unmounts
          return () => unsubscribe();
        } else {
          // If no sync manager, mark as ready for offline usage
          setSyncStatus({
            isInitializing: false,
            isSyncing: false,
            isReady: true,
            error: null
          });
        }
        
      } catch (error) {
        console.error("❌ Failed to initialize app:", error);
        console.error("🔧 Check console for Tauri migration logs");
        // Reset flag on error so retry is possible
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

  // Fetch archives only after sync is ready
  useEffect(() => {
    const fetchArchives = async () => {
      if (!syncStatus.isReady) return;
      
      try {
        const fetchedArchives = await GetArchives();
        setArchives(fetchedArchives);
      } catch (error) {
        console.error("Failed to fetch archives:", error);
      }
    };

    fetchArchives();
  }, [syncStatus.isReady]);

  useEffect(() => {
    if (entry) {
      runClarityAnalysis(entry);
    } else {
      // Clear decorations when no entry is selected
      setDecorations([]);
    }
  }, [entry]);


  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (dragging === "left") {
        setLeftWidth(Math.min(Math.max(e.clientX, 150), window.innerWidth - rightWidth - 200));
      } else if (dragging === "right") {
        const newRight = Math.min(Math.max(window.innerWidth - e.clientX, 150), window.innerWidth - leftWidth - 200);
        setRightWidth(newRight);
      }
    };
    const stop = () => setDragging(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [dragging, leftWidth, rightWidth]);

  return (
    <>
    {/* STARTUP NOTIFICATION */}
    <StartupNotification />

    {/* Initialize the app on first load */}
    {/* This will set up the database and sync data from the server */}

    {/* PREFERENCES */}
    {showPreferences && <Preferences 
      themes={themes}
      plugins={plugins}
      onApply={handlePreferencesApply}
      onClose={handlePreferencesClose}
      onTogglePreview={handleTogglePreview}
      onTogglePlugin={handleTogglePlugin}
      onSelectTheme={handleSelectTheme}
      onToggleAzureSync={handleToggleAzureSync}
    />}

    {/* NAME PROMPT */}
    {ShowEntryPrompt && <NamePrompt title="New Entry"  label="Entry Name" placeholder="Enter a name for the new entry" onClose={handleShowEntryPrompt} onConfirm={(name: string, entry_type: string) => { handleNewEntry(name, entry_type as "generic" | "requirement" | "specification" | "meeting" | "design" | "implementation" | "test" | "other"); handleShowEntryPrompt(false); }} />}
    {ShowTomePrompt && <NamePrompt title="New Tome" label="Tome Name" placeholder="Enter a name for the new tome" onClose={handleShowTomePrompt} onConfirm={(name: string) => {handleNewTome(name); handleShowTomePrompt(false)}} />}

    {/* START WINDOW */}
    <StartWindow 
      archives={archives} 
      onArchiveClick={handleArchiveOpen} 
      onCreateArchive={handleArchiveCreate}
      syncStatus={syncStatus}
    />

    {/* CUSTOM HEADER BAR */}
    <CustomHeaderBar
      onNewEntry={() => handleShowEntryPrompt(true)}
      onNewTome={() => handleShowTomePrompt(true)}
      onSave={handleSave}
      onSaveAll={handleSaveAll}
      onClose={handleClose}
      onPreferences={togglePreferences}
      onSearch={handleSearch}
      panelsVisible={panelsVisible}
      onTogglePanels={togglePanels}
      onToggleAI={toggleAISuggestions}
      aiActive={showAISuggestions}
    />

    {/* APP */}
    <div className="app">
      
      {/* LEFT PANEL */}
      {panelsVisible && (
        <div className="side-panel" style={{ width: leftWidth }}>
          {/* TODO: right-click context menu for tomes */}
          {archive && (
            <div className="tree-view">
              <ArchiveTree
                archive={archive}
                tomes={tomes}
                onTomeClick={(t: Tome, es: Entry[]) => {
                  handleTomeClick(t, es);
                }}
              />
            </div>
          )}
          <div className="panel-nav">
            <NavIconButton icon={<GearIcon />} onClick={togglePreferences} />
            <NavIconButton icon={<FilePlusIcon />} onClick={() => handleShowEntryPrompt(true)} />
          </div>
        </div>
      )}

      {/* ENTRY VIEW */}
      {panelsVisible && tome && (
        <div className="entry-view-panel">
          <EntryView 
            entries={entries} 
            onEntryClick={handleEntryClick} 
            onRenameEntry={handleRenameEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        </div>
      )}

      {/* EDITOR */}
      <div id="editor-container" 
        className="panel" 
        style={{ flex: 1 }}
      >
        <TabBar 
          tabs={tabbedEntries}
          activeTabId={activeTabId}
          dirtyIds={dirtyEntries.map(e => e.id)}
          onSelect={handleTabSelect}
          onClose={handleTabClose}
          onReorder={handleTabReorder}
        />
        {activeTabId ? (
          tabbedEntries
            .filter(e => e.id === activeTabId)
            .map(e => (
              <MdEditor
                key={e.id}
                value={markdown}
                onEntryChange={(content: string) => {
                  handleEntryChanged(content);
                }}
                decorations={decorations}
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
        className="divider"
        onMouseDown={() => setDragging("right")}
        style={{ width: DIVIDER_SIZE }}
      />

      {/* PREVIEW PANEL */}
      <div
        id="preview-container"
        className="panel"
        style={{ width: rightWidth, overflow: "auto", padding: "0px"}}
      >
        {showAISuggestions && (
          <AILinkSuggestions
            suggestions={aiSuggestions}
            isLoading={isLoadingAI}
            onApplySuggestion={handleApplyAISuggestion}
            onDismissSuggestion={handleDismissAISuggestion}
            onRefreshSuggestions={generateAISuggestions}
          />
        )}
        <PreviewPanel markdown={markdown} />
      
      </div>
    </div>
    </>
  );
}

export default App;
