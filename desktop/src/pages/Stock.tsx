import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api.service';

function Stock() {
    const [stock, setStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('courant');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [formData, setFormData] = useState({
        nomMateriel: '',
        reference: '',
        numeroSerie: '',
        codeBarre: '',
        categorie: '',
        fournisseur: '',
        quantite: 1,
        notes: '',
    });

    useEffect(() => {
        loadStock();
    }, [filter]);

    const loadStock = async () => {
        try {
            const data = await apiService.getStock({ statut: filter, limit: 200 });
            setStock(data.stock);
        } catch (error) {
            console.error('Erreur lors du chargement du stock:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrer le stock selon la recherche
    const filteredStock = stock.filter(item =>
        item.nomMateriel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.numeroSerie && item.numeroSerie.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.codeBarre && item.codeBarre.includes(searchTerm)) ||
        item.categorie.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.fournisseur && item.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedItem) {
                await apiService.updateStock(selectedItem.id, formData);
            } else {
                await apiService.createStock({ ...formData, statut: filter });
            }
            setShowForm(false);
            setFormData({
                nomMateriel: '',
                reference: '',
                numeroSerie: '',
                codeBarre: '',
                categorie: '',
                fournisseur: '',
                quantite: 1,
                notes: '',
            });
            setSelectedItem(null);
            loadStock();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            alert('Erreur lors de la sauvegarde de l\'article');
        }
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setFormData({
            nomMateriel: item.nomMateriel,
            reference: item.reference,
            numeroSerie: item.numeroSerie || '',
            codeBarre: item.codeBarre || '',
            categorie: item.categorie,
            fournisseur: item.fournisseur || '',
            quantite: item.quantite,
            notes: item.notes || '',
        });
        setShowForm(true);
    };

    const handleMoveToHS = async (id: string, nom: string) => {
        if (!confirm(`Déplacer "${nom}" vers le stock HS ?`)) return;

        try {
            await apiService.moveToHS(id, {});
            loadStock();
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du déplacement');
        }
    };

    if (loading) {
        return <div className="loading">Chargement...</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Stock</h1>
                <p className="page-subtitle">Gestion du stock matériel</p>
            </div>

            <div className="card">
                {showForm ? (
                    <div key="form" className="fade-in" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowForm(false);
                                    setSelectedItem(null);
                                }}
                                style={{ marginRight: '15px' }}
                            >
                                ← Retour à la liste
                            </button>
                            <h3 style={{ margin: 0 }}>
                                {selectedItem ? 'Modifier le matériel' : 'Nouveau matériel'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label className="form-label">Nom du matériel *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.nomMateriel}
                                        onChange={(e) => setFormData({ ...formData, nomMateriel: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Référence *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.reference}
                                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Numéro de Série *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.numeroSerie}
                                        onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Code-barres</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.codeBarre}
                                        onChange={(e) => setFormData({ ...formData, codeBarre: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Catégorie *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.categorie}
                                        onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                                        placeholder="ex: Réseau, Sécurité..."
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fournisseur</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.fournisseur}
                                        onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                                        placeholder="ex: Rexel, Sonepar..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Quantité *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        value={formData.quantite}
                                        onChange={(e) => setFormData({ ...formData, quantite: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn btn-primary">{selectedItem ? 'Mettre à jour' : 'Créer'}</button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setSelectedItem(null);
                                    }}
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div key="list" className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className={`btn ${filter === 'courant' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilter('courant')}
                                >
                                    📦 Stock Courant
                                </button>
                                <button
                                    className={`btn ${filter === 'hs' ? 'btn-danger' : 'btn-secondary'}`}
                                    onClick={() => setFilter('hs')}
                                >
                                    ⚠️ Stock HS
                                </button>
                            </div>

                            <div className="search-container" style={{ maxWidth: '300px' }}>
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setSelectedItem(null);
                                    setFormData({
                                        nomMateriel: '',
                                        reference: '',
                                        numeroSerie: '',
                                        codeBarre: '',
                                        categorie: '',
                                        fournisseur: '',
                                        quantite: 1,
                                        notes: '',
                                    });
                                    setShowForm(true);
                                }}
                            >
                                + Nouveau matériel
                            </button>
                        </div>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Matériel</th>
                                    <th>Référence</th>
                                    <th>N° Série</th>
                                    <th>Fournisseur</th>
                                    <th>Code-barres</th>
                                    <th>Catégorie</th>
                                    <th>Quantité</th>
                                    {filter === 'courant' && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStock.length > 0 ? (
                                    filteredStock.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.nomMateriel}</td>
                                            <td>{item.reference}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{item.numeroSerie || '-'}</td>
                                            <td>{item.fournisseur || '-'}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{item.codeBarre || '-'}</td>
                                            <td>
                                                <span className="badge badge-secondary">{item.categorie}</span>
                                            </td>
                                            <td>
                                                <span className="badge badge-info">{item.quantite}</span>
                                            </td>
                                            {filter === 'courant' && (
                                                <td>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ marginRight: '5px', padding: '6px 12px' }}
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        ✏️ Modifier
                                                    </button>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ padding: '6px 12px' }}
                                                        onClick={() => handleMoveToHS(item.id, item.nomMateriel)}
                                                    >
                                                        → Déplacer vers HS
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={filter === 'courant' ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            Aucun article en stock {filter}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Stock;
