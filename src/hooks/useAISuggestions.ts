import { useState, useRef, useCallback } from "react";
import { Entry } from "../types/entry";
import { Tome } from "../types/tome";
import { Archive } from "../types/archive";
import { aiLinkService, LinkSuggestion } from "../services/aiLinkService";
import { getEntriesByTomeId } from "../stores/dataStore";

interface AISuggestionsState {
  aiSuggestions: LinkSuggestion[];
  isLoadingAI: boolean;
  showAISuggestions: boolean;
  aiMinMatch: number;
}

interface AISuggestionsActions {
  generateAISuggestions: () => Promise<void>;
  handleApplyAISuggestion: (suggestion: LinkSuggestion) => void;
  handleDismissAISuggestion: (suggestion: LinkSuggestion) => void;
  toggleAISuggestions: () => void;
  handleChangeAiMinMatch: (next: number) => void;
}

interface UseAISuggestionsOptions {
  entry: Entry | null;
  tome: Tome | null;
  archive: Archive | null;
  onApplySuggestion: (newContent: string) => void;
}

export function useAISuggestions(
  options: UseAISuggestionsOptions
): AISuggestionsState & AISuggestionsActions {
  const { entry, tome, archive, onApplySuggestion } = options;

  const [aiSuggestions, setAiSuggestions] = useState<LinkSuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiMinMatch, setAiMinMatch] = useState<number>(() => {
    const stored = localStorage.getItem('aiMinMatch');
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.7;
  });

  const indexedTomesRef = useRef<Set<string>>(new Set());

  const generateAISuggestions = useCallback(async () => {
    if (!entry || !tome) return;

    setIsLoadingAI(true);
    setShowAISuggestions(true);

    try {
      const allEntries = await getEntriesByTomeId(tome.id);

      if (!indexedTomesRef.current.has(tome.id)) {
        await aiLinkService.indexEntries(allEntries, { archiveId: archive?.id, tomeId: tome.id });
        indexedTomesRef.current.add(tome.id);
      } else {
        await aiLinkService.indexEntries([entry], { archiveId: archive?.id, tomeId: tome.id });
      }

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
  }, [entry, tome, archive]);

  const handleApplyAISuggestion = useCallback((suggestion: LinkSuggestion) => {
    if (!entry) return;

    const linkText = suggestion.suggestedText || suggestion.targetEntryName;
    const linkMarkdown = `[${linkText}](entry://${suggestion.targetEntryId})`;

    let newContent: string;
    if (suggestion.position) {
      const content = entry.content;
      newContent =
        content.slice(0, suggestion.position.start) +
        linkMarkdown +
        content.slice(suggestion.position.end);
    } else {
      newContent = entry.content + '\n\n' + linkMarkdown;
    }

    onApplySuggestion(newContent);

    setAiSuggestions(prev =>
      prev.filter(s => s.targetEntryId !== suggestion.targetEntryId)
    );
  }, [entry, onApplySuggestion]);

  const handleDismissAISuggestion = useCallback((suggestion: LinkSuggestion) => {
    setAiSuggestions(prev =>
      prev.filter(s => s.targetEntryId !== suggestion.targetEntryId)
    );
  }, []);

  const toggleAISuggestions = useCallback(() => {
    setShowAISuggestions(prev => {
      const newValue = !prev;
      if (newValue && aiSuggestions.length === 0) {
        generateAISuggestions();
      }
      return newValue;
    });
  }, [aiSuggestions.length, generateAISuggestions]);

  const handleChangeAiMinMatch = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    setAiMinMatch(clamped);
    localStorage.setItem('aiMinMatch', String(clamped));
  }, []);

  return {
    aiSuggestions,
    isLoadingAI,
    showAISuggestions,
    aiMinMatch,
    generateAISuggestions,
    handleApplyAISuggestion,
    handleDismissAISuggestion,
    toggleAISuggestions,
    handleChangeAiMinMatch,
  };
}
