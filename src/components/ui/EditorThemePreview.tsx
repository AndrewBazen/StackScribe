import type { EditorThemeDefinition } from "../../themes/types";
import "../../styles/ThemePreview.css";

interface EditorThemePreviewProps {
  theme: EditorThemeDefinition;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function EditorThemePreview({ theme, isSelected = false, onClick }: EditorThemePreviewProps) {
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
      {/* Mini editor preview */}
      <div
        className="theme-preview-editor"
        style={{ backgroundColor: theme.colors.editorBg }}
      >
        {/* Gutter */}
        <div
          className="theme-preview-gutter"
          style={{
            backgroundColor: theme.colors.editorGutterBg,
            color: theme.colors.editorGutterText
          }}
        >
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>

        {/* Code content */}
        <div className="theme-preview-content">
          {/* Line 1: Heading */}
          <div className="theme-preview-line">
            <span style={{ color: theme.syntax.heading, fontWeight: 'bold' }}># Heading</span>
          </div>

          {/* Line 2: Code with syntax highlighting */}
          <div className="theme-preview-line">
            <span style={{ color: theme.syntax.keyword }}>const</span>
            <span style={{ color: theme.colors.editorText }}> </span>
            <span style={{ color: theme.syntax.variable }}>x</span>
            <span style={{ color: theme.syntax.operator }}> = </span>
            <span style={{ color: theme.syntax.string }}>"hello"</span>
          </div>

          {/* Line 3: Comment */}
          <div className="theme-preview-line">
            <span style={{ color: theme.syntax.comment, fontStyle: 'italic' }}>// comment</span>
          </div>

          {/* Line 4: More code */}
          <div className="theme-preview-line">
            <span style={{ color: theme.syntax.keyword }}>return</span>
            <span style={{ color: theme.colors.editorText }}> </span>
            <span style={{ color: theme.syntax.number }}>42</span>
          </div>
        </div>

        {/* Selection indicator */}
        <div
          className="theme-preview-selection"
          style={{ backgroundColor: theme.colors.editorSelection }}
        />
      </div>

      {/* Theme info */}
      <div className="theme-preview-info">
        <span className="theme-preview-name">{theme.name}</span>
        <span className="theme-preview-variant">{theme.variant}</span>
      </div>

      {/* Color swatches - showing syntax colors */}
      <div className="theme-preview-swatches">
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.colors.editorBg }}
          title="Background"
        />
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.colors.editorText }}
          title="Text"
        />
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.syntax.keyword }}
          title="Keyword"
        />
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.syntax.string }}
          title="String"
        />
        <div
          className="theme-swatch"
          style={{ backgroundColor: theme.syntax.variable }}
          title="Variable"
        />
      </div>
    </div>
  );
}
