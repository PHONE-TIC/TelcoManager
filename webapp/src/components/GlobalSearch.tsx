import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { apiService } from '../services/api.service';
import searchHistory from '../services/searchHistory.service';
import { useNavigate } from 'react-router-dom';
import './GlobalSearch.css';

interface SearchFilters {
    dateFrom?: string;
    dateTo?: string;
    status?: string[];
    category?: string[];
    technicianId?: string;
}

interface SearchResults {
    clients: any[];
    interventions: any[];
    stock: any[];
    techniciens: any[];
    totalResults: number;
}

type EntityTab = 'all' | 'clients' | 'interventions' | 'stock' | 'techniciens';

const GlobalSearch: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({
        clients: [],
        interventions: [],
        stock: [],
        techniciens: [],
        totalResults: 0
    });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<EntityTab>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({});
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isClosing, setIsClosing] = useState(false);

    const navigate = useNavigate();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<number | null>(null);

    // Close modal with animation
    const closeModal = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 200); // Match animation duration
    }, []);

    // Keyboard shortcut to open search (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape' && isOpen && !isClosing) {
                closeModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isClosing, closeModal]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
            setShowHistory(true);
        } else {
            // Reset on close
            setQuery('');
            setResults({ clients: [], interventions: [], stock: [], techniciens: [], totalResults: 0 });
            setActiveTab('all');
            setShowFilters(false);
            setShowHistory(false);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Debounced search
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.trim().length === 0) {
            setResults({ clients: [], interventions: [], stock: [], techniciens: [], totalResults: 0 });
            setShowHistory(true);
            return;
        }

        setLoading(true);
        setShowHistory(false);

        try {
            console.log('Performing search with query:', searchQuery, 'filters:', filters);
            const data = await apiService.globalSearch({
                q: searchQuery,
                filters
            });

            console.log('Search results received:', data);
            setResults(data);

            // Save to history
            searchHistory.saveSearch(searchQuery, filters);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const handleQueryChange = (value: string) => {
        setQuery(value);
        setSelectedIndex(0);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const handleHistoryItemClick = (item: any) => {
        setQuery(item.query);
        setFilters(item.filters);
        performSearch(item.query);
    };

    const clearHistory = () => {
        searchHistory.clearHistory();
        setShowHistory(false);
    };

    // Get flat list of all results for keyboard navigation
    const getAllResults = () => {
        const allResults: any[] = [];

        if (activeTab === 'all' || activeTab === 'clients') {
            results.clients.forEach(item => allResults.push({ type: 'client', data: item }));
        }
        if (activeTab === 'all' || activeTab === 'interventions') {
            results.interventions.forEach(item => allResults.push({ type: 'intervention', data: item }));
        }
        if (activeTab === 'all' || activeTab === 'stock') {
            results.stock.forEach(item => allResults.push({ type: 'stock', data: item }));
        }
        if (activeTab === 'all' || activeTab === 'techniciens') {
            results.techniciens.forEach(item => allResults.push({ type: 'technicien', data: item }));
        }

        return allResults;
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const allResults = getAllResults();

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && allResults[selectedIndex]) {
            e.preventDefault();
            handleResultClick(allResults[selectedIndex]);
        }
    };

    const handleResultClick = (result: any) => {
        const { type, data } = result;

        switch (type) {
            case 'client':
                navigate(`/clients`);
                break;
            case 'intervention':
                navigate(`/interventions/${data.id}`);
                break;
            case 'stock':
                navigate(`/stock`);
                break;
            case 'technicien':
                navigate(`/techniciens`);
                break;
        }

        closeModal();
    };

    const highlightText = (text: string, highlight: string) => {
        if (!highlight.trim()) {
            return text;
        }
        const regex = new RegExp(`(${highlight})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, i) =>
            regex.test(part) ? <mark key={i}>{part}</mark> : part
        );
    };

    const renderResult = (result: any, index: number) => {
        const isSelected = index === selectedIndex;
        const { type, data } = result;

        return (
            <div
                key={`${type}-${data.id}`}
                className={`search-result-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleResultClick(result)}
                onMouseEnter={() => setSelectedIndex(index)}
            >
                <div className="result-type-badge">{type}</div>
                <div className="result-content">
                    {type === 'client' && (
                        <>
                            <div className="result-title">{highlightText(data.nom, query)}</div>
                            <div className="result-subtitle">{data.telephone}</div>
                        </>
                    )}
                    {type === 'intervention' && (
                        <>
                            <div className="result-title">
                                {data.numero} - {highlightText(data.titre, query)}
                            </div>
                            <div className="result-subtitle">
                                {data.client?.nom} • {new Date(data.datePlanifiee).toLocaleDateString()}
                            </div>
                        </>
                    )}
                    {type === 'stock' && (
                        <>
                            <div className="result-title">{highlightText(data.nomMateriel, query)}</div>
                            <div className="result-subtitle">
                                Réf: {data.reference} • N° Série: {data.numeroSerie} • Qté: {data.quantite}
                            </div>
                        </>
                    )}
                    {type === 'technicien' && (
                        <>
                            <div className="result-title">{highlightText(data.nom, query)}</div>
                            <div className="result-subtitle">@{data.username}</div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen) {
        return (
            <button className="global-search-trigger" onClick={() => setIsOpen(true)}>
                <span className="search-icon">🔍</span>
                <span className="search-text">Rechercher...</span>
                <kbd className="search-shortcut">Ctrl+K</kbd>
            </button>
        );
    }

    const allResults = getAllResults();
    const history = searchHistory.getHistory();

    return ReactDOM.createPortal(
        <div className={`global-search-overlay ${isClosing ? 'closing' : ''}`} onClick={closeModal}>
            <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
                <div className="search-header">
                    <div className="search-input-wrapper">
                        <span className="search-icon-large">🔍</span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="search-input"
                            placeholder="Rechercher clients, interventions, stock, techniciens..."
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        {loading && <span className="search-loading">⌛</span>}
                    </div>
                    <button
                        className="filter-toggle"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        🎚️ Filtres
                    </button>
                    <button className="close-button" onClick={closeModal}>
                        ✕
                    </button>
                </div>

                {showFilters && (
                    <div className="filters-panel">
                        <div className="filter-group">
                            <label>Date de:</label>
                            <input
                                type="date"
                                value={filters.dateFrom || ''}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Date à:</label>
                            <input
                                type="date"
                                value={filters.dateTo || ''}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            />
                        </div>
                        <button
                            className="filter-reset"
                            onClick={() => {
                                setFilters({});
                                if (query) performSearch(query);
                            }}
                        >
                            Réinitialiser
                        </button>
                    </div>
                )}

                <div className="search-tabs">
                    <button
                        className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        Tout <span className="tab-count">{results.totalResults}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
                        onClick={() => setActiveTab('clients')}
                    >
                        Clients <span className="tab-count">{results.clients.length}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'interventions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('interventions')}
                    >
                        Interventions <span className="tab-count">{results.interventions.length}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stock')}
                    >
                        Stock <span className="tab-count">{results.stock.length}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'techniciens' ? 'active' : ''}`}
                        onClick={() => setActiveTab('techniciens')}
                    >
                        Techniciens <span className="tab-count">{results.techniciens.length}</span>
                    </button>
                </div>

                <div className="search-results">
                    {showHistory && history.length > 0 && (
                        <div className="history-section">
                            <div className="history-header">
                                <h3>Recherches récentes</h3>
                                <button className="clear-history" onClick={clearHistory}>
                                    Effacer
                                </button>
                            </div>
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    className="history-item"
                                    onClick={() => handleHistoryItemClick(item)}
                                >
                                    <span className="history-icon">🕐</span>
                                    <span className="history-query">{item.query}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {!showHistory && allResults.length > 0 && (
                        <div className="results-list">
                            {allResults.map((result, index) => renderResult(result, index))}
                        </div>
                    )}

                    {!showHistory && !loading && query && allResults.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">🔍</div>
                            <div className="empty-text">Aucun résultat pour "{query}"</div>
                        </div>
                    )}
                </div>

                <div className="search-footer">
                    <div className="keyboard-hints">
                        <kbd>↑↓</kbd> Naviguer
                        <kbd>Enter</kbd> Sélectionner
                        <kbd>Esc</kbd> Fermer
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GlobalSearch;
