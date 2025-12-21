import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';

function Stock() {
    const navigate = useNavigate();
    const [stock, setStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('courant');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortColumn, setSortColumn] = useState<string>('nomMateriel');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailItem, setDetailItem] = useState<any>(null);
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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStock();
    }, [filter]);

    const loadStock = async () => {
        try {
            const data = await apiService.getStock({ statut: filter, limit: 500 });
            setStock(data.stock);
        } catch (error) {
            console.error('Erreur lors du chargement du stock:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique categories for filter dropdown
    const categories = useMemo(() => [...new Set(stock.map(item => item.categorie))].sort(), [stock]);

    // Filter and sort stock
    const filteredStock = useMemo(() => {
        let result = stock.filter(item => {
            const matchesSearch = item.nomMateriel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.numeroSerie && item.numeroSerie.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.codeBarre && item.codeBarre.includes(searchTerm)) ||
                item.categorie.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.fournisseur && item.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = categoryFilter === 'all' || item.categorie === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        // Sort
        result.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [stock, searchTerm, categoryFilter, sortColumn, sortDirection]);

    // Stock statistics
    const totalItems = stock.length;
    const lowStockItems = stock.filter(item => item.quantite <= 2).length;
    const totalQuantity = stock.reduce((sum, item) => sum + item.quantite, 0);

    // Handle column sort
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Nom', 'Référence', 'N° Série', 'Code-barres', 'Catégorie', 'Fournisseur', 'Quantité', 'Statut'];
        const rows = filteredStock.map(item => [
            item.nomMateriel,
            item.reference,
            item.numeroSerie || '',
            item.codeBarre || '',
            item.categorie,
            item.fournisseur || '',
            item.quantite,
            filter
        ]);
        const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `stock_${filter}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
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
            setError('Erreur lors de la sauvegarde de l\'article');
        }
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
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

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
                gap: '12px'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📦 Stock</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestion du matériel et équipements</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={exportToCSV}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📥 Exporter CSV
                    </button>
                    <button
                        onClick={() => navigate('/stock/new')}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.35)'
                        }}
                    >
                        + Nouveau Matériel
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {[
                    { value: totalItems, label: `Articles ${filter === 'hs' ? 'HS' : 'en stock'}`, color: '#f97316' },
                    { value: totalQuantity, label: 'Quantité totale', color: '#3b82f6' },
                    { value: lowStockItems, label: 'Stock faible (≤2)', color: '#f59e0b' },
                    { value: categories.length, label: 'Catégories', color: '#10b981' }
                ].map((stat, idx) => (
                    <div key={idx} style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        borderLeft: `4px solid ${stat.color}`
                    }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stat.value}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters and Search */}
            <div style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '20px'
            }}>
                <div className="flex gap-4 mb-6 flex-wrap items-center justify-between">
                    {/* Left side: Status buttons + Category filter */}
                    <div className="flex gap-4 flex-wrap items-center">
                        {/* Status buttons */}
                        <div className="flex gap-2">
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

                        {/* Category filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{
                                padding: '10px 14px',
                                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                                border: '1px solid var(--border-color, #e5e5e5)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer',
                                minWidth: '160px'
                            }}
                        >
                            <option value="all">📁 Toutes catégories</option>
                            {categories.map((cat, i) => (
                                <option key={i} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Right side: Search input */}
                    <div className="relative" style={{ minWidth: '200px', maxWidth: '350px', width: '100%' }}>
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ fontSize: '16px' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px 10px 40px',
                                backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                                border: '1px solid var(--border-color, #e5e5e5)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249, 115, 22, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                </div>

                {/* Stock Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('nomMateriel')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Matériel {sortColumn === 'nomMateriel' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('reference')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Référence {sortColumn === 'reference' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>N° Série</th>
                                <th>Fournisseur</th>
                                <th onClick={() => handleSort('categorie')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Catégorie {sortColumn === 'categorie' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('quantite')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Quantité {sortColumn === 'quantite' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStock.length > 0 ? (
                                filteredStock.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800">{item.nomMateriel}</span>
                                                {item.codeBarre && <span className="text-xs text-gray-500">📊 {item.codeBarre}</span>}
                                            </div>
                                        </td>
                                        <td><code style={{ fontSize: '0.85em', background: 'var(--bg-color)', padding: '2px 6px', borderRadius: '4px' }}>{item.reference}</code></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{item.numeroSerie || '-'}</td>
                                        <td>{item.fournisseur || <span className="text-gray-400">-</span>}</td>
                                        <td>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                backgroundColor: '#dbeafe',
                                                color: '#1e40af'
                                            }}>
                                                {item.categorie}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    backgroundColor: item.quantite <= 0 ? '#fee2e2' : item.quantite <= (item.lowStockThreshold || 5) ? '#fef3c7' : '#d1fae5',
                                                    color: item.quantite <= 0 ? '#991b1b' : item.quantite <= (item.lowStockThreshold || 5) ? '#92400e' : '#065f46'
                                                }}>
                                                    {item.quantite} unité{item.quantite > 1 ? 's' : ''}
                                                </span>
                                                {item.quantite <= (item.lowStockThreshold || 5) && item.quantite > 0 && (
                                                    <span title={`Stock faible (seuil: ${item.lowStockThreshold || 5})`} style={{ cursor: 'help' }}>⚠️</span>
                                                )}
                                                {item.quantite <= 0 && (
                                                    <span title="Rupture de stock" style={{ cursor: 'help' }}>🔴</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {/* View Details Button */}
                                                <button
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        border: '1.5px solid rgba(255,255,255,0.25)',
                                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    onClick={() => navigate(`/stock/${item.id}`)}
                                                    title="Voir détails"
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                                                >
                                                    👁️
                                                </button>
                                                {/* Edit Button */}
                                                <button
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        border: '1.5px solid rgba(255,255,255,0.25)',
                                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    onClick={() => navigate(`/stock/${item.id}/edit`)}
                                                    title="Modifier"
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                                                >
                                                    ✏️
                                                </button>
                                                {/* Move to HS Button (only for courant stock) */}
                                                {filter === 'courant' && (
                                                    <button
                                                        style={{
                                                            padding: '8px',
                                                            borderRadius: '8px',
                                                            border: '1.5px solid rgba(255,255,255,0.25)',
                                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                                            color: 'var(--text-primary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        onClick={() => handleMoveToHS(item.id, item.nomMateriel)}
                                                        title="Déplacer vers HS"
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                                                    >
                                                        ⚠️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="text-center py-12">
                                            <div className="text-4xl mb-4">📦</div>
                                            <h3 className="text-lg font-medium text-gray-900">Aucun article trouvé</h3>
                                            <p className="text-gray-500 mt-2">
                                                {searchTerm ? 'Essayez avec d\'autres termes de recherche' : `Le stock ${filter} est vide`}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">
                                {selectedItem ? 'Modifier le matériel' : 'Nouveau matériel'}
                            </h2>
                            <button
                                onClick={() => { setShowForm(false); setSelectedItem(null); }}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du matériel *</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        value={formData.nomMateriel}
                                        onChange={(e) => setFormData({ ...formData, nomMateriel: e.target.value })}
                                        placeholder="Ex: Switch Cisco 24 ports"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Référence *</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        value={formData.reference}
                                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                        placeholder="Ex: WS-C2960X-24TD-L"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de Série *</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        value={formData.numeroSerie}
                                        onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value })}
                                        placeholder="Ex: FCW1234ABCD"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Code-barres</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        value={formData.codeBarre}
                                        onChange={(e) => setFormData({ ...formData, codeBarre: e.target.value })}
                                        placeholder="Optionnel"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        value={formData.categorie}
                                        onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                                        placeholder="Ex: Réseau, Sécurité, Téléphonie..."
                                        list="categories"
                                        required
                                    />
                                    <datalist id="categories">
                                        {categories.map((cat, i) => <option key={i} value={cat} />)}
                                    </datalist>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        value={formData.fournisseur}
                                        onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                                        placeholder="Ex: Rexel, Sonepar..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        min="1"
                                        value={formData.quantite}
                                        onChange={(e) => setFormData({ ...formData, quantite: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        placeholder="Informations supplémentaires..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    onClick={() => {
                                        setShowForm(false);
                                        setSelectedItem(null);
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark transition-colors shadow-sm"
                                >
                                    {selectedItem ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && detailItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">
                                📦 Détails du matériel
                            </h2>
                            <button
                                onClick={() => { setShowDetailModal(false); setDetailItem(null); }}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Nom</label>
                                    <div className="font-semibold text-gray-800">{detailItem.nomMateriel}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Référence</label>
                                    <div className="font-mono text-gray-800">{detailItem.reference}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">N° Série</label>
                                    <div className="font-mono text-gray-800">{detailItem.numeroSerie || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Code-barres</label>
                                    <div className="font-mono text-gray-800">{detailItem.codeBarre || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Catégorie</label>
                                    <div>
                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                            {detailItem.categorie}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Fournisseur</label>
                                    <div className="text-gray-800">{detailItem.fournisseur || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Quantité</label>
                                    <div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${detailItem.quantite <= 0 ? 'bg-red-50 text-red-600' :
                                                detailItem.quantite <= 2 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                            }`}>
                                            {detailItem.quantite} unité{detailItem.quantite > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Statut</label>
                                    <div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${detailItem.statut === 'courant' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {detailItem.statut === 'courant' ? '✅ En stock' : '⚠️ Hors Service'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {detailItem.notes && (
                                <div className="pt-4 border-t">
                                    <label className="text-xs text-gray-500 uppercase">Notes</label>
                                    <div className="text-gray-700 mt-1">{detailItem.notes}</div>
                                </div>
                            )}
                            <div className="pt-4 border-t text-xs text-gray-400">
                                <div>Créé le: {new Date(detailItem.createdAt).toLocaleDateString('fr-FR')}</div>
                                <div>Mis à jour: {new Date(detailItem.updatedAt).toLocaleDateString('fr-FR')}</div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                            <button
                                onClick={() => { setShowDetailModal(false); setDetailItem(null); }}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    navigate(`/stock/${detailItem.id}/edit`);
                                }}
                                className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark transition-colors shadow-sm"
                            >
                                ✏️ Modifier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Stock;

