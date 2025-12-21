import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api.service';
import './TechnicianStock.css';

export default function TechnicianStock() {
    const { user } = useAuth();
    const [stock, setStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user?.id) {
            loadStock();
        }
    }, [user]);

    const loadStock = async () => {
        if (!user?.id) return;

        try {
            const data = await apiService.getTechnicianStock(user.id);
            setStock(data.stock || []);
        } catch (error) {
            console.error('Erreur lors du chargement du stock:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (stockId: string, newQuantity: number) => {
        if (!user?.id || newQuantity < 0) return;

        try {
            await apiService.updateVehicleItemQuantity(user.id, stockId, newQuantity);
            await loadStock();
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            alert('Erreur lors de la mise à jour de la quantité');
        }
    };

    // Filtering
    const filteredStock = stock.filter(item => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            item.stock?.nom?.toLowerCase().includes(search) ||
            item.stock?.reference?.toLowerCase().includes(search) ||
            item.stock?.codeBarre?.toLowerCase().includes(search)
        );
    });

    if (loading) {
        return <div className="loading">Chargement...</div>;
    }

    return (
        <div className="technician-stock-page">
            <div className="page-header">
                <h1 className="page-title">🚗 Mon Stock Véhicule</h1>
                <p className="page-subtitle">Gérez les articles dans votre véhicule</p>
            </div>

            <div className="card">
                <div className="stock-actions">
                    <div className="relative" style={{ maxWidth: '400px', width: '100%' }}>
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ fontSize: '16px' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Rechercher par nom, code-barres, référence..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 40px 10px 40px',
                                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                                border: '1px solid var(--border-color, #e5e5e5)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249, 115, 22, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                        {searchQuery && (
                            <button
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    fontSize: '16px'
                                }}
                                onClick={() => setSearchQuery('')}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {filteredStock.length > 0 ? (
                    <div className="stock-list">
                        {filteredStock.map((item) => (
                            <div
                                key={item.id}
                                id={`stock-item-${item.id}`}
                                className="stock-item-card"
                            >
                                <div className="stock-item-info">
                                    <h3>{item.stock?.nom || 'Sans nom'}</h3>
                                    <p className="stock-item-ref">Réf: {item.stock?.reference || 'N/A'}</p>
                                    {item.stock?.codeBarre && (
                                        <p className="stock-item-barcode">
                                            <span>📊</span> {item.stock.codeBarre}
                                        </p>
                                    )}
                                    <span className={`badge ${item.quantite <= 2 ? 'badge-danger' :
                                        item.quantite <= 5 ? 'badge-warning' :
                                            'badge-success'
                                        }`}>
                                        {item.stock?.categorie || 'Non catégorisé'}
                                    </span>
                                </div>
                                <div className="stock-item-actions">
                                    <div className="quantity-control">
                                        <button
                                            className="btn-quantity btn-minus"
                                            onClick={() => updateQuantity(item.stockId, item.quantite - 1)}
                                            disabled={item.quantite === 0}
                                        >
                                            −
                                        </button>
                                        <span className="quantity-value">{item.quantite}</span>
                                        <button
                                            className="btn-quantity btn-plus"
                                            onClick={() => updateQuantity(item.stockId, item.quantite + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>📦 Aucun article trouvé</p>
                        {searchQuery ? (
                            <small>Aucun résultat pour "{searchQuery}"</small>
                        ) : (
                            <small>Votre stock véhicule est vide</small>
                        )}
                    </div>
                )}
            </div>

            {/* Summary Stats */}
            <div className="stock-summary">
                <div className="summary-card">
                    <div className="summary-value">{stock.length}</div>
                    <div className="summary-label">Articles différents</div>
                </div>
                <div className="summary-card">
                    <div className="summary-value">
                        {stock.reduce((sum, item) => sum + item.quantite, 0)}
                    </div>
                    <div className="summary-label">Quantité totale</div>
                </div>
                <div className="summary-card alert">
                    <div className="summary-value">
                        {stock.filter(item => item.quantite <= 5).length}
                    </div>
                    <div className="summary-label">Stock faible (≤5)</div>
                </div>
            </div>
        </div>
    );
}
