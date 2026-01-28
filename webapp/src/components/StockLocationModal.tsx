import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';

interface StockLocationModalProps {
    stockId: string;
    currentStatut: string;
    currentTechnicianId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

function StockLocationModal({ stockId, currentStatut, currentTechnicianId, onClose, onSuccess }: StockLocationModalProps) {
    const [statut, setStatut] = useState(currentStatut);
    const [locationType, setLocationType] = useState<'warehouse' | 'technician'>(currentTechnicianId ? 'technician' : 'warehouse');
    const [selectedTechnician, setSelectedTechnician] = useState(currentTechnicianId || '');
    const [techniciens, setTechniciens] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (locationType === 'technician') {
            loadTechniciens();
        }
    }, [locationType]);

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
        setLoading(true);
        setError(null);

        try {
            // 1. Update Status if changed
            if (statut !== currentStatut) {
                await apiService.updateStock(stockId, { statut });
            }

            // 2. Handle Location Change
            const isCurrentlyInTech = !!currentTechnicianId;
            const willBeInTech = locationType === 'technician';

            if (isCurrentlyInTech && !willBeInTech) {
                // Was in tech, moving to warehouse
                // We use removeItemFromVehicle (which effectively deletes the TechnicianStock entry)
                // This puts it back in "pool" technically, but logical location is Warehouse.
                await apiService.removeItemFromVehicle(currentTechnicianId!, stockId);
            } else if (!isCurrentlyInTech && willBeInTech) {
                // Was in warehouse, moving to tech
                await apiService.transferStockToTechnician(stockId, {
                    technicienId: selectedTechnician,
                    quantite: 1 // Assuming 1 for serialized items for now, or existing logic
                });
            } else if (isCurrentlyInTech && willBeInTech && currentTechnicianId !== selectedTechnician) {
                // Moving from Tech A to Tech B
                // First return to warehouse
                await apiService.removeItemFromVehicle(currentTechnicianId!, stockId);
                // Then assign to new tech
                await apiService.transferStockToTechnician(stockId, {
                    technicienId: selectedTechnician,
                    quantite: 1
                });
            }

            onSuccess();
        } catch (err: unknown) {
            console.error(err);
            setError("Une erreur est survenue lors de la mise à jour.");
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
                        ✏️ Modifier la localisation
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
                    {/* Statut */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Statut
                        </label>
                        <select
                            value={statut}
                            onChange={(e) => setStatut(e.target.value)}
                            className="form-input-premium"
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="courant">✅ En Stock (Fonctionnel)</option>
                            <option value="hs">⚠️ Hors Service</option>
                            <option value="retour_fournisseur">↩️ Retour Fournisseur</option>
                        </select>
                    </div>

                    {/* Localisation Type */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Affectation
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{
                                flex: 1,
                                cursor: 'pointer',
                                padding: '10px',
                                border: `1px solid ${locationType === 'warehouse' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                borderRadius: '8px',
                                backgroundColor: locationType === 'warehouse' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                textAlign: 'center',
                                fontWeight: locationType === 'warehouse' ? 600 : 400,
                                color: locationType === 'warehouse' ? 'var(--primary-color)' : 'var(--text-secondary)'
                            }}>
                                <input
                                    type="radio"
                                    name="locationType"
                                    value="warehouse"
                                    checked={locationType === 'warehouse'}
                                    onChange={() => setLocationType('warehouse')}
                                    style={{ display: 'none' }}
                                />
                                🏭 Stock Central
                            </label>
                            <label style={{
                                flex: 1,
                                cursor: 'pointer',
                                padding: '10px',
                                border: `1px solid ${locationType === 'technician' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                borderRadius: '8px',
                                backgroundColor: locationType === 'technician' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                textAlign: 'center',
                                fontWeight: locationType === 'technician' ? 600 : 400,
                                color: locationType === 'technician' ? 'var(--primary-color)' : 'var(--text-secondary)'
                            }}>
                                <input
                                    type="radio"
                                    name="locationType"
                                    value="technician"
                                    checked={locationType === 'technician'}
                                    onChange={() => setLocationType('technician')}
                                    style={{ display: 'none' }}
                                />
                                🔧 Technicien
                            </label>
                        </div>
                    </div>

                    {/* Technician Select */}
                    {locationType === 'technician' && (
                        <div style={{ marginBottom: '20px', animation: 'fadeIn 0.2s ease-in-out' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Sélectionner le technicien
                            </label>
                            <select
                                value={selectedTechnician}
                                onChange={(e) => setSelectedTechnician(e.target.value)}
                                className="form-input-premium"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)'
                                }}
                                required
                            >
                                <option value="">-- Choisir --</option>
                                {techniciens.map(tech => (
                                    <option key={tech.id} value={tech.id}>{tech.nom}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
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
                            disabled={loading || (locationType === 'technician' && !selectedTechnician)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--primary-color)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: (loading || (locationType === 'technician' && !selectedTechnician)) ? 'not-allowed' : 'pointer',
                                opacity: (loading || (locationType === 'technician' && !selectedTechnician)) ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Mise à jour...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default StockLocationModal;
