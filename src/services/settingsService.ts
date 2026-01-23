import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';
import { invoke } from '@tauri-apps/api/core';

const SETTINGS_KEY = 'stackscribe_settings';

interface TauriAIConfig {
  ai_service_url: string | null;
  qdrant_url: string | null;
  configured: boolean;
}

class SettingsService {
  private settings: AppSettings;
  private listeners: Set<(settings: AppSettings) => void> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Initialize settings from Tauri backend config.
   * Should be called once during app startup.
   */
  async initializeFromTauri(): Promise<void> {
    if (this.initialized) return;

    try {
      const config = await invoke<TauriAIConfig>('get_ai_service_config');
      console.log('Tauri AI config:', config);

      // Only set serviceUrl from Tauri if user hasn't manually configured one
      if (config.ai_service_url && !this.settings.ai.serviceUrl) {
        this.settings.ai.serviceUrl = config.ai_service_url;
        this.saveSettings();
        this.notifyListeners();
        console.log('AI service URL set from environment:', config.ai_service_url);
      }

      this.initialized = true;
    } catch (error) {
      console.warn('Failed to get AI config from Tauri:', error);
      this.initialized = true;
    }
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

  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = {
      ...this.settings,
      ai: updates.ai ? { ...this.settings.ai, ...updates.ai } : this.settings.ai,
      editor: updates.editor ? { ...this.settings.editor, ...updates.editor } : this.settings.editor,
      appearance: updates.appearance ? { ...this.settings.appearance, ...updates.appearance } : this.settings.appearance,
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
    resetToDefaults: settingsService.resetToDefaults.bind(settingsService),
  };
}

// Need to import these for the hook
import { useState, useEffect } from 'react';
