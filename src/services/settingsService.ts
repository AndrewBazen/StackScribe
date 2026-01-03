import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_KEY = 'stackscribe_settings';

class SettingsService {
  private settings: AppSettings;
  private listeners: Set<(settings: AppSettings) => void> = new Set();

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to handle new settings
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private mergeWithDefaults(stored: Partial<AppSettings>): AppSettings {
    return {
      ai: { ...DEFAULT_SETTINGS.ai, ...stored.ai },
      editor: { ...DEFAULT_SETTINGS.editor, ...stored.editor },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...stored.appearance },
      sync: { ...DEFAULT_SETTINGS.sync, ...stored.sync },
    };
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  getAISettings() {
    return { ...this.settings.ai };
  }

  getEditorSettings() {
    return { ...this.settings.editor };
  }

  getAppearanceSettings() {
    return { ...this.settings.appearance };
  }

  getSyncSettings() {
    return { ...this.settings.sync };
  }

  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = {
      ...this.settings,
      ai: updates.ai ? { ...this.settings.ai, ...updates.ai } : this.settings.ai,
      editor: updates.editor ? { ...this.settings.editor, ...updates.editor } : this.settings.editor,
      appearance: updates.appearance ? { ...this.settings.appearance, ...updates.appearance } : this.settings.appearance,
      sync: updates.sync ? { ...this.settings.sync, ...updates.sync } : this.settings.sync,
    };
    this.saveSettings();
    this.notifyListeners();
  }

  updateAISettings(updates: Partial<AppSettings['ai']>): void {
    this.settings.ai = { ...this.settings.ai, ...updates };
    this.saveSettings();
    this.notifyListeners();
  }

  updateEditorSettings(updates: Partial<AppSettings['editor']>): void {
    this.settings.editor = { ...this.settings.editor, ...updates };
    this.saveSettings();
    this.notifyListeners();
  }

  updateAppearanceSettings(updates: Partial<AppSettings['appearance']>): void {
    this.settings.appearance = { ...this.settings.appearance, ...updates };
    this.saveSettings();
    this.notifyListeners();
  }

  updateSyncSettings(updates: Partial<AppSettings['sync']>): void {
    this.settings.sync = { ...this.settings.sync, ...updates };
    this.saveSettings();
    this.notifyListeners();
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.notifyListeners();
  }

  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const currentSettings = this.getSettings();
    this.listeners.forEach(listener => listener(currentSettings));
  }
}

// Singleton instance
export const settingsService = new SettingsService();

// Hook for React components
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());

  useEffect(() => {
    const unsubscribe = settingsService.subscribe(setSettings);
    return unsubscribe;
  }, []);

  return {
    settings,
    updateSettings: settingsService.updateSettings.bind(settingsService),
    updateAISettings: settingsService.updateAISettings.bind(settingsService),
    updateEditorSettings: settingsService.updateEditorSettings.bind(settingsService),
    updateAppearanceSettings: settingsService.updateAppearanceSettings.bind(settingsService),
    updateSyncSettings: settingsService.updateSyncSettings.bind(settingsService),
    resetToDefaults: settingsService.resetToDefaults.bind(settingsService),
  };
}

// Need to import these for the hook
import { useState, useEffect } from 'react';
