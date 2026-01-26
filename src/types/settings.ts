export interface AppSettings {
  // AI Settings
  ai: {
    enabled: boolean;
    provider: "local" | "openai" | "anthropic";
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
    theme: "dark" | "light" | "system";
    customAppThemeId: string | null;
    customEditorThemeId: string | null;
    accentColor: string;
    sidebarWidth: number;
    showPreviewPanel: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    enabled: true,
    provider: "local",
    serviceUrl: "", // Initialized from Tauri backend config
    model: "auto",
    openaiApiKey: "",
    openaiModel: "gpt-4o-mini",
    anthropicApiKey: "",
    anthropicModel: "claude-sonnet-4-20250514",
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
    theme: "dark",
    customAppThemeId: null,
    customEditorThemeId: null,
    accentColor: "", // Empty means use theme's default accent
    sidebarWidth: 250,
    showPreviewPanel: true,
  },
};

export const ACCENT_COLORS = [
  { name: "Blue", value: "#007acc" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Green", value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
];

export const LOCAL_AI_MODELS = [
  // Auto - let the AI service decide
  { id: "auto", name: "Auto (Service Default)" },
  // CPU/4GB VRAM compatible (recommended)
  { id: "phi3:mini", name: "Phi-3 Mini (Fast, CPU friendly)" },
  { id: "gemma2:2b", name: "Gemma 2 2B (Compact)" },
  { id: "llama3.2:3b", name: "Llama 3.2 3B (4GB VRAM)" },
  { id: "qwen2.5:3b", name: "Qwen 2.5 3B (Good quality)" },
  // Larger models (8GB+ VRAM)
  { id: "llama3.1:8b", name: "Llama 3.1 8B (8GB+ VRAM)" },
  { id: "mistral:7b-instruct", name: "Mistral 7B (8GB+ VRAM)" },
];

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o (Best)" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast)" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Economy)" },
];

export const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 (Recommended)" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4 (Most Capable)" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku (Fast)" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
];
