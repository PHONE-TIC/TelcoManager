export interface SearchHistoryItem {
    id: string;
    query: string;
    filters: any;
    entities: string[];
    timestamp: number;
}

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

class SearchHistoryManager {
    saveSearch(query: string, filters: any = {}, entities: string[] = ['clients', 'interventions', 'stock', 'techniciens']) {
        if (!query || query.trim().length === 0) return;

        const history = this.getHistory();
        const newItem: SearchHistoryItem = {
            id: Date.now().toString(),
            query: query.trim(),
            filters,
            entities,
            timestamp: Date.now()
        };

        // Remove duplicates (same query and filters)
        const filtered = history.filter(h =>
            !(h.query === newItem.query && JSON.stringify(h.filters) === JSON.stringify(newItem.filters))
        );

        // Add new item at the beginning
        filtered.unshift(newItem);

        // Keep only MAX_HISTORY items
        const trimmed = filtered.slice(0, MAX_HISTORY);

        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    }

    getHistory(): SearchHistoryItem[] {
        try {
            const history = localStorage.getItem(HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch {
            return [];
        }
    }

    deleteItem(id: string) {
        const history = this.getHistory();
        const filtered = history.filter(h => h.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    }

    clearHistory() {
        localStorage.removeItem(HISTORY_KEY);
    }
}

export default new SearchHistoryManager();
