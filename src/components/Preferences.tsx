import { useState } from "react";
import { Tabs, Switch, Select, Label, ScrollArea } from "radix-ui";
import "../Styles/Preferences.css";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";


interface PreferenceProps {
    themes: {
        [key: string]: string;
    };
    plugins: {
        [key: string]: string;
    };
    onApply: (themes: { [key: string]: string }, plugins: { [key: string]: string }) => void;
    onClose: () => void;
    onTogglePreview: (preview: boolean) => void;
    onTogglePlugin: (plugin: string, checked: boolean) => void;
    onSelectTheme: (theme: string) => void;
    onToggleAzureSync: (checked: boolean) => void;
}


export default function Preferences(props: PreferenceProps) {
    const { themes, plugins, onApply, onClose, onTogglePreview, onTogglePlugin, onSelectTheme, onToggleAzureSync } = props;
    const [isOpen, setIsOpen] = useState(true);
    const handleSelectTheme = (value: string) => {
        onSelectTheme(value);
    }

    const handleTogglePreview = (checked: boolean) => {
        onTogglePreview(checked);
    }

    const handleTogglePlugin = (plugin: string, checked: boolean) => {
        onTogglePlugin(plugin, checked);
    }

    const handleApply = () => {
        onApply(themes, plugins);
        onClose();
    }

    return (
        <div className="preferences-menu" style={{ display: isOpen ? "block" : "none" }}>
            <Tabs.Root className="tabs-root" defaultValue="tab1" onValueChange={() => setIsOpen(true)}>
                <Tabs.List className="tabs-list" aria-label="Adjust your apps general settings">
                    <Tabs.Trigger className="tabs-trigger" value="tab1">
                        General
                    </Tabs.Trigger>
                    <Tabs.Trigger className="tabs-trigger" value="tab2">
                        Appearance
                    </Tabs.Trigger>
                    <Tabs.Trigger className="tabs-trigger" value="tab3">
                        Plugins
                    </Tabs.Trigger>
                    <Tabs.Trigger className="tabs-trigger" value="tab4">
                        Advanced
                    </Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content className="tabs-content" value="tab1">
                    <form className="tab-form">
                        <ScrollArea.Root className="scroll-area-root" style={{ height: "100px" }}>
                            <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: "10px" }}>
                            </div>
                        </ScrollArea.Root>
                    </form>
                </Tabs.Content>
                <Tabs.Content className="tabs-content" value="tab2">
                    <form className="tab-form">
                        <ScrollArea.Root className="scroll-area-root" style={{ height: "100px" }}>
                            <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: "10px" }}>
                            <Select.Root onValueChange={handleSelectTheme}>
                                <Select.Trigger className="select-trigger" aria-label="Theme">
                                    <Select.Value placeholder="Select a theme" />
                                    <Select.Icon className="select-icon">
                                        <ChevronDownIcon/>
                                    </Select.Icon>
                                </Select.Trigger>
                                <Select.Portal>
                                    <Select.Content className="select-content">
                                        <Select.ScrollUpButton className="select-scroll-btn">
                                            <ChevronUpIcon />
                                        </Select.ScrollUpButton>
                                        <Select.Viewport className="select-viewport">
                                            <Select.Group>
                                                <Select.Separator className="select-separator" />
                                                <Select.Label className="select-label">Dark</Select.Label>
                                                {Object.keys(themes).map((theme) => {
                                                    if (theme.includes("Dark")) {
                                                        return (
                                                            <Select.Item className="select-item" value={theme}>
                                                                {themes[theme]}
                                                            </Select.Item>
                                                        )
                                                    }
                                                })}
                                                <Select.Separator className="select-separator" />
                                                <Select.Label className="select-label">Light</Select.Label>
                                                {Object.keys(themes).map((theme) => {
                                                    if (theme.includes("Light")) {
                                                        return (
                                                            <Select.Item className="select-item" value={theme}>
                                                                {themes[theme]}
                                                            </Select.Item>
                                                        )
                                                    }
                                                })}
                                            </Select.Group>
                                        </Select.Viewport>
                                    </Select.Content>
                                </Select.Portal>
                            </Select.Root>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                                <label className="label" htmlFor="enable-preview">
                                    Enable Preview
                                </label>
                                <Switch.Root className="switch-root" id="enable-preview" onCheckedChange={handleTogglePreview}>
                                    <Switch.Thumb className="switch-thumb" />
                                </Switch.Root>
                            </div>
                            </div>
                        </ScrollArea.Root>
                    </form>
                </Tabs.Content>
                <Tabs.Content className="tabs-content" value="tab3">
                    <form className="tab-form">
                        <ScrollArea.Root className="scroll-area-root" style={{ height: "100px" }}>
                            <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: "10px" }}>
                                {Object.keys(plugins).map((plugin) => {
                                    return (
                                        <div key={plugin} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                                            <label className="label" htmlFor={plugin}>{plugin}</label>
                                            <Switch.Root className="switch-root" id={plugin} onCheckedChange={(checked) => handleTogglePlugin(plugin, checked)}>
                                                <Switch.Thumb className="switch-thumb" />
                                            </Switch.Root>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea.Root>
                    </form>
                </Tabs.Content>
                <Tabs.Content className="tabs-content" value="tab4">
                    <form className="tab-form">
                        <ScrollArea.Root className="scroll-area-root" style={{ height: "100px" }}>
                            <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: "10px" }}>
                                {/* Azure Sync toggle */}
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                                    <label className="label" htmlFor="enable-azure-sync">
                                        Enable Azure Sync
                                    </label>
                                    <Switch.Root className="switch-root" id="enable-azure-sync" onCheckedChange={onToggleAzureSync}>
                                        <Switch.Thumb className="switch-thumb" />
                                    </Switch.Root>
                                </div>
                            </div>
                        </ScrollArea.Root>
                    </form>
                </Tabs.Content>
                <div className="apply-bar" style={{ display: "flex", alignItems: "flex-end"}}>
                    <button type="submit" onClick={handleApply}>Apply</button>
                </div>
            </Tabs.Root>
        </div>
    );
}