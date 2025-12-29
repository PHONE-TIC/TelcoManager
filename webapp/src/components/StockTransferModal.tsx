import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';

interface StockTransferModalProps {
    stockId: string;
    stockName: string;
    maxQuantite: number;
    onClose: () => void;
    onSuccess: () => void;
}

function StockTransferModal({ stockId, stockName, maxQuantite, onClose, onSuccess }: StockTransferModalProps) {
    const [techniciens, setTechniciens] = useState<any[]>([]);
    const [selectedTechnicien, setSelectedTechnicien] = useState('');
    const [quantite, setQuantite] = useState(1);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTechniciens();
    }, []);

    const loadTechniciens = async () => {
        try {
            const data = await apiService.getTechniciens({ role: 'technicien', active: true });
            setTechniciens(data.techniciens || []);
        } catch (err) {
            console.error('Erreur chargement techniciens:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTechnicien) {
            setError('Veuillez sélectionner un technicien');
            return;
        }
        if (quantite <= 0 || quantite > maxQuantite) {
            setError(`Quantité invalide (max: ${maxQuantite})`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiService.transferStockToTechnician(stockId, {
                technicienId: selectedTechnicien,
                quantite,
                reason: reason || undefined
            });
            onSuccess();
        } catch (err: unknown) {
            setError((err as any).response?.data?.error || 'Erreur lors du transfert');
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
                maxWidth: '450px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        🚚 Transférer vers Technicien
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

                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Article: <strong style={{ color: 'var(--text-primary)' }}>{stockName}</strong>
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Quantité disponible: <strong>{maxQuantite}</strong>
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        color: '#991b1b',
                        marginBottom: '16px',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            Technicien *
                        </label>
                        <select
                            value={selectedTechnicien}
                            onChange={(e) => setSelectedTechnicien(e.target.value)}
                            className="form-input-premium"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                            required
                        >
                            <option value="">-- Sélectionner --</option>
                            {techniciens.map(tech => (
                                <option key={tech.id} value={tech.id}>{tech.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            Quantité à transférer *
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={maxQuantite}
                            value={quantite}
                            onChange={(e) => setQuantite(parseInt(e.target.value) || 1)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            Raison (optionnel)
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Intervention chez client X"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

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
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Transfert...' : '🚚 Transférer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default StockTransferModal;
