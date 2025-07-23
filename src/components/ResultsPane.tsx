import { Entry } from "../types/entry";
import "../Styles/ResultsPane.css";

interface ResultsPaneProps {
    results: Entry[];
    onResultClick?: (entry: Entry) => void;
}

export default function ResultsPane({ results, onResultClick }: ResultsPaneProps) {
    if (results.length === 0) {
        return null; // Don't show anything if no results
    }

    return (
        <div className="results-pane">
            <div className="results-header">
                <h3>Search Results ({results.length})</h3>
            </div>
            <div className="results-content">
                {results.map(result => (
                    <div 
                        key={result.id} 
                        className="result-item"
                        onClick={() => onResultClick?.(result)}
                    >
                        <div className="result-title">{result.name}</div>
                        <div className="result-type">{result.entry_type}</div>
                        {result.content && (
                            <div className="result-preview">
                                {result.content.substring(0, 100)}
                                {result.content.length > 100 ? '...' : ''}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}