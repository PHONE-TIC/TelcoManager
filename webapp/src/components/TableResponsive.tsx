import { useEffect, useRef, useState, type ReactNode } from 'react';
import './TableResponsive.css';

interface Column<T> {
    key: string;
    label: string;
    render?: (item: T) => ReactNode;
}

interface TableResponsiveProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    actions?: (item: T) => ReactNode;
}

export default function TableResponsive<T extends object>({
    data,
    columns,
    onRowClick,
    actions,
}: TableResponsiveProps<T>) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [useCards, setUseCards] = useState(false);

    const getCellValue = (item: T, key: string) => (item as Record<string, ReactNode>)[key];

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;

        const evaluateLayout = () => {
            const width = node.clientWidth;
            const nextUseCards = width > 0 && width < 1100;
            setUseCards((prev) => (prev === nextUseCards ? prev : nextUseCards));
        };

        evaluateLayout();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => evaluateLayout());
            observer.observe(node);
            return () => observer.disconnect();
        }

        window.addEventListener('resize', evaluateLayout);
        return () => window.removeEventListener('resize', evaluateLayout);
    }, []);

    return (
        <div
            ref={containerRef}
            className={`table-responsive-shell ${useCards ? 'is-cards' : 'is-table'}`}
        >
            <div className="table-desktop">
                <table className="table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key}>{col.label}</th>
                            ))}
                            {actions && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr
                                key={index}
                                onClick={() => onRowClick?.(item)}
                                className={onRowClick ? 'clickable' : ''}
                            >
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        {col.render ? col.render(item) : getCellValue(item, col.key)}
                                    </td>
                                ))}
                                {actions && <td>{actions(item)}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="cards-mobile">
                {data.map((item, index) => (
                    <div
                        key={index}
                        className={`mobile-card ${onRowClick ? 'clickable' : ''}`}
                        onClick={() => onRowClick?.(item)}
                    >
                        {columns.map((col) => (
                            <div key={col.key} className="card-row">
                                <span className="card-label">{col.label}:</span>
                                <span className="card-value">
                                    {col.render ? col.render(item) : getCellValue(item, col.key)}
                                </span>
                            </div>
                        ))}
                        {actions && <div className="card-actions">{actions(item)}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}
