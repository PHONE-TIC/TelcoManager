import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { apiService } from '../services/api.service';

function StockLabels() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const printRef = useRef<HTMLDivElement>(null);

    const [stock, setStock] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
    const [showDetails, setShowDetails] = useState(true);

    useEffect(() => {
        loadStock();
        // Check if specific item ID is passed
        const itemId = searchParams.get('id');
        if (itemId) {
            setSelectedItems([itemId]);
        }
    }, [searchParams]);

    const loadStock = async () => {
        try {
            const data = await apiService.getStock({ statut: 'courant', limit: 500 });
            setStock(data.stock || []);
        } catch (error) {
            console.error('Erreur chargement stock:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedItems.length === stock.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(stock.map(item => item.id));
        }
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Étiquettes Stock</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: system-ui, -apple-system, sans-serif; }
                    @media print {
                        .label-container { page-break-inside: avoid; }
                    }
                    .print-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(${labelSize === 'small' ? '150px' : labelSize === 'medium' ? '200px' : '280px'}, 1fr));
                        gap: 12px;
                        padding: 16px;
                    }
                    .label-container {
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 12px;
                        background: white;
                        text-align: center;
                    }
                    .label-name {
                        font-weight: 600;
                        font-size: ${labelSize === 'small' ? '10px' : labelSize === 'medium' ? '12px' : '14px'};
                        margin-bottom: 8px;
                        word-wrap: break-word;
                    }
                    .label-ref {
                        font-size: ${labelSize === 'small' ? '9px' : labelSize === 'medium' ? '10px' : '12px'};
                        color: #666;
                        margin-bottom: 8px;
                    }
                    .qr-code {
                        display: flex;
                        justify-content: center;
                        margin-bottom: 8px;
                    }
                    .label-barcode {
                        font-family: monospace;
                        font-size: ${labelSize === 'small' ? '8px' : labelSize === 'medium' ? '10px' : '12px'};
                        color: #999;
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const getQRSize = () => {
        switch (labelSize) {
            case 'small': return 64;
            case 'medium': return 96;
            case 'large': return 128;
        }
    };

    const selectedStock = stock.filter(item => selectedItems.includes(item.id));

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8" style={{ color: 'var(--text-primary)' }}>
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
                <div>
                    <button
                        onClick={() => navigate('/stock')}
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            padding: '8px 14px',
                            marginLeft: '-12px',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '12px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                            e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                    >
                        ← Retour au stock
                    </button>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        🏷️ Impression d'Étiquettes QR Code
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Sélectionnez les articles puis imprimez les étiquettes
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    disabled={selectedItems.length === 0}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: selectedItems.length > 0
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'var(--bg-secondary)',
                        color: selectedItems.length > 0 ? 'white' : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: selectedItems.length > 0 ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none'
                    }}
                >
                    🖨️ Imprimer {selectedItems.length > 0 && `(${selectedItems.length})`}
                </button>
            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 2fr' }}>
                {/* Left Panel - Selection */}
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    padding: '16px',
                    maxHeight: '70vh',
                    overflow: 'auto'
                }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Articles ({stock.length})</h3>
                        <button
                            onClick={selectAll}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: selectedItems.length === stock.length
                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                boxShadow: selectedItems.length === stock.length
                                    ? '0 2px 8px rgba(239, 68, 68, 0.3)'
                                    : '0 2px 8px rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            {selectedItems.length === stock.length ? '✕ Désélectionner tout' : '✓ Tout sélectionner'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {stock.map(item => (
                            <label
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedItems.includes(item.id)
                                        ? 'rgba(59, 130, 246, 0.1)'
                                        : 'transparent',
                                    border: selectedItems.includes(item.id)
                                        ? '1px solid rgba(59, 130, 246, 0.3)'
                                        : '1px solid transparent'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedItems.includes(item.id)}
                                    onChange={() => toggleItem(item.id)}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.nomMateriel}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {item.reference}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Right Panel - Preview & Settings */}
                <div>
                    {/* Settings */}
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        padding: '16px',
                        marginBottom: '16px'
                    }}>
                        <h3 className="font-semibold mb-3">Options d'impression</h3>
                        <div className="flex items-center gap-6 flex-wrap">
                            <div>
                                <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Taille étiquette</label>
                                <div className="flex gap-2">
                                    {(['small', 'medium', 'large'] as const).map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setLabelSize(size)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: labelSize === size
                                                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                                    : 'var(--bg-secondary)',
                                                color: labelSize === size ? 'white' : 'var(--text-primary)',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: labelSize === size ? 600 : 500,
                                                boxShadow: labelSize === size ? '0 2px 8px rgba(59, 130, 246, 0.35)' : 'none',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {size === 'small' ? '📐 Petit' : size === 'medium' ? '📏 Moyen' : '📄 Grand'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Afficher détails</label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: showDetails ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                                    border: showDetails ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={showDetails}
                                        onChange={(e) => setShowDetails(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                                    />
                                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Nom & Référence</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        padding: '16px'
                    }}>
                        <h3 className="font-semibold mb-3">
                            Aperçu ({selectedItems.length} étiquette{selectedItems.length > 1 ? 's' : ''})
                        </h3>

                        {selectedItems.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '32px 0' }}>
                                Sélectionnez des articles à gauche
                            </p>
                        ) : (
                            <div
                                ref={printRef}
                                className="print-grid"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(auto-fill, minmax(${labelSize === 'small' ? '150px' : labelSize === 'medium' ? '200px' : '280px'}, 1fr))`,
                                    gap: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    maxHeight: '50vh',
                                    overflow: 'auto',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                {selectedStock.map(item => (
                                    <div
                                        key={item.id}
                                        className="label-container"
                                        style={{
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            padding: '12px',
                                            background: 'var(--bg-primary)',
                                            textAlign: 'center',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                        }}
                                    >
                                        {showDetails && (
                                            <>
                                                <div className="label-name" style={{
                                                    fontWeight: 600,
                                                    fontSize: labelSize === 'small' ? '10px' : labelSize === 'medium' ? '12px' : '14px',
                                                    marginBottom: '8px',
                                                    wordWrap: 'break-word',
                                                    color: 'var(--text-primary)'
                                                }}>
                                                    {item.nomMateriel}
                                                </div>
                                                <div className="label-ref" style={{
                                                    fontSize: labelSize === 'small' ? '9px' : labelSize === 'medium' ? '10px' : '12px',
                                                    color: 'var(--text-secondary)',
                                                    marginBottom: '8px'
                                                }}>
                                                    Réf: {item.reference}
                                                </div>
                                            </>
                                        )}
                                        <div className="qr-code" style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            marginBottom: '8px',
                                            padding: '8px',
                                            backgroundColor: 'white',
                                            borderRadius: '6px'
                                        }}>
                                            <QRCodeSVG
                                                value={item.codeBarre || item.reference || item.id}
                                                size={getQRSize()}
                                                level="M"
                                                includeMargin={false}
                                            />
                                        </div>
                                        <div className="label-barcode" style={{
                                            fontFamily: 'monospace',
                                            fontSize: labelSize === 'small' ? '8px' : labelSize === 'medium' ? '10px' : '12px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {item.codeBarre || item.reference}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StockLabels;

