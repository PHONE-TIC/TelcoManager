import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api.service';

function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [stockStats, clientsData, interventionsData] = await Promise.all([
                apiService.getStockStats(),
                apiService.getClients({ limit: 1 }),
                apiService.getInterventions({ limit: 1 }),
            ]);

            setStats({
                stock: stockStats,
                totalClients: clientsData.pagination.total,
                totalInterventions: interventionsData.pagination.total,
            });
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Chargement...</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Vue d'ensemble du système</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--primary-color)' }}>
                        {stats?.totalClients || 0}
                    </div>
                    <div className="stat-label">Clients</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--secondary-color)' }}>
                        {stats?.totalInterventions || 0}
                    </div>
                    <div className="stat-label">Interventions</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--primary-color)' }}>
                        {stats?.stock?.stockCourant?.totalQuantite || 0}
                    </div>
                    <div className="stat-label">Stock Courant</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--danger-color)' }}>
                        {stats?.stock?.stockHS?.totalQuantite || 0}
                    </div>
                    <div className="stat-label">Stock HS</div>
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginBottom: '20px' }}>Stock par catégorie</h2>
                {stats?.stock?.parCategorie && stats.stock.parCategorie.length > 0 ? (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Catégorie</th>
                                <th>Articles</th>
                                <th>Quantité totale</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.stock.parCategorie.map((cat: any, index: number) => (
                                <tr key={index}>
                                    <td>{cat.categorie}</td>
                                    <td>{cat.articles}</td>
                                    <td>{cat.quantite}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ color: 'var(--text-secondary)' }}>Aucune donnée disponible</p>
                )}
            </div>

            {stats?.stock?.stockFaible && stats.stock.stockFaible.length > 0 && (
                <div className="card">
                    <h2 style={{ marginBottom: '20px' }}>⚠️ Stock faible (≤ 5 unités)</h2>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Matériel</th>
                                <th>Référence</th>
                                <th>Quantité</th>
                                <th>Catégorie</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.stock.stockFaible.map((item: any) => (
                                <tr key={item.id}>
                                    <td>{item.nomMateriel}</td>
                                    <td>{item.reference}</td>
                                    <td>
                                        <span className={item.quantite <= 2 ? 'badge badge-danger' : 'badge badge-warning'}>
                                            {item.quantite}
                                        </span>
                                    </td>
                                    <td>{item.categorie}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
