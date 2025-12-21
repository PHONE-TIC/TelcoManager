import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { apiService } from '../services/api.service';
import ConfirmConflictModal from '../components/ConfirmConflictModal';

// Configuration manuelle de la locale 'fr' pour s'assurer qu'elle est chargée
moment.defineLocale('fr', {
    months: 'janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre'.split('_'),
    monthsShort: 'janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.'.split('_'),
    monthsParseExact: true,
    weekdays: 'dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi'.split('_'),
    weekdaysShort: 'dim._lun._mar._mer._jeu._ven._sam.'.split('_'),
    weekdaysMin: 'Di_Lu_Ma_Me_Je_Ve_Sa'.split('_'),
    longDateFormat: {
        LT: 'HH:mm',
        LTS: 'HH:mm:ss',
        L: 'DD/MM/YYYY',
        LL: 'D MMMM YYYY',
        LLL: 'D MMMM YYYY HH:mm',
        LLLL: 'dddd D MMMM YYYY HH:mm'
    },
    calendar: {
        sameDay: '[Aujourd’hui à] LT',
        nextDay: '[Demain à] LT',
        nextWeek: 'dddd [à] LT',
        lastDay: '[Hier à] LT',
        lastWeek: 'dddd [dernier à] LT',
        sameElse: 'L'
    },
    relativeTime: {
        future: 'dans %s',
        past: 'il y a %s',
        s: 'quelques secondes',
        m: 'une minute',
        mm: '%d minutes',
        h: 'une heure',
        hh: '%d heures',
        d: 'un jour',
        dd: '%d jours',
        M: 'un mois',
        MM: '%d mois',
        y: 'un an',
        yy: '%d ans'
    },
    dayOfMonthOrdinalParse: /\d{1,2}(er|e)/,
    ordinal: function (number) {
        return number + (number === 1 ? 'er' : '');
    },
    week: {
        dow: 1, // Lundi est le premier jour de la semaine
        doy: 4  // La semaine qui contient le 4 janvier est la première semaine de l'année
    }
});

moment.locale('fr');
const localizer = momentLocalizer(moment);

function Interventions() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

    const [calendarView, setCalendarView] = useState<any>('month'); // Default to Month view
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [calendarKey, setCalendarKey] = useState(0);
    const [transitionClass, setTransitionClass] = useState('fade-in');
    const [interventions, setInterventions] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [techniciens, setTechniciens] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // Conflict detection state
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [conflictingIntervention, setConflictingIntervention] = useState<any>(null);

    const [formData, setFormData] = useState({
        clientId: '',
        technicienId: '',
        titre: '',
        description: '',
        datePlanifiee: '',
        statut: 'planifiee',
    });

    // UI state for selection steps
    const [clientSearch, setClientSearch] = useState('');
    const [technicianSearch, setTechnicianSearch] = useState('');

    useEffect(() => {
        loadData();
        const interval = setInterval(() => {
            loadData(true); // Silent reload
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [interventionsData, clientsData, techniciensData] = await Promise.all([
                apiService.getInterventions({ limit: 1000 }), // Increased limit for calendar
                apiService.getClients({ limit: 100 }),
                apiService.getTechniciens(),
            ]);
            setInterventions(interventionsData.interventions);
            setClients(clientsData.clients);
            setTechniciens(techniciensData.techniciens);
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const validateStep = (step: number) => {
        switch (step) {
            case 1:
                return !!formData.clientId;
            case 2:
                return !!formData.titre && !!formData.description;
            case 3:
                return !!formData.technicienId && !!formData.datePlanifiee;
            default:
                return false;
        }
    };

    const handleNextStep = async () => {
        if (currentStep === 3) {
            await handleCheckConflictAndSubmit();
        } else {
            if (validateStep(currentStep)) {
                setCurrentStep(prev => prev + 1);
            } else {
                alert('Veuillez remplir tous les champs obligatoires');
            }
        }
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const checkForConflict = (techId: string, date: string) => {
        if (!techId || !date) return null;

        const newDate = new Date(date);

        // Simple conflict check logic: Look for interventions on the same day for same tech
        // In a real app we'd check duration overlaps
        return interventions.find(int => {
            if (int.technicienId !== techId || int.statut === 'annulee' || int.statut === 'terminee') return false;

            const intDate = new Date(int.datePlanifiee);
            // Check if it's the same day and roughly same time (within 2 hours)
            const timeDiff = Math.abs(intDate.getTime() - newDate.getTime());
            return timeDiff < 2 * 60 * 60 * 1000; // < 2 hours
        });
    };

    const handleCheckConflictAndSubmit = async () => {
        if (!validateStep(3)) {
            alert('Veuillez sélectionner un technicien et une date');
            return;
        }

        const conflict = checkForConflict(formData.technicienId, formData.datePlanifiee);

        if (conflict) {
            setConflictingIntervention(conflict);
            setShowConflictModal(true);
        } else {
            await submitForm();
        }
    };

    const submitForm = async () => {
        try {
            await apiService.createIntervention(formData);
            closeForm();
            loadData();
        } catch (error) {
            console.error('Erreur lors de la création:', error);
            alert('Erreur lors de la création de l\'intervention');
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setCurrentStep(1);
        setShowConflictModal(false);
        setConflictingIntervention(null);
        setFormData({
            clientId: '',
            technicienId: '',
            titre: '',
            description: '',
            datePlanifiee: '',
            statut: 'planifiee',
        });
    };

    const getStatusBadge = (statut: string) => {
        const badges: { [key: string]: { label: string; class: string } } = {
            planifiee: { label: '🔵 Planifiée', class: 'badge-info' },
            en_cours: { label: '🟠 En cours', class: 'badge-warning' },
            terminee: { label: '🟢 Terminée', class: 'badge-success' },
            annulee: { label: '🔴 Annulée', class: 'badge-danger' },
        };
        const badge = badges[statut] || { label: statut, class: 'badge-info' };
        return <span className={`badge ${badge.class}`}>{badge.label}</span>;
    };

    const handleNavigate = (date: Date) => {
        if (date > calendarDate) {
            setTransitionClass('slide-left'); // Future: slide from right to left
        } else {
            setTransitionClass('slide-right'); // Past: slide from left to right
        }
        setCalendarDate(date);
        setCalendarKey(prev => prev + 1);
    };

    const handleViewChange = (view: any) => {
        setCalendarView(view);
        setTransitionClass('fade-in'); // View change: simple fade
        setCalendarKey(prev => prev + 1);
    };

    // Calendar events mapping
    const calendarEvents = interventions.map(int => ({
        id: int.id,
        title: `[${moment(int.datePlanifiee).format('HH:mm')}] ${int.titre} - ${int.client?.nom} (${getStatusBadge(int.statut).props.children})`,
        start: new Date(int.datePlanifiee),
        end: new Date(new Date(int.datePlanifiee).getTime() + 2 * 60 * 60 * 1000), // Assumed 2h duration
        resource: int,
    }));

    const eventStyleGetter = (event: any) => {
        let backgroundColor = '#3174ad'; // Default blue
        const status = event.resource.statut;

        if (status === 'terminee') backgroundColor = '#10b981'; // Green
        else if (status === 'en_cours') backgroundColor = '#f59e0b'; // Yellow (warning)
        else if (status === 'annulee') backgroundColor = '#dc2626'; // Red
        else if (status === 'planifiee') backgroundColor = '#3b82f6'; // Blue

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    // Filtered list
    const filteredInterventions = interventions.filter((intervention) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const numeroFormatted = `INT - ${String(intervention.numero || '').padStart(5, '0')} `;
        return (
            numeroFormatted.toLowerCase().includes(search) ||
            intervention.titre.toLowerCase().includes(search) ||
            intervention.client?.nom.toLowerCase().includes(search) ||
            intervention.technicien?.nom.toLowerCase().includes(search)
        );
    });

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Interventions</h1>
                <p className="page-subtitle">Gestion des interventions et planning</p>
            </div>

            <div className="card">
                <div className="tabs">
                    <button
                        className={`tab ${viewMode === 'calendar' ? 'active' : ''} `}
                        onClick={() => setViewMode('calendar')}
                    >
                        📅 Calendrier
                    </button>
                    <button
                        className={`tab ${viewMode === 'list' ? 'active' : ''} `}
                        onClick={() => setViewMode('list')}
                    >
                        📋 Liste
                    </button>
                </div>

                {viewMode === 'list' && !showForm && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <div className="search-container">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Rechercher par numéro, titre, client..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowForm(true)}
                            >
                                + Nouvelle intervention
                            </button>
                        </div>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Titre</th>
                                    <th>Client</th>
                                    <th>Technicien</th>
                                    <th>Date planifiée</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInterventions.length > 0 ? (
                                    filteredInterventions.map((intervention) => (
                                        <tr
                                            key={intervention.id}
                                            className="clickable-row" // Keep clickable-row here as we have general style for table hover now
                                            onClick={() => navigate(`/interventions/${intervention.id}`)}
                                        >
                                            <td><strong>INT-{String(intervention.numero || 0).padStart(5, '0')}</strong></td>
                                            <td><strong>{intervention.titre}</strong></td>
                                            <td>{intervention.client?.nom}</td>
                                            <td>{intervention.technicien?.nom || 'Non assigné'}</td>
                                            <td>{new Date(intervention.datePlanifiee).toLocaleString('fr-FR')}</td>
                                            <td>{getStatusBadge(intervention.statut)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            {searchTerm ? 'Aucune intervention correspondante' : 'Aucune intervention trouvée'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'calendar' && !showForm && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowForm(true)}
                            >
                                + Nouvelle intervention
                            </button>
                        </div>
                        <div key={calendarKey} className={transitionClass}>
                            <Calendar
                                localizer={localizer}
                                culture='fr'
                                defaultView='month'
                                min={new Date(0, 0, 0, 8, 0, 0)} // Start at 8:00
                                max={new Date(0, 0, 0, 20, 0, 0)} // End at 20:00
                                events={calendarEvents}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: 600 }}
                                date={calendarDate}
                                onNavigate={handleNavigate}
                                view={calendarView}
                                onView={handleViewChange}
                                eventPropGetter={eventStyleGetter}
                                formats={{
                                    dayFormat: (date: Date) =>
                                        moment(date).format('dddd D'),
                                    weekdayFormat: (date: Date) =>
                                        moment(date).format('dddd'),
                                    monthHeaderFormat: (date: Date) =>
                                        moment(date).format('MMMM YYYY'),
                                    dayHeaderFormat: (date: Date) =>
                                        moment(date).format('dddd D MMMM'),
                                }}
                                messages={{
                                    next: "Suivant",
                                    previous: "Précédent",
                                    today: "Aujourd'hui",
                                    month: "Mois",
                                    week: "Semaine",
                                    day: "Jour",
                                    agenda: "Agenda",
                                    date: "Date",
                                    time: "Heure",
                                    event: "Événement"
                                }}
                                onSelectEvent={(event: any) => navigate(`/interventions/${event.resource.id}`)}
                            />
                        </div>
                    </div>
                )}

                {showForm && (
                    <div className="fade-in" style={{ padding: '0 20px' }}>
                        <div style={{ marginBottom: '30px' }}>
                            <button className="btn btn-secondary" onClick={closeForm}>
                                ← Annuler la création
                            </button>
                        </div>

                        <div className="stepper-container">
                            <div className="stepper-header">
                                <div className={`step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''} `}>
                                    <div className="step-indicator">{currentStep > 1 ? '✓' : '1'}</div>
                                    <div className="step-label">Client</div>
                                </div>
                                <div className={`step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''} `}>
                                    <div className="step-indicator">{currentStep > 2 ? '✓' : '2'}</div>
                                    <div className="step-label">Détails</div>
                                </div>
                                <div className={`step-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''} `}>
                                    <div className="step-indicator">{currentStep > 3 ? '✓' : '3'}</div>
                                    <div className="step-label">Planification</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--bg-color)', padding: '30px', borderRadius: '8px' }}>
                            {currentStep === 1 && (
                                <div className="fade-in">
                                    <h3 style={{ marginBottom: '20px' }}>Étape 1 : Sélection du Client</h3>

                                    <div className="selection-search">
                                        <div className="search-container">
                                            <span className="search-icon">🔍</span>
                                            <input
                                                type="text"
                                                className="search-input"
                                                placeholder="Rechercher un client..."
                                                value={clientSearch}
                                                onChange={(e) => setClientSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Liste des clients *</label>
                                        <div className="selection-list">
                                            {clients
                                                .filter(client =>
                                                    client.nom.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                                    (client.adresse && client.adresse.toLowerCase().includes(clientSearch.toLowerCase()))
                                                )
                                                .map((client) => (
                                                    <div
                                                        key={client.id}
                                                        className={`selection-item ${formData.clientId === client.id ? 'selected' : ''}`}
                                                        onClick={() => setFormData({ ...formData, clientId: client.id })}
                                                    >
                                                        <div className="selection-item-info">
                                                            <span className="selection-item-title">{client.nom}</span>
                                                            <span className="selection-item-subtitle">{client.adresse || 'Sans adresse'}</span>
                                                        </div>
                                                        <div className="selection-check">✓</div>
                                                    </div>
                                                ))}
                                            {clients.filter(c => c.nom.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    Aucun client trouvé
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="fade-in">
                                    <h3 style={{ marginBottom: '20px' }}>Étape 2 : Détails de l'intervention</h3>
                                    <div className="form-group">
                                        <label className="form-label">Titre *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.titre}
                                            onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                                            placeholder="Ex: Installation Fibre Optique"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description *</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={5}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Détails de l'intervention..."
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="fade-in">
                                    <h3 style={{ marginBottom: '20px' }}>Étape 3 : Planification</h3>
                                    <div className="form-group">
                                        <label className="form-label">Choix du Technicien *</label>

                                        <div className="selection-search">
                                            <div className="search-container">
                                                <span className="search-icon">🔍</span>
                                                <input
                                                    type="text"
                                                    className="search-input"
                                                    placeholder="Rechercher un technicien..."
                                                    value={technicianSearch}
                                                    onChange={(e) => setTechnicianSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="selection-list">
                                            {techniciens
                                                .filter(tech =>
                                                    tech.nom.toLowerCase().includes(technicianSearch.toLowerCase()) ||
                                                    (tech.role && tech.role.toLowerCase().includes(technicianSearch.toLowerCase()))
                                                )
                                                .map((tech) => (
                                                    <div
                                                        key={tech.id}
                                                        className={`selection-item ${formData.technicienId === tech.id ? 'selected' : ''}`}
                                                        onClick={() => setFormData({ ...formData, technicienId: tech.id })}
                                                    >
                                                        <div className="selection-item-info">
                                                            <span className="selection-item-title">{tech.nom}</span>
                                                            <span className="selection-item-subtitle">{tech.role}</span>
                                                        </div>
                                                        <div className="selection-check">✓</div>
                                                    </div>
                                                ))}
                                            {techniciens.filter(t => t.nom.toLowerCase().includes(technicianSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    Aucun technicien trouvé
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Date et Heure de début *</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={formData.datePlanifiee}
                                            onChange={(e) => setFormData({ ...formData, datePlanifiee: e.target.value })}
                                        />
                                        <p className="text-muted" style={{ marginTop: '5px', fontSize: '0.875rem' }}>
                                            Durée estimée par défaut : 2 heures
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handlePrevStep}
                                    disabled={currentStep === 1}
                                    style={{ visibility: currentStep === 1 ? 'hidden' : 'visible' }}
                                >
                                    Précédent
                                </button>
                                <button className="btn btn-primary" onClick={handleNextStep}>
                                    {currentStep === 3 ? 'Valider et Planifier' : 'Suivant'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmConflictModal
                isOpen={showConflictModal}
                onClose={() => setShowConflictModal(false)}
                onConfirm={submitForm}
                conflictingIntervention={conflictingIntervention}
                newDate={formData.datePlanifiee}
            />
        </div>
    );
}

export default Interventions;
