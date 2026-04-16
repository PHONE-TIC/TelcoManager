import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';

interface Client {
    id: string;
    nom: string;
    sousLieu?: string;
    rue: string;
    codePostal: string;
    ville: string;
    contact: string;
    telephone: string;
    email?: string;
    notes?: string;
}

interface Intervention {
    id: string;
    numero: number;
    titre: string;
    datePlanifiee: string;
    dateRealisee?: string;
    statut: string;
    technicien?: { nom: string };
}

function ClientDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [loading, setLoading] = useState(true);

    const loadClientData = useCallback(async () => {
        try {
            setLoading(true);
            const [clientData, interventionsData] = await Promise.all([
                apiService.getClientById(id!),
                apiService.getInterventions({ clientId: id, limit: 100 })
            ]);
            setClient(clientData);
            setInterventions(interventionsData.interventions || []);
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadClientData();
    }, [loadClientData]);

    const getStatusBadge = (statut: string) => {
        const badges: { [key: string]: { label: string; color: string; bg: string } } = {
            planifiee: { label: '📅 Planifiée', color: '#1e40af', bg: '#dbeafe' },
            en_cours: { label: '⏳ En cours', color: '#9a3412', bg: '#ffedd5' },
            terminee: { label: '✓ Terminée', color: '#166534', bg: '#dcfce7' },
            annulee: { label: '✕ Annulée', color: '#991b1b', bg: '#fee2e2' },
        };
        const badge = badges[statut] || { label: statut, color: '#374151', bg: '#f3f4f6' };
        return (
            <span style={{
                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                backgroundColor: badge.bg, color: badge.color
            }}>
                {badge.label}
            </span>
        );
    };

    // Stats
    const stats = {
        total: interventions.length,
        planifiees: interventions.filter(i => i.statut === 'planifiee').length,
        enCours: interventions.filter(i => i.statut === 'en_cours').length,
        terminees: interventions.filter(i => i.statut === 'terminee').length,
        annulees: interventions.filter(i => i.statut === 'annulee').length,
    };

    const detailLabelStyle = { fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="page-container">
                <div className="error-message">Client non trouvé</div>
                <button onClick={() => navigate('/clients')} className="btn btn-secondary">
                    ← Retour aux clients
                </button>
            </div>
        );
    }

    return (
        <div className="page-container mobile-detail-shell">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="mobile-inline-pairs">
                    <div>
                        <button onClick={() => navigate('/clients')} className="btn btn-back" style={{ marginBottom: '12px' }}>
                            ← Retour aux clients
                        </button>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {client.nom}
                        </h1>
                        {client.sousLieu && (
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                📍 {client.sousLieu}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="mobile-stat-grid">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 mobile-stat-card" style={{ borderLeftColor: 'var(--primary-color)' }}>
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-sm text-gray-500">Total</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 mobile-stat-card" style={{ borderLeftColor: '#3b82f6' }}>
                    <div className="text-2xl font-bold text-gray-800">{stats.planifiees}</div>
                    <div className="text-sm text-gray-500">Planifiées</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 mobile-stat-card" style={{ borderLeftColor: '#f59e0b' }}>
                    <div className="text-2xl font-bold text-gray-800">{stats.enCours}</div>
                    <div className="text-sm text-gray-500">En cours</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 mobile-stat-card" style={{ borderLeftColor: '#10b981' }}>
                    <div className="text-2xl font-bold text-gray-800">{stats.terminees}</div>
                    <div className="text-sm text-gray-500">Terminées</div>
                </div>
            </div>

            <div className="mobile-card-grid" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 2fr)' }}>
                {/* Client Info Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        📋 Informations
                    </h2>
                    <div className="mobile-stack-list">
                        <div>
                            <div style={detailLabelStyle}>Contact</div>
                            <div style={{ fontWeight: 500 }}>{client.contact}</div>
                        </div>
                        <div>
                            <div style={detailLabelStyle}>Téléphone</div>
                            <div style={{ fontWeight: 500 }}>
                                <a href={`tel:${client.telephone}`} style={{ color: 'var(--primary-color)' }}>
                                    📞 {client.telephone}
                                </a>
                            </div>
                        </div>
                        {client.email && (
                            <div>
                                <div style={detailLabelStyle}>Email</div>
                                <div style={{ fontWeight: 500 }}>
                                    <a href={`mailto:${client.email}`} style={{ color: 'var(--primary-color)' }}>
                                        ✉️ {client.email}
                                    </a>
                                </div>
                            </div>
                        )}
                        <div>
                            <div style={detailLabelStyle}>Adresse</div>
                            <div style={{ fontWeight: 500 }}>
                                {client.rue}<br />
                                {client.codePostal} {client.ville}
                            </div>
                        </div>
                        {client.notes && (
                            <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                <div style={detailLabelStyle}>📝 Notes</div>
                                <div style={{ fontWeight: 400, fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                                    {client.notes}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Interventions List */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        📅 Historique des interventions ({interventions.length})
                    </h2>
                    {interventions.length > 0 ? (
                        <div className="mobile-stack-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {interventions.map((intervention) => (
                                <div
                                    key={intervention.id}
                                    onClick={() => navigate(`/interventions/${intervention.id}`)}
                                    className="mobile-history-item"
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        backgroundColor: 'var(--card-bg)'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--primary-color)', marginRight: '8px' }}>
                                                {intervention.numero}
                                            </span>
                                            {intervention.titre}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {new Date(intervention.datePlanifiee).toLocaleDateString('fr-FR')}
                                            {intervention.technicien && ` • ${intervention.technicien.nom}`}
                                        </div>
                                    </div>
                                    {getStatusBadge(intervention.statut)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
                            <div>Aucune intervention pour ce client</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ClientDetail;
