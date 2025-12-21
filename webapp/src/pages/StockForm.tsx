import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';

function StockForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        nomMateriel: '',
        reference: '',
        numeroSerie: '',
        codeBarre: '',
        categorie: '',
        fournisseur: '',
        quantite: 1,
        lowStockThreshold: 5,
        notes: '',
        statut: 'courant',
    });

    useEffect(() => {
        loadCategories();
        if (isEditing) {
            loadStock();
        }
    }, [id]);

    const loadCategories = async () => {
        try {
            const data = await apiService.getStock({ limit: 500 });
            const cats = [...new Set(data.stock.map((item: any) => item.categorie))].sort() as string[];
            setExistingCategories(cats);
        } catch (err) {
            console.error('Erreur chargement catégories:', err);
        }
    };

    const loadStock = async () => {
        try {
            const item = await apiService.getStockById(id!);
            setFormData({
                nomMateriel: item.nomMateriel || '',
                reference: item.reference || '',
                numeroSerie: item.numeroSerie || '',
                codeBarre: item.codeBarre || '',
                categorie: item.categorie || '',
                fournisseur: item.fournisseur || '',
                quantite: item.quantite || 1,
                lowStockThreshold: item.lowStockThreshold ?? 5,
                notes: item.notes || '',
                statut: item.statut || 'courant',
            });
        } catch (err) {
            console.error('Erreur chargement stock:', err);
            setError('Article non trouvé');
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
                await apiService.updateStock(id!, formData);
            } else {
                await apiService.createStock(formData);
            }
            navigate('/stock');
        } catch (err) {
            console.error('Erreur sauvegarde:', err);
            setError('Erreur lors de la sauvegarde. Vérifiez les champs obligatoires.');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: string | number) => {
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
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <button
                    onClick={() => navigate('/stock')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1.5px solid rgba(255,255,255,0.3)',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    ← Retour au stock
                </button>
                <h1 className="text-2xl font-bold text-gray-800">
                    {isEditing ? '✏️ Modifier le matériel' : '📦 Nouveau matériel'}
                </h1>
                <p className="text-gray-500">
                    {isEditing ? 'Modifiez les informations du matériel' : 'Ajoutez un nouveau matériel au stock'}
                </p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {/* Nom du matériel */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Nom du matériel *</label>
                            <input
                                type="text"
                                value={formData.nomMateriel}
                                onChange={(e) => handleChange('nomMateriel', e.target.value)}
                                placeholder="Ex: Switch Cisco 24 ports"
                                style={inputStyle}
                                required
                            />
                        </div>

                        {/* Référence */}
                        <div>
                            <label style={labelStyle}>Référence *</label>
                            <input
                                type="text"
                                value={formData.reference}
                                onChange={(e) => handleChange('reference', e.target.value)}
                                placeholder="Ex: WS-C2960X-24TD-L"
                                style={inputStyle}
                                required
                            />
                        </div>

                        {/* Numéro de série */}
                        <div>
                            <label style={labelStyle}>Numéro de série</label>
                            <input
                                type="text"
                                value={formData.numeroSerie}
                                onChange={(e) => handleChange('numeroSerie', e.target.value)}
                                placeholder="Ex: FCW1234ABCD"
                                style={inputStyle}
                            />
                        </div>

                        {/* Code-barres */}
                        <div>
                            <label style={labelStyle}>Code-barres</label>
                            <input
                                type="text"
                                value={formData.codeBarre}
                                onChange={(e) => handleChange('codeBarre', e.target.value)}
                                placeholder="Optionnel"
                                style={inputStyle}
                            />
                        </div>

                        {/* Catégorie */}
                        <div>
                            <label style={labelStyle}>Catégorie *</label>
                            <input
                                type="text"
                                value={formData.categorie}
                                onChange={(e) => handleChange('categorie', e.target.value)}
                                placeholder="Ex: Réseau, Sécurité, Téléphonie..."
                                list="categories"
                                style={inputStyle}
                                required
                            />
                            <datalist id="categories">
                                {existingCategories.map((cat, i) => <option key={i} value={cat} />)}
                            </datalist>
                        </div>

                        {/* Fournisseur */}
                        <div>
                            <label style={labelStyle}>Fournisseur</label>
                            <input
                                type="text"
                                value={formData.fournisseur}
                                onChange={(e) => handleChange('fournisseur', e.target.value)}
                                placeholder="Ex: Rexel, Sonepar..."
                                style={inputStyle}
                            />
                        </div>

                        {/* Quantité */}
                        <div>
                            <label style={labelStyle}>Quantité *</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.quantite}
                                onChange={(e) => handleChange('quantite', parseInt(e.target.value) || 0)}
                                style={inputStyle}
                                required
                            />
                        </div>

                        {/* Seuil alerte stock faible */}
                        <div>
                            <label style={labelStyle}>
                                Seuil d'alerte
                                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                    (alerte si quantité ≤ seuil)
                                </span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.lowStockThreshold}
                                onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value) || 0)}
                                style={inputStyle}
                            />
                        </div>

                        {/* Statut */}
                        <div>
                            <label style={labelStyle}>Statut</label>
                            <select
                                value={formData.statut}
                                onChange={(e) => handleChange('statut', e.target.value)}
                                className="form-input-premium"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="courant">📦 En stock</option>
                                <option value="hs">⚠️ Hors service</option>
                            </select>
                        </div>

                        {/* Notes */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Informations supplémentaires..."
                                rows={4}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/stock')}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '8px',
                                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.7 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            {saving ? '⏳ Enregistrement...' : (isEditing ? '💾 Enregistrer' : '➕ Créer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default StockForm;
