import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar-dark-theme.css";
import moment from "../utils/momentFrConfig"; // Use shared French locale config
import { apiService } from "../services/api.service";
import { useAuth } from "../contexts/AuthContext";
import MobilePlanning from "../components/MobilePlanning";
import ConfirmConflictModal from "../components/ConfirmConflictModal";
import { useOffline } from "../hooks/useOffline";
import { useReminders } from "../hooks/useReminders";

const localizer = momentLocalizer(moment);

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

  // Restore viewMode from navigation state if present
  const initialViewMode = (location.state as any)?.viewMode || "list";
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "all">(
    initialViewMode
  );

  const [calendarView, setCalendarView] = useState<any>("month"); // Default to Month view
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarKey, setCalendarKey] = useState(0);
  const [transitionClass, setTransitionClass] = useState("fade-in");
  const [interventions, setInterventions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [techniciens, setTechniciens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "planifiee" | "en_cours" | "terminee" | "annulee"
  >("all");

  // Column sorting state
  const [sortColumn, setSortColumn] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Conflict detection state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingIntervention, setConflictingIntervention] =
    useState<any>(null);

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

      // Check if online
      if (!isOnline) {
        // Use cached data when offline
        console.log("Offline - using cached interventions");
        const cachedInterventions = await getCachedInterventionsList();
        if (cachedInterventions.length > 0) {
          let filtered = cachedInterventions;
          if (user?.role === "technicien") {
            filtered = cachedInterventions.filter(
              (intervention: any) => intervention.technicienId === user.id
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
          (intervention: any) => intervention.technicienId === user.id
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
        setCurrentStep((prev) => prev + 1);
      } else {
        alert("Veuillez remplir tous les champs obligatoires");
      }
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const checkForConflict = (techId: string, date: string) => {
    if (!techId || !date) return null;

    const newDate = new Date(date);

    // Simple conflict check logic: Look for interventions on the same day for same tech
    // In a real app we'd check duration overlaps
    return interventions.find((int) => {
      if (
        int.technicienId !== techId ||
        int.statut === "annulee" ||
        int.statut === "terminee"
      )
        return false;

      const intDate = new Date(int.datePlanifiee);
      // Check if it's the same day and roughly same time (within 2 hours)
      const timeDiff = Math.abs(intDate.getTime() - newDate.getTime());
      return timeDiff < 2 * 60 * 60 * 1000; // < 2 hours
    });
  };

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
      await apiService.createIntervention(formData);
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
    const badges: { [key: string]: { label: string; class: string } } = {
      planifiee: { label: "📅 Planifiée", class: "bg-blue-100 text-blue-800" },
      en_cours: {
        label: "⏳ En cours",
        class: "bg-yellow-100 text-yellow-800",
      },
      terminee: { label: "✓ Terminée", class: "bg-green-100 text-green-800" },
      annulee: { label: "✕ Annulée", class: "bg-red-50 text-red-600" },
    };
    const badge = badges[statut] || {
      label: statut,
      class: "bg-gray-100 text-gray-600",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.class}`}
      >
        {badge.label}
      </span>
    );
  };

  // Priority indicator based on date
  const getPriorityIndicator = (datePlanifiee: string, statut: string) => {
    if (statut === "terminee" || statut === "annulee") return null;
    const date = new Date(datePlanifiee);
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    if (date < now && statut !== "terminee") {
      return (
        <span
          title="En retard"
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#ef4444",
            marginRight: 6,
          }}
        />
      );
    } else if (date >= todayStart && date < tomorrowStart) {
      return (
        <span
          title="Aujourd'hui"
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#f59e0b",
            marginRight: 6,
          }}
        />
      );
    } else {
      return (
        <span
          title="À venir"
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#10b981",
            marginRight: 6,
          }}
        />
      );
    }
  };

  // Technician avatar with initials
  const getTechnicianAvatar = (tech: { nom: string } | null | undefined) => {
    if (!tech)
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "#e5e7eb",
            color: "#9ca3af",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          ?
        </span>
      );
    const initials = tech.nom
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    // Generate color from name
    const colors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#f97316",
    ];
    const colorIndex = tech.nom.charCodeAt(0) % colors.length;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: colors[colorIndex],
          color: "white",
          fontSize: 11,
          fontWeight: 600,
          marginRight: 6,
        }}
      >
        {initials}
      </span>
    );
  };

  // Progress line for intervention status
  const getProgressLine = (statut: string) => {
    const steps = [
      { key: "planifiee", label: "Planifiée", color: "#3b82f6" },
      { key: "en_cours", label: "En cours", color: "#f59e0b" },
      { key: "terminee", label: "Terminée", color: "#10b981" },
    ];
    const currentIndex =
      statut === "annulee" ? -1 : steps.findIndex((s) => s.key === statut);

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {steps.map((step, idx) => (
          <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: idx <= currentIndex ? step.color : "#e5e7eb",
                transition: "background-color 0.2s",
              }}
            />
            {idx < steps.length - 1 && (
              <div
                style={{
                  width: 16,
                  height: 2,
                  backgroundColor:
                    idx < currentIndex ? steps[idx + 1].color : "#e5e7eb",
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Count overdue interventions
  const overdueCount = interventions.filter((i) => {
    if (i.statut === "terminee" || i.statut === "annulee") return false;
    return new Date(i.datePlanifiee) < new Date();
  }).length;

  // Column sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Sortable header component
  const getSortableHeader = (label: string, column: string) => (
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

  // Sort interventions
  const sortInterventions = (list: any[]) => {
    return [...list].sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case "datePlanifiee":
          valA = new Date(a.datePlanifiee).getTime();
          valB = new Date(b.datePlanifiee).getTime();
          break;
        case "statut":
          const order = { planifiee: 1, en_cours: 2, terminee: 3, annulee: 4 };
          valA = order[a.statut as keyof typeof order] || 5;
          valB = order[b.statut as keyof typeof order] || 5;
          break;
        case "client":
          valA = a.client?.nom?.toLowerCase() || "";
          valB = b.client?.nom?.toLowerCase() || "";
          break;
        case "technicien":
          valA = a.technicien?.nom?.toLowerCase() || "zzz";
          valB = b.technicien?.nom?.toLowerCase() || "zzz";
          break;
        case "id":
        case "numero":
          // Try to extract number from "RDV2025005" format
          const extractNum = (str: string) => {
            if (!str) return 0;
            const match = str.toString().match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
          };
          const numA = extractNum(a.numero || a.id);
          const numB = extractNum(b.numero || b.id);

          if (numA !== 0 && numB !== 0) {
            valA = numA;
            valB = numB;
          } else {
            valA = a.numero || a.id || "";
            valB = b.numero || b.id || "";
          }
          break;
        default:
          valA = a[sortColumn];
          valB = b[sortColumn];
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleNavigate = (date: Date) => {
    if (date > calendarDate) {
      setTransitionClass("slide-left"); // Future: slide from right to left
    } else {
      setTransitionClass("slide-right"); // Past: slide from left to right
    }
    setCalendarDate(date);
    setCalendarKey((prev) => prev + 1);
  };

  const handleViewChange = (view: any) => {
    setCalendarView(view);
    setTransitionClass("fade-in"); // View change: simple fade
    setCalendarKey((prev) => prev + 1);
  };

  // Calendar events mapping - use local time (moment without UTC)
  const calendarEvents = interventions.map((int) => ({
    id: int.id,
    title: `[${int.type === "Installation" ? "Install" : "SAV"}] [${moment(
      int.datePlanifiee
    ).format("HH:mm")}] ${int.titre} - ${int.client?.nom} (${
      getStatusBadge(int.statut).props.children
    })`,
    start: new Date(int.datePlanifiee),
    end: new Date(new Date(int.datePlanifiee).getTime() + 2 * 60 * 60 * 1000), // Assumed 2h duration
    resource: int,
  }));

  const eventStyleGetter = (event: any) => {
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

  // Filtered list - For list view, only show today's interventions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const filteredInterventions = interventions
    .filter((intervention) => {
      // For list view, filter to show only today's interventions
      const interventionDate = new Date(intervention.datePlanifiee);
      const isToday = interventionDate >= today && interventionDate < tomorrow;

      if (!isToday) return false;

      return true;
    })
    .sort((a, b) => {
      // Sort by time (earliest first)
      return (
        new Date(a.datePlanifiee).getTime() -
        new Date(b.datePlanifiee).getTime()
      );
    });

  // All interventions (filtered by search and status, for admin "Toutes" view)
  const allInterventions = interventions
    .filter((intervention) => {
      // Apply status filter
      if (statusFilter !== "all" && intervention.statut !== statusFilter)
        return false;

      return true;
    })
    .sort((a, b) => {
      // Sort by date (most recent first)
      return (
        new Date(b.datePlanifiee).getTime() -
        new Date(a.datePlanifiee).getTime()
      );
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--bg-primary)",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            📅 Interventions
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Gestion des interventions et planning
          </p>
        </div>
        {user?.role === "admin" && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(249, 115, 22, 0.35)",
            }}
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
            <span className="text-xl">📴</span>
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
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          }}
        >
          {[
            { value: interventions.length, label: "Total", color: "#f97316" },
            {
              value: interventions.filter((i) => i.statut === "planifiee")
                .length,
              label: "Planifiées",
              color: "#3b82f6",
            },
            {
              value: interventions.filter((i) => i.statut === "en_cours")
                .length,
              label: "En cours",
              color: "#f59e0b",
            },
            {
              value: interventions.filter((i) => i.statut === "terminee")
                .length,
              label: "Terminées",
              color: "#10b981",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "var(--bg-primary)",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
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
              style={{
                backgroundColor: "var(--bg-primary)",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
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
                ⚠️ En retard
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Card */}
      <div
        style={{
          backgroundColor: "var(--bg-primary)",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          padding: "20px",
        }}
      >
        {/* Tabs with Search */}
        {!showForm && (
          <div className="flex justify-between items-center gap-4 mb-6 border-b pb-4 flex-wrap">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === "calendar"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setViewMode("calendar")}
              >
                📅 Calendrier
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setViewMode("list")}
              >
                📋 Liste du jour
              </button>
              {user?.role === "admin" && (
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === "all"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setViewMode("all")}
                >
                  📑 Toutes les interventions
                </button>
              )}
            </div>
            {user?.role === "admin" && (
              <div
                className="relative"
                style={{ minWidth: "300px", maxWidth: "400px" }}
              ></div>
            )}
          </div>
        )}

        {viewMode === "list" && !showForm && (
          <div className="fade-in">
            <div style={{ overflowX: "auto" }}>
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
                  {sortInterventions(filteredInterventions).length > 0 ? (
                    sortInterventions(filteredInterventions).map(
                      (intervention) => (
                        <tr
                          key={intervention.id}
                          className="clickable-row"
                          onClick={() =>
                            navigate(`/interventions/${intervention.id}`)
                          }
                        >
                          <td>
                            <div
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              {getPriorityIndicator(
                                intervention.datePlanifiee,
                                intervention.statut
                              )}
                              <span className="font-bold text-gray-800">
                                {intervention.numero}
                              </span>
                            </div>
                          </td>
                          <td>
                            {new Date(
                              intervention.datePlanifiee
                            ).toLocaleString("fr-FR")}
                          </td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                intervention.type === "Installation"
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
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
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
                              {getProgressLine(intervention.statut)}
                              {getStatusBadge(intervention.statut)}
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td colSpan={user?.role === "admin" ? 6 : 5}>
                        <div className="text-center py-12">
                          <div className="text-4xl mb-4">📅</div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Aucune intervention aujourd'hui
                          </h3>
                          <p className="text-gray-500 mt-2">
                            "Utilisez le calendrier pour voir toutes les
                            interventions"
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

        {/* All Interventions View (Admin only) */}
        {viewMode === "all" && !showForm && user?.role === "admin" && (
          <div className="fade-in">
            <div className="mb-4 flex justify-between items-center flex-wrap gap-3">
              <div className="flex flex-col gap-2">
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
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setStatusFilter("all")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "1px solid var(--border-color)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      backgroundColor:
                        statusFilter === "all"
                          ? "var(--text-primary)"
                          : "var(--bg-secondary)",
                      color:
                        statusFilter === "all"
                          ? "var(--bg-primary)"
                          : "var(--text-secondary)",
                    }}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setStatusFilter("planifiee")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      backgroundColor:
                        statusFilter === "planifiee"
                          ? "#3b82f6"
                          : "rgba(59, 130, 246, 0.15)",
                      color: statusFilter === "planifiee" ? "white" : "#3b82f6",
                    }}
                  >
                    📅 Planifiées
                  </button>
                  <button
                    onClick={() => setStatusFilter("en_cours")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      backgroundColor:
                        statusFilter === "en_cours"
                          ? "#f59e0b"
                          : "rgba(245, 158, 11, 0.15)",
                      color: statusFilter === "en_cours" ? "white" : "#f59e0b",
                    }}
                  >
                    ⏳ En cours
                  </button>
                  <button
                    onClick={() => setStatusFilter("terminee")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      backgroundColor:
                        statusFilter === "terminee"
                          ? "#10b981"
                          : "rgba(16, 185, 129, 0.15)",
                      color: statusFilter === "terminee" ? "white" : "#10b981",
                    }}
                  >
                    ✓ Terminées
                  </button>
                  <button
                    onClick={() => setStatusFilter("annulee")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      backgroundColor:
                        statusFilter === "annulee"
                          ? "#ef4444"
                          : "rgba(239, 68, 68, 0.15)",
                      color: statusFilter === "annulee" ? "white" : "#ef4444",
                    }}
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
            <div style={{ overflowX: "auto" }}>
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
                  {sortInterventions(allInterventions).length > 0 ? (
                    sortInterventions(allInterventions).map((intervention) => (
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
                            {getPriorityIndicator(
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
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              intervention.type === "Installation"
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
                            {getProgressLine(intervention.statut)}
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
            <MobilePlanning
              interventions={interventions.map((int) => ({
                ...int,
                client: clients.find((c) => c.id === int.clientId),
                technicien: techniciens.find((t) => t.id === int.technicienId),
              }))}
            />
          </div>
        )}

        {/* Desktop Calendar View */}
        <div className="desktop-only">
          {viewMode === "calendar" && !showForm && (
            <div className="fade-in">
              <div
                key={calendarKey}
                className={transitionClass}
                style={{ width: "100%", overflow: "hidden" }}
              >
                <Calendar
                  localizer={localizer}
                  culture="fr"
                  defaultView="month"
                  selectable
                  min={new Date(0, 0, 0, 0, 0, 0)} // Start at 00:00
                  max={new Date(0, 0, 0, 23, 59, 59)} // End at 23:59
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{
                    height: "calc(100vh - 400px)",
                    minHeight: "450px",
                    maxHeight: "700px",
                  }}
                  date={calendarDate}
                  onNavigate={handleNavigate}
                  view={calendarView}
                  onView={handleViewChange}
                  eventPropGetter={eventStyleGetter}
                  formats={{
                    dayFormat: (date: Date) => moment(date).format("dddd D"),
                    weekdayFormat: (date: Date) => moment(date).format("dddd"),
                    monthHeaderFormat: (date: Date) =>
                      moment(date).format("MMMM YYYY"),
                    dayHeaderFormat: (date: Date) =>
                      moment(date).format("dddd D MMMM"),
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
                    event: "Événement",
                  }}
                  onSelectEvent={(event: any) =>
                    navigate(`/interventions/${event.resource.id}`, {
                      state: { from: "calendar" },
                    })
                  }
                />
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
                    className={`step-item ${
                      currentStep === 1 ? "active" : ""
                    } ${currentStep > 1 ? "completed" : ""} `}
                  >
                    <div className="step-indicator">
                      {currentStep > 1 ? "✓" : "1"}
                    </div>
                    <div className="step-label">Client</div>
                  </div>
                  <div
                    className={`step-item ${
                      currentStep === 2 ? "active" : ""
                    } ${currentStep > 2 ? "completed" : ""} `}
                  >
                    <div className="step-indicator">
                      {currentStep > 2 ? "✓" : "2"}
                    </div>
                    <div className="step-label">Détails</div>
                  </div>
                  <div
                    className={`step-item ${
                      currentStep === 3 ? "active" : ""
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
                        {clients
                          .filter(
                            (client) =>
                              client.nom
                                .toLowerCase()
                                .includes(clientSearch.toLowerCase()) ||
                              (client.rue &&
                                client.rue
                                  .toLowerCase()
                                  .includes(clientSearch.toLowerCase())) ||
                              (client.ville &&
                                client.ville
                                  .toLowerCase()
                                  .includes(clientSearch.toLowerCase()))
                          )
                          .map((client) => (
                            <div
                              key={client.id}
                              className={`selection-item ${
                                formData.clientId === client.id
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
                                    ? `${client.rue}, ${
                                        client.codePostal || ""
                                      } ${client.ville || ""}`.trim()
                                    : "Sans adresse"}
                                </span>
                              </div>
                              <div className="selection-check">✓</div>
                            </div>
                          ))}
                        {clients.filter((c) =>
                          c.nom
                            .toLowerCase()
                            .includes(clientSearch.toLowerCase())
                        ).length === 0 && (
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
                        {techniciens
                          .filter(
                            (tech) =>
                              tech.role !== "admin" &&
                              (tech.nom
                                .toLowerCase()
                                .includes(technicianSearch.toLowerCase()) ||
                                (tech.role &&
                                  tech.role
                                    .toLowerCase()
                                    .includes(technicianSearch.toLowerCase())))
                          )
                          .map((tech) => (
                            <div
                              key={tech.id}
                              className={`selection-item ${
                                formData.technicienId === tech.id
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
                        {techniciens.filter(
                          (t) =>
                            t.role !== "admin" &&
                            t.nom
                              .toLowerCase()
                              .includes(technicianSearch.toLowerCase())
                        ).length === 0 && (
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
