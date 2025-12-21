import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';

function ClientForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nom: '',
        sousLieu: '',
        rue: '',
        codePostal: '',
        ville: '',
        contact: '',
        telephone: '',
        email: '',
        notes: '',
    });

    useEffect(() => {
        if (isEditing) {
            loadClient();
        }
    }, [id]);

    const loadClient = async () => {
        try {
            const client = await apiService.getClientById(id!);
            setFormData({
                nom: client.nom || '',
                sousLieu: client.sousLieu || '',
                rue: client.rue || '',
                codePostal: client.codePostal || '',
                ville: client.ville || '',
                contact: client.contact || '',
                telephone: client.telephone || '',
                email: client.email || '',
                notes: client.notes || '',
            });
        } catch (err) {
            console.error('Erreur chargement client:', err);
            setError('Client non trouvé');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            if (isEditing) {
                await apiService.updateClient(id!, formData);
            } else {
                await apiService.createClient(formData);
            }
            navigate('/clients');
        } catch (err) {
            console.error('Erreur sauvegarde:', err);
            setError('Erreur lors de la sauvegarde. Vérifiez les champs obligatoires.');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        border: '1.5px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '8px',
        fontSize: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--text-primary)',
        transition: 'all 0.2s',
        outline: 'none'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: 'var(--text-secondary)'
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm" style={{ marginBottom: '24px' }}>
                <button onClick={() => navigate('/clients')} className="btn btn-back" style={{ marginBottom: '12px' }}>
                    ← Retour aux clients
                </button>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isEditing ? '✏️ Modifier le client' : '➕ Nouveau client'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {isEditing ? 'Modifiez les informations du client' : 'Renseignez les informations du nouveau client'}
                </p>
            </div>

            {/* Form */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        marginBottom: '20px',
                        borderRadius: '8px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: '20px' }}>
                        {/* Nom */}
                        <div>
                            <label style={labelStyle}>Nom / Entreprise *</label>
                            <input
                                type="text"
                                value={formData.nom}
                                onChange={(e) => handleChange('nom', e.target.value)}
                                required
                                placeholder="Ex: SARL Dupont"
                                style={inputStyle}
                            />
                        </div>

                        {/* Sous-lieu */}
                        <div>
                            <label style={labelStyle}>Sous-lieu (optionnel)</label>
                            <input
                                type="text"
                                value={formData.sousLieu}
                                onChange={(e) => handleChange('sousLieu', e.target.value)}
                                placeholder="Ex: Bâtiment A, Étage 2"
                                style={inputStyle}
                            />
                        </div>

                        {/* Adresse */}
                        <div>
                            <label style={labelStyle}>Rue *</label>
                            <input
                                type="text"
                                value={formData.rue}
                                onChange={(e) => handleChange('rue', e.target.value)}
                                required
                                placeholder="Ex: 12 rue de la Paix"
                                style={inputStyle}
                            />
                        </div>

                        {/* Code postal + Ville */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Code postal *</label>
                                <input
                                    type="text"
                                    value={formData.codePostal}
                                    onChange={(e) => handleChange('codePostal', e.target.value)}
                                    required
                                    placeholder="75001"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Ville *</label>
                                <input
                                    type="text"
                                    value={formData.ville}
                                    onChange={(e) => handleChange('ville', e.target.value)}
                                    required
                                    placeholder="Paris"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <label style={labelStyle}>Nom du contact *</label>
                            <input
                                type="text"
                                value={formData.contact}
                                onChange={(e) => handleChange('contact', e.target.value)}
                                required
                                placeholder="Ex: Jean Dupont"
                                style={inputStyle}
                            />
                        </div>

                        {/* Téléphone */}
                        <div>
                            <label style={labelStyle}>Téléphone *</label>
                            <input
                                type="tel"
                                value={formData.telephone}
                                onChange={(e) => handleChange('telephone', e.target.value)}
                                required
                                placeholder="Ex: 06 12 34 56 78"
                                style={inputStyle}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label style={labelStyle}>Email (optionnel)</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="Ex: contact@entreprise.fr"
                                style={inputStyle}
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label style={labelStyle}>Notes / Commentaires (optionnel)</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Informations complémentaires sur ce client..."
                                rows={4}
                                style={{
                                    ...inputStyle,
                                    resize: 'vertical',
                                    minHeight: '100px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/clients')}
                            className="btn btn-secondary"
                            disabled={saving}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ minWidth: '150px' }}
                        >
                            {saving ? '⏳ Enregistrement...' : (isEditing ? '✓ Enregistrer' : '+ Créer le client')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ClientForm;
