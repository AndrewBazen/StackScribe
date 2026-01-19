import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import * as Slider from "@radix-ui/react-slider";
import { Cross2Icon, ChevronDownIcon, CheckIcon, EyeOpenIcon, EyeClosedIcon, PlusIcon, UploadIcon } from "@radix-ui/react-icons";
import "../../styles/Preferences.css";
import "../../styles/ThemePreview.css";
import { settingsService } from "../../services/settingsService";
import { AppSettings, ACCENT_COLORS, LOCAL_AI_MODELS, OPENAI_MODELS, ANTHROPIC_MODELS, DEFAULT_SETTINGS } from "../../types/settings";
import { useTheme } from "../../themes/themeContext";
import {
  importAppTheme,
  importEditorTheme,
  loadAppThemeById,
  loadEditorThemeById,
  BUILT_IN_APP_THEMES,
  BUILT_IN_EDITOR_THEMES,
} from "../../themes/themeUtils";
import type { AppThemeDefinition, EditorThemeDefinition } from "../../themes/types";
import AppThemePreview from "../ui/AppThemePreview";
import EditorThemePreview from "../ui/EditorThemePreview";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

interface PreferencesProps {
  onClose: () => void;
}

export default function Preferences({ onClose }: PreferencesProps) {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [showApiKey, setShowApiKey] = useState(false);
  const {
    appTheme,
    editorTheme,
    appThemeSetting,
    setAppThemeSetting,
    setCustomAppTheme,
    setCustomEditorTheme,
    availableAppThemes,
    availableEditorThemes,
    refreshAppThemes,
    refreshEditorThemes,
  } = useTheme();

  // App theme management state
  const [allAppThemes, setAllAppThemes] = useState<AppThemeDefinition[]>([...BUILT_IN_APP_THEMES]);
  const [selectedAppThemeId, setSelectedAppThemeId] = useState<string>(appTheme.id);
  const [appThemeImportError, setAppThemeImportError] = useState<string | null>(null);
  const [isImportingAppTheme, setIsImportingAppTheme] = useState(false);

  // Editor theme management state
  const [allEditorThemes, setAllEditorThemes] = useState<EditorThemeDefinition[]>([...BUILT_IN_EDITOR_THEMES]);
  const [selectedEditorThemeId, setSelectedEditorThemeId] = useState<string>(editorTheme.id);
  const [editorThemeImportError, setEditorThemeImportError] = useState<string | null>(null);
  const [isImportingEditorTheme, setIsImportingEditorTheme] = useState(false);

  // Load all app themes on mount
  useEffect(() => {
    const loadAllAppThemes = async () => {
      const themes: AppThemeDefinition[] = [...BUILT_IN_APP_THEMES];

      for (const meta of availableAppThemes) {
        if (!meta.isBuiltIn) {
          const result = await loadAppThemeById(meta.id);
          if (result.success && result.theme) {
            themes.push(result.theme);
          }
        }
      }

      setAllAppThemes(themes);
    };

    loadAllAppThemes();
  }, [availableAppThemes]);

  // Load all editor themes on mount
  useEffect(() => {
    const loadAllEditorThemes = async () => {
      const themes: EditorThemeDefinition[] = [...BUILT_IN_EDITOR_THEMES];

      for (const meta of availableEditorThemes) {
        if (!meta.isBuiltIn) {
          const result = await loadEditorThemeById(meta.id);
          if (result.success && result.theme) {
            themes.push(result.theme);
          }
        }
      }

      setAllEditorThemes(themes);
    };

    loadAllEditorThemes();
  }, [availableEditorThemes]);

  // Update selected themes when current themes change
  useEffect(() => {
    setSelectedAppThemeId(appTheme.id);
  }, [appTheme.id]);

  useEffect(() => {
    setSelectedEditorThemeId(editorTheme.id);
  }, [editorTheme.id]);

  useEffect(() => {
    checkAIConnection();
  }, [settings.ai.serviceUrl]);

  const checkAIConnection = async () => {
    setAiStatus('checking');
    try {
      const response = await fetch(`${settings.ai.serviceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        setAiStatus('connected');
      } else {
        setAiStatus('error');
      }
    } catch {
      setAiStatus('error');
    }
  };

  const handleSave = () => {
    settingsService.updateSettings(settings);
    onClose();
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
  };

  const updateAI = (updates: Partial<AppSettings['ai']>) => {
    setSettings(prev => ({ ...prev, ai: { ...prev.ai, ...updates } }));
  };

  const updateEditor = (updates: Partial<AppSettings['editor']>) => {
    setSettings(prev => ({ ...prev, editor: { ...prev.editor, ...updates } }));
  };

  const updateAppearance = (updates: Partial<AppSettings['appearance']>) => {
    setSettings(prev => ({ ...prev, appearance: { ...prev.appearance, ...updates } }));
    if (updates.theme) {
      setAppThemeSetting(updates.theme);
    }
    // Immediately apply and persist accent color changes
    if (updates.accentColor) {
      // Apply CSS variables directly
      const color = updates.accentColor;
      const num = parseInt(color.replace('#', ''), 16);
      const r = Math.max(0, (num >> 16) - Math.round(255 * 0.15));
      const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * 0.15));
      const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * 0.15));
      const hoverColor = `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
      document.documentElement.style.setProperty('--color-accent-primary', color);
      document.documentElement.style.setProperty('--color-accent-primary-hover', hoverColor);
      // Persist to settings
      settingsService.updateAppearanceSettings({ accentColor: color });
    }
  };

  const updateSync = (updates: Partial<AppSettings['sync']>) => {
    setSettings(prev => ({ ...prev, sync: { ...prev.sync, ...updates } }));
  };

  // Handle app theme selection
  const handleAppThemeSelect = async (themeId: string) => {
    setSelectedAppThemeId(themeId);
    setAppThemeImportError(null);

    // Find the selected theme to get its accent color
    const selectedTheme = allAppThemes.find(t => t.id === themeId);
    const themeAccentColor = selectedTheme?.colors.accentPrimary;

    // Update local settings state - reset accent color to theme's default
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        customAppThemeId: themeId,
        accentColor: themeAccentColor || prev.appearance.accentColor
      }
    }));

    // Apply the theme's accent color and persist it
    if (themeAccentColor) {
      const num = parseInt(themeAccentColor.replace('#', ''), 16);
      const r = Math.max(0, (num >> 16) - Math.round(255 * 0.15));
      const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * 0.15));
      const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * 0.15));
      const hoverColor = `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
      document.documentElement.style.setProperty('--color-accent-primary', themeAccentColor);
      document.documentElement.style.setProperty('--color-accent-primary-hover', hoverColor);
      settingsService.updateAppearanceSettings({ accentColor: themeAccentColor });
    }

    await setCustomAppTheme(themeId);
  };

  // Handle editor theme selection
  const handleEditorThemeSelect = async (themeId: string) => {
    setSelectedEditorThemeId(themeId);
    setEditorThemeImportError(null);
    // Update local settings state so Save doesn't overwrite
    setSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, customEditorThemeId: themeId }
    }));
    await setCustomEditorTheme(themeId);
  };

  // Handle app theme import
  const handleImportAppTheme = async () => {
    setAppThemeImportError(null);
    setIsImportingAppTheme(true);

    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: 'App Theme', extensions: ['json'] }],
        title: 'Import App Theme',
      });

      if (!filePath) {
        setIsImportingAppTheme(false);
        return;
      }

      const content = await readTextFile(filePath as string);
      const result = await importAppTheme(content);

      if (result.success && result.theme) {
        await refreshAppThemes();
        setAllAppThemes(prev => {
          const exists = prev.some(t => t.id === result.theme!.id);
          if (exists) {
            return prev.map(t => t.id === result.theme!.id ? result.theme! : t);
          }
          return [...prev, result.theme!];
        });
        setSelectedAppThemeId(result.theme.id);

        // Get the theme's accent color
        const themeAccentColor = result.theme.colors.accentPrimary;

        // Update local settings state - reset accent color to theme's default
        setSettings(prev => ({
          ...prev,
          appearance: {
            ...prev.appearance,
            customAppThemeId: result.theme!.id,
            accentColor: themeAccentColor
          }
        }));

        // Apply the theme's accent color and persist it
        if (themeAccentColor) {
          const num = parseInt(themeAccentColor.replace('#', ''), 16);
          const r = Math.max(0, (num >> 16) - Math.round(255 * 0.15));
          const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * 0.15));
          const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * 0.15));
          const hoverColor = `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
          document.documentElement.style.setProperty('--color-accent-primary', themeAccentColor);
          document.documentElement.style.setProperty('--color-accent-primary-hover', hoverColor);
          settingsService.updateAppearanceSettings({ accentColor: themeAccentColor });
        }

        await setCustomAppTheme(result.theme.id);
      } else {
        setAppThemeImportError(result.error || 'Failed to import theme');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setAppThemeImportError(errorMsg);
      console.error('Failed to import app theme:', error);
    } finally {
      setIsImportingAppTheme(false);
    }
  };

  // Handle editor theme import
  const handleImportEditorTheme = async () => {
    setEditorThemeImportError(null);
    setIsImportingEditorTheme(true);

    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: 'Editor Theme', extensions: ['json'] }],
        title: 'Import Editor Theme',
      });

      if (!filePath) {
        setIsImportingEditorTheme(false);
        return;
      }

      const content = await readTextFile(filePath as string);
      const result = await importEditorTheme(content);

      if (result.success && result.theme) {
        await refreshEditorThemes();
        setAllEditorThemes(prev => {
          const exists = prev.some(t => t.id === result.theme!.id);
          if (exists) {
            return prev.map(t => t.id === result.theme!.id ? result.theme! : t);
          }
          return [...prev, result.theme!];
        });
        setSelectedEditorThemeId(result.theme.id);
        // Update local settings state so Save doesn't overwrite
        setSettings(prev => ({
          ...prev,
          appearance: { ...prev.appearance, customEditorThemeId: result.theme!.id }
        }));
        await setCustomEditorTheme(result.theme.id);
      } else {
        setEditorThemeImportError(result.error || 'Failed to import theme');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setEditorThemeImportError(errorMsg);
      console.error('Failed to import editor theme:', error);
    } finally {
      setIsImportingEditorTheme(false);
    }
  };

  return (
    <>
      <div className="preferences-overlay" onClick={onClose} />
      <div className="preferences-menu">
        <div className="preferences-header">
          <h2>Preferences</h2>
          <button className="preferences-close" onClick={onClose}>
            <Cross2Icon />
          </button>
        </div>

        <Tabs.Root className="tabs-root" defaultValue="ai">
          <Tabs.List className="tabs-list">
            <Tabs.Trigger className="tabs-trigger" value="ai">AI</Tabs.Trigger>
            <Tabs.Trigger className="tabs-trigger" value="editor">Editor</Tabs.Trigger>
            <Tabs.Trigger className="tabs-trigger" value="appearance">Appearance</Tabs.Trigger>
            <Tabs.Trigger className="tabs-trigger" value="sync">Sync</Tabs.Trigger>
          </Tabs.List>

          {/* AI Settings Tab */}
          <Tabs.Content className="tabs-content" value="ai">
            <div className="settings-section">
              <div className="settings-section-title">AI Service</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Enable AI Features</div>
                  <div className="setting-description">Use AI for suggestions and chat</div>
                </div>
                <div className="setting-control">
                  <Switch.Root
                    className="switch-root"
                    checked={settings.ai.enabled}
                    onCheckedChange={(checked) => updateAI({ enabled: checked })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">AI Provider</div>
                  <div className="setting-description">Choose between local or cloud AI</div>
                </div>
                <div className="setting-control">
                  <Select.Root
                    value={settings.ai.provider}
                    onValueChange={(value: 'local' | 'openai' | 'anthropic') => updateAI({ provider: value })}
                  >
                    <Select.Trigger className="select-trigger">
                      <Select.Value />
                      <Select.Icon className="select-icon">
                        <ChevronDownIcon />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="select-content" position="popper" sideOffset={4}>
                        <Select.Viewport className="select-viewport">
                          <Select.Item value="local" className="select-item">
                            <Select.ItemText>Local (Ollama)</Select.ItemText>
                          </Select.Item>
                          <Select.Item value="openai" className="select-item">
                            <Select.ItemText>OpenAI</Select.ItemText>
                          </Select.Item>
                          <Select.Item value="anthropic" className="select-item">
                            <Select.ItemText>Anthropic (Claude)</Select.ItemText>
                          </Select.Item>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>
            </div>

            {/* Local AI Settings */}
            {settings.ai.provider === 'local' && (
              <div className="settings-section">
                <div className="settings-section-title">Local AI (Ollama)</div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Service URL</div>
                    <div className="setting-description">AI service endpoint</div>
                  </div>
                  <div className="setting-control">
                    <input
                      type="text"
                      className="setting-input"
                      value={settings.ai.serviceUrl}
                      onChange={(e) => updateAI({ serviceUrl: e.target.value })}
                      placeholder="http://localhost:8000"
                    />
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Connection Status</div>
                  </div>
                  <div className="setting-control">
                    <div className={`status-indicator ${aiStatus}`}>
                      {aiStatus === 'checking' && 'Checking...'}
                      {aiStatus === 'connected' && 'Connected'}
                      {aiStatus === 'error' && 'Not Connected'}
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Model</div>
                    <div className="setting-description">Local LLM model</div>
                  </div>
                  <div className="setting-control">
                    <Select.Root
                      value={settings.ai.model}
                      onValueChange={(value) => updateAI({ model: value })}
                    >
                      <Select.Trigger className="select-trigger">
                        <Select.Value />
                        <Select.Icon className="select-icon">
                          <ChevronDownIcon />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="select-content" position="popper" sideOffset={4}>
                          <Select.Viewport className="select-viewport">
                            {LOCAL_AI_MODELS.map((model) => (
                              <Select.Item key={model.id} value={model.id} className="select-item">
                                <Select.ItemText>{model.name}</Select.ItemText>
                                <Select.ItemIndicator>
                                  <CheckIcon />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>
              </div>
            )}

            {/* OpenAI Settings */}
            {settings.ai.provider === 'openai' && (
              <div className="settings-section">
                <div className="settings-section-title">OpenAI</div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">API Key</div>
                    <div className="setting-description">Your OpenAI API key</div>
                  </div>
                  <div className="setting-control">
                    <div className="api-key-input-container">
                      <input
                        type={showApiKey ? "text" : "password"}
                        className="setting-input api-key-input"
                        value={settings.ai.openaiApiKey}
                        onChange={(e) => updateAI({ openaiApiKey: e.target.value })}
                        placeholder="sk-..."
                      />
                      <button
                        type="button"
                        className="api-key-toggle"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Status</div>
                  </div>
                  <div className="setting-control">
                    <div className={`status-indicator ${settings.ai.openaiApiKey ? 'success' : 'warning'}`}>
                      {settings.ai.openaiApiKey ? 'API Key Set' : 'No API Key'}
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Model</div>
                    <div className="setting-description">OpenAI model to use</div>
                  </div>
                  <div className="setting-control">
                    <Select.Root
                      value={settings.ai.openaiModel}
                      onValueChange={(value) => updateAI({ openaiModel: value })}
                    >
                      <Select.Trigger className="select-trigger">
                        <Select.Value />
                        <Select.Icon className="select-icon">
                          <ChevronDownIcon />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="select-content" position="popper" sideOffset={4}>
                          <Select.Viewport className="select-viewport">
                            {OPENAI_MODELS.map((model) => (
                              <Select.Item key={model.id} value={model.id} className="select-item">
                                <Select.ItemText>{model.name}</Select.ItemText>
                                <Select.ItemIndicator>
                                  <CheckIcon />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>
              </div>
            )}

            {/* Anthropic Settings */}
            {settings.ai.provider === 'anthropic' && (
              <div className="settings-section">
                <div className="settings-section-title">Anthropic (Claude)</div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">API Key</div>
                    <div className="setting-description">Your Anthropic API key</div>
                  </div>
                  <div className="setting-control">
                    <div className="api-key-input-container">
                      <input
                        type={showApiKey ? "text" : "password"}
                        className="setting-input api-key-input"
                        value={settings.ai.anthropicApiKey}
                        onChange={(e) => updateAI({ anthropicApiKey: e.target.value })}
                        placeholder="sk-ant-..."
                      />
                      <button
                        type="button"
                        className="api-key-toggle"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Status</div>
                  </div>
                  <div className="setting-control">
                    <div className={`status-indicator ${settings.ai.anthropicApiKey ? 'success' : 'warning'}`}>
                      {settings.ai.anthropicApiKey ? 'API Key Set' : 'No API Key'}
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Model</div>
                    <div className="setting-description">Claude model to use</div>
                  </div>
                  <div className="setting-control">
                    <Select.Root
                      value={settings.ai.anthropicModel}
                      onValueChange={(value) => updateAI({ anthropicModel: value })}
                    >
                      <Select.Trigger className="select-trigger">
                        <Select.Value />
                        <Select.Icon className="select-icon">
                          <ChevronDownIcon />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="select-content" position="popper" sideOffset={4}>
                          <Select.Viewport className="select-viewport">
                            {ANTHROPIC_MODELS.map((model) => (
                              <Select.Item key={model.id} value={model.id} className="select-item">
                                <Select.ItemText>{model.name}</Select.ItemText>
                                <Select.ItemIndicator>
                                  <CheckIcon />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>
              </div>
            )}

            <div className="settings-section">
              <div className="settings-section-title">Auto Suggestions</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Auto-suggest Links</div>
                  <div className="setting-description">Automatically suggest related entries</div>
                </div>
                <div className="setting-control">
                  <Switch.Root
                    className="switch-root"
                    checked={settings.ai.autoSuggest}
                    onCheckedChange={(checked) => updateAI({ autoSuggest: checked })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Suggestion Delay</div>
                  <div className="setting-description">Wait time before suggesting (ms)</div>
                </div>
                <div className="setting-control">
                  <div className="slider-container">
                    <Slider.Root
                      className="slider-root"
                      value={[settings.ai.suggestDelay]}
                      onValueChange={([value]) => updateAI({ suggestDelay: value })}
                      min={500}
                      max={3000}
                      step={100}
                    >
                      <Slider.Track className="slider-track">
                        <Slider.Range className="slider-range" />
                      </Slider.Track>
                      <Slider.Thumb className="slider-thumb" />
                    </Slider.Root>
                    <span className="slider-value">{settings.ai.suggestDelay}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Editor Settings Tab */}
          <Tabs.Content className="tabs-content" value="editor">
            <div className="settings-section">
              <div className="settings-section-title">Text</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Font Size</div>
                </div>
                <div className="setting-control">
                  <div className="slider-container">
                    <Slider.Root
                      className="slider-root"
                      value={[settings.editor.fontSize]}
                      onValueChange={([value]) => updateEditor({ fontSize: value })}
                      min={10}
                      max={24}
                      step={1}
                    >
                      <Slider.Track className="slider-track">
                        <Slider.Range className="slider-range" />
                      </Slider.Track>
                      <Slider.Thumb className="slider-thumb" />
                    </Slider.Root>
                    <span className="slider-value">{settings.editor.fontSize}px</span>
                  </div>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Line Height</div>
                </div>
                <div className="setting-control">
                  <div className="slider-container">
                    <Slider.Root
                      className="slider-root"
                      value={[settings.editor.lineHeight * 10]}
                      onValueChange={([value]) => updateEditor({ lineHeight: value / 10 })}
                      min={10}
                      max={25}
                      step={1}
                    >
                      <Slider.Track className="slider-track">
                        <Slider.Range className="slider-range" />
                      </Slider.Track>
                      <Slider.Thumb className="slider-thumb" />
                    </Slider.Root>
                    <span className="slider-value">{settings.editor.lineHeight.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Tab Size</div>
                </div>
                <div className="setting-control">
                  <Select.Root
                    value={String(settings.editor.tabSize)}
                    onValueChange={(value) => updateEditor({ tabSize: Number(value) })}
                  >
                    <Select.Trigger className="select-trigger" style={{ minWidth: '80px' }}>
                      <Select.Value />
                      <Select.Icon className="select-icon">
                        <ChevronDownIcon />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="select-content" position="popper" sideOffset={4}>
                        <Select.Viewport className="select-viewport">
                          {[2, 4, 8].map((size) => (
                            <Select.Item key={size} value={String(size)} className="select-item">
                              <Select.ItemText>{size} spaces</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Behavior</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Word Wrap</div>
                  <div className="setting-description">Wrap long lines</div>
                </div>
                <div className="setting-control">
                  <Switch.Root
                    className="switch-root"
                    checked={settings.editor.wordWrap}
                    onCheckedChange={(checked) => updateEditor({ wordWrap: checked })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Show Line Numbers</div>
                </div>
                <div className="setting-control">
                  <Switch.Root
                    className="switch-root"
                    checked={settings.editor.showLineNumbers}
                    onCheckedChange={(checked) => updateEditor({ showLineNumbers: checked })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Auto Save</div>
                  <div className="setting-description">Automatically save changes</div>
                </div>
                <div className="setting-control">
                  <Switch.Root
                    className="switch-root"
                    checked={settings.editor.autoSave}
                    onCheckedChange={(checked) => updateEditor({ autoSave: checked })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              </div>

              {settings.editor.autoSave && (
                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Auto Save Interval</div>
                  </div>
                  <div className="setting-control">
                    <div className="slider-container">
                      <Slider.Root
                        className="slider-root"
                        value={[settings.editor.autoSaveInterval]}
                        onValueChange={([value]) => updateEditor({ autoSaveInterval: value })}
                        min={10}
                        max={120}
                        step={5}
                      >
                        <Slider.Track className="slider-track">
                          <Slider.Range className="slider-range" />
                        </Slider.Track>
                        <Slider.Thumb className="slider-thumb" />
                      </Slider.Root>
                      <span className="slider-value">{settings.editor.autoSaveInterval}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Appearance Settings Tab */}
          <Tabs.Content className="tabs-content" value="appearance">
            <div className="settings-section">
              <div className="settings-section-title">Base Theme</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Theme Mode</div>
                  <div className="setting-description">Choose dark, light, or follow system</div>
                </div>
                <div className="setting-control">
                  <Select.Root
                    value={settings.appearance.theme}
                    onValueChange={(value: 'dark' | 'light' | 'system') => updateAppearance({ theme: value })}
                  >
                    <Select.Trigger className="select-trigger">
                      <Select.Value />
                      <Select.Icon className="select-icon">
                        <ChevronDownIcon />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="select-content" position="popper" sideOffset={4}>
                        <Select.Viewport className="select-viewport">
                          <Select.Item value="dark" className="select-item">
                            <Select.ItemText>Dark</Select.ItemText>
                          </Select.Item>
                          <Select.Item value="light" className="select-item">
                            <Select.ItemText>Light</Select.ItemText>
                          </Select.Item>
                          <Select.Item value="system" className="select-item">
                            <Select.ItemText>System</Select.ItemText>
                          </Select.Item>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>
            </div>

            {/* App Theme Section */}
            <div className="settings-section">
              <div className="settings-section-title">
                App Theme
                <button
                  className="btn btn-secondary"
                  onClick={handleImportAppTheme}
                  disabled={isImportingAppTheme}
                  style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '11px' }}
                >
                  <UploadIcon style={{ marginRight: '4px' }} />
                  {isImportingAppTheme ? 'Importing...' : 'Import'}
                </button>
              </div>
              <div className="setting-description" style={{ marginBottom: '12px', marginTop: '-8px' }}>
                Controls sidebar, tabs, dialogs, and buttons
              </div>

              {appThemeImportError && (
                <div className="theme-error">
                  {appThemeImportError}
                </div>
              )}

              <div className="theme-grid">
                {allAppThemes.map((t) => (
                  <AppThemePreview
                    key={t.id}
                    theme={t}
                    isSelected={selectedAppThemeId === t.id}
                    onClick={() => handleAppThemeSelect(t.id)}
                  />
                ))}

                <button
                  className="theme-import-btn"
                  onClick={handleImportAppTheme}
                  disabled={isImportingAppTheme}
                >
                  <PlusIcon />
                  <span>Import Theme</span>
                </button>
              </div>
            </div>

            {/* Editor Theme Section */}
            <div className="settings-section">
              <div className="settings-section-title">
                Editor Theme
                <button
                  className="btn btn-secondary"
                  onClick={handleImportEditorTheme}
                  disabled={isImportingEditorTheme}
                  style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '11px' }}
                >
                  <UploadIcon style={{ marginRight: '4px' }} />
                  {isImportingEditorTheme ? 'Importing...' : 'Import'}
                </button>
              </div>
              <div className="setting-description" style={{ marginBottom: '12px', marginTop: '-8px' }}>
                Controls syntax highlighting and editor colors
              </div>

              {editorThemeImportError && (
                <div className="theme-error">
                  {editorThemeImportError}
                </div>
              )}

              <div className="theme-grid">
                {allEditorThemes.map((t) => (
                  <EditorThemePreview
                    key={t.id}
                    theme={t}
                    isSelected={selectedEditorThemeId === t.id}
                    onClick={() => handleEditorThemeSelect(t.id)}
                  />
                ))}

                <button
                  className="theme-import-btn"
                  onClick={handleImportEditorTheme}
                  disabled={isImportingEditorTheme}
                >
                  <PlusIcon />
                  <span>Import Theme</span>
                </button>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Accent Color</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Choose Accent</div>
                  <div className="setting-description">Highlight color for buttons and links</div>
                </div>
                <div className="setting-control">
                  <div className="color-picker-container">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className={`color-swatch ${settings.appearance.accentColor === color.value ? 'selected' : ''}`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => updateAppearance({ accentColor: color.value })}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Layout</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Show Preview Panel</div>
                  <div className="setting-description">Display markdown preview</div>
                </div>
                <div className="setting-control">
                  <Switch.Root
                    className="switch-root"
                    checked={settings.appearance.showPreviewPanel}
                    onCheckedChange={(checked) => updateAppearance({ showPreviewPanel: checked })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Sidebar Width</div>
                </div>
                <div className="setting-control">
                  <div className="slider-container">
                    <Slider.Root
                      className="slider-root"
                      value={[settings.appearance.sidebarWidth]}
                      onValueChange={([value]) => updateAppearance({ sidebarWidth: value })}
                      min={180}
                      max={400}
                      step={10}
                    >
                      <Slider.Track className="slider-track">
                        <Slider.Range className="slider-range" />
                      </Slider.Track>
                      <Slider.Thumb className="slider-thumb" />
                    </Slider.Root>
                    <span className="slider-value">{settings.appearance.sidebarWidth}px</span>
                  </div>
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Sync Settings Tab */}
          <Tabs.Content className="tabs-content" value="sync">
            <div className="settings-section">
              <div className="settings-section-title">Cloud Sync</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Enable Azure Sync</div>
                  <div className="setting-description">Sync data with Azure cloud</div>
                </div>
                <div className="setting-control">
                  <Switch.Root
                    className="switch-root"
                    checked={settings.sync.azureEnabled}
                    onCheckedChange={(checked) => updateSync({ azureEnabled: checked })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              </div>

              {settings.sync.azureEnabled && (
                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Sync Interval</div>
                    <div className="setting-description">How often to sync (minutes)</div>
                  </div>
                  <div className="setting-control">
                    <div className="slider-container">
                      <Slider.Root
                        className="slider-root"
                        value={[settings.sync.syncInterval]}
                        onValueChange={([value]) => updateSync({ syncInterval: value })}
                        min={1}
                        max={30}
                        step={1}
                      >
                        <Slider.Track className="slider-track">
                          <Slider.Range className="slider-range" />
                        </Slider.Track>
                        <Slider.Thumb className="slider-thumb" />
                      </Slider.Root>
                      <span className="slider-value">{settings.sync.syncInterval}m</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>

        <div className="preferences-footer">
          <button className="btn btn-primary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </>
  );
}
