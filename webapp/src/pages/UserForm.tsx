import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { AppIcon } from '../components/AppIcon';
import './detail-form-harmonization.css';

function UserForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        prenom: '',
        nomFamille: '',
        username: '',
        password: '',
        role: 'technicien',
        active: true,
    });

    const generatePassword = useCallback(() => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let pass = '';
        for (let i = 0; i < 6; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password: pass }));
        setShowPassword(true); // Show password when generated
    }, []);

    const loadUser = useCallback(async () => {
        try {
            const user = await apiService.getTechnicienById(id!);
            // Heuristic to split name
            const nameParts = user.nom.split(' ');
            const prenom = nameParts[0] || '';
            const nomFamille = nameParts.slice(1).join(' ') || '';

            setFormData({
                prenom,
                nomFamille,
                username: user.username,
                password: '', // On ne charge pas le hash
                role: user.role,
                active: user.active !== undefined ? user.active : true,
            });
        } catch (err) {
            console.error('Erreur chargement utilisateur:', err);
            setError('Utilisateur non trouvé');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isEditing) {
            loadUser();
        } else {
            generatePassword();
        }
    }, [generatePassword, isEditing, loadUser]);

    // Auto-generate username when Preom/Nom change (only if not editing or username is empty/default)
    useEffect(() => {
        if (!isEditing && formData.prenom && formData.nomFamille) {
            const p = formData.prenom.trim().charAt(0).toLowerCase();
            const n = formData.nomFamille.trim().toLowerCase().replace(/\s+/g, '');
            // Simple normalization (remove accents)
            const normalizedP = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedN = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            setFormData(prev => ({ ...prev, username: `${normalizedP}${normalizedN}` }));
        }
    }, [formData.prenom, formData.nomFamille, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        const fullName = `${formData.prenom.trim()} ${formData.nomFamille.trim()}`;

        try {
            if (isEditing) {
                const updateData: Record<string, string | boolean> = {
                    nom: fullName,
                    username: formData.username,
                    role: formData.role,
                    active: formData.active
                };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await apiService.updateTechnicien(id!, updateData);
            } else {
                await apiService.createTechnicien({
                    nom: fullName,
                    username: formData.username,
                    password: formData.password,
                    role: formData.role,
                    active: formData.active
                });
            }
            navigate('/techniciens');
        } catch (err) {
            console.error('Erreur sauvegarde:', err);
            setError('Erreur lors de la sauvegarde. Nom d\'utilisateur peut-être déjà pris.');
        } finally {
            setSaving(false);
        }
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: 'var(--text-secondary)'
    };

    const inputStyle = {
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border-color)'
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="page-container mobile-form-shell harmonized-shell">
            {/* Header */}
            <div className="harmonized-detail-header">
                <button onClick={() => navigate('/techniciens')} className="harmonized-back-button">
                    ← Retour à la liste
                </button>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}><AppIcon name={isEditing ? 'edit' : 'plus'} size={24} /> {isEditing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {isEditing ? 'Modifiez les informations du compte' : 'Créez un nouveau compte utilisateur'}
                </p>
            </div>

            {/* Form */}
            <div className="harmonized-card">
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-message">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><AppIcon name="warning" size={18} /> {error}</span>
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: '20px' }}>
                        {/* Prénom et Nom */}
                        <div className="mobile-form-grid-2" style={{ gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Prénom *</label>
                                <input
                                    type="text"
                                    className="form-input-premium"
                                    style={inputStyle}
                                    value={formData.prenom}
                                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                    placeholder="Ex: Jean"
                                    required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Nom *</label>
                                <input
                                    type="text"
                                    className="form-input-premium"
                                    style={inputStyle}
                                    value={formData.nomFamille}
                                    onChange={(e) => setFormData({ ...formData, nomFamille: e.target.value })}
                                    placeholder="Ex: Dupont"
                                    required
                                />
                            </div>
                        </div>

                        {/* Identifiant et Rôle */}
                        <div className="mobile-form-grid-2" style={{ gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Identifiant (généré ou personnalisé) *</label>
                                <input
                                    type="text"
                                    className="form-input-premium"
                                    style={inputStyle}
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="jdupont"
                                    required
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Rôle *</label>
                                <select
                                    className="form-input-premium"
                                    style={inputStyle}
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="technicien">Technicien</option>
                                    <option value="gestionnaire">Gestionnaire</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>
                        </div>

                        {/* Mot de passe */}
                        <div>
                            <label style={labelStyle}>
                                Mot de passe {isEditing ? '(Laisser vide pour conserver)' : '*'}
                            </label>
                            <div className="flex gap-2">
                                <div className="relative w-full">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-input-premium"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={isEditing ? "••••••••" : "Mot de passe sécurisé"}
                                        required={!isEditing && !formData.password}
                                        minLength={6}
                                        style={{ ...inputStyle, paddingRight: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.2rem',
                                            color: 'var(--text-secondary)'
                                        }}
                                        title={showPassword ? "Masquer" : "Afficher"}
                                    >
                                        <AppIcon name="eye" size={18} />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="btn btn-secondary"
                                    style={{ whiteSpace: 'nowrap' }}
                                    title="Générer un nouveau mot de passe"
                                >
                                    Générer
                                </button>
                            </div>
                            {isEditing && <p className="text-xs text-gray-500 mt-1">Uniquement si vous souhaitez le changer</p>}
                        </div>

                        {isEditing && (
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="activeStatus"
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                    checked={formData.active}
                                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                />
                                <label htmlFor="activeStatus" className="text-sm text-gray-700 font-medium">
                                    Compte Actif
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="mobile-form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/techniciens')}
                            disabled={saving}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ minWidth: 0 }}
                        >
                            {saving ? 'Enregistrement...' : (isEditing ? 'Enregistrer' : 'Créer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UserForm;
