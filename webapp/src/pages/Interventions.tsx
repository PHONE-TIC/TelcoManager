import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { View } from "react-big-calendar";
import { apiService } from "../services/api.service";
import { useAuth } from "../contexts/useAuth";
import MobilePlanning from "../components/MobilePlanning";
import ConfirmConflictModal from "../components/ConfirmConflictModal";
import { useOffline } from "../hooks/useOffline";
import { useLocks } from "../contexts/LockContextCore";
import { useReminders } from "../hooks/useReminders";
import { useResponsive } from "../hooks/useResponsive";
import { AppIcon } from "../components/AppIcon";
import {
  Button,
  type Column,
  DataTable,
  DetailFact,
  DetailFacts,
  DetailPane,
  DetailSection,
  DetailTimeline,
  FilterBar,
  SearchInput,
  SplitView,
  Status,
  ViewTab,
  Workspace,
} from "../components/ui";
import {
  buildCalendarEventTitle,
  getCalendarTransitionClass,
} from "./interventions.utils";
import {
  filterClientsForSelection,
  filterTechniciansForSelection,
  findInterventionConflict,
} from "./interventions-form.utils";
import {
  getStatusFilteredInterventions,
  getTodayInterventions,
  sortInterventionsList,
  type InterventionSortColumn,
} from "./interventions-list.utils";
import {
} from "./interventions-ui.utils";

import { QuickCreateClientModal } from "../components/QuickCreateClientModal";
import SkeletonLoader from "../components/SkeletonLoader";

import type { Client, Intervention, Technicien } from "../types";
import type { CalendarEvent } from "./InterventionsCalendar";
import "./Interventions.css";

const InterventionsCalendar = lazy(() => import("./InterventionsCalendar"));

type InterventionsLocationState = {
  viewMode?: "list" | "calendar" | "all";
};

function Interventions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { locks } = useLocks();
  const {
    isOnline,
    cacheInterventionsList,
    getCachedInterventionsList,
    pendingSyncCount,
  } = useOffline();
  const { scheduleForInterventions } = useReminders();
  const { isMobile } = useResponsive();

  // Restore viewMode from navigation state if present
  const initialViewMode =
    (location.state as InterventionsLocationState | null)?.viewMode || "list";
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "all">(
    initialViewMode
  );

  const [calendarView, setCalendarView] = useState<View>("month"); // Default to Month view
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarKey, setCalendarKey] = useState(0);
  const [transitionClass, setTransitionClass] = useState("fade-in");
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [techniciens, setTechniciens] = useState<Technicien[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // Fiche ouverte dans le panneau de détail, à droite de la liste.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "planifiee" | "en_cours" | "terminee" | "annulee"
  >("all");

  // Column sorting state
  // Ordre par défaut de la liste du jour ; le tri interactif est porté par DataTable.
  const sortColumn: InterventionSortColumn = "id";
  const sortDirection: "asc" | "desc" = "desc";

  // Conflict detection state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingIntervention, setConflictingIntervention] =
    useState<Intervention | null>(null);

  const [formData, setFormData] = useState({
    clientId: "",
    technicienId: "",
    datePlanifiee: "",
    titre: "",
    description: "",
    statut: "planifiee",
    type: "SAV",
    duree: 120, // default duration in minutes
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);

  const timeInputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // UI state for selection steps
  const [clientSearch, setClientSearch] = useState("");
  const [technicianSearch, setTechnicianSearch] = useState("");

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Check if online
      if (!isOnline) {
        // Use cached data when offline

        const cachedInterventions = await getCachedInterventionsList();
        if (cachedInterventions.length > 0) {
          let filtered = cachedInterventions;
          if (user?.role === "technicien") {
            filtered = cachedInterventions.filter(
              (intervention: Intervention) =>
                intervention.technicienId === user.id
            );
          }
          setInterventions(filtered);
        }
        return;
      }

      // Get interventions (all users can access)
      const interventionsData = await apiService.getInterventions({});

      let filteredInterventions = interventionsData.interventions;

      // Filter interventions for technician role
      if (user?.role === "technicien") {
        filteredInterventions = interventionsData.interventions.filter(
          (intervention: Intervention) => intervention.technicienId === user.id
        );
      }

      setInterventions(filteredInterventions);

      // Cache interventions for offline use
      await cacheInterventionsList(interventionsData.interventions);

      // Schedule reminders for today's interventions (technicians only)
      if (user?.role === "technicien") {
        scheduleForInterventions(filteredInterventions);
      }

      // Only admins can access clients and techniciens lists
      if (user?.role === "admin") {
        try {
          const [clientsData, techniciensData] = await Promise.all([
            apiService.getClients({ limit: 1000 }),
            apiService.getTechniciens({ limit: 1000 }),
          ]);
          setClients(clientsData.clients);
          setTechniciens(techniciensData.techniciens);
        } catch (error) {
          console.warn("Could not load clients/techniciens:", error);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      // Try to use cached data on API error
      if (!isOnline) {
        const cachedInterventions = await getCachedInterventionsList();
        if (cachedInterventions.length > 0) {
          setInterventions(cachedInterventions);
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [
    cacheInterventionsList,
    getCachedInterventionsList,
    isOnline,
    scheduleForInterventions,
    user?.id,
    user?.role,
  ]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true); // Silent reload
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const validateForm = (step: number): boolean => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.clientId) {
        errors.clientId = "Veuillez selectionner un client.";
      }
    } else if (step === 2) {
      if (!formData.titre || !formData.titre.trim()) {
        errors.titre = "Le titre est obligatoire.";
      }
      if (!formData.description || !formData.description.trim()) {
        errors.description = "La description est obligatoire.";
      }
    } else if (step === 3) {
      if (!formData.technicienId) {
        errors.technicienId = "Veuillez selectionner un technicien.";
      }
      if (!formData.datePlanifiee) {
        errors.datePlanifiee = "La date et l'heure sont obligatoires.";
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = async () => {
    if (currentStep === 3) {
      await handleCheckConflictAndSubmit();
    } else {
      if (validateForm(currentStep)) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const checkForConflict = (techId: string, date: string) =>
    findInterventionConflict(interventions, techId, date);

  const handleCheckConflictAndSubmit = async () => {
    if (!validateForm(3)) {
      return;
    }

    const conflict = checkForConflict(
      formData.technicienId,
      formData.datePlanifiee
    );

    if (conflict) {
      setConflictingIntervention(conflict);
      setShowConflictModal(true);
    } else {
      await submitForm();
    }
  };

  const submitForm = async () => {
    try {
      // Create a copy of data and convert date to ISO string (UTC)
      const dataToSubmit = {
        ...formData,
        description: `${formData.description}\n__duree_mins:${formData.duree}__`,
      };
      if (dataToSubmit.datePlanifiee) {
        dataToSubmit.datePlanifiee = new Date(
          dataToSubmit.datePlanifiee
        ).toISOString();
      }

      await apiService.createIntervention(dataToSubmit);
      closeForm();
      loadData();
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      alert("Erreur lors de la création de l'intervention");
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setCurrentStep(1);
    setShowConflictModal(false);
    setConflictingIntervention(null);
    setValidationErrors({});
    setFormData({
      clientId: "",
      technicienId: "",
      titre: "",
      description: "",
      datePlanifiee: "",
      statut: "planifiee",
      type: "SAV",
      duree: 120,
    });
  };


  const filteredClients = useMemo(
    () => filterClientsForSelection(clients, clientSearch),
    [clients, clientSearch]
  );

  const filteredTechnicians = useMemo(
    () => filterTechniciansForSelection(techniciens, technicianSearch),
    [techniciens, technicianSearch]
  );

  const todayInterventions = useMemo(
    () => getTodayInterventions(interventions),
    [interventions]
  );



  // Column sorting handler
  const sortInterventions = useCallback(
    (list: Intervention[]) => sortInterventionsList(list, sortColumn, sortDirection),
    [sortColumn, sortDirection]
  );

  const handleNavigate = (date: Date) => {
    setTransitionClass(getCalendarTransitionClass(calendarDate, date));
    setCalendarDate(date);
    setCalendarKey((prev) => prev + 1);
  };

  const handleViewChange = (view: View) => {
    setCalendarView(view);
    setTransitionClass("fade-in"); // View change: simple fade
    setCalendarKey((prev) => prev + 1);
  };

  const calendarEvents = useMemo(
    () =>
      interventions.map((intervention) => {
        const dureeMins = (() => {
          if (!intervention.description) return 120;
          const match = intervention.description.match(/__duree_mins:(\d+)__/);
          return match ? parseInt(match[1], 10) : 120;
        })();
        return {
          id: intervention.id,
          title: buildCalendarEventTitle(intervention),
          start: new Date(intervention.datePlanifiee),
          end: new Date(
            new Date(intervention.datePlanifiee).getTime() + dureeMins * 60 * 1000
          ),
          resource: intervention,
        };
      }),
    [interventions]
  );
  const techDayInterventions = useMemo(() => {
    if (!formData.technicienId || !formData.datePlanifiee) return [];
    const selectedDateStr = formData.datePlanifiee.split("T")[0];
    return interventions.filter(
      (inter) =>
        inter.technicienId === formData.technicienId &&
        inter.datePlanifiee.split("T")[0] === selectedDateStr &&
        inter.statut !== "annulee"
    ).sort((a, b) => new Date(a.datePlanifiee).getTime() - new Date(b.datePlanifiee).getTime());
  }, [interventions, formData.technicienId, formData.datePlanifiee]);
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3174ad"; // Default blue
    const status = event.resource.statut;

    if (status === "terminee") backgroundColor = "#10b981"; // Green
    else if (status === "en_cours")
      backgroundColor = "#f59e0b"; // Yellow (warning)
    else if (status === "annulee") backgroundColor = "#dc2626"; // Red
    else if (status === "planifiee") backgroundColor = "#3b82f6"; // Blue

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const sortedTodayInterventions = useMemo(
    () => sortInterventions(todayInterventions),
    [todayInterventions, sortInterventions]
  );

  const allInterventions = useMemo(
    () => getStatusFilteredInterventions(interventions, statusFilter),
    [interventions, statusFilter]
  );

  const sortedAllInterventions = useMemo(
    () => sortInterventions(allInterventions),
    [allInterventions, sortInterventions]
  );

  const mobilePlanningInterventions = useMemo(
    () =>
      interventions.map((intervention) => ({
        ...intervention,
        client: clients.find((client) => client.id === intervention.clientId),
        technicien: techniciens.find(
          (technicien) => technicien.id === intervention.technicienId
        ),
      })),
    [clients, interventions, techniciens]
  );

  if (loading) {
    return (
      <div className="space-y-6 interventions-page harmonized-page" style={{ padding: '24px' }}>
        <div className="interventions-header harmonized-header" style={{ marginBottom: '24px' }}>
          <div className="interventions-header-copy harmonized-header-copy">
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Interventions</h1>
            <p style={{ color: "var(--text-secondary)" }}>Chargement du planning en cours...</p>
          </div>
        </div>
        <SkeletonLoader type="table" rows={6} columns={user?.role === "admin" ? 6 : 5} />
      </div>
    );
  }

  const interventionOuverte = detailId
    ? [...interventions, ...todayInterventions].find((i) => i.id === detailId) ?? null
    : null;

  const listeCourante =
    viewMode === "all" ? sortedAllInterventions : sortedTodayInterventions;

  // La recherche porte sur ce qu'on a sous les yeux : numéro, intitulé, client
  // et technicien — les quatre entrées par lesquelles on cherche une fiche.
  const listeAffichee = recherche.trim()
    ? listeCourante.filter((i) => {
        const q = recherche.trim().toLowerCase();
        return (
          i.numero?.toLowerCase().includes(q) ||
          i.titre?.toLowerCase().includes(q) ||
          i.client?.nom?.toLowerCase().includes(q) ||
          i.technicien?.nom?.toLowerCase().includes(q)
        );
      })
    : listeCourante;

  const colonnesInterventions: Column<Intervention>[] = [
    {
      key: "numero",
      header: "Numéro",
      width: "112px",
      sortValue: (i) => i.numero,
      render: (i) => <span className="ui-ref">{i.numero}</span>,
    },
    {
      key: "titre",
      header: "Intervention",
      sortValue: (i) => i.titre,
      render: (i) => (
        <span className="ui-row__main">
          <span className="ui-row__title">{i.titre}</span>
          <span className="ui-row__meta">
            {i.client?.nom ?? "Client inconnu"}
            {i.type ? ` · ${i.type}` : ""}
          </span>
        </span>
      ),
    },
    {
      key: "technicien",
      header: "Technicien",
      width: "142px",
      hideOnNarrow: true,
      sortValue: (i) => i.technicien?.nom ?? null,
      render: (i) => i.technicien?.nom ?? "Non assigné",
    },
    {
      key: "date",
      header: "Planifiée",
      width: "132px",
      hideOnNarrow: true,
      sortValue: (i) => new Date(i.datePlanifiee).getTime(),
      render: (i) =>
        new Date(i.datePlanifiee).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      key: "statut",
      header: "État",
      width: "112px",
      sortValue: (i) => i.statut,
      render: (i) => <Status statut={i.statut} />,
    },
  ];

  return (
    <div className="interventions-page">
      <Workspace
        title="Interventions"
        meta={`${listeAffichee.length} ${listeAffichee.length > 1 ? "fiches" : "fiche"}`}
        search={
          !showForm && viewMode !== "calendar" ? (
            <SearchInput
              value={recherche}
              onChange={setRecherche}
              placeholder="Rechercher un numéro, un client, un technicien…"
            />
          ) : null
        }
        actions={
          user?.role === "admin" && !showForm ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Nouvelle intervention
            </Button>
          ) : null
        }
        views={
          !showForm ? (
            <>
              {user?.role !== "technicien" && (
                <ViewTab
                  active={viewMode === "calendar"}
                  onClick={() => setViewMode("calendar")}
                >
                  Calendrier
                </ViewTab>
              )}
              <ViewTab active={viewMode === "list"} onClick={() => setViewMode("list")}>
                Aujourd'hui
              </ViewTab>
              {user?.role === "admin" && (
                <ViewTab active={viewMode === "all"} onClick={() => setViewMode("all")}>
                  Toutes
                </ViewTab>
              )}
            </>
          ) : null
        }
        filters={
          !showForm && viewMode === "all" ? (
            <FilterBar
              options={[
                { value: "all", label: "Tous" },
                { value: "planifiee", label: "Planifiées", tone: "wait" },
                { value: "en_cours", label: "En cours", tone: "run" },
                { value: "terminee", label: "Terminées", tone: "done" },
                { value: "annulee", label: "Annulées", tone: "off" },
              ]}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              resultCount={{
                shown: listeAffichee.length,
                total: allInterventions.length,
              }}
            />
          ) : null
        }
      >
        {!isOnline && (
          <p className="interventions-hors-ligne">
            Mode hors-ligne — données mises en cache.
            {pendingSyncCount > 0
              ? ` ${pendingSyncCount} action${pendingSyncCount > 1 ? "s" : ""} en attente de synchronisation.`
              : ""}
          </p>
        )}

        {!showForm && viewMode !== "calendar" && (
          <SplitView
            detailOpen={Boolean(interventionOuverte)}
            onCloseDetail={() => setDetailId(null)}
            detailLabel="Détail de l'intervention"
            list={
              <DataTable
                rows={listeAffichee}
                rowKey={(i) => i.id}
                onRowClick={(i) => setDetailId(i.id)}
                selectedKey={detailId}
                columns={colonnesInterventions}
                emptyLabel={
                  recherche.trim()
                    ? "Aucune intervention ne correspond à cette recherche."
                    : viewMode === "list"
                      ? "Aucune intervention aujourd'hui."
                      : "Aucune intervention ne correspond à ce filtre."
                }
              />
            }
            detail={
              interventionOuverte ? (
                <DetailPane
                  title={interventionOuverte.titre}
                  reference={interventionOuverte.numero}
                  onClose={() => setDetailId(null)}
                  actions={
                    <>
                      <Button
                        variant="primary"
                        onClick={() =>
                          navigate(`/interventions/${interventionOuverte.id}`)
                        }
                      >
                        Ouvrir la fiche
                      </Button>
                      {locks[interventionOuverte.id] ? (
                        <span className="ui-state" data-tone="wait">
                          Verrouillée par {locks[interventionOuverte.id].lockedBy}
                        </span>
                      ) : null}
                    </>
                  }
                >
                  <DetailFacts>
                    <DetailFact label="État">
                      <Status statut={interventionOuverte.statut} />
                    </DetailFact>
                    <DetailFact label="Type">
                      {interventionOuverte.type || "SAV"}
                    </DetailFact>
                    <DetailFact label="Client">
                      {interventionOuverte.client?.nom ?? "Client inconnu"}
                    </DetailFact>
                    <DetailFact label="Technicien">
                      {interventionOuverte.technicien?.nom ?? "Non assigné"}
                    </DetailFact>
                    <DetailFact label="Planifiée">
                      {new Date(interventionOuverte.datePlanifiee).toLocaleString(
                        "fr-FR",
                        {
                          day: "2-digit",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </DetailFact>
                    <DetailFact label="Adresse">
                      {interventionOuverte.client
                        ? `${interventionOuverte.client.ville ?? ""}`
                        : "—"}
                    </DetailFact>
                  </DetailFacts>

                  {interventionOuverte.description ? (
                    <DetailSection title="Description">
                      <p className="ui-detail__texte">
                        {interventionOuverte.description}
                      </p>
                    </DetailSection>
                  ) : null}

                  <DetailSection title="Déroulé">
                    <DetailTimeline
                      steps={[
                        {
                          label: "Planifiée",
                          hint: "Créée et datée",
                          done: true,
                        },
                        {
                          label: "Prise en charge",
                          hint: "Le technicien démarre",
                          done: interventionOuverte.statut !== "planifiee",
                          current: interventionOuverte.statut === "en_cours",
                        },
                        {
                          label: "Heures et matériel",
                          hint: "Saisie sur place",
                          done: interventionOuverte.statut === "terminee",
                        },
                        {
                          label: "Signatures",
                          hint: "Technicien puis client",
                          done: interventionOuverte.statut === "terminee",
                        },
                        {
                          label: "Clôturée",
                          hint: "Rapport disponible",
                          done: interventionOuverte.statut === "terminee",
                        },
                      ]}
                    />
                  </DetailSection>
                </DetailPane>
              ) : null
            }
          />
        )}

        {user?.role !== "technicien" && viewMode === "calendar" && !showForm && (
          <div className="mobile-only">
            <MobilePlanning interventions={mobilePlanningInterventions} />
          </div>
        )}

        {/* Desktop Calendar View */}
        <div className="desktop-only">
          {user?.role !== "technicien" && viewMode === "calendar" && !showForm && (
            <div className="fade-in">
              <div
                key={calendarKey}
                className={transitionClass}
                style={{ width: "100%", overflow: "hidden", minWidth: 0 }}
              >
                <Suspense
                  fallback={
                    <div
                      className="flex items-center justify-center"
                      style={{
                        height: "calc(100vh - 400px)",
                        minHeight: "450px",
                        maxHeight: "700px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Chargement du calendrier...
                    </div>
                  }
                >
                  <InterventionsCalendar
                    calendarDate={calendarDate}
                    calendarEvents={calendarEvents}
                    calendarView={calendarView}
                    eventStyleGetter={eventStyleGetter}
                    handleNavigate={handleNavigate}
                    handleViewChange={handleViewChange}
                    onSelectEvent={(event: CalendarEvent) =>
                      navigate(`/interventions/${event.resource.id}`, {
                        state: { from: "calendar" },
                      })
                    }
                  />
                </Suspense>
              </div>
            </div>
          )}
        </div>

        {showForm && (
          <div
            className="fade-in"
            style={{
              padding: isMobile ? "0" : "0 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div style={{ width: "100%", maxWidth: "800px" }}>
              <div style={{ marginBottom: "30px" }}>
                <button className="btn btn-secondary" onClick={closeForm}>
                  ← Annuler la création
                </button>
              </div>

              <div
                className="stepper-container"
                style={{
                  maxWidth: "100%",
                  margin: "0 auto 30px auto",
                  padding: "0 10px",
                }}
              >
                <div className="stepper-header">
                  <div
                    className={`step-item ${currentStep === 1 ? "active" : ""
                      } ${currentStep > 1 ? "completed" : ""} `}
                  >
                    <div className="step-indicator">
                      {currentStep > 1 ? <AppIcon name="check-circle" size={18} /> : "1"}
                    </div>
                    <div className="step-label">Client</div>
                  </div>
                  <div
                    className={`step-item ${currentStep === 2 ? "active" : ""
                      } ${currentStep > 2 ? "completed" : ""} `}
                  >
                    <div className="step-indicator">
                      {currentStep > 2 ? <AppIcon name="check-circle" size={18} /> : "2"}
                    </div>
                    <div className="step-label">Détails</div>
                  </div>
                  <div
                    className={`step-item ${currentStep === 3 ? "active" : ""
                      } ${currentStep > 3 ? "completed" : ""} `}
                  >
                    <div className="step-indicator">
                      {currentStep > 3 ? <AppIcon name="check-circle" size={18} /> : "3"}
                    </div>
                    <div className="step-label">Planification</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "100%",
                  backgroundColor: "var(--card-bg)",
                  padding: isMobile ? "20px 15px" : "30px",
                  borderRadius: "16px",
                  boxShadow: "var(--shadow-lg)",
                  border: "1px solid var(--border-color)",
                }}
              >
              {currentStep === 1 && (
                  <div className="fade-in">
                    <h3 style={{ marginBottom: "20px" }}>
                      Étape 1 : Sélection du Client
                    </h3>

                    <div className="selection-search">
                      <div className="search-container">
                        <span className="search-icon"><AppIcon name="search" size={18} /></span>
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <label className="form-label" style={{ margin: 0 }}>Liste des clients *</label>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", border: "1px solid var(--border-color)" }}
                          onClick={() => setShowQuickClientModal(true)}
                        >
                          <AppIcon name="user" size={14} /> + Nouveau Client
                        </button>
                      </div>
                      {validationErrors.clientId && (
                        <div style={{ color: "#ef4444", fontSize: "0.875rem", marginBottom: "8px", fontWeight: "600" }}>
                          {validationErrors.clientId}
                        </div>
                      )}
                      <div className="selection-list" style={validationErrors.clientId ? { border: "2px solid #ef4444", borderRadius: "8px" } : undefined}>
                        {filteredClients.map((client) => (
                            <div
                              key={client.id}
                              className={`selection-item ${formData.clientId === client.id
                                ? "selected"
                                : ""
                                }`}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  clientId: client.id,
                                });
                                if (validationErrors.clientId) {
                                  setValidationErrors((prev) => {
                                    const copy = { ...prev };
                                    delete copy.clientId;
                                    return copy;
                                  });
                                }
                              }}
                            >
                              <div className="selection-item-info">
                                <span className="selection-item-title">
                                  {client.nom}
                                </span>
                                <span className="selection-item-subtitle">
                                  {client.rue
                                    ? `${client.rue}, ${client.codePostal || ""
                                      } ${client.ville || ""}`.trim()
                                    : "Sans adresse"}
                                </span>
                              </div>
                              <div className="selection-check"><AppIcon name="check-circle" size={16} /></div>
                            </div>
                          ))}
                        {filteredClients.length === 0 && (
                            <div
                              style={{
                                padding: "10px",
                                textAlign: "center",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Aucun client trouvé
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="fade-in">
                    <h3 style={{ marginBottom: "20px" }}>
                      Étape 2 : Détails de l'intervention
                    </h3>
                    <div className="form-group">
                      <label className="form-label">Titre *</label>
                      <input
                        type="text"
                        className="form-input"
                        style={validationErrors.titre ? { borderColor: "#ef4444" } : undefined}
                        value={formData.titre}
                        onChange={(e) => {
                          setFormData({ ...formData, titre: e.target.value });
                          if (validationErrors.titre) {
                            setValidationErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.titre;
                              return copy;
                            });
                          }
                        }}
                        placeholder="Ex: Installation Fibre Optique"
                      />
                      {validationErrors.titre && (
                        <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "4px", fontWeight: "600" }}>
                          {validationErrors.titre}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Type d'intervention *
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: "20px",
                          marginTop: "5px",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="type"
                            value="SAV"
                            checked={formData.type !== "Installation"} // Default to SAV if empty
                            onChange={() =>
                              setFormData({ ...formData, type: "SAV" })
                            }
                          />
                          <span>SAV</span>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="type"
                            value="Installation"
                            checked={formData.type === "Installation"}
                            onChange={() =>
                              setFormData({ ...formData, type: "Installation" })
                            }
                          />
                          <span>Installation</span>
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description *</label>
                      <textarea
                        className="form-textarea"
                        rows={5}
                        style={validationErrors.description ? { borderColor: "#ef4444" } : undefined}
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          });
                          if (validationErrors.description) {
                            setValidationErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.description;
                              return copy;
                            });
                          }
                        }}
                        placeholder="Détails de l'intervention..."
                        onKeyDown={(e) => {
                          if (e.key === "Tab" && !e.shiftKey) {
                            e.preventDefault();
                            nextButtonRef.current?.focus();
                          }
                        }}
                      />
                      {validationErrors.description && (
                        <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "4px", fontWeight: "600" }}>
                          {validationErrors.description}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="fade-in">
                    <h3 style={{ marginBottom: "20px" }}>
                      Étape 3 : Planification
                    </h3>
                    <div className="form-group">
                      <label className="form-label">
                        Choix du Technicien *
                      </label>
                      {validationErrors.technicienId && (
                        <div style={{ color: "#ef4444", fontSize: "0.875rem", marginBottom: "8px", fontWeight: "600" }}>
                          {validationErrors.technicienId}
                        </div>
                      )}

                      <div className="selection-search">
                        <div className="search-container">
                          <span className="search-icon"><AppIcon name="search" size={18} /></span>
                          <input
                            type="text"
                            className="search-input"
                            placeholder="Rechercher un technicien..."
                            value={technicianSearch}
                            onChange={(e) =>
                              setTechnicianSearch(e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="selection-list" style={validationErrors.technicienId ? { border: "2px solid #ef4444", borderRadius: "8px" } : undefined}>
                        {filteredTechnicians.map((tech) => (
                            <div
                              key={tech.id}
                              className={`selection-item ${formData.technicienId === tech.id
                                ? "selected"
                                : ""
                                }`}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  technicienId: tech.id,
                                });
                                if (validationErrors.technicienId) {
                                  setValidationErrors((prev) => {
                                    const copy = { ...prev };
                                    delete copy.technicienId;
                                    return copy;
                                  });
                                }
                              }}
                            >
                              <div className="selection-item-info">
                                <span className="selection-item-title">
                                  {tech.nom}
                                </span>
                                <span className="selection-item-subtitle">
                                  {tech.role}
                                </span>
                              </div>
                              <div className="selection-check"><AppIcon name="check-circle" size={16} /></div>
                            </div>
                          ))}
                        {filteredTechnicians.length === 0 && (
                            <div
                              style={{
                                padding: "10px",
                                textAlign: "center",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Aucun technicien disponible
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Date et Heure de début *
                      </label>
                      {validationErrors.datePlanifiee && (
                        <div style={{ color: "#ef4444", fontSize: "0.875rem", marginBottom: "8px", fontWeight: "600" }}>
                          {validationErrors.datePlanifiee}
                        </div>
                      )}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "15px",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              fontSize: "0.875rem",
                              color: "var(--text-secondary)",
                              marginBottom: "5px",
                              display: "block",
                            }}
                          >
                            Date
                          </label>
                          <input
                            type="date"
                            className="form-input"
                            style={validationErrors.datePlanifiee ? { borderColor: "#ef4444" } : undefined}
                            value={
                              formData.datePlanifiee
                                ? formData.datePlanifiee.split("T")[0]
                                : ""
                            }
                            onChange={(e) => {
                              const date = e.target.value;
                              const time = formData.datePlanifiee
                                ? formData.datePlanifiee.split("T")[1]
                                : "09:00";
                              if (date) {
                                setFormData({
                                  ...formData,
                                  datePlanifiee: `${date}T${time}`,
                                });
                              } else {
                                setFormData({ ...formData, datePlanifiee: "" });
                              }
                              if (validationErrors.datePlanifiee) {
                                setValidationErrors((prev) => {
                                  const copy = { ...prev };
                                  delete copy.datePlanifiee;
                                  return copy;
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Tab" && !e.shiftKey) {
                                e.preventDefault();
                                timeInputRef.current?.focus();
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: "0.875rem",
                              color: "var(--text-secondary)",
                              marginBottom: "5px",
                              display: "block",
                            }}
                          >
                            Heure
                          </label>
                          <input
                            ref={timeInputRef}
                            type="time"
                            className="form-input"
                            style={validationErrors.datePlanifiee ? { borderColor: "#ef4444" } : undefined}
                            value={
                              formData.datePlanifiee
                                ? (
                                  formData.datePlanifiee.split("T")[1] || ""
                                ).substring(0, 5)
                                : ""
                            }
                            onChange={(e) => {
                              const time = e.target.value;
                              const date = formData.datePlanifiee
                                ? formData.datePlanifiee.split("T")[0]
                                : new Date().toISOString().split("T")[0];
                              if (time) {
                                setFormData({
                                  ...formData,
                                  datePlanifiee: `${date}T${time}`,
                                });
                              }
                              if (validationErrors.datePlanifiee) {
                                setValidationErrors((prev) => {
                                  const copy = { ...prev };
                                  delete copy.datePlanifiee;
                                  return copy;
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleNextStep();
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: "20px" }}>
                      <label className="form-label">Durée estimée *</label>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "5px" }}>
                        {[
                          { label: "30 min", value: 30 },
                          { label: "1h", value: 60 },
                          { label: "2h (défaut)", value: 120 },
                          { label: "4h", value: 240 },
                          { label: "Journée (8h)", value: 480 },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`btn ${formData.duree === opt.value ? "btn-primary" : "btn-secondary"}`}
                            style={{ padding: "8px 16px", fontSize: "0.875rem", border: "1px solid var(--border-color)" }}
                            onClick={() => setFormData({ ...formData, duree: opt.value })}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.technicienId && formData.datePlanifiee && (
                      <div className="fade-in" style={{ marginTop: "25px", padding: "20px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <h4 style={{ fontSize: "1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
                          <AppIcon name="clock" size={16} /> Agenda de la journée pour le technicien
                        </h4>
                        {techDayInterventions.length === 0 ? (
                          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
                            Aucune intervention planifiée pour cette journée. Ce technicien est disponible.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {techDayInterventions.map((inter) => {
                              const time = new Date(inter.datePlanifiee).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const duree = (() => {
                                if (!inter.description) return 120;
                                const match = inter.description.match(/__duree_mins:(\d+)__/);
                                return match ? parseInt(match[1], 10) : 120;
                              })();
                              const endHour = new Date(new Date(inter.datePlanifiee).getTime() + duree * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              return (
                                <div key={inter.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 15px", backgroundColor: "var(--bg-color)", borderRadius: "6px", borderLeft: "4px solid var(--primary-color)" }}>
                                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--primary-color)", minWidth: "95px" }}>
                                    {time} - {endHour}
                                  </span>
                                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                    <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>{inter.titre}</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Client : {inter.clientNom || inter.client?.nom}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "30px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    onClick={handlePrevStep}
                    disabled={currentStep === 1}
                    style={{
                      visibility: currentStep === 1 ? "hidden" : "visible",
                    }}
                  >
                    Précédent
                  </button>
                  <button
                    ref={nextButtonRef}
                    className="btn btn-primary"
                    onClick={handleNextStep}
                  >
                    {currentStep === 3 ? "Valider et Planifier" : "Suivant"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Workspace>

      {showConflictModal && conflictingIntervention && (
        <ConfirmConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          onConfirm={submitForm}
          conflictingIntervention={conflictingIntervention}
          newDate={formData.datePlanifiee}
        />
      )}

      <QuickCreateClientModal
        isOpen={showQuickClientModal}
        onClose={() => setShowQuickClientModal(false)}
        onSuccess={(newClient) => {
          setClients((prev) => [newClient, ...prev]);
          setFormData((prev) => ({
            ...prev,
            clientId: newClient.id,
          }));
          if (validationErrors.clientId) {
            setValidationErrors((prev) => {
              const copy = { ...prev };
              delete copy.clientId;
              return copy;
            });
          }
          loadData(true);
        }}
      />
    </div>
  );
}

export default Interventions;
