/**
 * Theme Context Provider
 *
 * Provides separate App and Editor theme management across the application.
 * App themes control UI (sidebar, tabs, dialogs, buttons).
 * Editor themes control CodeMirror (syntax highlighting, editor colors).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  AppThemeDefinition,
  AppThemeMeta,
  EditorThemeDefinition,
  EditorThemeMeta,
  ThemeDefinition,
  ThemeMeta,
} from './types';
import {
  applyAppTheme,
  discoverAppThemes,
  discoverEditorThemes,
  loadAppThemeById,
  loadEditorThemeById,
  resolveThemeSetting,
  getSystemThemeVariant,
  getDefaultAppTheme,
  getDefaultEditorTheme,
  // Legacy
  applyTheme,
  discoverThemes,
  loadThemeById,
  getDefaultTheme,
} from './themeUtils';
import { getThemeReconfiguration, createEditorTheme } from './editorTheme';
import { settingsService } from '../services/settingsService';

// Helper to darken a hex color
function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// Apply accent color to CSS variables
function applyAccentColor(color: string): void {
  const root = document.documentElement;
  root.style.setProperty('--color-accent-primary', color);
  root.style.setProperty('--color-accent-primary-hover', darkenColor(color, 0.15));
}

/**
 * Theme context value interface
 */
interface ThemeContextValue {
  // App theme (UI: sidebar, tabs, dialogs, buttons)
  appTheme: AppThemeDefinition;
  appThemeSetting: 'dark' | 'light' | 'system';
  availableAppThemes: AppThemeMeta[];
  setAppThemeSetting: (setting: 'dark' | 'light' | 'system') => void;
  setCustomAppTheme: (themeId: string) => Promise<void>;
  refreshAppThemes: () => Promise<void>;

  // Editor theme (CodeMirror: syntax, editor colors)
  editorTheme: EditorThemeDefinition;
  availableEditorThemes: EditorThemeMeta[];
  setCustomEditorTheme: (themeId: string) => Promise<void>;
  refreshEditorThemes: () => Promise<void>;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Legacy - combined theme (for backwards compatibility)
  /** @deprecated Use appTheme and editorTheme instead */
  theme: ThemeDefinition;
  /** @deprecated Use appThemeSetting instead */
  themeSetting: 'dark' | 'light' | 'system';
  /** @deprecated Use availableAppThemes or availableEditorThemes instead */
  availableThemes: ThemeMeta[];
  /** @deprecated Use setAppThemeSetting instead */
  setThemeSetting: (setting: 'dark' | 'light' | 'system') => void;
  /** @deprecated Use setCustomAppTheme or setCustomEditorTheme instead */
  setCustomTheme: (themeId: string) => Promise<void>;
  /** @deprecated Use refreshAppThemes or refreshEditorThemes instead */
  refreshThemes: () => Promise<void>;
  /** Editor reconfiguration for dynamic theme switching */
  getEditorReconfiguration: () => ReturnType<typeof getThemeReconfiguration>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // App theme state
  const [appTheme, setAppTheme] = useState<AppThemeDefinition>(() => getDefaultAppTheme('dark'));
  const [appThemeSetting, setAppThemeSettingState] = useState<'dark' | 'light' | 'system'>('dark');
  const [customAppThemeId, setCustomAppThemeId] = useState<string | null>(null);
  const [availableAppThemes, setAvailableAppThemes] = useState<AppThemeMeta[]>([]);

  // Editor theme state
  const [editorTheme, setEditorTheme] = useState<EditorThemeDefinition>(() => getDefaultEditorTheme('dark'));
  const [customEditorThemeId, setCustomEditorThemeId] = useState<string | null>(null);
  const [availableEditorThemes, setAvailableEditorThemes] = useState<EditorThemeMeta[]>([]);

  // Legacy combined theme (for backwards compatibility)
  const [legacyTheme, setLegacyTheme] = useState<ThemeDefinition>(() => getDefaultTheme('dark'));
  const [availableLegacyThemes, setAvailableLegacyThemes] = useState<ThemeMeta[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // THEME LOADING FUNCTIONS
  // ============================================================================

  const loadAndApplyAppTheme = useCallback(async (themeId: string) => {
    try {
      const result = await loadAppThemeById(themeId);
      if (result.success && result.theme) {
        setAppTheme(result.theme);
        applyAppTheme(result.theme);
        setError(null);
      } else {
        setError(result.error || 'Failed to load app theme');
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Failed to load app theme:', e);
      setError(errorMsg);
    }
  }, []);

  const loadEditorTheme = useCallback(async (themeId: string) => {
    try {
      const result = await loadEditorThemeById(themeId);
      if (result.success && result.theme) {
        setEditorTheme(result.theme);
        setError(null);
      } else {
        setError(result.error || 'Failed to load editor theme');
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Failed to load editor theme:', e);
      setError(errorMsg);
    }
  }, []);

  // ============================================================================
  // APP THEME FUNCTIONS
  // ============================================================================

  const refreshAppThemes = useCallback(async () => {
    try {
      const themes = await discoverAppThemes();
      setAvailableAppThemes(themes);
    } catch (e) {
      console.error('Failed to discover app themes:', e);
    }
  }, []);

  const setAppThemeSetting = useCallback((setting: 'dark' | 'light' | 'system') => {
    setAppThemeSettingState(setting);
    setCustomAppThemeId(null);
    setCustomEditorThemeId(null);
    settingsService.updateAppearanceSettings({
      theme: setting,
      customAppThemeId: null,
      customEditorThemeId: null,
    });

    const variant = resolveThemeSetting(setting);
    const appThemeId = variant === 'light' ? 'app-light' : 'app-dark';
    const editorThemeId = variant === 'light' ? 'editor-light' : 'editor-dark';
    loadAndApplyAppTheme(appThemeId);
    loadEditorTheme(editorThemeId);
  }, [loadAndApplyAppTheme, loadEditorTheme]);

  const setCustomAppTheme = useCallback(async (themeId: string) => {
    setCustomAppThemeId(themeId);
    settingsService.updateAppearanceSettings({ customAppThemeId: themeId });
    await loadAndApplyAppTheme(themeId);
  }, [loadAndApplyAppTheme]);

  // ============================================================================
  // EDITOR THEME FUNCTIONS
  // ============================================================================

  const refreshEditorThemes = useCallback(async () => {
    try {
      const themes = await discoverEditorThemes();
      setAvailableEditorThemes(themes);
    } catch (e) {
      console.error('Failed to discover editor themes:', e);
    }
  }, []);

  const setCustomEditorTheme = useCallback(async (themeId: string) => {
    setCustomEditorThemeId(themeId);
    settingsService.updateAppearanceSettings({ customEditorThemeId: themeId });
    await loadEditorTheme(themeId);
  }, [loadEditorTheme]);

  // ============================================================================
  // LEGACY FUNCTIONS (for backwards compatibility)
  // ============================================================================

  const loadAndApplyLegacyTheme = useCallback(async (themeId: string) => {
    try {
      const result = await loadThemeById(themeId, availableLegacyThemes);
      if (result.success && result.theme) {
        setLegacyTheme(result.theme);
        applyTheme(result.theme);
      }
    } catch (e) {
      console.error('Failed to load legacy theme:', e);
    }
  }, [availableLegacyThemes]);

  const refreshLegacyThemes = useCallback(async () => {
    try {
      const themes = await discoverThemes();
      setAvailableLegacyThemes(themes);
    } catch (e) {
      console.error('Failed to discover legacy themes:', e);
    }
  }, []);

  const setLegacyThemeSetting = useCallback((setting: 'dark' | 'light' | 'system') => {
    setAppThemeSetting(setting);
    const variant = resolveThemeSetting(setting);
    const editorThemeId = variant === 'light' ? 'editor-light' : 'editor-dark';
    loadEditorTheme(editorThemeId);
    // Also update legacy
    const legacyThemeId = variant === 'light' ? 'default-light' : 'default-dark';
    loadAndApplyLegacyTheme(legacyThemeId);
  }, [setAppThemeSetting, loadEditorTheme, loadAndApplyLegacyTheme]);

  const setLegacyCustomTheme = useCallback(async (themeId: string) => {
    await loadAndApplyLegacyTheme(themeId);
  }, [loadAndApplyLegacyTheme]);

  const getEditorReconfiguration = useCallback(() => {
    // Convert EditorThemeDefinition to the format expected by getThemeReconfiguration
    // The editorTheme already contains all needed info
    return {
      effects: createEditorTheme(editorTheme as any),
    } as any;
  }, [editorTheme]);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);

      // Load all theme types
      await Promise.all([
        refreshAppThemes(),
        refreshEditorThemes(),
        refreshLegacyThemes(),
      ]);

      // Get initial settings
      const settings = settingsService.getAppearanceSettings();
      setAppThemeSettingState(settings.theme);

      // Check for saved custom theme IDs
      const savedCustomAppThemeId = settings.customAppThemeId;
      const savedCustomEditorThemeId = settings.customEditorThemeId;

      // Resolve default themes based on setting
      const variant = resolveThemeSetting(settings.theme);
      const defaultAppThemeId = variant === 'light' ? 'app-light' : 'app-dark';
      const defaultEditorThemeId = variant === 'light' ? 'editor-light' : 'editor-dark';
      const legacyThemeId = variant === 'light' ? 'default-light' : 'default-dark';

      // Use saved custom themes if available, otherwise use defaults
      const appThemeIdToLoad = savedCustomAppThemeId || defaultAppThemeId;
      const editorThemeIdToLoad = savedCustomEditorThemeId || defaultEditorThemeId;

      // Set the custom theme IDs in state if they exist
      if (savedCustomAppThemeId) {
        setCustomAppThemeId(savedCustomAppThemeId);
      }
      if (savedCustomEditorThemeId) {
        setCustomEditorThemeId(savedCustomEditorThemeId);
      }

      await Promise.all([
        loadAndApplyAppTheme(appThemeIdToLoad),
        loadEditorTheme(editorThemeIdToLoad),
        loadAndApplyLegacyTheme(legacyThemeId),
      ]);

      // Apply accent color if set
      if (settings.accentColor) {
        applyAccentColor(settings.accentColor);
      }

      setIsLoading(false);
    };

    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system theme changes
  useEffect(() => {
    if (appThemeSetting !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

    const handleChange = () => {
      const variant = getSystemThemeVariant();
      const appThemeId = variant === 'light' ? 'app-light' : 'app-dark';
      const editorThemeId = variant === 'light' ? 'editor-light' : 'editor-dark';
      loadAndApplyAppTheme(appThemeId);
      loadEditorTheme(editorThemeId);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [appThemeSetting, loadAndApplyAppTheme, loadEditorTheme]);

  // Subscribe to settings changes
  useEffect(() => {
    const unsubscribe = settingsService.subscribe((settings) => {
      const newSetting = settings.appearance.theme;
      if (newSetting !== appThemeSetting) {
        setAppThemeSettingState(newSetting);
        if (!customAppThemeId) {
          const variant = resolveThemeSetting(newSetting);
          const appThemeId = variant === 'light' ? 'app-light' : 'app-dark';
          loadAndApplyAppTheme(appThemeId);
        }
        if (!customEditorThemeId) {
          const variant = resolveThemeSetting(newSetting);
          const editorThemeId = variant === 'light' ? 'editor-light' : 'editor-dark';
          loadEditorTheme(editorThemeId);
        }
      }
    });

    return unsubscribe;
  }, [appThemeSetting, customAppThemeId, customEditorThemeId, loadAndApplyAppTheme, loadEditorTheme]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<ThemeContextValue>(
    () => ({
      // App theme
      appTheme,
      appThemeSetting,
      availableAppThemes,
      setAppThemeSetting,
      setCustomAppTheme,
      refreshAppThemes,

      // Editor theme
      editorTheme,
      availableEditorThemes,
      setCustomEditorTheme,
      refreshEditorThemes,

      // Loading states
      isLoading,
      error,

      // Legacy (backwards compatibility)
      theme: legacyTheme,
      themeSetting: appThemeSetting,
      availableThemes: availableLegacyThemes,
      setThemeSetting: setLegacyThemeSetting,
      setCustomTheme: setLegacyCustomTheme,
      refreshThemes: refreshLegacyThemes,
      getEditorReconfiguration,
    }),
    [
      appTheme,
      appThemeSetting,
      availableAppThemes,
      setAppThemeSetting,
      setCustomAppTheme,
      refreshAppThemes,
      editorTheme,
      availableEditorThemes,
      setCustomEditorTheme,
      refreshEditorThemes,
      isLoading,
      error,
      legacyTheme,
      availableLegacyThemes,
      setLegacyThemeSetting,
      setLegacyCustomTheme,
      refreshLegacyThemes,
      getEditorReconfiguration,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    const fallbackAppTheme = getDefaultAppTheme('dark');
    const fallbackEditorTheme = getDefaultEditorTheme('dark');
    const fallbackLegacyTheme = getDefaultTheme('dark');

    return {
      // App theme
      appTheme: fallbackAppTheme,
      appThemeSetting: 'dark',
      availableAppThemes: [],
      setAppThemeSetting: () => {},
      setCustomAppTheme: async () => {},
      refreshAppThemes: async () => {},

      // Editor theme
      editorTheme: fallbackEditorTheme,
      availableEditorThemes: [],
      setCustomEditorTheme: async () => {},
      refreshEditorThemes: async () => {},

      // Loading states
      isLoading: true,
      error: null,

      // Legacy
      theme: fallbackLegacyTheme,
      themeSetting: 'dark',
      availableThemes: [],
      setThemeSetting: () => {},
      setCustomTheme: async () => {},
      refreshThemes: async () => {},
      getEditorReconfiguration: () => ({} as any),
    };
  }
  return context;
}

/**
 * Hook to get app theme
 */
export function useAppTheme(): AppThemeDefinition {
  const { appTheme } = useTheme();
  return appTheme;
}

/**
 * Hook to get editor theme
 */
export function useEditorTheme(): EditorThemeDefinition {
  const { editorTheme } = useTheme();
  return editorTheme;
}

/**
 * Hook to get theme variant
 */
export function useThemeVariant(): 'dark' | 'light' {
  const { appTheme } = useTheme();
  return appTheme.variant;
}

/**
 * @deprecated Use useAppTheme or useEditorTheme instead
 */
export function useCurrentTheme(): ThemeDefinition {
  const { theme } = useTheme();
  return theme;
}
