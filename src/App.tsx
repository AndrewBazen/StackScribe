import "./Styles/App.css";
import { MdEditor } from "./components/MpEditor";
import { useEffect, useRef, useCallback } from "react";
import { NavIconButton } from "./components/NavIconButton";
import { useAppState } from "./hooks/useAppState";
import EntryView from "./components/EntryView";
import { Entry } from "./types/entry";
import ArchiveTree from "./components/ArchiveTree";
import { Tome } from "./types/tome";  
import StartWindow from "./components/StartWindow";
import { Archive } from "./types/archive";
import { chunkMarkdown, persistClarityFindings, createDecorationExtension } from "./Utils/AIUtils";
import CustomHeaderBar from "./components/CustomHeaderBar";
import NewEntryPrompt from "./components/NewEntryPrompt";
import NewTomePrompt from "./components/NewTomePrompt";
import { exitApp } from "./Utils/AppUtils";
import PreviewPanel from "./components/PreviewPanel";
import { 
  getAllArchives, saveArchive, createArchive,
  getTomesByArchiveId, saveTome, createTome,
  getEntriesByTomeId, saveEntry, createEntry, deleteEntry,
  bulkSaveEntries, testDatabase
} from "./services/rustDatabaseService";
import TabBar from "./components/TabBar";
import logo from "../src-tauri/icons/icon.png";
import Preferences from "./components/Preferences";
import { FilePlusIcon, GearIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import AILinkSuggestions from "./components/AILinkSuggestions";
import { aiLinkService, LinkSuggestion } from "./services/aiLinkService";
import StartupNotification from "./components/StartupNotification";
import { detectAmbiguity } from "./Utils/detectAmbiguity";


const DIVIDER_SIZE = 2; // px

function App() {
  const {
    ui, app, data, modals, ai,
    updateUI, updateApp, updateData, updateModals, updateAI,
    addDirtyEntry, removeDirtyEntry, clearDirtyEntries,
    addTabbedEntry, removeTabbedEntry, setActiveTab,
    setSearchResults, searchResults
  } = useAppState();

  // Debug logging for editor state
  useEffect(() => {
    console.log("🔍 Editor state - activeTabId:", data.activeTabId, "tabbedEntries:", data.tabbedEntries.length);
  }, [data.activeTabId, data.tabbedEntries.length]);

  // Ensure active tab content is loaded when activeTabId changes
  useEffect(() => {
    if (data.activeTabId) {
      const activeEntry = data.tabbedEntries.find(e => e.id === data.activeTabId);
      if (activeEntry && activeEntry.id !== data.openEntry?.id) {
        console.log("🔍 Syncing active tab content:", activeEntry.name);
        updateData({ openEntry: activeEntry });
        updateApp({ markdown: activeEntry.content ?? "" });
      }
    }
  }, [data.activeTabId, data.tabbedEntries]);

  // open an archive
  const handleArchiveOpen = async (selectedArchive: Archive) => {
    // Prevent archive opening if sync is not ready
    if (app.connectionStatus !== 'connected') {
      console.warn('⚠️ Cannot open archive while not connected to the database');
      return;
    }

    // set the archive
    updateData({ archive: selectedArchive });

    // get and set the tomes
    const openedTomes = await getTomesByArchiveId(selectedArchive.id);
    console.log(`📚 Loaded ${openedTomes.length} tomes for archive: ${selectedArchive.name}`);
    
    // Load all entries for all tomes in the archive
    let allEntries: Entry[] = [];
    if (openedTomes.length > 0) {
      // Fetch entries for all tomes in parallel
      const entryPromises = openedTomes.map(async (tome) => {
        const tomeEntries = await getEntriesByTomeId(tome.id);
        console.log(`📚 Loaded ${tomeEntries.length} entries for tome: ${tome.name}`);
        return tomeEntries;
      });
      
      const allTomeEntries = await Promise.all(entryPromises);
      allEntries = allTomeEntries.flat();
      console.log(`📚 Total entries loaded: ${allEntries.length}`);
    }
    
    // Set the first tome and its entries as the open ones
    const firstTome = openedTomes[0] || null;
    const firstTomeEntries = firstTome ? allEntries.filter(entry => entry.tome_id === firstTome.id) : [];
    
    const firstEntry = firstTomeEntries[0] || null;
    updateData({ 
      tomes: openedTomes,
      openTome: firstTome,
      openEntries: firstTomeEntries,
      openEntry: firstEntry,
      tabbedEntries: [firstTomeEntries[0]],
      activeTabId: firstEntry?.id || null,
      entries: allEntries // Store all entries from all tomes
    });
    updateApp({ markdown: firstEntry?.content || "" });
    updateUI({ panelsVisible: true, leftWidth: 200, rightWidth: 200 });
  };

  // create a new archive and a new tome with an untitled entry
  const handleArchiveCreate = async (newArchive: Archive, tomeName: string) => {
    // Prevent archive creation if sync is not ready
    if (app.connectionStatus !== 'connected') {
      console.warn('⚠️ Cannot create archive while not connected to the database');
      return;
    }

    // Create the archive and persist it
    const createdArchive = await createArchive(newArchive.name, newArchive.description || undefined);
    await saveArchive(createdArchive);
    updateData({ archive: createdArchive });

    // Create a new tome in the archive
    const createdTome = await createTome(createdArchive.id, tomeName);
    await saveTome(createdTome);
    updateData({ tomes: [createdTome], openTome: createdTome });
    
    // Create a default untitled entry in the new tome
    const createdEntry = await createEntry(createdTome.id, "Untitled Entry", "", "generic");
    await saveEntry(createdEntry);
    updateData({ 
      entries: [createdEntry], 
      openEntry: createdEntry,
      tabbedEntries: [...data.tabbedEntries, createdEntry],
      activeTabId: createdEntry.id
    });
    updateApp({ markdown: createdEntry.content || "" });
  };

  const handleCreateTab = (entry: Entry) => {
    console.log("🔍 Creating tab for entry:", entry.name, "ID:", entry.id);
    addTabbedEntry(entry);
    console.log("🔍 Tab created - activeTabId should now be:", entry.id);
  }

  // When user clicks a tab in the TabBar
  const handleTabSelect = (id: string) => {
    console.log("🔍 Tab selected:", id);
    const selected = data.tabbedEntries.find(e => e.id === id);
    if (selected) {
      setActiveTab(id);
      updateData({ openEntry: selected });
      updateApp({ markdown: selected.content ?? "" });
      console.log("🔍 Tab selection complete - activeTabId:", id, "openEntry:", selected.name);
    }
  };

  // Close (remove) a tab
  const handleTabClose = (id: string) => {
    console.log("🔍 Closing tab:", id, "activeTabId:", data.activeTabId);
    
    // Get the current tabbed entries before removal to determine the new active tab
    const currentTabs = data.tabbedEntries;
    const isActiveTab = id === data.activeTabId;
    
    // Remove the tab from the list (reducer will handle active tab logic)
    removeTabbedEntry(id);
    
    // If we're closing the active tab, we need to update the open entry and markdown
    if (isActiveTab) {
      const remainingTabs = currentTabs.filter(tab => tab.id !== id);
      if (remainingTabs.length > 0) {
        const newActive = remainingTabs[remainingTabs.length - 1];
        console.log("🔍 Setting new active tab:", newActive.name, "ID:", newActive.id);
        updateData({ openEntry: newActive });
        updateApp({ markdown: newActive.content ?? "" });
      } else {
        console.log("🔍 No tabs remaining, clearing state");
        updateData({ openEntry: null });
        updateApp({ markdown: "" });
      }
    }
  };

  // Drag-to-reorder tabs
  const handleTabReorder = (dragId: string, targetId: string) => {
    const dragIndex = data.tabbedEntries.findIndex(e => e.id === dragId);
    const targetIndex = data.tabbedEntries.findIndex(e => e.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;
    
    const reordered = [...data.tabbedEntries];
    const [dragged] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, dragged);
    updateData({ tabbedEntries: reordered });
  };

  // open a tome
  const handleTomeClick = async (tome: Tome) => {
    // check if the tome is already open
    if (data.openTome?.id === tome.id) {
      console.warn("Tome already selected: ", tome.name);
      return;
    }
    
    // set the open tome
    updateData({ openTome: tome });
    
    // filter entries for this tome from the already loaded entries
    const tomeEntries = data.entries.filter(entry => entry.tome_id === tome.id);
    console.log(`📚 Found ${tomeEntries.length} entries for tome: ${tome.name}`);
    
    // update the open entries
    updateData({
      openEntries: tomeEntries
    });
  };

  // open an entry
  const handleEntryClick = async (e: Entry) => {
    console.log("🔍 Entry clicked:", e.name, "ID:", e.id);
    console.log("🔍 Current tabbedEntries:", data.tabbedEntries.map(t => t.name));
    console.log("🔍 Current activeTabId:", data.activeTabId);
    
    // check if the entry is already in the tabbedEntries
    if (!data.tabbedEntries.some(t => t.id === e.id)) {
      console.log("🔍 Adding entry to tabs");
      // if not, add it to the tabbedEntries (this also sets activeTabId)
      handleCreateTab(e);
    } else {
      console.log("🔍 Entry already in tabs, setting as active");
      // if it's already in tabs, just set it as active
      setActiveTab(e.id);
    }
    // set the open entry and update markdown
    updateData({ openEntry: e });
    updateApp({ markdown: e.content ?? "" });
    
    console.log("🔍 After update - activeTabId should be:", e.id);
  };

  // save the entry when the user presses Ctrl+S
  const handleSave = useCallback(async () => {
      if (!data.openEntry) return;
      // Ensure entry timestamp is fresh so saveEntry persists the new content
      data.openEntry.updated_at = new Date().toISOString();
      try {
        await saveEntry(data.openEntry as Entry);
        // If the entry was saved successfully, remove it from dirty entries
        removeDirtyEntry(data.openEntry.id);
        console.log(`Entry ${data.openEntry?.name} saved successfully`);
      } catch (error) {
        // If the save failed, log an error
        console.error("Failed to save entry ", data.openEntry?.name, error);
      }
  }, [data.openEntry, removeDirtyEntry]);

  const handleSaveAll = async () => {
    // Save all dirty entries using bulk save
    await bulkSaveEntries(data.dirtyEntries as Entry[]);
    clearDirtyEntries();
  };

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEntryChanged = async (content: string) => {
     // update markdown shown in preview
     updateApp({ markdown: content });

     if (!data.openEntry) return;

     // update entry object
     data.openEntry.content = content;
     data.openEntry.updated_at = new Date().toISOString();

     // add to dirty list if not present
     addDirtyEntry(data.openEntry);

     // debounce save
     if (saveTimeout.current) {
       clearTimeout(saveTimeout.current);
     }
     saveTimeout.current = setTimeout(async () => {
       try {
         await saveEntry(data.openEntry!);
         removeDirtyEntry(data.openEntry!.id);
       } catch (error) {
         console.error("Failed to save entry:", error);
       }
     }, 1000); // save 1s after typing stops
   };

  //------ CREATE NEW TOME/ENTRY ------

  const handleNewTome = async (newTomeName: string) => {
    if (data.archive && !data.tomes.some(tome => tome.name === newTomeName)) {
      const newTome = await createTome(data.archive.id, newTomeName);
      await saveTome(newTome);
      updateData({ tomes: [...data.tomes, newTome], openTome: newTome });
      // Automatically create a default entry in the new tome
      const defaultEntry = await createEntry(newTome.id, "Untitled Entry", "", "generic");
      await saveEntry(defaultEntry);
      updateData({ 
        entries: [defaultEntry], 
        openEntry: defaultEntry,
        tabbedEntries: [...data.tabbedEntries, defaultEntry],
        activeTabId: defaultEntry.id
      });
      updateApp({ markdown: defaultEntry.content || "" });
    }
  };

  const handleNewEntry = async (newEntryName: string, entry_type: "generic" | "requirement" | "specification" | "meeting" | "design" | "implementation" | "test" | "other") => {
    if (data.openTome && !data.openEntries.some(e => e.name === newEntryName)) {
      const newEntry = await createEntry(data.openTome.id, newEntryName, "", entry_type);
      await saveEntry(newEntry);
      updateData({ 
        entries: [...data.entries, newEntry], 
        openEntry: newEntry 
      });
      handleCreateTab(newEntry);
      updateData({ activeTabId: newEntry.id });
      updateApp({ markdown: newEntry.content || "" });
      updateModals({ showEntryPrompt: false });
    }
  };

  // Handle closing the app
  // This will prompt the user to save changes if there are dirty entries
  const handleClose = async () => {
    await exitApp(data.dirtyEntries as Entry[]);
  };

  // Handle preferences dialog
  const togglePreferences = () => {
    updateUI({ showPreferences: !ui.showPreferences });
  };

  const handlePreferencesApply = (themes: { [key: string]: string }, plugins: { [key: string]: string }) => {
    console.log("Preferences applied:", themes, plugins);
  }

  const handlePreferencesClose = () => {
    updateUI({ showPreferences: false });
  }

  const togglePanels = () => {
    updateUI({ panelsVisible: !ui.panelsVisible });
  };

  // AI Link Suggestions Functions
  const generateAISuggestions = async () => {
    if (!data.openEntry || !data.openTome) return;
    
    updateUI({ isLoadingAI: true, showAISuggestions: true });
    
    try {
      // Get all entries from the current tome to provide context
      const allEntries = await getEntriesByTomeId(data.openTome.id);
      
      const response = await aiLinkService.getSuggestions({
        currentEntry: data.openEntry,
        allEntries: allEntries,
        context: {
          archiveId: data.archive?.id,
          tomeId: data.openTome.id,
        },
      });
      
      if (response.status === 'success') {
        updateAI({ suggestions: response.suggestions });
      } else {
        console.error('AI suggestions failed:', response.error);
        updateAI({ suggestions: [] });
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      updateAI({ suggestions: [] });
    } finally {
      updateUI({ isLoadingAI: false });
    }
  };

  // Run clarity analysis on an entry
  async function runClarityAnalysis(entry: Entry) {
    console.log("🔍 Running clarity analysis for entry:", entry.name, "type:", entry.entry_type);
    if (!entry.content.trim() || entry.entry_type !== 'requirement') {
      console.log("Clarity analysis not supported for non-requirement entries");
      updateApp({ decorations: [] }); // Clear decorations for non-requirement entries
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
    updateApp({ decorations: decorationExtensions });
  }

  // Apply an AI suggestion to the current entry
  const handleApplyAISuggestion = (suggestion: LinkSuggestion) => {
    if (!data.openEntry) return;
    
    // Apply the suggestion to the current entry content
    const linkText = suggestion.suggestedText || suggestion.targetEntryName;
    const linkMarkdown = `[${linkText}](entry://${suggestion.targetEntryId})`;
    
    // If position is specified, insert at that position
    if (suggestion.position) {
      const content = data.openEntry.content;
      const newContent = 
        content.slice(0, suggestion.position.start) +
        linkMarkdown +
        content.slice(suggestion.position.end);
      
      updateApp({ markdown: newContent });
      handleEntryChanged(newContent);
    } else {
      // Append to the end of the content
      const newContent = data.openEntry.content + '\n\n' + linkMarkdown;
      updateApp({ markdown: newContent });
      handleEntryChanged(newContent);
    }
    
    // Remove the applied suggestion
    updateAI({ 
      suggestions: ai.suggestions.filter(s => s.targetEntryId !== suggestion.targetEntryId)
    });
  };

  // Dismiss an AI suggestion
  const handleDismissAISuggestion = (suggestion: LinkSuggestion) => {
    updateAI({ 
      suggestions: ai.suggestions.filter(s => s.targetEntryId !== suggestion.targetEntryId)
    });
  };

  // Toggle AI suggestions
  const toggleAISuggestions = () => {
    updateUI({ showAISuggestions: !ui.showAISuggestions });
    if (!ui.showAISuggestions && ai.suggestions.length === 0) {
      generateAISuggestions();
    }
  };

  // Show the entry prompt
  const handleShowEntryPrompt = (show: boolean) => {
    updateModals({ showEntryPrompt: show });
  }

  // Show the tome prompt
  const handleShowTomePrompt = (show: boolean) => {
    updateModals({ showTomePrompt: show });
  };

  // Rename an entry
  const handleRenameEntry = async (entry: Entry) => {
    updateModals({ entryToRename: entry });
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!modals.entryToRename) return;
    
    const updatedEntry = { ...modals.entryToRename, name: newName, updated_at: new Date().toISOString() };
    
    try {
      await saveEntry(updatedEntry);
      
      // Update local state
      updateData({
        entries: data.entries.map(e => e.id === updatedEntry.id ? updatedEntry : e),
        tabbedEntries: data.tabbedEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
      });
      
      if (data.openEntry?.id === updatedEntry.id) {
        updateData({ openEntry: updatedEntry });
      }
      
      updateModals({ entryToRename: null });
    } catch (error) {
      console.error("Failed to rename entry:", error);
    }
  };

  // Delete an entry
  const handleDeleteEntry = async (entry: Entry) => {
    updateModals({ entryToDelete: entry });
  };

  const handleDeleteConfirm = async () => {
    if (!modals.entryToDelete) return;
    
    try {
      // Remove from database
      await deleteEntry(modals.entryToDelete.id);
      updateData({
        entries: data.entries.filter(e => e.id !== modals.entryToDelete!.id),
        tabbedEntries: data.tabbedEntries.filter(e => e.id !== modals.entryToDelete!.id)
      });
      
      if (data.activeTabId === modals.entryToDelete.id) {
        const remaining = data.tabbedEntries.filter(e => e.id !== modals.entryToDelete!.id);
        if (remaining.length > 0) {
          const newActive = remaining[remaining.length - 1];
          updateData({
            activeTabId: newActive.id,
            openEntry: newActive
          });
          updateApp({ markdown: newActive.content ?? "" });
        } else {
          updateData({
            activeTabId: null,
            openEntry: null
          });
          updateApp({ markdown: "" });
        }
      }
      
      updateModals({ entryToDelete: null });
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  // Handle entry saving via keyboard shortcut
  // This will save the current entry when the user presses Ctrl+S
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && data.openEntry) {
        e.preventDefault();
        await handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [data.openEntry, handleSave]);

  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (data.dirtyEntries.length > 0) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to trigger confirmation dialog
        await exitApp(data.dirtyEntries as Entry[]);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [data.dirtyEntries]);

  // Initialize the app on first load
  // This will set up the database and sync data from the server
  useEffect(() => {
    const testDatabaseConnection = async () => {
      // test the database
      const connectionStatus = await testDatabase();
      console.log('🧪 Database test result:', connectionStatus);
      updateApp({ connectionStatus: connectionStatus as unknown as string });

      // fetch the archives
      if (connectionStatus === 'connected' && !app.isInitialized) {
        const fetchedArchives = await getAllArchives();
        if (fetchedArchives) {
          updateData({ archives: fetchedArchives });
          updateApp({ isInitialized: true });
        }
      }
    };
    testDatabaseConnection();
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (ui.dragging === "left") {
        updateUI({ leftWidth: Math.min(Math.max(e.clientX, 150), window.innerWidth - ui.rightWidth - 200) });
      } else if (ui.dragging === "right") {
        const newRight = Math.min(Math.max(window.innerWidth - e.clientX, 150), window.innerWidth - ui.leftWidth - 200);
        updateUI({ rightWidth: newRight });
      }
    };
    const stop = () => updateUI({ dragging: null });
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [ui.dragging, ui.leftWidth, ui.rightWidth]);

  return (
    <>
    {/* STARTUP NOTIFICATION */}
    <StartupNotification />

    {/* PREFERENCES */}
    {ui.showPreferences && <Preferences 
      themes={{}}
      plugins={{}}
      onApply={handlePreferencesApply}
      onClose={handlePreferencesClose}
      onTogglePreview={() => {}}
      onTogglePlugin={() => {}}
      onSelectTheme={() => {}}
      onToggleAzureSync={() => {}}
    />}

    {/* NEW ENTRY PROMPT */}
    {modals.showEntryPrompt && <NewEntryPrompt 
      title="New Entry"
      label="Entry Name"
      placeholder="Enter a name for the new entry"
      onClose={() => handleShowEntryPrompt(false)} 
      onConfirm={(name: string, entry_type: string) => {
        handleNewEntry(name, entry_type as "generic" | "requirement" | "specification" | "meeting" | "design" | "implementation" | "test" | "other");
        handleShowEntryPrompt(false);
      }} 
    />}

    {/* NEW TOME PROMPT */}
    {modals.showTomePrompt && <NewTomePrompt 
      title="New Tome"
      label="Tome Name"
      placeholder="Enter a name for the new tome"
      onClose={() => handleShowTomePrompt(false)} 
      onConfirm={(name: string) => {
        handleNewTome(name);
        handleShowTomePrompt(false);
      }} 
    />}

    {/* RENAME ENTRY PROMPT */}
    {modals.entryToRename && (
      <NewEntryPrompt
        title="Rename Entry"
        label="Entry Name"
        placeholder="Enter a new name for the entry"
        onClose={() => updateModals({ entryToRename: null })}
        onConfirm={(newName: string, entry_type: string) => {
          handleRenameConfirm(newName);
        }}
      />
    )}

    {/* DELETE ENTRY CONFIRMATION */}
    {modals.entryToDelete && (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Delete Entry</h3>
          <p>Are you sure you want to delete "{modals.entryToDelete.name}"?</p>
          <div className="modal-buttons">
            <button onClick={() => updateModals({ entryToDelete: null })}>Cancel</button>
            <button onClick={handleDeleteConfirm} className="danger">Delete</button>
          </div>
        </div>
      </div>
    )}

    {/* START WINDOW */}
    <StartWindow 
      archives={data.archives} 
      onArchiveClick={handleArchiveOpen} 
      onCreateArchive={handleArchiveCreate}
      syncStatus={{ isInitializing: false, isSyncing: false, isReady: true, error: null }}
    />

    {/* CUSTOM HEADER BAR */}
    <CustomHeaderBar
      onCreateArchive={() => handleShowTomePrompt(true)}
      onSwitchArchive={() => {}}
      onNewEntry={() => handleShowEntryPrompt(true)}
      onNewTome={() => handleShowTomePrompt(true)}
      onSave={handleSave}
      onSaveAll={handleSaveAll}
      onClose={handleClose}
      onPreferences={togglePreferences}
      onSearch={setSearchResults}
      onSearchResultClick={(entry) => {
        handleEntryClick(entry);
        // Clear search results after clicking
        setSearchResults([]);
      }}
      panelsVisible={ui.panelsVisible}
      onTogglePanels={togglePanels}
      onToggleAI={toggleAISuggestions}
      aiActive={ui.showAISuggestions}
      entries={data.entries}
    />



    {/* APP */}
    <div className="app">
      
      {/* LEFT PANEL */}
      {ui.panelsVisible && (
        <div className="side-panel" style={{ width: ui.leftWidth }}>
          {/* TODO: right-click context menu for tomes */}
          {data.archive && (
            <div className="tree-view">
              <ArchiveTree
                archive={data.archive}
                tomes={data.tomes}
                onTomeClick={(t: Tome) => {
                  handleTomeClick(t);
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
      {ui.panelsVisible && data.openTome && (
        <div className="entry-view-panel">
          <EntryView 
            entries={data.openEntries} 
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
          tabs={data.tabbedEntries}
          activeTabId={data.activeTabId}
          dirtyIds={data.dirtyEntries.map(e => e.id)}
          onSelect={handleTabSelect}
          onClose={handleTabClose}
          onReorder={handleTabReorder}
        />
        {data.activeTabId ? (
          data.tabbedEntries
            .filter(e => e.id === data.activeTabId)
            .map(e => {
              console.log("🔍 Rendering editor for entry:", e.name, "ID:", e.id);
              return (
                <MdEditor
                  key={e.id}
                  value={app.markdown}
                  onEntryChange={(content: string) => {
                    handleEntryChanged(content);
                  }}
                  decorations={app.decorations}
                />
              );
            })
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
        onMouseDown={() => updateUI({ dragging: "right" })}
        style={{ width: DIVIDER_SIZE }}
      />

      {/* PREVIEW PANEL */}
      <div
        id="preview-container"
        className="panel"
        style={{ width: ui.rightWidth, overflow: "auto", padding: "0px"}}
      >
        {ui.showAISuggestions && (
          <AILinkSuggestions
            suggestions={ai.suggestions}
            isLoading={ui.isLoadingAI}
            onApplySuggestion={handleApplyAISuggestion}
            onDismissSuggestion={handleDismissAISuggestion}
            onRefreshSuggestions={generateAISuggestions}
          />
        )}
        <PreviewPanel markdown={app.markdown} />
      
      </div>
    </div>
    </>
  );
}

export default App;
