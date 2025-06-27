import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ReactMarkdown from "react-markdown";
import { previewTheme } from "../Themes/previewTheme";

interface PreviewPanelProps {
    markdown: string;
}

const PreviewPanel = ({ markdown }: PreviewPanelProps) => {
    return (
        <ReactMarkdown
            className="preview-content"
            components={{
                code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return match ? (
                        <SyntaxHighlighter
                            style={previewTheme}
                            language={match[1]}
                            PreTag="pre"
                            className="preview-code"
                            {...props}
                        >
                            {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                    ) : (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
            }}
        >
            {markdown}
        </ReactMarkdown>
    );
};

export default PreviewPanel;