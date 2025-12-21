import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';
import moment from 'moment';
import { generateInventoryPDF } from '../utils/inventoryPdf';

function Inventaire() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Notes pour la nouvelle session
    const [newSessionNotes, setNewSessionNotes] = useState('');
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const data = await apiService.getInventorySessions();
            setSessions(data);
        } catch (error) {
            console.error('Erreur chargement sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSessionDetails = async (id: string) => {
        setLoading(true);
        try {
            const data = await apiService.getInventorySession(id);
            setCurrentSession(data);
        } catch (error) {
            console.error('Erreur chargement détail session:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async () => {
        if (!confirm('Créer un nouvel inventaire va prendre un instantané du stock courant. Continuer ?')) return;

        try {
            const session = await apiService.createInventorySession({ notes: newSessionNotes });
            setShowNewSessionModal(false);
            setNewSessionNotes('');
            loadSessions();
            // Charger directement la nouvelle session
            loadSessionDetails(session.id);
        } catch (error) {
            console.error('Erreur création session:', error);
            alert('Erreur lors de la création de la session');
        }
    };

    const handleUpdateQuantity = (itemId: string, qty: string) => {
        if (!currentSession) return;

        const quantity = qty === '' ? null : parseInt(qty);

        const updatedItems = currentSession.items.map((item: any) =>
            item.id === itemId ? { ...item, countedQuantity: quantity } : item
        );

        setCurrentSession({ ...currentSession, items: updatedItems });
    };

    const handleSaveProgress = async () => {
        if (!currentSession) return;

        try {
            await apiService.updateInventoryItems(currentSession.id, currentSession.items);
            alert('Progression sauvegardée !');
            // Recharger pour être sûr d'avoir les bonnes données (ex: updatedAt)
            loadSessionDetails(currentSession.id);
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            alert('Erreur lors de la sauvegarde');
        }
    };

    const handleFinalize = async () => {
        if (!currentSession) return;
        if (!confirm('ATTENTION : Finaliser l\'inventaire va mettre à jour les quantités du stock réel. Cette action est irréversible. Continuer ?')) return;

        try {
            // D'abord sauvegarder la progression actuelle
            await apiService.updateInventoryItems(currentSession.id, currentSession.items);

            // Puis finaliser
            await apiService.finalizeInventorySession(currentSession.id);
            alert('Inventaire finalisé et stock mis à jour !');
            loadSessions(); // Rafraîchir la liste (statut changé)
            loadSessionDetails(currentSession.id); // Rafraîchir le détail
        } catch (error) {
            console.error('Erreur finalisation:', error);
            alert('Erreur lors de la finalisation');
        }
    };

    const handleDeleteSession = async (id: string) => {
        if (!confirm('Supprimer cette session d\'inventaire ?')) return;
        try {
            await apiService.deleteInventorySession(id);
            loadSessions();
            if (currentSession && currentSession.id === id) {
                setCurrentSession(null);
            }
        } catch (error) {
            console.error('Erreur suppression:', error);
            alert('Impossible de supprimer cette session');
        }
    };

    // --- RENDER ---

    if (currentSession) {
        // VUE DÉTAIL SESSION (ACTIVE OU FINALISÉE)
        const isCompleted = currentSession.status === 'completed';
        const filteredItems = currentSession.items.filter((item: any) =>
            item.stock.nomMateriel.toLowerCase().includes(search.toLowerCase()) ||
            item.stock.reference.toLowerCase().includes(search.toLowerCase()) ||
            (item.stock.codeBarre && item.stock.codeBarre.includes(search))
        );

        return (
            <div className="fade-in">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button className="btn btn-secondary" onClick={() => setCurrentSession(null)}>← Retour</button>
                        <div>
                            <h1 className="page-title">
                                Inventaire du {moment(currentSession.date).format('DD/MM/YYYY')}
                                {isCompleted && <span className="badge badge-success" style={{ marginLeft: '10px', fontSize: '0.6em', verticalAlign: 'middle' }}>Finalisé</span>}
                                {!isCompleted && <span className="badge badge-warning" style={{ marginLeft: '10px', fontSize: '0.6em', verticalAlign: 'middle' }}>Brouillon</span>}
                            </h1>
                            <p className="page-subtitle">{currentSession.id} • {currentSession.items.length} articles</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-secondary" onClick={() => generateInventoryPDF(currentSession)}>🖨️ PDF</button>
                        {!isCompleted && (
                            <>
                                <button className="btn btn-primary" onClick={handleSaveProgress}>💾 Sauvegarder</button>
                                <button className="btn btn-danger" onClick={handleFinalize}>✅ Finaliser l'inventaire</button>
                            </>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="search-container" style={{ marginBottom: '20px', maxWidth: '400px' }}>
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Rechercher un article..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <table className="table">
                        <thead>
                            <tr>
                                <th>Matériel</th>
                                <th>Référence</th>
                                <th>Code-barres</th>
                                <th style={{ textAlign: 'center' }}>Qte Théorique</th>
                                <th style={{ textAlign: 'center', width: '150px' }}>Qte Comptée</th>
                                <th>Écart</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item: any) => {
                                const counted = item.countedQuantity;
                                const expected = item.expectedQuantity;
                                const diff = counted !== null ? counted - expected : 0;
                                const hasDiff = counted !== null && diff !== 0;

                                return (
                                    <tr key={item.id} style={{ backgroundColor: hasDiff ? 'rgba(231, 76, 60, 0.05)' : 'inherit' }}>
                                        <td>
                                            <strong>{item.stock.nomMateriel}</strong>
                                            {item.notes && <div style={{ fontSize: '0.8em', color: 'gray' }}>📝 {item.notes}</div>}
                                        </td>
                                        <td>{item.stock.reference}</td>
                                        <td>{item.stock.codeBarre || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{expected}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isCompleted ? (
                                                <strong>{counted !== null ? counted : '-'}</strong>
                                            ) : (
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: '80px', textAlign: 'center', padding: '4px' }}
                                                    value={counted !== null ? counted : ''}
                                                    onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                                                    placeholder="-"
                                                    min="0"
                                                />
                                            )}
                                        </td>
                                        <td style={{
                                            color: hasDiff ? (diff > 0 ? 'green' : 'red') : 'gray',
                                            fontWeight: hasDiff ? 'bold' : 'normal'
                                        }}>
                                            {counted !== null ? (diff > 0 ? `+${diff}` : diff) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // VUE LISTE SESSIONS
    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Inventaire</h1>
                <p className="page-subtitle">Historique et sessions en cours</p>
                <button className="btn btn-primary" onClick={() => setShowNewSessionModal(true)}>
                    + Nouvel inventaire
                </button>
            </div>

            {/* Modal création */}
            {showNewSessionModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Démarrer un nouvel inventaire</h3>
                        <p>Cela va créer une copie de l'état actuel du stock pour inventaire.</p>
                        <textarea
                            className="form-input"
                            placeholder="Notes (optionnel)..."
                            value={newSessionNotes}
                            onChange={(e) => setNewSessionNotes(e.target.value)}
                            style={{ width: '100%', marginBottom: '15px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowNewSessionModal(false)}>Annuler</button>
                            <button className="btn btn-primary" onClick={handleCreateSession}>Confirmer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Statut</th>
                            <th>Articles</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.length > 0 ? (
                            sessions.map((session) => (
                                <tr key={session.id}>
                                    <td>
                                        <strong>{moment(session.date).format('DD/MM/YYYY HH:mm')}</strong>
                                        <div style={{ fontSize: '0.8em', color: 'gray' }}>Mise à jour: {moment(session.updatedAt).fromNow()}</div>
                                    </td>
                                    <td>
                                        {session.status === 'completed'
                                            ? <span className="badge badge-success">Finalisé</span>
                                            : <span className="badge badge-warning">Brouillon</span>
                                        }
                                    </td>
                                    <td>{session._count?.items || 0}</td>
                                    <td>{session.notes || '-'}</td>
                                    <td>
                                        <button
                                            className="btn btn-primary"
                                            style={{ marginRight: '5px', padding: '6px 12px' }}
                                            onClick={() => loadSessionDetails(session.id)}
                                        >
                                            👁️ Ouvrir
                                        </button>
                                        {session.status !== 'completed' && (
                                            <button
                                                className="btn btn-danger"
                                                style={{ padding: '6px 12px' }}
                                                onClick={() => handleDeleteSession(session.id)}
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'gray' }}>
                                    Aucune session d'inventaire.<br />
                                    Cliquez sur "Nouvel inventaire" pour commencer.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Inventaire;
