import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { AppIcon } from './AppIcon';
import './MobilePlanning.css';

interface Intervention {
    id: string;
    titre: string;
    description?: string;
    datePlanifiee: string;
    statut: string;
    client?: { nom: string };
    technicien?: { nom: string };
}

interface MobilePlanningProps {
    interventions: Intervention[];
}

type FilterType = 'today' | 'week' | 'month' | 'custom';

export default function MobilePlanning({ interventions }: MobilePlanningProps) {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<FilterType>('today');
    const [currentDate, setCurrentDate] = useState(moment());
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Filter interventions based on selected filter
    const getFilteredInterventions = () => {
        let filtered = interventions;

        switch (filter) {
            case 'today':
                filtered = interventions.filter(int =>
                    moment(int.datePlanifiee).isSame(currentDate, 'day')
                );
                break;
            case 'week':
                filtered = interventions.filter(int =>
                    moment(int.datePlanifiee).isSame(currentDate, 'week')
                );
                break;
            case 'month':
                filtered = interventions.filter(int =>
                    moment(int.datePlanifiee).isSame(currentDate, 'month')
                );
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    filtered = interventions.filter(int => {
                        const intDate = moment(int.datePlanifiee);
                        return intDate.isBetween(customStartDate, customEndDate, 'day', '[]');
                    });
                }
                break;
        }

        // Sort by date
        return filtered.sort((a, b) =>
            moment(a.datePlanifiee).diff(moment(b.datePlanifiee))
        );
    };

    const filteredInterventions = getFilteredInterventions();

    // Group interventions by date
    const groupedInterventions = filteredInterventions.reduce((acc, intervention) => {
        const dateKey = moment(intervention.datePlanifiee).format('YYYY-MM-DD');
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(intervention);
        return acc;
    }, {} as Record<string, Intervention[]>);

    const getStatusBadge = (statut: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'planifiee': { label: 'Planifiée', className: 'badge-info' },
            'en_cours': { label: 'En cours', className: 'badge-warning' },
            'terminee': { label: 'Terminée', className: 'badge-success' },
            'annulee': { label: 'Annulée', className: 'badge-danger' },
        };
        return statusMap[statut] || { label: statut, className: 'badge-secondary' };
    };

    const navigateTo = (direction: 'prev' | 'next') => {
        let newDate = currentDate.clone();

        switch (filter) {
            case 'today':
                newDate = direction === 'next' ? newDate.add(1, 'day') : newDate.subtract(1, 'day');
                break;
            case 'week':
                newDate = direction === 'next' ? newDate.add(1, 'week') : newDate.subtract(1, 'week');
                break;
            case 'month':
                newDate = direction === 'next' ? newDate.add(1, 'month') : newDate.subtract(1, 'month');
                break;
        }

        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(moment());
    };

    const getHeaderText = () => {
        switch (filter) {
            case 'today':
                return currentDate.format('dddd D MMMM YYYY');
            case 'week': {
                const weekStart = currentDate.clone().startOf('week');
                const weekEnd = currentDate.clone().endOf('week');
                return `${weekStart.format('D MMM')} - ${weekEnd.format('D MMM YYYY')}`;
            }
            case 'month':
                return currentDate.format('MMMM YYYY');
            case 'custom':
                if (customStartDate && customEndDate) {
                    return `${moment(customStartDate).format('D MMM')} - ${moment(customEndDate).format('D MMM YYYY')}`;
                }
                return 'Période personnalisée';
        }
    };

    return (
        <div className="mobile-planning">
            {/* Filter Tabs */}
            <div className="planning-filters">
                <button
                    className={`filter-btn ${filter === 'today' ? 'active' : ''}`}
                    onClick={() => setFilter('today')}
                >
                    Aujourd'hui
                </button>
                <button
                    className={`filter-btn ${filter === 'week' ? 'active' : ''}`}
                    onClick={() => setFilter('week')}
                >
                    Semaine
                </button>
                <button
                    className={`filter-btn ${filter === 'month' ? 'active' : ''}`}
                    onClick={() => setFilter('month')}
                >
                    Mois
                </button>
                <button
                    className={`filter-btn ${filter === 'custom' ? 'active' : ''}`}
                    onClick={() => setFilter('custom')}
                >
                    Personnalisé
                </button>
            </div>

            {/* Custom Date Range */}
            {filter === 'custom' && (
                <div className="custom-date-range">
                    <input
                        type="date"
                        className="form-input"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        placeholder="Date début"
                    />
                    <span>→</span>
                    <input
                        type="date"
                        className="form-input"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        placeholder="Date fin"
                    />
                </div>
            )}

            {/* Navigation */}
            {filter !== 'custom' && (
                <div className="planning-navigation">
                    <button className="nav-btn" onClick={() => navigateTo('prev')}>
                        ← Précédent
                    </button>
                    <button className="nav-btn today-btn" onClick={goToToday}>
                        Aujourd'hui
                    </button>
                    <button className="nav-btn" onClick={() => navigateTo('next')}>
                        Suivant →
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="planning-header">
                <h2>{getHeaderText()}</h2>
                <div className="intervention-count">
                    {filteredInterventions.length} intervention{filteredInterventions.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Interventions List */}
            <div className="interventions-timeline">
                {Object.keys(groupedInterventions).length > 0 ? (
                    Object.entries(groupedInterventions).map(([date, dayInterventions]) => (
                        <div key={date} className="day-group">
                            <div className="day-header">
                                {moment(date).format('dddd D MMMM YYYY')}
                            </div>
                            {dayInterventions.map((intervention) => {
                                const status = getStatusBadge(intervention.statut);
                                return (
                                    <div
                                        key={intervention.id}
                                        className={`intervention-card status-${intervention.statut}`}
                                        onClick={() => navigate(`/interventions/${intervention.id}`)}
                                    >
                                        <div className="intervention-card-header">
                                            <div className="intervention-time">
                                                {moment(intervention.datePlanifiee).format('HH:mm')}
                                            </div>
                                            <span className={`badge ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className="intervention-card-content">
                                            <h3 className="intervention-title">{intervention.titre}</h3>
                                            {intervention.description && (
                                                <p className="intervention-description">
                                                    {intervention.description}
                                                </p>
                                            )}
                                            <div className="intervention-card-footer">
                                                {intervention.client && (
                                                    <span className="intervention-client" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        <AppIcon name="user" size={14} /> {intervention.client.nom}
                                                    </span>
                                                )}
                                                {intervention.technicien && (
                                                    <span className="intervention-tech" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        <AppIcon name="technician" size={14} /> {intervention.technicien.nom}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <p style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><AppIcon name="interventions" size={16} /> Aucune intervention pour cette période</p>
                        <small>Sélectionnez une autre période ou créez une nouvelle intervention</small>
                    </div>
                )}
            </div>
        </div>
    );
}
