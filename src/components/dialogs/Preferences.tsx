import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import * as Slider from "@radix-ui/react-slider";
import { Cross2Icon, ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons";
import "../../styles/Preferences.css";
import { settingsService } from "../../services/settingsService";
import { AppSettings, ACCENT_COLORS, LOCAL_AI_MODELS, OPENAI_MODELS, ANTHROPIC_MODELS, DEFAULT_SETTINGS } from "../../types/settings";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";

interface PreferencesProps {
  onClose: () => void;
}

export default function Preferences({ onClose }: PreferencesProps) {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [showApiKey, setShowApiKey] = useState(false);

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
  };

  const updateSync = (updates: Partial<AppSettings['sync']>) => {
    setSettings(prev => ({ ...prev, sync: { ...prev.sync, ...updates } }));
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
                      {aiStatus === 'connected' && '● Connected'}
                      {aiStatus === 'error' && '● Not Connected'}
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
                      {settings.ai.openaiApiKey ? '● API Key Set' : '● No API Key'}
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
                      {settings.ai.anthropicApiKey ? '● API Key Set' : '● No API Key'}
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

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Get API Key</div>
                    <div className="setting-description">Sign up at console.anthropic.com</div>
                  </div>
                  <div className="setting-control">
                    <a
                      href="https://console.anthropic.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none', fontSize: '12px', padding: '6px 12px' }}
                    >
                      Get API Key →
                    </a>
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
              <div className="settings-section-title">Theme</div>

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Color Theme</div>
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

              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Accent Color</div>
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
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
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
