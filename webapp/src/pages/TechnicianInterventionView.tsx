import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { generateInterventionPDF } from '../utils/pdfGenerator';
import { formatDateTimeLocal } from '../utils/dateUtils';
import { getTravelEstimate } from '../services/geolocation.service';
import type { TravelEstimate } from '../services/geolocation.service';
import PhotoCapture from '../components/PhotoCapture';
import SignaturePad from '../components/SignaturePad';
import BarcodeScanner from '../components/BarcodeScanner';
import { useAuth } from '../contexts/AuthContext';
import './TechnicianInterventionView.css';

interface Intervention {
    id: string;
    numero?: number;
    titre: string;
    description: string;
    datePlanifiee: string;
    dateRealisee?: string;
    statut: string;
    notes?: string;
    heureArrivee?: string;
    heureDepart?: string;
    signature?: string;
    commentaireTechnicien?: string;
    client: {
        id: string;
        nom: string;
        contact: string;
        telephone: string;
        rue?: string;
        codePostal?: string;
        ville?: string;
    };
    technicien?: {
        id: string;
        nom: string;
    };
    equipements?: any[];
}

interface Equipment {
    stockId?: string;
    nom: string;
    action: 'install' | 'retrait';
    etat?: 'ok' | 'hs';
    quantite: number;
}

const STEPS = [
    { id: 'info', label: '📋 Infos', icon: '📋' },
    { id: 'heures', label: '🕐 Heures', icon: '🕐' },
    { id: 'materiel', label: '🔧 Matériel', icon: '🔧' },
    { id: 'rapport', label: '📝 Rapport', icon: '📝' },
    { id: 'sign-tech', label: '✍️ Tech', icon: '✍️' },
    { id: 'sign-client', label: '✍️ Client', icon: '✍️' },
];

const TechnicianInterventionView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    useAuth(); // Keep for authentication check

    const [intervention, setIntervention] = useState<Intervention | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentStep, setCurrentStep] = useState(0);

    // Form states
    const [heureArrivee, setHeureArrivee] = useState('');
    const [heureDepart, setHeureDepart] = useState('');
    const [commentaire, setCommentaire] = useState('');
    const [signatureTechnicien, setSignatureTechnicien] = useState<string | null>(null);
    const [signatureClient, setSignatureClient] = useState<string | null>(null);
    const [photos, setPhotos] = useState<any[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [showScanner, setShowScanner] = useState(false);
    const [scanAction, setScanAction] = useState<'install' | 'retrait'>('install');
    const [clientHistory, setClientHistory] = useState<any[]>([]);
    const [travelEstimate, setTravelEstimate] = useState<TravelEstimate | null>(null);
    const [loadingTravel, setLoadingTravel] = useState(false);

    // Global function to stop all camera streams
    const stopAllCameras = () => {
        console.log('Stopping all cameras globally...');
        // Find all video elements and stop their streams
        document.querySelectorAll('video').forEach(video => {
            if (video.srcObject) {
                const stream = video.srcObject as MediaStream;
                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log('Global track stopped:', track.label);
                });
                video.srcObject = null;
            }
        });
        setShowScanner(false);
    };

    useEffect(() => {
        loadIntervention();

        // Cleanup: stop all cameras when leaving the page
        return () => {
            console.log('TechnicianInterventionView unmounting - stopping cameras');
            stopAllCameras();
        };
    }, [id]);

    const loadIntervention = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await apiService.getInterventionById(id);
            setIntervention(data);

            // Pre-fill form with existing data
            if (data.heureArrivee) setHeureArrivee(formatDateTimeLocal(data.heureArrivee));
            if (data.heureDepart) setHeureDepart(formatDateTimeLocal(data.heureDepart));
            if (data.commentaireTechnicien) setCommentaire(data.commentaireTechnicien);
            if (data.signature) setSignatureClient(data.signature);

            // Load client history (other interventions for this client)
            if (data.clientId) {
                try {
                    const historyData = await apiService.getInterventions({ clientId: data.clientId });
                    // Filter out current intervention and limit to 5 most recent
                    const history = (historyData.interventions || [])
                        .filter((int: any) => int.id !== id)
                        .sort((a: any, b: any) => new Date(b.datePlanifiee).getTime() - new Date(a.datePlanifiee).getTime())
                        .slice(0, 5);
                    setClientHistory(history);
                } catch (histErr) {
                    console.warn('Could not load client history:', histErr);
                }
            }

            // Determine starting step based on status
            if (data.statut === 'planifiee') {
                setCurrentStep(0); // Start at info
            } else if (data.statut === 'en_cours') {
                setCurrentStep(1); // Start at heures
            }
        } catch (err) {
            setError('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (msg: string, isError = false) => {
        if (isError) {
            setError(msg);
            setSuccess('');
        } else {
            setSuccess(msg);
            setError('');
        }
        setTimeout(() => { setError(''); setSuccess(''); }, 3000);
    };

    // === ACTIONS ===
    const handleTakeCharge = async () => {
        if (!id) return;
        try {
            await apiService.updateInterventionStatus(id, {
                statut: 'en_cours',
                datePriseEnCharge: new Date().toISOString()
            });
            showMessage('Intervention prise en charge !');
            await loadIntervention();
            setCurrentStep(1); // Go to heures step
        } catch (err: any) {
            showMessage(err.response?.data?.error || 'Erreur', true);
        }
    };

    const handleSaveHours = async () => {
        if (!id || !heureArrivee || !heureDepart) return;
        try {
            await apiService.validateInterventionHours(id, {
                heureArrivee: new Date(heureArrivee).toISOString(),
                heureDepart: new Date(heureDepart).toISOString()
            });
            showMessage('Heures enregistrées');
        } catch (err: any) {
            showMessage(err.response?.data?.error || 'Erreur', true);
        }
    };

    const handleBarcodeScan = async (barcode: string) => {
        setShowScanner(false);
        try {
            const stockItem = await apiService.getStockByBarcode(barcode);
            if (stockItem) {
                setEquipments([...equipments, {
                    stockId: stockItem.id,
                    nom: stockItem.nomMateriel,
                    action: scanAction,
                    quantite: 1,
                    etat: scanAction === 'retrait' ? 'ok' : undefined
                }]);
                showMessage(`${stockItem.nomMateriel} ajouté`);
            }
        } catch {
            showMessage('Article non trouvé', true);
        }
    };

    const handleSaveEquipments = async () => {
        if (!id || equipments.length === 0) return;
        try {
            for (const eq of equipments) {
                await apiService.manageInterventionEquipment(id, eq);
            }
            setEquipments([]);
            showMessage('Matériel enregistré');
            await loadIntervention();
        } catch (err: any) {
            showMessage(err.response?.data?.error || 'Erreur', true);
        }
    };

    const handleClose = async () => {
        if (!id) return;
        if (!heureArrivee || !heureDepart) {
            alert('⚠️ Veuillez saisir les heures d\'arrivée et de départ');
            setCurrentStep(1);
            return;
        }

        setLoading(true);
        console.log('Closing intervention...', { id, heureArrivee, heureDepart, commentaire });

        try {
            // Save hours
            console.log('Saving hours...');
            await apiService.validateInterventionHours(id, {
                heureArrivee: new Date(heureArrivee).toISOString(),
                heureDepart: new Date(heureDepart).toISOString()
            });

            // Save signatures (optional - may not be implemented in backend)
            try {
                if (signatureTechnicien) {
                    console.log('Saving technician signature...');
                    await apiService.signIntervention(id, { type: 'technicien', signature: signatureTechnicien });
                }
                if (signatureClient) {
                    console.log('Saving client signature...');
                    await apiService.signIntervention(id, { type: 'client', signature: signatureClient });
                }
            } catch (signErr) {
                console.warn('Signature API not available, continuing without saving signatures', signErr);
            }

            // Close intervention
            console.log('Updating status to terminee...');
            await apiService.updateInterventionStatus(id, {
                statut: 'terminee',
                commentaireTechnicien: commentaire
            });

            console.log('Intervention closed successfully!');
            alert('✅ Intervention clôturée avec succès !');
            navigate('/interventions');
        } catch (err: any) {
            console.error('Error closing intervention:', err);
            setLoading(false);
            alert('❌ Erreur: ' + (err.response?.data?.error || err.message || 'Erreur lors de la clôture'));
        }
    };

    const getStatusBadge = (statut: string) => {
        const badges: { [key: string]: { label: string; class: string } } = {
            planifiee: { label: '🔵 Planifiée', class: 'badge-info' },
            en_cours: { label: '🟠 En cours', class: 'badge-warning' },
            terminee: { label: '🟢 Terminée', class: 'badge-success' },
            annulee: { label: '🔴 Annulée', class: 'badge-danger' },
        };
        const badge = badges[statut] || { label: statut, class: 'badge-gray' };
        return <span className={`badge ${badge.class}`}>{badge.label}</span>;
    };

    if (loading) {
        return <div className="page-container"><div className="loading">Chargement...</div></div>;
    }

    if (!intervention) {
        return (
            <div className="page-container">
                <div className="error-message">Intervention non trouvée</div>
                <button onClick={() => navigate('/interventions')} className="btn btn-secondary">← Retour</button>
            </div>
        );
    }

    const isEnCours = intervention.statut === 'en_cours';
    const isPlanifiee = intervention.statut === 'planifiee';
    const isClosed = intervention.statut === 'terminee' || intervention.statut === 'annulee';

    // Check if intervention is scheduled for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = new Date(intervention.datePlanifiee);
    const isScheduledForToday = scheduledDate >= today && scheduledDate < tomorrow;

    // For closed interventions, show full report details
    if (isClosed) {
        const clientAddress = intervention.client?.rue
            ? `${intervention.client.rue}, ${intervention.client.codePostal || ''} ${intervention.client.ville || ''}`
            : 'Non renseignée';

        return (
            <div className="page-container technician-view">
                <div className="tech-header">
                    <button onClick={() => navigate('/interventions')} className="btn btn-back">← Retour</button>
                    <div className="title-row">
                        <h1>
                            <span className="intervention-number">{intervention.numero}</span>
                            {intervention.titre}
                        </h1>
                        {getStatusBadge(intervention.statut)}
                    </div>
                    <button onClick={() => void generateInterventionPDF(intervention)} className="btn btn-primary">
                        📄 Télécharger PDF
                    </button>
                </div>

                {/* Compte-rendu complet */}
                <div className="report-summary">
                    <h2 style={{ marginBottom: '20px', borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px' }}>
                        📋 Compte-rendu d'intervention
                    </h2>

                    {/* Informations client */}
                    <div className="info-card" style={{ marginBottom: '15px' }}>
                        <h3 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>👤 Client</h3>
                        <p><strong>Nom :</strong> {intervention.client?.nom}</p>
                        <p><strong>Contact :</strong> {intervention.client?.contact} - {intervention.client?.telephone}</p>
                        <p><strong>Adresse :</strong> {clientAddress}</p>
                    </div>

                    {/* Informations intervention */}
                    <div className="info-card" style={{ marginBottom: '15px' }}>
                        <h3 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>📅 Dates & Horaires</h3>
                        <p><strong>Date planifiée :</strong> {new Date(intervention.datePlanifiee).toLocaleDateString('fr-FR')}</p>
                        {intervention.heureArrivee && (
                            <p><strong>Heure d'arrivée :</strong> {new Date(intervention.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                        {intervention.heureDepart && (
                            <p><strong>Heure de départ :</strong> {new Date(intervention.heureDepart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                        <p><strong>Technicien :</strong> {intervention.technicien?.nom || 'Non assigné'}</p>
                    </div>

                    {/* Description */}
                    {intervention.description && (
                        <div className="info-card" style={{ marginBottom: '15px' }}>
                            <h3 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>📝 Description</h3>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{intervention.description}</p>
                        </div>
                    )}

                    {/* Équipements */}
                    {intervention.equipements && intervention.equipements.length > 0 && (
                        <div className="info-card" style={{ marginBottom: '15px' }}>
                            <h3 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>🔧 Équipements</h3>
                            <table className="table" style={{ marginTop: '10px' }}>
                                <thead>
                                    <tr>
                                        <th>Matériel</th>
                                        <th>Action</th>
                                        <th>Quantité</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {intervention.equipements.map((eq: any, idx: number) => (
                                        <tr key={idx}>
                                            <td>{eq.stock?.nomMateriel || eq.nom || 'N/A'}</td>
                                            <td>{eq.action === 'install' ? '✅ Installation' : '🔄 Retrait'}</td>
                                            <td>{eq.quantite || 1}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Commentaire technicien */}
                    {intervention.commentaireTechnicien && (
                        <div className="info-card" style={{ marginBottom: '15px' }}>
                            <h3 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>💬 Commentaire du technicien</h3>
                            <p style={{ whiteSpace: 'pre-wrap', backgroundColor: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px' }}>
                                {intervention.commentaireTechnicien}
                            </p>
                        </div>
                    )}

                    {/* Notes */}
                    {intervention.notes && (
                        <div className="info-card" style={{ marginBottom: '15px' }}>
                            <h3 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>📒 Notes</h3>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{intervention.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container technician-view">
            {/* Header */}
            <div className="tech-header">
                <button onClick={() => navigate('/interventions')} className="btn btn-back">← Retour</button>
                <div className="title-row">
                    <h1>
                        <span className="intervention-number">{intervention.numero}</span>
                        {intervention.titre}
                    </h1>
                    {getStatusBadge(intervention.statut)}
                </div>
                {isPlanifiee && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                        <button
                            onClick={handleTakeCharge}
                            className={`btn ${isScheduledForToday ? 'btn-success' : 'btn-secondary'}`}
                            disabled={!isScheduledForToday}
                            style={!isScheduledForToday ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                        >
                            {isScheduledForToday ? '▶️ Prendre en charge' : '🔒 Non disponible'}
                        </button>
                        {!isScheduledForToday && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Intervention prévue le {new Date(intervention.datePlanifiee).toLocaleDateString('fr-FR')}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Messages */}
            {error && <div className="message error">{error}</div>}
            {success && <div className="message success">{success}</div>}

            {/* Step Tabs (only for en_cours) */}
            {isEnCours && (
                <div className="step-tabs">
                    {STEPS.map((step, index) => (
                        <button
                            key={step.id}
                            className={`step-tab ${currentStep === index ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                            onClick={() => setCurrentStep(index)}
                        >
                            <span className="step-icon">{step.icon}</span>
                            <span className="step-label">{step.label.split(' ')[1]}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Step Content */}
            <div className="step-content">
                {/* === STEP 0: INFOS === */}
                {(currentStep === 0 || isPlanifiee) && (
                    <div className="step-panel">
                        <div className="info-card">
                            <h3>📋 Informations générales</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Client</label>
                                    <div className="info-value">
                                        <strong>{intervention.client.nom}</strong>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Contact</label>
                                    <div className="info-value">
                                        {intervention.client.contact}
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Téléphone</label>
                                    <div className="info-value">
                                        <a href={`tel:${intervention.client.telephone}`} className="phone-link">
                                            {intervention.client.telephone}
                                        </a>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Date planifiée</label>
                                    <div className="info-value">{new Date(intervention.datePlanifiee).toLocaleString('fr-FR')}</div>
                                </div>
                            </div>
                        </div>

                        <div className="info-card">
                            <h3>📍 Localisation client</h3>
                            <div className="address-info">
                                <div className="address-line">🏠 {intervention.client.rue || 'Adresse non renseignée'}</div>
                                <div className="address-line">📮 {intervention.client.codePostal} {intervention.client.ville}</div>
                            </div>

                            {/* Travel time estimation */}
                            {travelEstimate && (
                                <div style={{
                                    marginTop: '10px',
                                    padding: '10px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{travelEstimate.formattedTime}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {travelEstimate.formattedDistance} (estimation)
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    onClick={() => {
                                        const addr = encodeURIComponent(`${intervention.client.rue}, ${intervention.client.codePostal} ${intervention.client.ville}`);
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${addr}`, '_blank');
                                    }}
                                >
                                    🗺️ Google Maps
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ flex: 1, backgroundColor: '#33ccff', borderColor: '#33ccff', color: '#000' }}
                                    onClick={() => {
                                        const addr = encodeURIComponent(`${intervention.client.rue}, ${intervention.client.codePostal} ${intervention.client.ville}`);
                                        window.open(`https://waze.com/ul?q=${addr}&navigate=yes`, '_blank');
                                    }}
                                >
                                    🚗 Waze
                                </button>
                            </div>

                            {/* Calculate travel time button */}
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', marginTop: '10px' }}
                                disabled={loadingTravel}
                                onClick={async () => {
                                    setLoadingTravel(true);
                                    try {
                                        const address = `${intervention.client.rue}, ${intervention.client.codePostal} ${intervention.client.ville}`;
                                        const estimate = await getTravelEstimate(address);
                                        setTravelEstimate(estimate);
                                    } catch (err) {
                                        console.error('Could not get travel estimate:', err);
                                    } finally {
                                        setLoadingTravel(false);
                                    }
                                }}
                            >
                                {loadingTravel ? '⏳ Calcul en cours...' : '⏱️ Estimer le temps de trajet'}
                            </button>
                        </div>

                        <div className="info-card">
                            <h3>📄 Description</h3>
                            <p>{intervention.description || 'Aucune description'}</p>
                        </div>

                        {intervention.notes && (
                            <div className="info-card">
                                <h3>📝 Notes</h3>
                                <p>{intervention.notes}</p>
                            </div>
                        )}

                        {/* Client History */}
                        {clientHistory.length > 0 && (
                            <div className="info-card">
                                <h3>📜 Historique client ({clientHistory.length} précédente{clientHistory.length > 1 ? 's' : ''})</h3>
                                <div style={{ marginTop: '10px' }}>
                                    {clientHistory.map((hist: any) => (
                                        <div
                                            key={hist.id}
                                            style={{
                                                padding: '10px',
                                                marginBottom: '8px',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '6px',
                                                borderLeft: `4px solid ${hist.statut === 'terminee' ? 'var(--success-color)' : hist.statut === 'annulee' ? 'var(--danger-color)' : 'var(--primary-color)'}`
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong>{hist.titre}</strong>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: hist.statut === 'terminee' ? 'var(--success-color)' : hist.statut === 'annulee' ? 'var(--danger-color)' : 'var(--primary-color)',
                                                    color: 'white'
                                                }}>
                                                    {hist.statut === 'terminee' ? 'Terminée' : hist.statut === 'annulee' ? 'Annulée' : hist.statut}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                📅 {new Date(hist.datePlanifiee).toLocaleDateString('fr-FR')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isEnCours && (
                            <button className="btn btn-primary btn-block" onClick={() => setCurrentStep(1)}>
                                Suivant →
                            </button>
                        )}
                    </div>
                )}

                {/* === STEP 1: HEURES === */}
                {currentStep === 1 && isEnCours && (
                    <div className="step-panel">
                        <div className="info-card">
                            <h3>🕐 Heures d'intervention</h3>
                            <div className="form-group">
                                <label>Heure d'arrivée</label>
                                <input
                                    type="datetime-local"
                                    value={heureArrivee}
                                    onChange={(e) => setHeureArrivee(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Heure de départ</label>
                                <input
                                    type="datetime-local"
                                    value={heureDepart}
                                    onChange={(e) => setHeureDepart(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            <button className="btn btn-secondary" onClick={handleSaveHours} disabled={!heureArrivee || !heureDepart}>
                                💾 Enregistrer
                            </button>
                        </div>

                        <div className="step-nav">
                            <button className="btn btn-outline" onClick={() => setCurrentStep(0)}>← Précédent</button>
                            <button className="btn btn-primary" onClick={() => setCurrentStep(2)}>Suivant →</button>
                        </div>
                    </div>
                )}

                {/* === STEP 2: MATERIEL === */}
                {currentStep === 2 && isEnCours && (
                    <div className="step-panel">
                        <div className="info-card">
                            <h3>🔧 Matériel</h3>
                            <div className="equipment-actions">
                                <button
                                    className="equipment-btn install-btn"
                                    onClick={() => { setScanAction('install'); setShowScanner(true); }}
                                >
                                    <span className="eq-btn-icon">📥</span>
                                    <span className="eq-btn-text">Installation</span>
                                    <span className="eq-btn-hint">Matériel posé</span>
                                </button>
                                <button
                                    className="equipment-btn retrait-btn"
                                    onClick={() => { setScanAction('retrait'); setShowScanner(true); }}
                                >
                                    <span className="eq-btn-icon">📤</span>
                                    <span className="eq-btn-text">Retrait</span>
                                    <span className="eq-btn-hint">Matériel repris</span>
                                </button>
                            </div>

                            {equipments.length > 0 && (
                                <div className="equipment-list">
                                    {equipments.map((eq, i) => (
                                        <div key={i} className={`equipment-item ${eq.action}`}>
                                            <span>{eq.action === 'install' ? '📥' : '📤'} {eq.nom} x{eq.quantite}</span>
                                            <button className="btn-remove" onClick={() => setEquipments(equipments.filter((_, idx) => idx !== i))}>✕</button>
                                        </div>
                                    ))}
                                    <button className="btn btn-success" onClick={handleSaveEquipments}>
                                        💾 Enregistrer le matériel
                                    </button>
                                </div>
                            )}

                            {intervention.equipements && intervention.equipements.length > 0 && (
                                <div className="saved-equipment">
                                    <h4>Matériel enregistré</h4>
                                    {intervention.equipements.map((eq: any) => (
                                        <div key={eq.id} className="equipment-item saved">
                                            {eq.action === 'install' ? '📥' : '📤'} {eq.stock?.nomMateriel || eq.nom} x{eq.quantite}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* No equipment option */}
                            {equipments.length === 0 && (!intervention.equipements || intervention.equipements.length === 0) && (
                                <div className="no-equipment-option">
                                    <p>Aucun matériel à déclarer ?</p>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setCurrentStep(3)}
                                    >
                                        ✓ Pas de matériel installé/repris
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="step-nav">
                            <button className="btn btn-outline" onClick={() => setCurrentStep(1)}>← Précédent</button>
                            <button className="btn btn-primary" onClick={() => setCurrentStep(3)}>Suivant →</button>
                        </div>
                    </div>
                )}

                {/* === STEP 3: RAPPORT === */}
                {currentStep === 3 && isEnCours && (
                    <div className="step-panel">
                        <div className="info-card">
                            <h3>📝 Rapport technicien</h3>
                            <div className="form-group">
                                <label>
                                    Commentaire <span className="required">*</span>
                                </label>
                                <textarea
                                    value={commentaire}
                                    onChange={(e) => setCommentaire(e.target.value)}
                                    placeholder="Décrivez le travail effectué, les observations, les problèmes rencontrés..."
                                    className={`form-textarea ${!commentaire.trim() ? 'field-required' : ''}`}
                                    rows={6}
                                />
                                {!commentaire.trim() && (
                                    <p className="field-hint">⚠️ Le commentaire est obligatoire pour passer à l'étape suivante</p>
                                )}
                            </div>
                        </div>

                        <PhotoCapture
                            photos={photos}
                            onPhotoAdd={(photo) => setPhotos([...photos, photo])}
                            onPhotoRemove={(photoId) => setPhotos(photos.filter(p => p.id !== photoId))}
                        />

                        <div className="step-nav">
                            <button className="btn btn-outline" onClick={() => setCurrentStep(2)}>← Précédent</button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    if (!commentaire.trim()) {
                                        alert('⚠️ Veuillez saisir un commentaire avant de continuer');
                                        // Scroll to and focus the textarea
                                        const textarea = document.querySelector('.form-textarea') as HTMLTextAreaElement;
                                        if (textarea) {
                                            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            setTimeout(() => textarea.focus(), 300);
                                        }
                                        return;
                                    }
                                    setCurrentStep(4);
                                }}
                            >
                                Suivant →
                            </button>
                        </div>
                    </div>
                )}

                {/* === STEP 4: SIGNATURE TECHNICIEN === */}
                {currentStep === 4 && isEnCours && (
                    <div className="step-panel">
                        <div className="info-card">
                            <h3>✍️ Signature du technicien</h3>
                            <p className="hint">Signez pour confirmer les travaux effectués</p>
                        </div>

                        <SignaturePad
                            onSignatureChange={setSignatureTechnicien}
                            initialSignature={signatureTechnicien || undefined}
                            label="Votre signature"
                        />

                        <div className="step-nav">
                            <button className="btn btn-outline" onClick={() => setCurrentStep(3)}>← Précédent</button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    if (!signatureTechnicien) {
                                        alert('⚠️ Veuillez signer avant de continuer');
                                        return;
                                    }
                                    setCurrentStep(5);
                                }}
                            >
                                Suivant →
                            </button>
                        </div>
                    </div>
                )}

                {/* === STEP 5: SIGNATURE CLIENT === */}
                {currentStep === 5 && isEnCours && (
                    <div className="step-panel">
                        <div className="info-card">
                            <h3>✍️ Signature du client</h3>
                            <p className="hint">Faites signer le client pour valider l'intervention</p>
                        </div>

                        <SignaturePad
                            onSignatureChange={setSignatureClient}
                            initialSignature={signatureClient || undefined}
                            label="Signature du client"
                        />

                        <div className="closure-section">
                            <h3>✅ Clôturer l'intervention</h3>
                            <p className="hint">Vérifiez que toutes les informations sont correctes avant de clôturer.</p>
                            <button
                                className="btn btn-success btn-lg btn-block"
                                type="button"
                                onClick={() => {
                                    console.log('Closure button clicked!');
                                    console.log('signatureClient:', signatureClient);
                                    if (!signatureClient) {
                                        alert('⚠️ La signature du client est obligatoire');
                                        return;
                                    }
                                    console.log('Calling handleClose...');
                                    handleClose();
                                }}
                            >
                                ✅ Clôturer l'intervention
                            </button>
                        </div>

                        <div className="step-nav">
                            <button className="btn btn-outline" onClick={() => setCurrentStep(4)}>← Précédent</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Scanner Modal */}
            {showScanner && (
                <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
            )}
        </div>
    );
};

export default TechnicianInterventionView;
