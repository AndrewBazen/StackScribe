/**
 * Theme Utilities
 *
 * Provides functions for managing App and Editor themes separately.
 * Handles applying themes, loading custom themes, and import/export.
 */

import { readDir, readTextFile, writeTextFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';
import type {
  AppThemeDefinition,
  AppThemeColors,
  AppThemeMeta,
  AppThemeLoadResult,
  PartialAppTheme,
  EditorThemeDefinition,
  EditorUIColors,
  SyntaxColors,
  EditorThemeMeta,
  EditorThemeLoadResult,
  PartialEditorTheme,
  ThemeDefinition,
  ThemeColors,
  PartialTheme,
  ThemeMeta,
  ThemeLoadResult,
} from './types';
import { APP_COLOR_TO_CSS_VAR, EDITOR_COLOR_TO_CSS_VAR, SYNTAX_TO_CSS_VAR, COLOR_TO_CSS_VAR } from './types';
import { defaultAppDark } from './defaultAppDark';
import { defaultAppLight } from './defaultAppLight';
import { defaultEditorDark } from './defaultEditorDark';
import { defaultEditorLight } from './defaultEditorLight';
import { defaultDark } from './defaultDark';
import { defaultLight } from './defaultLight';

// Theme folder names within app data
const APP_THEMES_FOLDER = 'themes/app';
const EDITOR_THEMES_FOLDER = 'themes/editor';
const THEMES_FOLDER = 'themes'; // Legacy folder

// ============================================================================
// BUILT-IN THEMES
// ============================================================================

export const BUILT_IN_APP_THEMES: AppThemeDefinition[] = [defaultAppDark, defaultAppLight];
export const BUILT_IN_EDITOR_THEMES: EditorThemeDefinition[] = [defaultEditorDark, defaultEditorLight];

// Legacy combined themes (for backwards compatibility)
export const BUILT_IN_THEMES: ThemeDefinition[] = [defaultDark, defaultLight];

// ============================================================================
// APP THEME FUNCTIONS
// ============================================================================

/**
 * Get built-in app theme by ID
 */
export function getBuiltInAppTheme(id: string): AppThemeDefinition | undefined {
  return BUILT_IN_APP_THEMES.find(t => t.id === id);
}

/**
 * Get default app theme for a variant
 */
export function getDefaultAppTheme(variant: 'dark' | 'light'): AppThemeDefinition {
  return variant === 'light' ? defaultAppLight : defaultAppDark;
}

/**
 * Apply an app theme to the document by setting CSS variables
 */
export function applyAppTheme(theme: AppThemeDefinition): void {
  const root = document.documentElement;

  // Apply app color variables
  for (const [key, cssVar] of Object.entries(APP_COLOR_TO_CSS_VAR)) {
    const value = theme.colors[key as keyof AppThemeColors];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }

  // Set theme variant attribute for CSS selectors
  root.setAttribute('data-app-theme', theme.variant);

  // Update body background for immediate effect
  document.body.style.backgroundColor = theme.colors.bgTertiary;
  document.body.style.color = theme.colors.textPrimary;
}

/**
 * Validate a partial app theme object
 */
export function validateAppTheme(data: unknown): data is PartialAppTheme {
  if (!data || typeof data !== 'object') return false;
  const theme = data as Record<string, unknown>;

  if (typeof theme.id !== 'string' || !theme.id) {
    console.error('App theme validation failed: id is required');
    return false;
  }
  if (typeof theme.name !== 'string' || !theme.name) {
    console.error('App theme validation failed: name is required');
    return false;
  }
  if (theme.variant !== 'dark' && theme.variant !== 'light') {
    console.error('App theme validation failed: variant must be "dark" or "light"');
    return false;
  }
  if (theme.colors !== undefined && typeof theme.colors !== 'object') {
    console.error('App theme validation failed: colors must be an object');
    return false;
  }

  return true;
}

/**
 * Merge a partial app theme with default values
 */
export function mergeAppThemeWithDefaults(partial: PartialAppTheme): AppThemeDefinition {
  const baseTheme = getDefaultAppTheme(partial.variant);
  return {
    id: partial.id,
    name: partial.name,
    variant: partial.variant,
    colors: {
      ...baseTheme.colors,
      ...partial.colors,
    },
  };
}

/**
 * Ensure app themes folder exists
 */
async function ensureAppThemesFolder(): Promise<boolean> {
  try {
    const folderExists = await exists(APP_THEMES_FOLDER, { baseDir: BaseDirectory.AppData });
    if (!folderExists) {
      await mkdir(APP_THEMES_FOLDER, { baseDir: BaseDirectory.AppData, recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Failed to create app themes folder:', error);
    return false;
  }
}

/**
 * Discover all available app themes
 */
export async function discoverAppThemes(): Promise<AppThemeMeta[]> {
  const themes: AppThemeMeta[] = [];

  // Add built-in themes
  for (const theme of BUILT_IN_APP_THEMES) {
    themes.push({
      id: theme.id,
      name: theme.name,
      variant: theme.variant,
      isBuiltIn: true,
    });
  }

  // Discover custom themes
  try {
    const folderReady = await ensureAppThemesFolder();
    if (!folderReady) return themes;

    const entries = await readDir(APP_THEMES_FOLDER, { baseDir: BaseDirectory.AppData });
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.json')) {
        try {
          const filePath = `${APP_THEMES_FOLDER}/${entry.name}`;
          const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
          const data = JSON.parse(content);
          if (validateAppTheme(data)) {
            const theme = mergeAppThemeWithDefaults(data);
            themes.push({
              id: theme.id,
              name: theme.name,
              variant: theme.variant,
              isBuiltIn: false,
              filePath: entry.name,
            });
          }
        } catch (e) {
          console.warn(`Skipping invalid app theme file: ${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.debug('Custom app theme discovery not available:', error);
  }

  return themes;
}

/**
 * Load an app theme by ID
 */
export async function loadAppThemeById(id: string): Promise<AppThemeLoadResult> {
  // Check built-in themes
  const builtIn = getBuiltInAppTheme(id);
  if (builtIn) {
    return { success: true, theme: builtIn };
  }

  // Try custom themes
  try {
    const filePath = `${APP_THEMES_FOLDER}/${id}.json`;
    const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    const data = JSON.parse(content);
    if (validateAppTheme(data)) {
      return { success: true, theme: mergeAppThemeWithDefaults(data) };
    }
    return { success: false, error: 'Invalid theme format' };
  } catch {
    console.warn(`App theme "${id}" not found, using default`);
    return { success: true, theme: defaultAppDark };
  }
}

/**
 * Import an app theme from JSON content
 */
export async function importAppTheme(jsonContent: string): Promise<AppThemeLoadResult> {
  try {
    const data = JSON.parse(jsonContent);
    if (!validateAppTheme(data)) {
      return { success: false, error: 'Invalid app theme format' };
    }

    const theme = mergeAppThemeWithDefaults(data);
    const folderReady = await ensureAppThemesFolder();
    if (!folderReady) {
      return { success: false, error: 'Could not create themes folder' };
    }

    const filename = `${theme.id}.json`;
    const filePath = `${APP_THEMES_FOLDER}/${filename}`;
    await writeTextFile(filePath, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppData });

    return { success: true, theme };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    console.error('Failed to import app theme:', error);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// EDITOR THEME FUNCTIONS
// ============================================================================

/**
 * Get built-in editor theme by ID
 */
export function getBuiltInEditorTheme(id: string): EditorThemeDefinition | undefined {
  return BUILT_IN_EDITOR_THEMES.find(t => t.id === id);
}

/**
 * Get default editor theme for a variant
 */
export function getDefaultEditorTheme(variant: 'dark' | 'light'): EditorThemeDefinition {
  return variant === 'light' ? defaultEditorLight : defaultEditorDark;
}

/**
 * Validate a partial editor theme object
 */
export function validateEditorTheme(data: unknown): data is PartialEditorTheme {
  if (!data || typeof data !== 'object') return false;
  const theme = data as Record<string, unknown>;

  if (typeof theme.id !== 'string' || !theme.id) {
    console.error('Editor theme validation failed: id is required');
    return false;
  }
  if (typeof theme.name !== 'string' || !theme.name) {
    console.error('Editor theme validation failed: name is required');
    return false;
  }
  if (theme.variant !== 'dark' && theme.variant !== 'light') {
    console.error('Editor theme validation failed: variant must be "dark" or "light"');
    return false;
  }
  if (theme.colors !== undefined && typeof theme.colors !== 'object') {
    console.error('Editor theme validation failed: colors must be an object');
    return false;
  }
  if (theme.syntax !== undefined && typeof theme.syntax !== 'object') {
    console.error('Editor theme validation failed: syntax must be an object');
    return false;
  }

  return true;
}

/**
 * Merge a partial editor theme with default values
 */
export function mergeEditorThemeWithDefaults(partial: PartialEditorTheme): EditorThemeDefinition {
  const baseTheme = getDefaultEditorTheme(partial.variant);
  return {
    id: partial.id,
    name: partial.name,
    variant: partial.variant,
    colors: {
      ...baseTheme.colors,
      ...partial.colors,
    },
    syntax: {
      ...baseTheme.syntax,
      ...partial.syntax,
    },
  };
}

/**
 * Ensure editor themes folder exists
 */
async function ensureEditorThemesFolder(): Promise<boolean> {
  try {
    const folderExists = await exists(EDITOR_THEMES_FOLDER, { baseDir: BaseDirectory.AppData });
    if (!folderExists) {
      await mkdir(EDITOR_THEMES_FOLDER, { baseDir: BaseDirectory.AppData, recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Failed to create editor themes folder:', error);
    return false;
  }
}

/**
 * Discover all available editor themes
 */
export async function discoverEditorThemes(): Promise<EditorThemeMeta[]> {
  const themes: EditorThemeMeta[] = [];

  // Add built-in themes
  for (const theme of BUILT_IN_EDITOR_THEMES) {
    themes.push({
      id: theme.id,
      name: theme.name,
      variant: theme.variant,
      isBuiltIn: true,
    });
  }

  // Discover custom themes
  try {
    const folderReady = await ensureEditorThemesFolder();
    if (!folderReady) return themes;

    const entries = await readDir(EDITOR_THEMES_FOLDER, { baseDir: BaseDirectory.AppData });
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.json')) {
        try {
          const filePath = `${EDITOR_THEMES_FOLDER}/${entry.name}`;
          const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
          const data = JSON.parse(content);
          if (validateEditorTheme(data)) {
            const theme = mergeEditorThemeWithDefaults(data);
            themes.push({
              id: theme.id,
              name: theme.name,
              variant: theme.variant,
              isBuiltIn: false,
              filePath: entry.name,
            });
          }
        } catch (e) {
          console.warn(`Skipping invalid editor theme file: ${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.debug('Custom editor theme discovery not available:', error);
  }

  return themes;
}

/**
 * Load an editor theme by ID
 */
export async function loadEditorThemeById(id: string): Promise<EditorThemeLoadResult> {
  // Check built-in themes
  const builtIn = getBuiltInEditorTheme(id);
  if (builtIn) {
    return { success: true, theme: builtIn };
  }

  // Try custom themes
  try {
    const filePath = `${EDITOR_THEMES_FOLDER}/${id}.json`;
    const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    const data = JSON.parse(content);
    if (validateEditorTheme(data)) {
      return { success: true, theme: mergeEditorThemeWithDefaults(data) };
    }
    return { success: false, error: 'Invalid theme format' };
  } catch {
    console.warn(`Editor theme "${id}" not found, using default`);
    return { success: true, theme: defaultEditorDark };
  }
}

/**
 * Import an editor theme from JSON content
 */
export async function importEditorTheme(jsonContent: string): Promise<EditorThemeLoadResult> {
  try {
    const data = JSON.parse(jsonContent);
    if (!validateEditorTheme(data)) {
      return { success: false, error: 'Invalid editor theme format' };
    }

    const theme = mergeEditorThemeWithDefaults(data);
    const folderReady = await ensureEditorThemesFolder();
    if (!folderReady) {
      return { success: false, error: 'Could not create themes folder' };
    }

    const filename = `${theme.id}.json`;
    const filePath = `${EDITOR_THEMES_FOLDER}/${filename}`;
    await writeTextFile(filePath, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppData });

    return { success: true, theme };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    console.error('Failed to import editor theme:', error);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the appropriate theme variant based on system preference
 */
export function getSystemThemeVariant(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

/**
 * Resolve theme setting to actual theme variant
 */
export function resolveThemeSetting(setting: 'dark' | 'light' | 'system'): 'dark' | 'light' {
  if (setting === 'system') {
    return getSystemThemeVariant();
  }
  return setting;
}

// ============================================================================
// LEGACY FUNCTIONS (for backwards compatibility)
// ============================================================================

/**
 * Get theme by ID from built-in themes (legacy)
 */
export function getBuiltInTheme(id: string): ThemeDefinition | undefined {
  return BUILT_IN_THEMES.find(t => t.id === id);
}

/**
 * Get default theme for a variant (legacy)
 */
export function getDefaultTheme(variant: 'dark' | 'light'): ThemeDefinition {
  return variant === 'light' ? defaultLight : defaultDark;
}

/**
 * Apply a theme to the document (legacy - applies both app and editor colors)
 */
export function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement;

  // Apply color variables
  for (const [key, cssVar] of Object.entries(COLOR_TO_CSS_VAR)) {
    const value = theme.colors[key as keyof ThemeColors];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }

  // Apply syntax highlighting variables
  for (const [key, cssVar] of Object.entries(SYNTAX_TO_CSS_VAR)) {
    const value = theme.syntax[key as keyof SyntaxColors];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }

  root.setAttribute('data-theme', theme.variant);
  document.body.style.backgroundColor = theme.colors.bgTertiary;
  document.body.style.color = theme.colors.textPrimary;
}

/**
 * Validate a partial theme object (legacy)
 */
export function validateTheme(data: unknown): data is PartialTheme {
  if (!data || typeof data !== 'object') return false;
  const theme = data as Record<string, unknown>;

  if (typeof theme.id !== 'string' || !theme.id) return false;
  if (typeof theme.name !== 'string' || !theme.name) return false;
  if (theme.variant !== 'dark' && theme.variant !== 'light') return false;

  return true;
}

/**
 * Merge a partial theme with defaults (legacy)
 */
export function mergeWithDefaults(partial: PartialTheme): ThemeDefinition {
  const baseTheme = getDefaultTheme(partial.variant);
  return {
    id: partial.id,
    name: partial.name,
    variant: partial.variant,
    colors: {
      ...baseTheme.colors,
      ...partial.colors,
    },
    syntax: {
      ...baseTheme.syntax,
      ...partial.syntax,
    },
  };
}

/**
 * Discover all themes (legacy)
 */
export async function discoverThemes(): Promise<ThemeMeta[]> {
  const themes: ThemeMeta[] = [];

  for (const theme of BUILT_IN_THEMES) {
    themes.push({
      id: theme.id,
      name: theme.name,
      variant: theme.variant,
      isBuiltIn: true,
    });
  }

  try {
    const folderExists = await exists(THEMES_FOLDER, { baseDir: BaseDirectory.AppData });
    if (!folderExists) {
      await mkdir(THEMES_FOLDER, { baseDir: BaseDirectory.AppData, recursive: true });
    }

    const entries = await readDir(THEMES_FOLDER, { baseDir: BaseDirectory.AppData });
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.json')) {
        try {
          const filePath = `${THEMES_FOLDER}/${entry.name}`;
          const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
          const data = JSON.parse(content);
          if (validateTheme(data)) {
            const theme = mergeWithDefaults(data);
            themes.push({
              id: theme.id,
              name: theme.name,
              variant: theme.variant,
              isBuiltIn: false,
              filePath: entry.name,
            });
          }
        } catch (e) {
          console.warn(`Skipping invalid theme file: ${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.debug('Custom theme discovery not available:', error);
  }

  return themes;
}

/**
 * Load a theme by ID (legacy)
 */
export async function loadThemeById(id: string, customThemes?: ThemeMeta[]): Promise<ThemeLoadResult> {
  const builtIn = getBuiltInTheme(id);
  if (builtIn) {
    return { success: true, theme: builtIn };
  }

  const themes = customThemes || (await discoverThemes());
  const meta = themes.find(t => t.id === id);

  if (meta && meta.filePath) {
    try {
      const filePath = `${THEMES_FOLDER}/${meta.filePath}`;
      const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
      const data = JSON.parse(content);
      if (validateTheme(data)) {
        return { success: true, theme: mergeWithDefaults(data) };
      }
    } catch {
      // Fall through to default
    }
  }

  return { success: true, theme: defaultDark };
}

/**
 * Import a theme (legacy)
 */
export async function importTheme(jsonContent: string): Promise<ThemeLoadResult> {
  try {
    const data = JSON.parse(jsonContent);
    if (!validateTheme(data)) {
      return { success: false, error: 'Invalid theme format' };
    }

    const theme = mergeWithDefaults(data);
    const folderExists = await exists(THEMES_FOLDER, { baseDir: BaseDirectory.AppData });
    if (!folderExists) {
      await mkdir(THEMES_FOLDER, { baseDir: BaseDirectory.AppData, recursive: true });
    }

    const filename = `${theme.id}.json`;
    const filePath = `${THEMES_FOLDER}/${filename}`;
    await writeTextFile(filePath, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppData });

    return { success: true, theme };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
