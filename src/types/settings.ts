export interface AppSettings {
  // AI Settings
  ai: {
    enabled: boolean;
    provider: 'local' | 'openai' | 'anthropic';
    // Local AI settings
    serviceUrl: string;
    model: string;
    // OpenAI settings
    openaiApiKey: string;
    openaiModel: string;
    // Anthropic settings
    anthropicApiKey: string;
    anthropicModel: string;
    // General
    autoSuggest: boolean;
    suggestDelay: number; // ms
  };

  // Editor Settings
  editor: {
    fontSize: number;
    lineHeight: number;
    wordWrap: boolean;
    autoSave: boolean;
    autoSaveInterval: number; // seconds
    showLineNumbers: boolean;
    tabSize: number;
  };

  // Appearance Settings
  appearance: {
    theme: 'dark' | 'light' | 'system';
    customAppThemeId: string | null;
    customEditorThemeId: string | null;
    accentColor: string;
    sidebarWidth: number;
    showPreviewPanel: boolean;
  };

  // Sync Settings
  sync: {
    azureEnabled: boolean;
    syncInterval: number; // minutes
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    enabled: true,
    provider: 'local',
    serviceUrl: 'http://localhost:8000',
    model: 'llama31-8b-instruct-q4k-4k',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    anthropicApiKey: '',
    anthropicModel: 'claude-sonnet-4-20250514',
    autoSuggest: true,
    suggestDelay: 1000,
  },
  editor: {
    fontSize: 14,
    lineHeight: 1.5,
    wordWrap: true,
    autoSave: true,
    autoSaveInterval: 30,
    showLineNumbers: true,
    tabSize: 2,
  },
  appearance: {
    theme: 'dark',
    customAppThemeId: null,
    customEditorThemeId: null,
    accentColor: '',  // Empty means use theme's default accent
    sidebarWidth: 250,
    showPreviewPanel: true,
  },
  sync: {
    azureEnabled: false,
    syncInterval: 5,
  },
};

export const ACCENT_COLORS = [
  { name: 'Blue', value: '#007acc' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
];

export const LOCAL_AI_MODELS = [
  { id: 'llama31-8b-instruct-q4k-4k', name: 'Llama 3.1 8B (Fast)' },
  { id: 'llama31-70b-instruct', name: 'Llama 3.1 70B (Quality)' },
  { id: 'mistral-7b-instruct', name: 'Mistral 7B' },
  { id: 'codellama-13b', name: 'CodeLlama 13B' },
];

export const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (Best)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Economy)' },
];

export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Recommended)' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4 (Most Capable)' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
];
