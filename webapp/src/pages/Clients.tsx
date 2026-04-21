import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { apiService } from "../services/api.service";
import TableResponsive from "../components/TableResponsive";
import { useAuth } from "../contexts/useAuth";
import type { Client, ClientsListResponse } from "../types";
import "./mobile-refactor.css";
import "./screen-harmonization.css";

interface ApiErrorResponse {
  error?: string;
}

type ClientSortField = "nom" | "ville";

function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortField, setSortField] = useState<ClientSortField>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [cityFilter, setCityFilter] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    client: Client | null;
  }>({
    show: false,
    client: null,
  });

  // UNYC sync state
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const handleUnycSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await apiService.syncUnycCustomers();
      alert(result.message || "Synchronisation terminée");
      loadClients();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      alert(
        axiosError.response?.data?.error || "Erreur lors de la synchronisation UNYC"
      );
    } finally {
      setSyncing(false);
    }
  };

  // Get unique cities for filter dropdown
  const uniqueCities = [...new Set(clients.map((c) => c.ville))].sort();

  // Sort and filter clients
  const sortedClients = [...clients]
    .filter((c) => !cityFilter || c.ville === cityFilter)
    .sort((a, b) => {
      const valA = a[sortField]?.toLowerCase() || "";
      const valB = b[sortField]?.toLowerCase() || "";
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(sortedClients.length / itemsPerPage);
  const paginatedClients = sortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: ClientSortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const loadClients = useCallback(async () => {
    try {
      const data = (await apiService.getClients({ limit: 100 })) as ClientsListResponse;
      setClients(data.clients);
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const handleDelete = (client: Client) => {
    setDeleteModal({ show: true, client });
  };

  const confirmDelete = async () => {
    if (!deleteModal.client) return;

    try {
      await apiService.deleteClient(deleteModal.client.id);
      setDeleteModal({ show: false, client: null });
      loadClients();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert(
        "Erreur: Impossible de supprimer un client ayant des interventions liées."
      );
      setDeleteModal({ show: false, client: null });
    }
  };

  // Export clients to CSV
  const exportCSV = () => {
    const headers = [
      "Nom",
      "Sous-lieu",
      "Rue",
      "Code Postal",
      "Ville",
      "Contact",
      "Téléphone",
    ];
    const rows = sortedClients.map((c) => [
      c.nom,
      c.sousLieu || "",
      c.rue,
      c.codePostal,
      c.ville,
      c.contact,
      c.telephone,
    ]);
    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import clients from CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const dataLines = lines.slice(1); // Skip header

      let imported = 0;
      for (const line of dataLines) {
        const cells = line
          .split(";")
          .map((cell) => cell.replace(/^"|"$/g, "").trim());
        if (cells.length >= 7 && cells[0]) {
          try {
            await apiService.createClient({
              nom: cells[0],
              sousLieu: cells[1] || "",
              rue: cells[2],
              codePostal: cells[3],
              ville: cells[4],
              contact: cells[5],
              telephone: cells[6],
            });
            imported++;
          } catch (err) {
            console.error("Erreur import ligne:", line, err);
          }
        }
      }
      alert(`${imported} client(s) importé(s) avec succès !`);
      loadClients();
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 screen-shell harmonized-page"
    >
      <div className="harmonized-header-with-stats">
        <div className="harmonized-header">
        <div className="harmonized-header-copy">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Clients</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Gestion de la base client
          </p>
        </div>
        <div className="screen-header-actions">
          <button
            onClick={exportCSV}
            title="Exporter en CSV"
            className="harmonized-secondary-action"
          >
            Exporter
          </button>
          {user?.role === "admin" && (
            <button
              onClick={handleUnycSync}
              disabled={syncing}
              title="Synchroniser les clients depuis UNYC Atlas"
              className="harmonized-secondary-action"
              style={{
                borderColor: "#6366f1",
                color: "#6366f1",
                backgroundColor: syncing
                  ? "rgba(99, 102, 241, 0.3)"
                  : "rgba(99, 102, 241, 0.1)",
                cursor: syncing ? "wait" : "pointer",
              }}
            >
              {syncing ? "Synchronisation..." : "Synchroniser UNYC"}
            </button>
          )}
          <label
            className="harmonized-secondary-action"
            title="Importer depuis CSV"
          >
            Importer
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              style={{ display: "none" }}
            />
          </label>
          <button
            onClick={() => navigate("/clients/new")}
            className="harmonized-primary-action"
          >
            + Nouveau Client
          </button>
        </div>
      </div>

      {/* Mini Dashboard Stats */}
      <div className="harmonized-stats-grid" style={{ padding: "0 24px 24px" }}>
        <div
          className="harmonized-stat-card"
          style={{ borderLeft: "4px solid #f97316" }}
        >
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            {clients.length}
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Total clients
          </div>
        </div>
        <div
          className="harmonized-stat-card"
          style={{ borderLeft: "4px solid #10b981" }}
        >
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            {new Set(clients.map((c) => c.ville)).size}
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Villes
          </div>
        </div>
      </div>

      </div>

      <div className="harmonized-surface">
        {/* Filters Row */}
        <div className="harmonized-toolbar">
          <div className="harmonized-filter-group">
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              Ville :
            </span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="harmonized-select"
              style={{ cursor: "pointer", padding: "6px 12px" }}
            >
              <option value="">Toutes</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div className="harmonized-filter-group">
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              Trier par :
            </span>
            <button
              onClick={() => handleSort("nom")}
              className={`harmonized-filter-chip ${sortField === "nom" ? "active" : ""}`}
              style={{ fontSize: "13px" }}
            >
              Nom {sortField === "nom" && (sortDir === "asc" ? "▲" : "▼")}
            </button>
            <button
              onClick={() => handleSort("ville")}
              className={`harmonized-filter-chip ${sortField === "ville" ? "active" : ""}`}
              style={{ fontSize: "13px" }}
            >
              Ville {sortField === "ville" && (sortDir === "asc" ? "▲" : "▼")}
            </button>
          </div>
          <span
            className="harmonized-summary-text"
          >
            {sortedClients.length} client{sortedClients.length !== 1 ? "s" : ""}
          </span>
        </div>

        <TableResponsive
          data={paginatedClients}
          columns={[
            {
              key: "nom",
              label: "Client / Entreprise",
              render: (client) => (
                <div className="flex flex-col">
                  <span className="font-bold text-gray-800">{client.nom}</span>
                  {client.sousLieu && (
                    <span className="text-xs text-gray-500 mt-1">
                      📍 {client.sousLieu}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "contact",
              label: "Contact",
              render: (client) => (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div className="flex flex-col" style={{ minWidth: "120px" }}>
                    <span className="text-gray-900">{client.contact}</span>
                    <span className="text-sm text-gray-500">
                      {client.telephone}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      width: "72px",
                      justifyContent: "flex-start",
                    }}
                  >
                    {client.telephone && (
                      <button
                        style={{
                          padding: "8px",
                          borderRadius: "8px",
                          border: "1.5px solid #10b981",
                          backgroundColor: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `tel:${client.telephone}`;
                        }}
                        title={`Appeler ${client.telephone}`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#10b981";
                          e.currentTarget.style.color = "white";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "rgba(16, 185, 129, 0.1)";
                          e.currentTarget.style.color = "#10b981";
                        }}
                      >
                        📞
                      </button>
                    )}
                    {client.email && (
                      <button
                        style={{
                          padding: "8px",
                          borderRadius: "8px",
                          border: "1.5px solid #f59e0b",
                          backgroundColor: "rgba(245, 158, 11, 0.1)",
                          color: "#f59e0b",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `mailto:${client.email}`;
                        }}
                        title={`Envoyer un email à ${client.email}`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f59e0b";
                          e.currentTarget.style.color = "white";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "rgba(245, 158, 11, 0.1)";
                          e.currentTarget.style.color = "#f59e0b";
                        }}
                      >
                        📧
                      </button>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: "adresse",
              label: "Adresse",
              render: (client) => (
                <div className="text-sm text-gray-600">
                  {client.rue}
                  <br />
                  {client.codePostal}{" "}
                  <span className="uppercase">{client.ville}</span>
                </div>
              ),
            },
          ]}
          actions={(client) => (
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/clients/${client.id}`);
                }}
                title="Voir détails"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--primary-color)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "var(--primary-color)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                }}
              >
                👁️
              </button>
              <button
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/clients/${client.id}/edit`);
                }}
                title="Modifier"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                }}
              >
                ✏️
              </button>
              <button
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(client);
                }}
                title="Supprimer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#ef4444";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                }}
              >
                🗑️
              </button>
            </div>
          )}
        />

        {clients.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900">
              Aucun client trouvé
            </h3>
            <p className="text-gray-500 mt-2">
              Commencez par ajouter un nouveau client à la base de données.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor:
                  currentPage === 1 ? "var(--bg-secondary)" : "var(--card-bg)",
                color:
                  currentPage === 1
                    ? "var(--text-muted)"
                    : "var(--text-primary)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              ← Précédent
            </button>
            <span style={{ padding: "0 16px", color: "var(--text-secondary)" }}>
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor:
                  currentPage === totalPages
                    ? "var(--bg-secondary)"
                    : "var(--card-bg)",
                color:
                  currentPage === totalPages
                    ? "var(--text-muted)"
                    : "var(--text-primary)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && deleteModal.client && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--card-bg)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>⚠️</div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Confirmer la suppression
              </h3>
              <p style={{ color: "var(--text-secondary)" }}>
                Êtes-vous sûr de vouloir supprimer le client{" "}
                <strong>{deleteModal.client.nom}</strong> ?
              </p>
              <p
                style={{
                  color: "#ef4444",
                  fontSize: "0.875rem",
                  marginTop: "8px",
                }}
              >
                Cette action est irréversible.
              </p>
            </div>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                onClick={() => setDeleteModal({ show: false, client: null })}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#ef4444",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;
