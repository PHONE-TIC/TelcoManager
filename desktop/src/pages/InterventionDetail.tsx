import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { generateInterventionPDF } from '../utils/pdfGenerator';

interface Intervention {
    id: string;
    numero?: number;
    titre: string;
    description: string;
    datePlanifiee: string;
    dateRealisee?: string;
    statut: string;
    notes?: string;
    client: {
        id: string;
        nom: string;
        contact: string;
        telephone: string;
    };
    technicien?: {
        id: string;
        nom: string;
        username: string;
    };
    equipements?: any[];
    commentaireTechnicien?: string;
}

const InterventionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [intervention, setIntervention] = useState<Intervention | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        titre: '',
        description: '',
        datePlanifiee: '',
        statut: '',
        notes: '',
        clientId: '',
        technicienId: '',
    });

    // Liste des clients et techniciens pour les sélecteurs
    const [clients, setClients] = useState<any[]>([]);
    const [techniciens, setTechniciens] = useState<any[]>([]);

    useEffect(() => {
        loadIntervention();
        loadClientsAndTechniciens();

        // Lock logic
        const lock = async () => {
            if (!id) return;
            try {
                await apiService.lockIntervention(id);
            } catch (e: any) {
                if (e.response?.status === 409) {
                    alert(`ATTENTION: Cette intervention est actuellement modifiée par ${e.response.data.lockedBy || 'un autre utilisateur'}.`);
                }
            }
        };
        lock();

        // Polling (Auto-Refresh)
        const interval = setInterval(() => {
            loadIntervention(true); // Silent reload
        }, 10000); // 10 seconds

        return () => {
            clearInterval(interval);
            if (id) apiService.unlockIntervention(id).catch(() => { });
        };
    }, [id]);

    const loadIntervention = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await apiService.getInterventionById(id!);
            setIntervention(data);
            if (!isEditing) { // Don't overwrite if editing
                setFormData({
                    titre: data.titre,
                    description: data.description || '',
                    datePlanifiee: data.datePlanifiee ? new Date(data.datePlanifiee).toISOString().slice(0, 16) : '',
                    statut: data.statut,
                    notes: data.notes || '',
                    clientId: data.client.id,
                    technicienId: data.technicien?.id || '',
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erreur lors du chargement');
        } finally {
            if (!silent) setLoading(false);
        }
    };


    const loadClientsAndTechniciens = async () => {
        try {
            const [clientsData, techniciensData] = await Promise.all([
                apiService.getClients({ limit: 1000 }),
                apiService.getTechniciens({ limit: 1000 }),
            ]);
            setClients(clientsData.clients || clientsData);
            setTechniciens(techniciensData.techniciens || techniciensData);
        } catch (err) {
            console.error('Erreur lors du chargement des listes:', err);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');

            const updateData = {
                titre: formData.titre,
                description: formData.description,
                datePlanifiee: new Date(formData.datePlanifiee).toISOString(),
                statut: formData.statut,
                notes: formData.notes,
                clientId: formData.clientId,
                technicienId: formData.technicienId || null,
            };

            await apiService.updateIntervention(id!, updateData);
            await loadIntervention();
            setIsEditing(false);
            alert('Intervention mise à jour avec succès !');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (intervention) {
            setFormData({
                titre: intervention.titre,
                description: intervention.description || '',
                datePlanifiee: intervention.datePlanifiee ? new Date(intervention.datePlanifiee).toISOString().slice(0, 16) : '',
                statut: intervention.statut,
                notes: intervention.notes || '',
                clientId: intervention.client.id,
                technicienId: intervention.technicien?.id || '',
            });
        }
        setIsEditing(false);
        setError('');
    };

    const getStatusBadge = (statut: string) => {
        const badges: { [key: string]: { label: string; class: string } } = {
            planifiee: { label: '🔵 Planifiée', class: 'badge-info' },
            en_cours: { label: '🟠 En cours', class: 'badge-warning' }, // Yellow per request
            terminee: { label: '🟢 Terminée', class: 'badge-success' },
            annulee: { label: '🔴 Annulée', class: 'badge-danger' },
        };
        const badge = badges[statut] || { label: statut, class: 'badge-gray' };
        return <span className={`badge ${badge.class} `}>{badge.label}</span>;
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading">Chargement...</div>
            </div>
        );
    }

    if (!intervention) {
        return (
            <div className="page-container">
                <div className="error-message">Intervention non trouvée</div>
                <button onClick={() => navigate('/interventions')} className="btn btn-secondary">
                    ← Retour à la liste
                </button>
            </div>
        );
    }

    return (
        <div className="page-container intervention-detail">
            {/* En-tête */}
            <div className="detail-header">
                <div>
                    <button onClick={() => navigate('/interventions')} className="btn btn-back">
                        ← Retour à la liste
                    </button>
                    <h1>#{intervention.numero ? String(intervention.numero).padStart(5, '0') : '-----'} - {intervention.titre}</h1>
                    {!isEditing && getStatusBadge(intervention.statut)}
                </div>
                <div className="header-actions">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={() => generateInterventionPDF(intervention)}
                                className="btn btn-secondary"
                            >
                                📄 Exporter PDF
                            </button>
                            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                                ✏️ Modifier
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleCancel} className="btn btn-secondary" disabled={saving}>
                                Annuler
                            </button>
                            <button onClick={handleSave} className="btn btn-success" disabled={saving}>
                                {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Carte Informations Générales */}
            <div className="info-card">
                <h3>📋 Informations générales</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <label>Client</label>
                        {!isEditing ? (
                            <div className="info-value">
                                <strong>{intervention.client.nom}</strong>
                                <br />
                                <small>{intervention.client.contact} - {intervention.client.telephone}</small>
                            </div>
                        ) : (
                            <select
                                value={formData.clientId}
                                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                className="input"
                            >
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.nom}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Technicien assigné</label>
                        {!isEditing ? (
                            <div className="info-value">
                                {intervention.technicien ? (
                                    <>
                                        <strong>{intervention.technicien.nom}</strong>
                                        <br />
                                        <small>@{intervention.technicien.username}</small>
                                    </>
                                ) : (
                                    <em className="text-muted">Non assigné</em>
                                )}
                            </div>
                        ) : (
                            <select
                                value={formData.technicienId}
                                onChange={(e) => setFormData({ ...formData, technicienId: e.target.value })}
                                className="input"
                            >
                                <option value="">Non assigné</option>
                                {techniciens.map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.nom} (@{tech.username})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="info-item">
                        <label>Date planifiée</label>
                        {!isEditing ? (
                            <div className="info-value">
                                {new Date(intervention.datePlanifiee).toLocaleString('fr-FR')}
                            </div>
                        ) : (
                            <input
                                type="datetime-local"
                                value={formData.datePlanifiee}
                                onChange={(e) => setFormData({ ...formData, datePlanifiee: e.target.value })}
                                className="input"
                            />
                        )}
                    </div>

                    <div className="info-item">
                        <label>Statut</label>
                        {!isEditing ? (
                            <div className="info-value">{getStatusBadge(intervention.statut)}</div>
                        ) : (
                            <select
                                value={formData.statut}
                                onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                                className="input"
                            >
                                <option value="planifiee">🔵 Planifiée</option>
                                <option value="en_cours">🟠 En cours</option>
                                <option value="terminee">🟢 Terminée</option>
                                <option value="annulee">🔴 Annulée</option>
                            </select>
                        )}
                    </div>

                    {intervention.dateRealisee && (
                        <div className="info-item">
                            <label>Date de réalisation</label>
                            <div className="info-value">
                                {new Date(intervention.dateRealisee).toLocaleString('fr-FR')}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Carte Description */}
            <div className="info-card">
                <h3>📝 Description</h3>
                {!isEditing ? (
                    <div className="description-content">
                        {intervention.description || <em className="text-muted">Aucune description</em>}
                    </div>
                ) : (
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="textarea"
                        rows={4}
                        placeholder="Description de l'intervention..."
                    />
                )}
            </div>

            {/* Carte Commentaires */}
            <div className="info-card comment-section">
                <h3>💬 Commentaires / Notes</h3>
                {!isEditing ? (
                    <div className="description-content">
                        {intervention.notes || <em className="text-muted">Aucun commentaire</em>}
                    </div>
                ) : (
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="textarea"
                        rows={6}
                        placeholder="Ajoutez des commentaires, observations ou notes techniques..."
                    />
                )}
            </div>

            {/* Carte Rapport Technicien (Compte Rendu) */}
            <div className="info-card" style={{ borderLeft: '4px solid #10b981' }}>
                <h3>📄 Rapport d'Intervention (Technicien)</h3>
                <div className="description-content">
                    {intervention.commentaireTechnicien ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{intervention.commentaireTechnicien}</div>
                    ) : (
                        <em className="text-muted">Aucun rapport saisi pour le moment.</em>
                    )}
                </div>
            </div>

            {/* Future: Carte Équipements */}
            {intervention.equipements && intervention.equipements.length > 0 && (
                <div className="info-card">
                    <h3>🔧 Équipements utilisés</h3>
                    <div className="equipments-list">
                        {intervention.equipements.map((eq: any) => (
                            <div key={eq.id} className="equipment-item">
                                {eq.stock?.nomMateriel} - {eq.action} (x{eq.quantite})
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterventionDetail;
