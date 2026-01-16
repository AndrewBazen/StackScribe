import { Entry } from "../../types/entry";

interface SearchResult extends Entry {
    tomeName: string;
}

interface SearchResultsProps {
    results: SearchResult[];
    isLoading: boolean;
    query: string;
    onResultClick: (entry: Entry) => void;
    onClose: () => void;
}

export default function SearchResults({
    results,
    isLoading,
    query,
    onResultClick,
    onClose
}: SearchResultsProps) {
    if (!query.trim()) return null;

    const handleResultClick = (result: SearchResult) => {
        onResultClick(result);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent, result: SearchResult) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleResultClick(result);
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    const highlightMatch = (text: string, query: string) => {
        if (!query.trim()) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase()
                ? <mark key={i} className="search-highlight">{part}</mark>
                : part
        );
    };

    const getContentPreview = (content: string, query: string) => {
        const maxLength = 80;
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const matchIndex = lowerContent.indexOf(lowerQuery);

        if (matchIndex === -1) {
            return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '');
        }

        const start = Math.max(0, matchIndex - 20);
        const end = Math.min(content.length, matchIndex + query.length + 60);
        let preview = content.slice(start, end);

        if (start > 0) preview = '...' + preview;
        if (end < content.length) preview = preview + '...';

        return highlightMatch(preview, query);
    };

    return (
        <div className="search-results-dropdown">
            {isLoading ? (
                <div className="search-results-loading">Searching...</div>
            ) : results.length === 0 ? (
                <div className="search-results-empty">No results found for "{query}"</div>
            ) : (
                <>
                    <div className="search-results-header">
                        {results.length} result{results.length !== 1 ? 's' : ''} found
                    </div>
                    <div className="search-results-list">
                        {results.map((result) => (
                            <div
                                key={result.id}
                                className="search-result-item"
                                onClick={() => handleResultClick(result)}
                                onKeyDown={(e) => handleKeyDown(e, result)}
                                tabIndex={0}
                                role="button"
                            >
                                <div className="search-result-name">
                                    {highlightMatch(result.name, query)}
                                </div>
                                <div className="search-result-tome">
                                    in {result.tomeName}
                                </div>
                                {result.content && (
                                    <div className="search-result-preview">
                                        {getContentPreview(result.content, query)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
