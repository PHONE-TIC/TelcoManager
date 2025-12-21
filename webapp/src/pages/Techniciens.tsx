import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';
import TableResponsive from '../components/TableResponsive';
import UserAvatar from '../components/UserAvatar';

function Techniciens() {
    const navigate = useNavigate();
    const [techniciens, setTechniciens] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'gestionnaire' | 'technicien'>('all');

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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) return;

        try {
            await apiService.deleteTechnicien(id);
            loadTechniciens();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Impossible de supprimer un utilisateur ayant des interventions associées. Essayez de le désactiver.');
        }
    };

    // Filter technicians based on search and role
    const filteredTechniciens = techniciens.filter(tech => {
        const matchesSearch = tech.nom.toLowerCase().includes(search.toLowerCase()) ||
            tech.username.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'all' || tech.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6" style={{ color: 'var(--text-primary)' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-primary)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>👤 Gestion des Utilisateurs</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Administration des comptes (Admins & Techniciens)</p>
                </div>
                <button
                    onClick={() => navigate('/techniciens/new')}
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
                    + Nouvel utilisateur
                </button>
            </div>

            <div style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '20px'
            }}>
                <div className="mb-6 flex gap-4 flex-wrap">
                    {/* Search input */}
                    <div className="relative" style={{ flex: '1', minWidth: '200px', maxWidth: '400px' }}>
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ fontSize: '16px' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Rechercher un utilisateur..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
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

                    {/* Role filter dropdown */}
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
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
                        <option value="all">🏷️ Tous les rôles</option>
                        <option value="admin">👑 Administrateurs</option>
                        <option value="gestionnaire">📋 Gestionnaires</option>
                        <option value="technicien">🔧 Techniciens</option>
                    </select>
                </div>

                <TableResponsive
                    data={filteredTechniciens}
                    columns={[
                        {
                            key: 'nom',
                            label: 'Utilisateur / Identité',
                            render: (tech) => (
                                <div className="flex items-center gap-3">
                                    <UserAvatar name={tech.nom} size="sm" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{tech.nom}</span>
                                        <span className="text-xs text-gray-500">{tech.username}</span>
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'role',
                            label: 'Rôle & Accès',
                            render: (tech) => (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tech.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : tech.role === 'gestionnaire'
                                        ? 'bg-red-100 text-red-900'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    {tech.role === 'admin' ? 'Administrateur' : tech.role === 'gestionnaire' ? 'Gestionnaire' : 'Technicien'}
                                </span>
                            )
                        },
                        {
                            key: 'active',
                            label: 'Statut',
                            render: (tech) => (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1 ${tech.active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    <span className={`w-2 h-2 rounded-full ${tech.active ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                    {tech.active ? 'Actif' : 'Inactif'}
                                </span>
                            )
                        },
                        {
                            key: 'interventions',
                            label: 'Activité',
                            render: (tech) => (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600 font-medium">{tech._count?.interventions || 0}</span>
                                    <span className="text-xs text-gray-400">interventions</span>
                                </div>
                            )
                        }
                    ]}
                    actions={(tech) => (
                        <div style={{ display: 'flex', gap: '4px' }}>
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
                                onClick={(e) => { e.stopPropagation(); navigate(`/techniciens/${tech.id}`); }}
                                title="Voir détails"
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                            >
                                👁️
                            </button>
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
                                onClick={(e) => { e.stopPropagation(); navigate(`/techniciens/${tech.id}/edit`); }}
                                title="Modifier"
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                            >
                                ✏️
                            </button>
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
                                onClick={(e) => handleDelete(e, tech.id)}
                                title="Supprimer"
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                            >
                                🗑️
                            </button>
                        </div>
                    )}
                />
            </div>
        </div>
    );
}

export default Techniciens;
