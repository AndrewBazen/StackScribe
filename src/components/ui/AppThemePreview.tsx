import type { AppThemeDefinition } from "../../themes/types";
import "../../styles/ThemePreview.css";

interface AppThemePreviewProps {
  theme: AppThemeDefinition;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function AppThemePreview({ theme, isSelected = false, onClick }: AppThemePreviewProps) {
  return (
    <div
      className={`theme-preview ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Mini app UI preview */}
      <div
        className="theme-preview-app"
        style={{ backgroundColor: theme.colors.bgTertiary }}
      >
        {/* Sidebar */}
        <div
          className="theme-preview-sidebar"
          style={{ backgroundColor: theme.colors.bgSecondary }}
        >
          <div
            className="theme-preview-sidebar-item"
            style={{ backgroundColor: theme.colors.bgActive, borderRadius: '3px' }}
          />
          <div
            className="theme-preview-sidebar-item"
            style={{ backgroundColor: theme.colors.bgHover, borderRadius: '3px' }}
          />
          <div
            className="theme-preview-sidebar-item"
            style={{ backgroundColor: theme.colors.bgHover, borderRadius: '3px' }}
          />
        </div>

        {/* Main area */}
        <div className="theme-preview-main">
          {/* Tab bar */}
          <div
            className="theme-preview-tabs"
            style={{
              backgroundColor: theme.colors.bgSecondary,
              borderBottom: `1px solid ${theme.colors.borderPrimary}`
            }}
          >
            <div
              className="theme-preview-tab active"
              style={{
                backgroundColor: theme.colors.bgPrimary,
                borderBottom: `2px solid ${theme.colors.accentPrimary}`
              }}
            />
            <div
              className="theme-preview-tab"
              style={{ backgroundColor: 'transparent' }}
            />
          </div>

          {/* Content */}
          <div
            className="theme-preview-content-area"
            style={{ backgroundColor: theme.colors.bgPrimary }}
          >
            {/* Text lines */}
            <div
              className="theme-preview-text-line"
              style={{ backgroundColor: theme.colors.textPrimary, opacity: 0.9 }}
            />
            <div
              className="theme-preview-text-line short"
              style={{ backgroundColor: theme.colors.textSecondary, opacity: 0.7 }}
            />
            <div
              className="theme-preview-text-line medium"
              style={{ backgroundColor: theme.colors.textMuted, opacity: 0.5 }}
            />

            {/* Button */}
            <div
              className="theme-preview-button"
              style={{ backgroundColor: theme.colors.accentPrimary }}
            />
          </div>
        </div>
      </div>

      {/* Theme info */}
      <div className="theme-preview-info">
        <span className="theme-preview-name">{theme.name}</span>
        <span className="theme-preview-variant">{theme.variant}</span>
      </div>

      {/* Color swatches */}
      <div className="theme-preview-swatches">
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.colors.bgPrimary }}
          title="Background"
        />
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.colors.textPrimary }}
          title="Text"
        />
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.colors.accentPrimary }}
          title="Accent"
        />
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.colors.borderPrimary }}
          title="Border"
        />
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.colors.success }}
          title="Success"
        />
      </div>
    </div>
  );
}
