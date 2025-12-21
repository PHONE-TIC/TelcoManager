import { useState } from 'react';
import { apiService } from '../services/api.service';

interface StockImportModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

function StockImportModal({ onClose, onSuccess }: StockImportModalProps) {
    const [csvData, setCsvData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ created: number; errors: any[] } | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setParseError(null);
        setCsvData([]);
        setResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());
                if (lines.length < 2) {
                    setParseError('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données');
                    return;
                }

                const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
                const requiredHeaders = ['nommateriel', 'reference', 'categorie'];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

                if (missingHeaders.length > 0) {
                    setParseError(`En-têtes manquants: ${missingHeaders.join(', ')}`);
                    return;
                }

                const items = lines.slice(1).map((line) => {
                    const values = line.split(';').map(v => v.trim());
                    const item: any = {};
                    headers.forEach((header, i) => {
                        if (header === 'nommateriel') item.nomMateriel = values[i];
                        else if (header === 'numeroserie') item.numeroSerie = values[i];
                        else if (header === 'codebarre') item.codeBarre = values[i];
                        else if (header === 'lowstockthreshold') item.lowStockThreshold = parseInt(values[i]) || 5;
                        else item[header] = values[i];
                    });
                    if (item.quantite) item.quantite = parseInt(item.quantite) || 1;
                    return item;
                });

                setCsvData(items);
            } catch (err) {
                setParseError('Erreur lors de la lecture du fichier CSV');
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (csvData.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const response = await apiService.bulkImportStock(csvData);
            setResult(response);
            if (response.created > 0) {
                setTimeout(() => {
                    onSuccess();
                }, 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erreur lors de l\'import');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        📥 Importer Stock (CSV)
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Instructions */}
                <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                }}>
                    <p style={{ marginBottom: '8px' }}><strong>Format CSV attendu (séparateur: ;)</strong></p>
                    <code style={{
                        display: 'block',
                        padding: '8px',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.75rem'
                    }}>
                        nomMateriel;reference;categorie;quantite;fournisseur;notes
                    </code>
                </div>

                {/* File Input */}
                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '2px dashed var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            cursor: 'pointer'
                        }}
                    />
                </div>

                {parseError && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        color: '#991b1b',
                        marginBottom: '16px'
                    }}>
                        {parseError}
                    </div>
                )}

                {/* Preview */}
                {csvData.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ marginBottom: '8px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            Aperçu: {csvData.length} article(s) à importer
                        </p>
                        <div style={{
                            maxHeight: '200px',
                            overflow: 'auto',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            padding: '8px'
                        }}>
                            <table style={{ width: '100%', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '4px' }}>Nom</th>
                                        <th style={{ textAlign: 'left', padding: '4px' }}>Réf</th>
                                        <th style={{ textAlign: 'left', padding: '4px' }}>Cat</th>
                                        <th style={{ textAlign: 'right', padding: '4px' }}>Qté</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvData.slice(0, 10).map((item, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '4px' }}>{item.nomMateriel}</td>
                                            <td style={{ padding: '4px' }}>{item.reference}</td>
                                            <td style={{ padding: '4px' }}>{item.categorie}</td>
                                            <td style={{ padding: '4px', textAlign: 'right' }}>{item.quantite || 1}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {csvData.length > 10 && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    ...et {csvData.length - 10} autres articles
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        color: '#991b1b',
                        marginBottom: '16px'
                    }}>
                        {error}
                    </div>
                )}

                {result && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: result.created > 0 ? '#d1fae5' : '#fee2e2',
                        border: `1px solid ${result.created > 0 ? '#a7f3d0' : '#fecaca'}`,
                        borderRadius: '8px',
                        color: result.created > 0 ? '#065f46' : '#991b1b',
                        marginBottom: '16px'
                    }}>
                        <p><strong>{result.created} article(s) importé(s) avec succès</strong></p>
                        {result.errors.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                                <p>Erreurs ({result.errors.length}):</p>
                                <ul style={{ marginLeft: '16px', marginTop: '4px' }}>
                                    {result.errors.slice(0, 5).map((err, i) => (
                                        <li key={i}>Ligne {err.row}: {err.error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        Fermer
                    </button>
                    {csvData.length > 0 && !result && (
                        <button
                            onClick={handleImport}
                            disabled={loading}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Import...' : `📥 Importer ${csvData.length} article(s)`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StockImportModal;
