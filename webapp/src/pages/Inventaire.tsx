import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';
import moment from 'moment';
import { generateInventoryPDF } from '../utils/inventoryPdf';

type FilterType = 'all' | 'uncounted' | 'discrepancy' | 'ok';

function Inventaire() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [itemFilter, setItemFilter] = useState<FilterType>('all');

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

    const handleUpdateItemNotes = (itemId: string, notes: string) => {
        if (!currentSession) return;

        const updatedItems = currentSession.items.map((item: any) =>
            item.id === itemId ? { ...item, notes } : item
        );

        setCurrentSession({ ...currentSession, items: updatedItems });
    };

    const handleSaveProgress = async () => {
        if (!currentSession) return;

        try {
            await apiService.updateInventoryItems(currentSession.id, currentSession.items);
            alert('Progression sauvegardée !');
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
            await apiService.updateInventoryItems(currentSession.id, currentSession.items);
            await apiService.finalizeInventorySession(currentSession.id);
            alert('Inventaire finalisé et stock mis à jour !');
            loadSessions();
            loadSessionDetails(currentSession.id);
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

    // Stats helpers
    const getSessionStats = () => {
        if (!currentSession) return { counted: 0, total: 0, discrepancies: 0, ok: 0 };
        const items = currentSession.items || [];
        const counted = items.filter((i: any) => i.countedQuantity !== null).length;
        const discrepancies = items.filter((i: any) =>
            i.countedQuantity !== null && i.countedQuantity !== i.expectedQuantity
        ).length;
        const ok = items.filter((i: any) =>
            i.countedQuantity !== null && i.countedQuantity === i.expectedQuantity
        ).length;
        return { counted, total: items.length, discrepancies, ok };
    };

    // Filter items
    const getFilteredItems = () => {
        if (!currentSession) return [];

        let items = currentSession.items.filter((item: any) =>
            item.stock.nomMateriel.toLowerCase().includes(search.toLowerCase()) ||
            item.stock.reference.toLowerCase().includes(search.toLowerCase()) ||
            (item.stock.codeBarre && item.stock.codeBarre.includes(search))
        );

        switch (itemFilter) {
            case 'uncounted':
                return items.filter((i: any) => i.countedQuantity === null);
            case 'discrepancy':
                return items.filter((i: any) => i.countedQuantity !== null && i.countedQuantity !== i.expectedQuantity);
            case 'ok':
                return items.filter((i: any) => i.countedQuantity !== null && i.countedQuantity === i.expectedQuantity);
            default:
                return items;
        }
    };

    // --- RENDER ---

    if (loading && !currentSession && sessions.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (currentSession) {
        // VUE DÉTAIL SESSION
        const isCompleted = currentSession.status === 'completed';
        const stats = getSessionStats();
        const filteredItems = getFilteredItems();
        const progressPercent = stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0;

        return (
            <div className="space-y-6" style={{ color: 'var(--text-primary)' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-primary)',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCurrentSession(null)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 500
                            }}
                        >
                            ← Retour
                        </button>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                    📋 Inventaire du {moment(currentSession.date).format('DD/MM/YYYY')}
                                </h1>
                                {isCompleted ? (
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white'
                                    }}>✓ Finalisé</span>
                                ) : (
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: 'white'
                                    }}>📝 Brouillon</span>
                                )}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{currentSession.items.length} articles à inventorier</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => generateInventoryPDF(currentSession)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
                            }}
                        >🖨️ Export PDF</button>
                        {!isCompleted && (
                            <>
                                <button
                                    onClick={handleSaveProgress}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)'
                                    }}
                                >💾 Sauvegarder</button>
                                <button
                                    onClick={handleFinalize}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                                    }}
                                >✅ Finaliser</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Progress Bar + Stats */}
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 600 }}>Progression</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {stats.counted} / {stats.total} articles comptés
                        </span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '12px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '6px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: progressPercent === 100
                                ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: '6px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: '#10b981'
                            }} />
                            <span style={{ fontSize: '0.9rem' }}>{stats.ok} conformes</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: '#ef4444'
                            }} />
                            <span style={{ fontSize: '0.9rem' }}>{stats.discrepancies} écarts</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: 'var(--text-secondary)',
                                opacity: 0.5
                            }} />
                            <span style={{ fontSize: '0.9rem' }}>{stats.total - stats.counted} non comptés</span>
                        </div>
                    </div>
                </div>

                {/* Filters + Search */}
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Filter buttons */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { key: 'all', label: '📦 Tous', count: stats.total },
                                { key: 'uncounted', label: '⏳ Non comptés', count: stats.total - stats.counted },
                                { key: 'discrepancy', label: '⚠️ Écarts', count: stats.discrepancies },
                                { key: 'ok', label: '✅ Conformes', count: stats.ok }
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setItemFilter(f.key as FilterType)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: itemFilter === f.key
                                            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                            : 'var(--bg-secondary)',
                                        color: itemFilter === f.key ? 'white' : 'var(--text-primary)',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {f.label}
                                    <span style={{
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        background: itemFilter === f.key ? 'rgba(255,255,255,0.2)' : 'var(--border-color)',
                                        fontSize: '0.75rem'
                                    }}>{f.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative" style={{ minWidth: '200px', maxWidth: '300px', width: '100%' }}>
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ fontSize: '16px' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px 10px 40px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    padding: '20px',
                    overflowX: 'auto'
                }}>
                    <table className="table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Matériel</th>
                                <th>Référence</th>
                                <th>Code-barres</th>
                                <th style={{ textAlign: 'center' }}>Qté Théorique</th>
                                <th style={{ textAlign: 'center', width: '120px' }}>Qté Comptée</th>
                                <th style={{ textAlign: 'center' }}>Écart</th>
                                <th style={{ width: '150px' }}>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item: any) => {
                                const counted = item.countedQuantity;
                                const expected = item.expectedQuantity;
                                const diff = counted !== null ? counted - expected : 0;
                                const hasDiff = counted !== null && diff !== 0;

                                return (
                                    <tr key={item.id} style={{ backgroundColor: hasDiff ? 'rgba(239, 68, 68, 0.08)' : 'inherit' }}>
                                        <td>
                                            <div className="flex flex-col">
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.stock.nomMateriel}</span>
                                            </div>
                                        </td>
                                        <td><code style={{ fontSize: '0.85em', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{item.stock.reference}</code></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.9em', color: 'var(--text-secondary)' }}>{item.stock.codeBarre || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                background: 'rgba(59, 130, 246, 0.15)',
                                                color: '#3b82f6'
                                            }}>{expected}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isCompleted ? (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    background: hasDiff ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                    color: hasDiff ? '#ef4444' : '#10b981'
                                                }}>
                                                    {counted !== null ? counted : '-'}
                                                </span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    style={{
                                                        width: '80px',
                                                        padding: '8px',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '8px',
                                                        textAlign: 'center',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                        outline: 'none'
                                                    }}
                                                    value={counted !== null ? counted : ''}
                                                    onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                                                    placeholder="-"
                                                    min="0"
                                                />
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {counted !== null ? (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    background: diff > 0 ? 'rgba(16, 185, 129, 0.15)' : diff < 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                                                    color: diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : 'var(--text-secondary)'
                                                }}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            {isCompleted ? (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.notes || '-'}</span>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="Notes..."
                                                    value={item.notes || ''}
                                                    onChange={(e) => handleUpdateItemNotes(item.id, e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 10px',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                        outline: 'none'
                                                    }}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredItems.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                            <p>Aucun article trouvé avec ce filtre</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // VUE LISTE SESSIONS
    return (
        <div className="space-y-6" style={{ color: 'var(--text-primary)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-primary)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📋 Inventaire</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Historique et sessions en cours</p>
                </div>
                <button
                    onClick={() => setShowNewSessionModal(true)}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    + Nouvel Inventaire
                </button>
            </div>

            {/* Stats */}
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    borderLeft: '4px solid var(--primary-color)'
                }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{sessions.length}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sessions d'inventaire</div>
                </div>
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    borderLeft: '4px solid #f59e0b'
                }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        {sessions.filter(s => s.status !== 'completed').length}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>En cours</div>
                </div>
                <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    borderLeft: '4px solid #10b981'
                }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        {sessions.filter(s => s.status === 'completed').length}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Finalisés</div>
                </div>
            </div>

            {/* Modal création */}
            {showNewSessionModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '16px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        width: '100%',
                        maxWidth: '450px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '20px 24px',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)'
                        }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>📋 Démarrer un inventaire</h2>
                            <button
                                onClick={() => setShowNewSessionModal(false)}
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
                        <div style={{ padding: '24px' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Cela va créer une copie de l'état actuel du stock pour inventaire.
                            </p>
                            <textarea
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    resize: 'vertical',
                                    minHeight: '80px'
                                }}
                                placeholder="Notes (optionnel)..."
                                value={newSessionNotes}
                                onChange={(e) => setNewSessionNotes(e.target.value)}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                <button
                                    onClick={() => setShowNewSessionModal(false)}
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
                                    onClick={handleCreateSession}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.35)'
                                    }}
                                >
                                    Créer l'inventaire
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '20px',
                overflowX: 'auto'
            }}>
                <table className="table" style={{ width: '100%' }}>
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
                                        <div className="flex flex-col">
                                            <span style={{ fontWeight: 600 }}>{moment(session.date).format('DD/MM/YYYY HH:mm')}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MàJ {moment(session.updatedAt).fromNow()}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {session.status === 'completed' ? (
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: 'white'
                                            }}>✓ Finalisé</span>
                                        ) : (
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                color: 'white'
                                            }}>📝 Brouillon</span>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            color: '#3b82f6'
                                        }}>
                                            {session._count?.items || 0} articles
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{session.notes || <span style={{ opacity: 0.5 }}>-</span>}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => loadSessionDetails(session.id)}
                                                title="Ouvrir"
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                    color: 'white',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                👁️
                                            </button>
                                            {session.status !== 'completed' && (
                                                <button
                                                    onClick={() => handleDeleteSession(session.id)}
                                                    title="Supprimer"
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                        color: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5}>
                                    <div style={{ textAlign: 'center', padding: '48px' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Aucune session d'inventaire</h3>
                                        <p style={{ color: 'var(--text-secondary)' }}>Cliquez sur "Nouvel Inventaire" pour commencer.</p>
                                    </div>
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
