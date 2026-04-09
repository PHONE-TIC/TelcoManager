import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';
import moment from 'moment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Intervention, Technicien } from '../types';

interface ReportStats {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    completionRate: number;
    avgDuration: number;
}

function Reports() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [dateRange, setDateRange] = useState({
        start: moment().subtract(30, 'days').format('YYYY-MM-DD'),
        end: moment().format('YYYY-MM-DD')
    });
    const [selectedTechnician, setSelectedTechnician] = useState('');
    const [technicians, setTechnicians] = useState<Technicien[]>([]);

    useEffect(() => {
        loadTechnicians();
    }, []);

    useEffect(() => {
        loadData();
    }, [dateRange, selectedTechnician]);

    const loadTechnicians = async () => {
        try {
            const data = await apiService.getTechniciens();
            setTechnicians(data.techniciens || data || []);
        } catch (error) {
            console.error('Error loading technicians:', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {
                dateDebut: dateRange.start,
                dateFin: dateRange.end,
                limit: "500"
            };
            if (selectedTechnician) {
                params.technicienId = selectedTechnician;
            }
            const data = await apiService.getInterventions(params);
            setInterventions(data.interventions || []);

            const all = data.interventions || [];
            const completed = all.filter((i: { statut: string; heureArrivee?: string; heureDepart?: string }) => i.statut === 'terminee');
            const pending = all.filter((i: { statut: string; heureArrivee?: string; heureDepart?: string }) => i.statut === 'planifiee');
            const inProgress = all.filter((i: { statut: string; heureArrivee?: string; heureDepart?: string }) => i.statut === 'en_cours');

            let avgDuration = 0;
            const withDuration = completed.filter((i: { statut: string; heureArrivee?: string; heureDepart?: string }) => i.heureArrivee && i.heureDepart);
            if (withDuration.length > 0) {
                const totalMinutes = withDuration.reduce((acc: number, i: { heureArrivee: string; heureDepart: string }) => {
                    const start = moment(i.heureArrivee, 'HH:mm');
                    const end = moment(i.heureDepart, 'HH:mm');
                    return acc + end.diff(start, 'minutes');
                }, 0);
                avgDuration = Math.round(totalMinutes / withDuration.length);
            }

            setStats({
                total: all.length,
                completed: completed.length,
                pending: pending.length,
                inProgress: inProgress.length,
                completionRate: all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0,
                avgDuration
            });
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ['N°', 'Date', 'Client', 'Titre', 'Technicien', 'Statut', 'Durée'];
        const rows = interventions.map(i => [
            i.numero || '',
            moment(i.datePlanifiee).format('DD/MM/YYYY'),
            i.client?.nom || '',
            i.titre || '',
            i.technicien?.nom || '',
            i.statut || '',
            i.heureArrivee && i.heureDepart ? `${i.heureArrivee} - ${i.heureDepart}` : ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `interventions_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    const exportPDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(249, 115, 22);
        doc.text('Rapport d\'Interventions', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Période: ${moment(dateRange.start).format('DD/MM/YYYY')} - ${moment(dateRange.end).format('DD/MM/YYYY')}`, pageWidth / 2, 28, { align: 'center' });

        if (selectedTechnician) {
            const tech = technicians.find(t => t.id === selectedTechnician);
            doc.text(`Technicien: ${tech?.nom || 'N/A'}`, pageWidth / 2, 34, { align: 'center' });
        }

        let y = 45;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Résumé', 14, y);

        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total interventions: ${stats?.total || 0}`, 14, y);
        doc.text(`Terminées: ${stats?.completed || 0} (${stats?.completionRate || 0}%)`, 80, y);
        y += 6;
        doc.text(`En cours: ${stats?.inProgress || 0}`, 14, y);
        doc.text(`Planifiées: ${stats?.pending || 0}`, 80, y);
        y += 6;
        doc.text(`Durée moyenne: ${stats?.avgDuration || 0} min`, 14, y);

        y += 12;

        autoTable(doc, {
            startY: y,
            head: [['N°', 'Date', 'Client', 'Titre', 'Technicien', 'Statut']],
            body: interventions.slice(0, 50).map(i => [
                i.numero || '-',
                moment(i.datePlanifiee).format('DD/MM/YY'),
                i.client?.nom?.substring(0, 20) || '-',
                (i.titre || '').substring(0, 25),
                i.technicien?.nom?.substring(0, 15) || '-',
                getStatusLabel(i.statut)
            ]),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [249, 115, 22], textColor: 255 },
            alternateRowStyles: { fillColor: [255, 247, 237] }
        });

        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Généré le ${moment().format('DD/MM/YYYY HH:mm')} - TelcoManager`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.save(`rapport_interventions_${dateRange.start}_${dateRange.end}.pdf`);
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            planifiee: 'Planifiée',
            en_cours: 'En cours',
            terminee: 'Terminée',
            annulee: 'Annulée'
        };
        return labels[status] || status;
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string }> = {
            planifiee: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
            en_cours: { bg: 'rgba(245, 158, 11, 0.15)', color: '#d97706' },
            terminee: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
            annulee: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
        };
        return styles[status] || { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
    };

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
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📈 Rapports</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Statistiques et exports de données</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportCSV}
                        disabled={interventions.length === 0}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            cursor: interventions.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: interventions.length === 0 ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📊 Export CSV
                    </button>
                    <button
                        onClick={exportPDF}
                        disabled={!stats}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: stats ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#ccc',
                            color: 'white',
                            fontWeight: 600,
                            cursor: !stats ? 'not-allowed' : 'pointer',
                            boxShadow: stats ? '0 2px 8px rgba(249, 115, 22, 0.35)' : 'none'
                        }}
                    >
                        📄 Export PDF
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
            }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>🔍 Filtres</h2>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Date début</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Date fin</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Technicien</label>
                        <select
                            value={selectedTechnician}
                            onChange={(e) => setSelectedTechnician(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Tous les techniciens</option>
                            {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.nom}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : stats && (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    {[
                        { value: stats.total, label: 'Interventions totales', color: '#f97316' },
                        { value: stats.completed, label: 'Terminées', color: '#10b981' },
                        { value: stats.pending, label: 'Planifiées', color: '#f59e0b' },
                        { value: `${stats.completionRate}%`, label: 'Taux de complétion', color: '#3b82f6' },
                        { value: `${stats.avgDuration} min`, label: 'Durée moyenne', color: '#8b5cf6' }
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
            )}

            {/* Interventions Table */}
            <div style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '20px'
            }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                    📋 Interventions ({interventions.length})
                </h2>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Date</th>
                                <th>Client</th>
                                <th>Titre</th>
                                <th>Technicien</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            {interventions.length > 0 ? (
                                interventions.slice(0, 100).map((intervention) => {
                                    const badge = getStatusBadge(intervention.statut);
                                    return (
                                        <tr key={intervention.id}>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>
                                                    #{intervention.numero || '-'}
                                                </span>
                                            </td>
                                            <td>{moment(intervention.datePlanifiee).format('DD/MM/YYYY')}</td>
                                            <td>{intervention.client?.nom || '-'}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{intervention.titre?.substring(0, 40) || '-'}</td>
                                            <td>{intervention.technicien?.nom || <span style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Non assigné</span>}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    backgroundColor: badge.bg,
                                                    color: badge.color
                                                }}>
                                                    {getStatusLabel(intervention.statut)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6}>
                                        <div style={{ textAlign: 'center', padding: '48px' }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Aucune intervention trouvée</h3>
                                            <p style={{ color: 'var(--text-secondary)' }}>Modifiez les filtres pour afficher des résultats</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {interventions.length > 100 && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '16px', textAlign: 'center' }}>
                        Affichage limité à 100 résultats. Exportez en CSV pour obtenir toutes les données.
                    </p>
                )}
            </div>
        </div>
    );
}

export default Reports;
