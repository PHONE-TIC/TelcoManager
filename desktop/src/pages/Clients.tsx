import React, { useEffect, useState } from 'react';
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
}

function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState({
        nom: '',
        sousLieu: '',
        rue: '',
        codePostal: '',
        ville: '',
        contact: '',
        telephone: '',
    });
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadClients();
    }, [search]);

    const loadClients = async () => {
        try {
            const data = await apiService.getClients({ search, limit: 100 });
            setClients(data.clients);
        } catch (error) {
            console.error('Erreur lors du chargement des clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedClient) {
                await apiService.updateClient(selectedClient.id, formData);
            } else {
                await apiService.createClient(formData);
            }
            setShowForm(false);
            setShowForm(false);
            setFormData({ nom: '', sousLieu: '', rue: '', codePostal: '', ville: '', contact: '', telephone: '' });
            setSelectedClient(null);
            loadClients();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            alert('Erreur lors de la sauvegarde du client');
        }
    };

    const handleEdit = (client: Client) => {
        setSelectedClient(client);
        setFormData({
            nom: client.nom,
            sousLieu: client.sousLieu || '',
            rue: client.rue,
            codePostal: client.codePostal,
            ville: client.ville,
            contact: client.contact,
            telephone: client.telephone,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

        try {
            await apiService.deleteClient(id);
            loadClients();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression du client');
        }
    };

    if (loading) {
        return <div className="loading">Chargement...</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Clients</h1>
                <p className="page-subtitle">Gestion des clients</p>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '20px' }}>
                    <div className="search-container" style={{ maxWidth: '300px' }}>
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Rechercher un client..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setSelectedClient(null);
                            setFormData({ nom: '', sousLieu: '', rue: '', codePostal: '', ville: '', contact: '', telephone: '' });
                            setShowForm(true);
                        }}
                    >
                        + Nouveau client
                    </button>
                </div>

                <table className="table">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Contact</th>
                            <th>Téléphone</th>
                            <th>Adresse</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.length > 0 ? (
                            clients.map((client) => (
                                <tr key={client.id}>
                                    <td><strong>{client.nom}</strong></td>
                                    <td>{client.contact}</td>
                                    <td>{client.telephone}</td>
                                    <td>
                                        {client.rue}<br />
                                        {client.codePostal} {client.ville}
                                        {client.sousLieu && <small><br />📍 {client.sousLieu}</small>}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-primary"
                                            style={{ marginRight: '5px', padding: '6px 12px' }}
                                            onClick={() => handleEdit(client)}
                                        >
                                            ✏️ Modifier
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            style={{ padding: '6px 12px' }}
                                            onClick={() => handleDelete(client.id)}
                                        >
                                            🗑️ Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    Aucun client trouvé
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de création/édition */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', width: '100%' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>
                                {selectedClient ? 'Modifier le client' : 'Nouveau client'}
                            </h2>
                            <button
                                onClick={() => { setShowForm(false); setSelectedClient(null); }}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Nom de l'entreprise / Client *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.nom}
                                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                    placeholder="Ex: Entreprise ABC"
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label className="form-label">Contact Principal *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        placeholder="Ex: M. Dupont"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Téléphone *</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={formData.telephone}
                                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                        placeholder="Ex: 01 23 45 67 89"
                                        required
                                    />
                                </div>
                            </div>



                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label className="form-label">Sous-lieu (Optionnel)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.sousLieu}
                                    onChange={(e) => setFormData({ ...formData, sousLieu: e.target.value })}
                                    placeholder="Ex: Agence Centre, Magasin Principal..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Numéro et Rue *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.rue}
                                    onChange={(e) => setFormData({ ...formData, rue: e.target.value })}
                                    placeholder="Ex: 12 Rue de la Paix"
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label className="form-label">Code Postal *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.codePostal}
                                        onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                                        placeholder="Ex: 75000"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ville *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.ville}
                                        onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                                        placeholder="Ex: Paris"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setSelectedClient(null);
                                    }}
                                >
                                    Annuler
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {selectedClient ? 'Enregistrer les modifications' : 'Créer le client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }
        </div >
    );
}

export default Clients;
