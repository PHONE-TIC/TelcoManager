

interface SkeletonLoaderProps {
    type?: 'list' | 'card' | 'table' | 'form';
    rows?: number;
    columns?: number;
}

export default function SkeletonLoader({ type = 'list', rows = 3, columns = 4 }: SkeletonLoaderProps) {
    const renderList = () => (
        <div className="skeleton-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {Array.from({ length: rows }).map((_, i) => (
                <div 
                    key={i} 
                    className="skeleton-item shimmer" 
                    style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px', 
                        padding: '16px', 
                        background: 'var(--card-bg, #ffffff)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-color, rgba(0,0,0,0.05))',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ width: '40%', height: '18px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px' }} />
                    <div style={{ width: '80%', height: '12px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px' }} />
                    <div style={{ width: '60%', height: '12px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px' }} />
                </div>
            ))}
        </div>
    );

    const renderCard = () => (
        <div className="skeleton-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px', 
            width: '100%' 
        }}>
            {Array.from({ length: rows }).map((_, i) => (
                <div 
                    key={i} 
                    className="skeleton-card shimmer" 
                    style={{ 
                        padding: '24px', 
                        background: 'var(--card-bg, #ffffff)', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border-color, rgba(0,0,0,0.05))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        minHeight: '160px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '30%', height: '16px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px' }} />
                        <div style={{ width: '20%', height: '16px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px' }} />
                    </div>
                    <div style={{ width: '90%', height: '24px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px' }} />
                    <div style={{ width: '50%', height: '14px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px' }} />
                </div>
            ))}
        </div>
    );

    const renderTable = () => (
        <div className="skeleton-table-wrapper" style={{ 
            width: '100%', 
            background: 'var(--card-bg, #ffffff)', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color, rgba(0,0,0,0.05))',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
            <div className="skeleton-table-header" style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${columns}, 1fr)`, 
                gap: '16px', 
                padding: '16px 24px', 
                backgroundColor: 'var(--bg-secondary, #f9fafb)',
                borderBottom: '1px solid var(--border-color, #e5e7eb)'
            }}>
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} style={{ height: '14px', backgroundColor: 'var(--border-color, #e5e7eb)', borderRadius: '4px', width: '60%' }} />
                ))}
            </div>
            <div className="skeleton-table-body" style={{ display: 'flex', flexDirection: 'column' }}>
                {Array.from({ length: rows }).map((_, r) => (
                    <div 
                        key={r} 
                        className="shimmer"
                        style={{ 
                            display: 'grid', 
                            gridTemplateColumns: `repeat(${columns}, 1fr)`, 
                            gap: '16px', 
                            padding: '20px 24px', 
                            borderBottom: r < rows - 1 ? '1px solid var(--border-color, #f3f4f6)' : 'none',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {Array.from({ length: columns }).map((_, c) => (
                            <div key={c} style={{ 
                                height: '14px', 
                                backgroundColor: 'var(--bg-secondary, #f3f4f6)', 
                                borderRadius: '4px', 
                                width: c === 0 ? '40%' : c === 1 ? '85%' : '60%' 
                            }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="skeleton-form" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px', 
            width: '100%',
            padding: '24px',
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, rgba(0,0,0,0.05))',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ width: '25%', height: '20px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px', marginBottom: '10px' }} />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="shimmer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: '15%', height: '12px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '4px' }} />
                    <div style={{ width: '100%', height: '40px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '8px' }} />
                </div>
            ))}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <div style={{ width: '100px', height: '38px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '8px' }} />
                <div style={{ width: '120px', height: '38px', backgroundColor: 'var(--bg-secondary, #f3f4f6)', borderRadius: '8px' }} />
            </div>
        </div>
    );

    switch (type) {
        case 'card':
            return renderCard();
        case 'table':
            return renderTable();
        case 'form':
            return renderForm();
        case 'list':
        default:
            return renderList();
    }
}
