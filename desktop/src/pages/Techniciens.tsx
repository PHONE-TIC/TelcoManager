import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';

function Techniciens() {
    const navigate = useNavigate();
    const [techniciens, setTechniciens] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedTech, setSelectedTech] = useState<any>(null);
    const [formData, setFormData] = useState({
        nom: '',
        username: '',
        password: '',
        role: 'technicien',
    });

    useEffect(() => {
        loadTechniciens();
    }, []);

    const loadTechniciens = async () => {
        try {
            const data = await apiService.getTechniciens();
            setTechniciens(data.techniciens);
        } catch (error) {
            console.error('Erreur lors du chargement des techniciens:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedTech) {
                const updateData: any = { nom: formData.nom, username: formData.username, role: formData.role };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await apiService.updateTechnicien(selectedTech.id, updateData);
            } else {
                await apiService.createTechnicien(formData);
            }
            setShowForm(false);
            setFormData({ nom: '', username: '', password: '', role: 'technicien' });
            setSelectedTech(null);
            loadTechniciens();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            alert('Erreur lors de la sauvegarde du technicien');
        }
    };

    const handleEdit = (e: React.MouseEvent, tech: any) => {
        e.stopPropagation();
        setSelectedTech(tech);
        setFormData({
            nom: tech.nom,
            username: tech.username,
            password: '',
            role: tech.role,
        });
        setShowForm(true);
    };

    if (loading) {
        return <div className="loading">Chargement...</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Techniciens</h1>
                <p className="page-subtitle">Gestion des techniciens et stock véhicule</p>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setSelectedTech(null);
                            setFormData({ nom: '', username: '', password: '', role: 'technicien' });
                            setShowForm(true);
                        }}
                    >
                        + Nouveau technicien
                    </button>
                </div>

                {showForm && (
                    <div style={{ backgroundColor: 'var(--bg-color)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <h3 style={{ marginBottom: '20px' }}>
                            {selectedTech ? 'Modifier le technicien' : 'Nouveau technicien'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label className="form-label">Nom *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.nom}
                                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nom d'utilisateur *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Mot de passe {selectedTech ? '(laisser vide pour ne pas changer)' : '*'}
                                    </label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!selectedTech}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rôle *</label>
                                    <select
                                        className="form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="technicien">Technicien</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-primary">
                                    {selectedTech ? 'Mettre à jour' : 'Créer'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setSelectedTech(null);
                                    }}
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <table className="table">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Nom d'utilisateur</th>
                            <th>Rôle</th>
                            <th>Statut</th>
                            <th>Interventions</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {techniciens.map((tech) => (
                            <tr
                                key={tech.id}
                                className="clickable-row"
                                onClick={() => navigate(`/techniciens/${tech.id}`)}
                            >
                                <td><strong>{tech.nom}</strong></td>
                                <td>{tech.username}</td>
                                <td>
                                    <span className={tech.role === 'admin' ? 'badge badge-danger' : 'badge badge-info'}>
                                        {tech.role}
                                    </span>
                                </td>
                                <td>
                                    <span className={tech.active ? 'badge badge-success' : 'badge badge-danger'}>
                                        {tech.active ? 'Actif' : 'Inactif'}
                                    </span>
                                </td>
                                <td>{tech._count?.interventions || 0}</td>
                                <td>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '6px 12px' }}
                                        onClick={(e) => handleEdit(e, tech)}
                                    >
                                        ✏️ Modifier
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Techniciens;
