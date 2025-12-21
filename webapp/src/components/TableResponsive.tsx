import type { ReactNode } from 'react';
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

export default function TableResponsive<T extends Record<string, any>>({
    data,
    columns,
    onRowClick,
    actions,
}: TableResponsiveProps<T>) {
    return (
        <>
            {/* Desktop Table */}
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
                                        {col.render ? col.render(item) : item[col.key]}
                                    </td>
                                ))}
                                {actions && <td>{actions(item)}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
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
                                    {col.render ? col.render(item) : item[col.key]}
                                </span>
                            </div>
                        ))}
                        {actions && <div className="card-actions">{actions(item)}</div>}
                    </div>
                ))}
            </div>
        </>
    );
}
