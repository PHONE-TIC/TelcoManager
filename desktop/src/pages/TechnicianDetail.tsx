import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';

type TabType = 'info' | 'stock';

function TechnicianDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [technician, setTechnician] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('info');

    // Stock véhicule
    const [vehicleStock, setVehicleStock] = useState<any[]>([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [allStock, setAllStock] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState('');
    const [stockQuantity, setStockQuantity] = useState(1);

    useEffect(() => {
        loadTechnician();
        loadAllStock();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'stock' && id) {
            loadVehicleStock();
        }
    }, [activeTab, id]);

    const loadTechnician = async () => {
        try {
            setLoading(true);
            const data = await apiService.getTechnicienById(id!);
            setTechnician(data);
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllStock = async () => {
        try {
            const data = await apiService.getStock({ statut: 'courant', limit: 1000 });
            setAllStock(data.stock || data);
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const loadVehicleStock = async () => {
        try {
            setLoadingStock(true);
            const stock = await apiService.getTechnicianStock(id!);
            setVehicleStock(stock);
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setLoadingStock(false);
        }
    };

    const handleAddToVehicle = async () => {
        if (!selectedStockItem) return;

        try {
            await apiService.addItemToVehicle(id!, {
                stockId: selectedStockItem,
                quantite: stockQuantity,
            });
            loadVehicleStock();
            setShowAddModal(false);
            setSelectedStockItem('');
            setStockQuantity(1);
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'ajout du matériel');
        }
    };

    const handleUpdateQuantity = async (stockId: string, quantite: number) => {
        try {
            await apiService.updateVehicleItemQuantity(id!, stockId, quantite);
            loadVehicleStock();
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const handleRemoveFromVehicle = async (stockId: string) => {
        if (!confirm('Retirer ce matériel du véhicule ?')) return;

        try {
            await apiService.removeItemFromVehicle(id!, stockId);
            loadVehicleStock();
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading">Chargement...</div>
            </div>
        );
    }

    if (!technician) {
        return (
            <div className="page-container">
                <div className="error-message">Technicien non trouvé</div>
                <button onClick={() => navigate('/techniciens')} className="btn btn-secondary">
                    ← Retour à la liste
                </button>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* En-tête */}
            <div className="detail-header">
                <div>
                    <button onClick={() => navigate('/techniciens')} className="btn btn-back">
                        ← Retour à la liste
                    </button>
                    <h1>🔧 {technician.nom}</h1>
                    <span className={technician.role === 'admin' ? 'badge badge-danger' : 'badge badge-info'}>
                        {technician.role}
                    </span>
                </div>
            </div>

            {/* Onglets */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    📋 Informations
                </button>
                <button
                    className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stock')}
                >
                    🚗 Stock Véhicule
                </button>
            </div>

            {/* Contenu Onglet Informations */}
            {activeTab === 'info' && (
                <div className="tab-content">
                    <div className="info-card">
                        <h3>Informations du technicien</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Nom complet</label>
                                <div className="info-value"><strong>{technician.nom}</strong></div>
                            </div>
                            <div className="info-item">
                                <label>Nom d'utilisateur</label>
                                <div className="info-value">{technician.username}</div>
                            </div>
                            <div className="info-item">
                                <label>Rôle</label>
                                <div className="info-value">
                                    <span className={technician.role === 'admin' ? 'badge badge-danger' : 'badge badge-info'}>
                                        {technician.role}
                                    </span>
                                </div>
                            </div>
                            <div className="info-item">
                                <label>Statut</label>
                                <div className="info-value">
                                    <span className={technician.active ? 'badge badge-success' : 'badge badge-danger'}>
                                        {technician.active ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>
                            </div>
                            <div className="info-item">
                                <label>Interventions assignées</label>
                                <div className="info-value">{technician._count?.interventions || 0}</div>
                            </div>
                            <div className="info-item">
                                <label>Créé le</label>
                                <div className="info-value">
                                    {new Date(technician.createdAt).toLocaleDateString('fr-FR')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contenu Onglet Stock Véhicule */}
            {activeTab === 'stock' && (
                <div className="tab-content">
                    <div className="info-card">
                        <div className="vehicle-stock-header">
                            <h3>🚗 Stock embarqué dans le véhicule</h3>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowAddModal(true)}
                            >
                                + Ajouter matériel
                            </button>
                        </div>

                        {loadingStock ? (
                            <div className="loading">Chargement du stock...</div>
                        ) : vehicleStock.length > 0 ? (
                            <div className="vehicle-stock-list">
                                {vehicleStock.map((item) => (
                                    <div key={item.id} className="vehicle-stock-item">
                                        <div className="stock-item-info">
                                            <strong>{item.stock.nomMateriel}</strong>
                                            <small>
                                                Réf: {item.stock.reference} | {item.stock.categorie}
                                                {item.stock.codeBarre && ` | Code-barre: ${item.stock.codeBarre}`}
                                            </small>
                                        </div>
                                        <div className="stock-item-actions">
                                            <button
                                                className="btn-quantity"
                                                onClick={() => handleUpdateQuantity(item.stockId, item.quantite - 1)}
                                                disabled={item.quantite <= 1}
                                            >
                                                -
                                            </button>
                                            <span className="quantity-display">{item.quantite}</span>
                                            <button
                                                className="btn-quantity"
                                                onClick={() => handleUpdateQuantity(item.stockId, item.quantite + 1)}
                                            >
                                                +
                                            </button>
                                            <button
                                                className="btn-remove"
                                                onClick={() => handleRemoveFromVehicle(item.stockId)}
                                                title="Retirer du véhicule"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-stock">
                                <p>🚗 Aucun matériel dans le véhicule</p>
                                <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
                                    Cliquez sur "Ajouter matériel" pour charger du matériel dans le véhicule
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Ajout Stock */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Ajouter matériel au véhicule</h3>
                        <div className="form-group">
                            <label className="form-label">Matériel</label>
                            <select
                                className="form-select"
                                value={selectedStockItem}
                                onChange={(e) => setSelectedStockItem(e.target.value)}
                            >
                                <option value="">Sélectionner un matériel</option>
                                {allStock.map((stock) => (
                                    <option key={stock.id} value={stock.id}>
                                        {stock.nomMateriel} - {stock.reference} ({stock.categorie})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quantité</label>
                            <input
                                type="number"
                                className="form-input"
                                min="1"
                                value={stockQuantity}
                                onChange={(e) => setStockQuantity(parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddToVehicle}
                                disabled={!selectedStockItem}
                            >
                                Ajouter
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowAddModal(false)}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TechnicianDetail;
