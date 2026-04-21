import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { View } from "react-big-calendar";
import { apiService } from "../services/api.service";
import { useAuth } from "../contexts/useAuth";
import MobilePlanning from "../components/MobilePlanning";
import ConfirmConflictModal from "../components/ConfirmConflictModal";
import { useOffline } from "../hooks/useOffline";
import { useReminders } from "../hooks/useReminders";
import { useResponsive } from "../hooks/useResponsive";
import {
  buildCalendarEventTitle,
  getCalendarTransitionClass,
  getInterventionStatusBadgeConfig,
} from "./interventions.utils";
import {
  filterClientsForSelection,
  filterTechniciansForSelection,
  findInterventionConflict,
  validateInterventionStep,
} from "./interventions-form.utils";
import {
  getOverdueInterventionsCount,
  getStatusFilteredInterventions,
  getTodayInterventions,
  sortInterventionsList,
  type InterventionSortColumn,
} from "./interventions-list.utils";
import {
  getInterventionPriorityIndicator,
  getInterventionProgressLine,
  getTechnicianAvatar,
} from "./interventions-ui.utils";

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
  const [currentStep, setCurrentStep] = useState(1);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "planifiee" | "en_cours" | "terminee" | "annulee"
  >("all");

  // Column sorting state
  const [sortColumn, setSortColumn] = useState<InterventionSortColumn>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
  });

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
            apiService.getClients({}),
            apiService.getTechniciens({}),
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

  const validateStep = (step: number) => validateInterventionStep(step, formData);

  const handleNextStep = async () => {
    if (currentStep === 3) {
      await handleCheckConflictAndSubmit();
    } else {
      if (validateStep(currentStep)) {
        setCurrentStep((prev) => prev + 1);
      } else {
        alert("Veuillez remplir tous les champs obligatoires");
      }
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const checkForConflict = (techId: string, date: string) =>
    findInterventionConflict(interventions, techId, date);

  const handleCheckConflictAndSubmit = async () => {
    if (!validateStep(3)) {
      alert("Veuillez sélectionner un technicien et une date");
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
      const dataToSubmit = { ...formData };
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
    setFormData({
      clientId: "",
      technicienId: "",
      titre: "",
      description: "",
      datePlanifiee: "",
      statut: "planifiee",
      type: "SAV",
    });
  };

  const getStatusBadge = (statut: string) => {
    const badge = getInterventionStatusBadgeConfig(statut);
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

  const formatInterventionDate = (dateValue: string) =>
    new Date(dateValue).toLocaleDateString("fr-FR", {
      weekday: isMobile ? undefined : "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderMobileInterventionCard = (
    intervention: Intervention,
    detailState?: { from?: "all" | "calendar" }
  ) => (
    <article
      key={intervention.id}
      className="interventions-mobile-card"
      onClick={() => navigate(`/interventions/${intervention.id}`, detailState ? { state: detailState } : undefined)}
    >
      <div className="interventions-mobile-card-top">
        <div>
          <div className="interventions-mobile-number">
            {getInterventionPriorityIndicator(
              intervention.datePlanifiee,
              intervention.statut
            )}
            <span>{intervention.numero}</span>
          </div>
          <h3 className="interventions-mobile-title">{intervention.titre}</h3>
        </div>
        <div>{getStatusBadge(intervention.statut)}</div>
      </div>

      <div className="interventions-mobile-meta">
        <div className="interventions-mobile-meta-row">
          <span className="interventions-mobile-label">Quand</span>
          <span className="interventions-mobile-value">
            {formatInterventionDate(intervention.datePlanifiee)}
          </span>
        </div>
        <div className="interventions-mobile-meta-row">
          <span className="interventions-mobile-label">Client</span>
          <span className="interventions-mobile-value">
            {intervention.client?.nom || "Non renseigné"}
          </span>
        </div>
        {user?.role === "admin" && (
          <div className="interventions-mobile-meta-row">
            <span className="interventions-mobile-label">Technicien</span>
            <span className="interventions-mobile-value">
              {intervention.technicien?.nom || "Non assigné"}
            </span>
          </div>
        )}
      </div>

      <div className="interventions-mobile-footer">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${intervention.type === "Installation"
            ? "bg-blue-100 text-blue-800"
            : intervention.type === "SAV"
              ? "bg-orange-100 text-orange-800"
              : "bg-gray-100 text-gray-800"
            }`}
        >
          {intervention.type || "SAV"}
        </span>
        <div className="interventions-mobile-status">
          {getInterventionProgressLine(intervention.statut)}
        </div>
      </div>
    </article>
  );

  const filteredClients = useMemo(
    () => filterClientsForSelection(clients, clientSearch),
    [clients, clientSearch]
  );

  const filteredTechnicians = useMemo(
    () => filterTechniciansForSelection(techniciens, technicianSearch),
    [techniciens, technicianSearch]
  );

  const interventionStats = useMemo(
    () => [
      { value: interventions.length, label: "Total", color: "#f97316" },
      {
        value: interventions.filter((intervention) => intervention.statut === "planifiee")
          .length,
        label: "Planifiées",
        color: "#3b82f6",
      },
      {
        value: interventions.filter((intervention) => intervention.statut === "en_cours")
          .length,
        label: "En cours",
        color: "#f59e0b",
      },
      {
        value: interventions.filter((intervention) => intervention.statut === "terminee")
          .length,
        label: "Terminées",
        color: "#10b981",
      },
    ],
    [interventions]
  );

  const overdueCount = useMemo(
    () => getOverdueInterventionsCount(interventions),
    [interventions]
  );

  // Column sorting handler
  const handleSort = (column: InterventionSortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Sortable header component
  const getSortableHeader = (label: string, column: InterventionSortColumn) => (
    <th
      style={{ cursor: "pointer", userSelect: "none" }}
      onClick={() => handleSort(column)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {sortColumn === column && (
          <span style={{ fontSize: 12 }}>
            {sortDirection === "asc" ? "▲" : "▼"}
          </span>
        )}
      </div>
    </th>
  );

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

  // Calendar events mapping - use local time (moment without UTC)
  const calendarEvents = useMemo(
    () =>
      interventions.map((intervention) => ({
        id: intervention.id,
        title: buildCalendarEventTitle(intervention),
        start: new Date(intervention.datePlanifiee),
        end: new Date(
          new Date(intervention.datePlanifiee).getTime() + 2 * 60 * 60 * 1000
        ),
        resource: intervention,
      })),
    [interventions]
  );

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

  const filteredInterventions = useMemo(
    () => getTodayInterventions(interventions),
    [interventions]
  );

  const sortedTodayInterventions = useMemo(
    () => sortInterventions(filteredInterventions),
    [filteredInterventions, sortInterventions]
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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 interventions-page">
      {/* Header */}
      <div className="interventions-header">
        <div className="interventions-header-copy">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Interventions
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Gestion des interventions et planning
          </p>
        </div>
        {user?.role === "admin" && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="interventions-primary-action"
          >
            + Nouvelle Intervention
          </button>
        )}
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            borderLeft: "4px solid #f59e0b",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">Hors ligne</span>
            <div>
              <strong>Mode hors-ligne</strong>
              <span style={{ color: "var(--text-secondary)" }}>
                {" "}
                - Vous consultez les données mises en cache.
              </span>
              {pendingSyncCount > 0 && (
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    backgroundColor: "rgba(245, 158, 11, 0.2)",
                    color: "#d97706",
                  }}
                >
                  {pendingSyncCount} action{pendingSyncCount > 1 ? "s" : ""} en
                  attente
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards (show only when not in form) */}
      {!showForm && (
        <div
          className="interventions-stats-grid"
        >
          {interventionStats.map((stat, idx) => (
            <div
              key={idx}
              className="interventions-stat-card"
              style={{
                borderLeft: `4px solid ${stat.color}`,
              }}
            >
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                {stat.value}
              </div>
              <div
                style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
          {overdueCount > 0 && (
            <div
              className="interventions-stat-card"
              style={{
                borderLeft: "4px solid #ef4444",
              }}
            >
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "#ef4444",
                }}
              >
                {overdueCount}
              </div>
              <div
                style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
              >
                En retard
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Card */}
      <div className="interventions-surface">
        {/* Tabs with Search */}
        {!showForm && (
          <div className="interventions-toolbar">
            <div className="interventions-view-switcher">
              <button
                className={`interventions-tab ${viewMode === "calendar" ? "active" : ""}`}
                onClick={() => setViewMode("calendar")}
              >
                <span className="interventions-tab-meta">
                  <span>Calendrier</span>
                  <span className="interventions-tab-count">{interventions.length}</span>
                </span>
              </button>
              <button
                className={`interventions-tab ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <span className="interventions-tab-meta">
                  <span>Liste du jour</span>
                  <span className="interventions-tab-count">{sortedTodayInterventions.length}</span>
                </span>
              </button>
              {user?.role === "admin" && (
                <button
                  className={`interventions-tab ${viewMode === "all" ? "active" : ""}`}
                  onClick={() => setViewMode("all")}
                >
                  <span className="interventions-tab-meta">
                    <span>Toutes</span>
                    <span className="interventions-tab-count">{sortedAllInterventions.length}</span>
                  </span>
                </button>
              )}
            </div>
            {user?.role === "admin" && (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", alignSelf: "center" }}>
                {isMobile ? "Appuyez sur une carte pour ouvrir le détail." : "Cliquez sur une ligne pour ouvrir le détail."}
              </div>
            )}
          </div>
        )}

        {viewMode === "list" && !showForm && (
          <div className="fade-in">
            <div className="interventions-mobile-list">
              <div className="interventions-mobile-summary">
                <span>Aujourd'hui</span>
                <strong>{sortedTodayInterventions.length} intervention{sortedTodayInterventions.length > 1 ? "s" : ""}</strong>
              </div>
              {sortedTodayInterventions.length > 0 ? (
                isMobile ? (
                  sortedTodayInterventions.map((intervention) =>
                    renderMobileInterventionCard(intervention)
                  )
                ) : (
                  <div className="responsive-scroll">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>N°</th>
                          {getSortableHeader("Date planifiée", "datePlanifiee")}
                          <th>Type</th>
                          <th>Titre</th>
                          {getSortableHeader("Client", "client")}
                          {user?.role === "admin" &&
                            getSortableHeader("Technicien", "technicien")}
                          {getSortableHeader("Statut", "statut")}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTodayInterventions.map((intervention) => (
                          <tr
                            key={intervention.id}
                            className="clickable-row"
                            onClick={() => navigate(`/interventions/${intervention.id}`)}
                          >
                            <td>
                              <div style={{ display: "flex", alignItems: "center" }}>
                                {getInterventionPriorityIndicator(
                                  intervention.datePlanifiee,
                                  intervention.statut
                                )}
                                <span className="font-bold text-gray-800">
                                  {intervention.numero}
                                </span>
                              </div>
                            </td>
                            <td>{new Date(intervention.datePlanifiee).toLocaleString("fr-FR")}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${intervention.type === "Installation"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-indigo-100 text-indigo-800"
                                  }`}
                              >
                                {intervention.type || "SAV"}
                              </span>
                            </td>
                            <td className="font-medium">{intervention.titre}</td>
                            <td>
                              {intervention.client?.nom || (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            {user?.role === "admin" && (
                              <td>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  {getTechnicianAvatar(intervention.technicien)}
                                  <span>
                                    {intervention.technicien?.nom || (
                                      <span className="text-gray-400">Non assigné</span>
                                    )}
                                  </span>
                                </div>
                              </td>
                            )}
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "nowrap",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {getInterventionProgressLine(intervention.statut)}
                                {getStatusBadge(intervention.statut)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="interventions-mobile-empty">
                  <div className="text-4xl mb-4">📅</div>
                  <div className="font-medium">Aucune intervention aujourd'hui</div>
                  <div className="mt-2">Utilisez le calendrier pour voir toutes les interventions.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Interventions View (Admin only) */}
        {viewMode === "all" && !showForm && user?.role === "admin" && (
          <div className="fade-in">
            <div className="mb-4" style={{ display: "grid", gap: 14 }}>
              <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    letterSpacing: "0.3px",
                  }}
                >
                  Filtrer par statut
                </span>
                <div className="interventions-filter-row">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`interventions-filter-chip filter-all ${statusFilter === "all" ? "active" : ""}`}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setStatusFilter("planifiee")}
                    className={`interventions-filter-chip filter-planifiee ${statusFilter === "planifiee" ? "active" : ""}`}
                  >
                    📅 Planifiées
                  </button>
                  <button
                    onClick={() => setStatusFilter("en_cours")}
                    className={`interventions-filter-chip filter-en_cours ${statusFilter === "en_cours" ? "active" : ""}`}
                  >
                    ⏳ En cours
                  </button>
                  <button
                    onClick={() => setStatusFilter("terminee")}
                    className={`interventions-filter-chip filter-terminee ${statusFilter === "terminee" ? "active" : ""}`}
                  >
                    ✓ Terminées
                  </button>
                  <button
                    onClick={() => setStatusFilter("annulee")}
                    className={`interventions-filter-chip filter-annulee ${statusFilter === "annulee" ? "active" : ""}`}
                  >
                    ✕ Annulées
                  </button>
                </div>
              </div>
              <span
                style={{ color: "var(--text-secondary)", fontSize: "14px" }}
              >
                {allInterventions.length} intervention
                {allInterventions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="mobile-only interventions-mobile-list">
              <div className="interventions-mobile-summary">
                <span>Vue filtrée</span>
                <strong>{sortedAllInterventions.length} intervention{sortedAllInterventions.length > 1 ? "s" : ""}</strong>
              </div>
              {sortedAllInterventions.length > 0 ? (
                sortedAllInterventions.map((intervention) =>
                  renderMobileInterventionCard(intervention, { from: "all" })
                )
              ) : (
                <div className="interventions-mobile-empty">
                  <div className="text-4xl mb-4">📋</div>
                  <div className="font-medium">Aucune intervention</div>
                  <div className="mt-2">Aucune intervention enregistrée pour ce filtre.</div>
                </div>
              )}
            </div>
            <div className="responsive-scroll desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>N°</th>
                    {getSortableHeader("Date planifiée", "datePlanifiee")}
                    <th>Type</th>
                    <th>Titre</th>
                    {getSortableHeader("Client", "client")}
                    {getSortableHeader("Technicien", "technicien")}
                    {getSortableHeader("Statut", "statut")}
                  </tr>
                </thead>
                <tbody>
                  {sortedAllInterventions.length > 0 ? (
                    sortedAllInterventions.map((intervention) => (
                      <tr
                        key={intervention.id}
                        className="clickable-row"
                        onClick={() =>
                          navigate(`/interventions/${intervention.id}`, {
                            state: { from: "all" },
                          })
                        }
                      >
                        <td>
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {getInterventionPriorityIndicator(
                              intervention.datePlanifiee,
                              intervention.statut
                            )}
                            <span className="font-bold text-gray-800">
                              {intervention.numero}
                            </span>
                          </div>
                        </td>
                        <td>
                          {new Date(intervention.datePlanifiee).toLocaleString(
                            "fr-FR"
                          )}
                        </td>
                        <td>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${intervention.type === "Installation"
                              ? "bg-blue-100 text-blue-800"
                              : intervention.type === "SAV"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {intervention.type || "SAV"}
                          </span>
                        </td>
                        <td className="font-medium">{intervention.titre}</td>
                        <td>
                          {intervention.client?.nom || (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td>
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {getTechnicianAvatar(intervention.technicien)}
                            <span>
                              {intervention.technicien?.nom || (
                                <span className="text-gray-400">
                                  Non assigné
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "nowrap",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getInterventionProgressLine(intervention.statut)}
                            {getStatusBadge(intervention.statut)}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="text-center py-12">
                          <div className="text-4xl mb-4">📋</div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Aucune intervention
                          </h3>
                          <p className="text-gray-500 mt-2">
                            "Aucune intervention enregistrée"
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile Planning View - Only show in calendar mode */}
        {viewMode === "calendar" && !showForm && (
          <div className="mobile-only">
            <MobilePlanning interventions={mobilePlanningInterventions} />
          </div>
        )}

        {/* Desktop Calendar View */}
        <div className="desktop-only">
          {viewMode === "calendar" && !showForm && (
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
          {showForm && (
            <div className="fade-in" style={{ padding: "0 20px" }}>
              <div style={{ marginBottom: "30px" }}>
                <button className="btn btn-secondary" onClick={closeForm}>
                  ← Annuler la création
                </button>
              </div>

              <div className="stepper-container">
                <div className="stepper-header">
                  <div
                    className={`step-item ${currentStep === 1 ? "active" : ""
                      } ${currentStep > 1 ? "completed" : ""} `}
                  >
                    <div className="step-indicator">
                      {currentStep > 1 ? "✓" : "1"}
                    </div>
                    <div className="step-label">Client</div>
                  </div>
                  <div
                    className={`step-item ${currentStep === 2 ? "active" : ""
                      } ${currentStep > 2 ? "completed" : ""} `}
                  >
                    <div className="step-indicator">
                      {currentStep > 2 ? "✓" : "2"}
                    </div>
                    <div className="step-label">Détails</div>
                  </div>
                  <div
                    className={`step-item ${currentStep === 3 ? "active" : ""
                      } ${currentStep > 3 ? "completed" : ""} `}
                  >
                    <div className="step-indicator">
                      {currentStep > 3 ? "✓" : "3"}
                    </div>
                    <div className="step-label">Planification</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  maxWidth: "800px",
                  margin: "0 auto",
                  backgroundColor: "var(--bg-color)",
                  padding: "30px",
                  borderRadius: "8px",
                }}
              >
                {currentStep === 1 && (
                  <div className="fade-in">
                    <h3 style={{ marginBottom: "20px" }}>
                      Étape 1 : Sélection du Client
                    </h3>

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
                        {filteredClients.map((client) => (
                            <div
                              key={client.id}
                              className={`selection-item ${formData.clientId === client.id
                                ? "selected"
                                : ""
                                }`}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  clientId: client.id,
                                })
                              }
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
                              <div className="selection-check">✓</div>
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
                        value={formData.titre}
                        onChange={(e) =>
                          setFormData({ ...formData, titre: e.target.value })
                        }
                        placeholder="Ex: Installation Fibre Optique"
                      />
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
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Détails de l'intervention..."
                        onKeyDown={(e) => {
                          if (e.key === "Tab" && !e.shiftKey) {
                            e.preventDefault();
                            nextButtonRef.current?.focus();
                          }
                        }}
                      />
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

                      <div className="selection-search">
                        <div className="search-container">
                          <span className="search-icon">🔍</span>
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

                      <div className="selection-list">
                        {filteredTechnicians.map((tech) => (
                            <div
                              key={tech.id}
                              className={`selection-item ${formData.technicienId === tech.id
                                ? "selected"
                                : ""
                                }`}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  technicienId: tech.id,
                                })
                              }
                            >
                              <div className="selection-item-info">
                                <span className="selection-item-title">
                                  {tech.nom}
                                </span>
                                <span className="selection-item-subtitle">
                                  {tech.role}
                                </span>
                              </div>
                              <div className="selection-check">✓</div>
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
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
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
                      <p
                        className="text-muted"
                        style={{ marginTop: "10px", fontSize: "0.875rem" }}
                      >
                        Durée estimée par défaut : 2 heures
                      </p>
                    </div>
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
          )}
        </div>
      </div>

      {showConflictModal && conflictingIntervention && (
        <ConfirmConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          onConfirm={submitForm}
          conflictingIntervention={conflictingIntervention}
          newDate={formData.datePlanifiee}
        />
      )}
    </div>
  );
}

export default Interventions;
