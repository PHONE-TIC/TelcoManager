import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { apiService } from "../services/api.service";
import { useAuth } from "../contexts/useAuth";
import type { Client, ClientsListResponse } from "../types";
import "./mobile-refactor.css";
import "./screen-harmonization.css";
import SkeletonLoader from "../components/SkeletonLoader";
import {
  Button,
  DataTable,
  FilterBar,
  Pagination,
  SearchInput,
  Workspace,
} from "../components/ui";


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
  const [recherche, setRecherche] = useState("");

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
  // La recherche porte sur les champs par lesquels on cherche un client.
  const clientsAffiches = recherche.trim()
    ? sortedClients.filter((c) => {
        const q = recherche.trim().toLowerCase();
        return (
          c.nom?.toLowerCase().includes(q) ||
          c.contact?.toLowerCase().includes(q) ||
          c.ville?.toLowerCase().includes(q) ||
          c.telephone?.toLowerCase().includes(q)
        );
      })
    : sortedClients;

  const totalPages = Math.ceil(clientsAffiches.length / itemsPerPage);
  const paginatedClients = clientsAffiches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Le tri porte sur l'ensemble des clients avant découpage en pages : confié
  // au tableau, il ne réordonnerait que la page affichée.
  const handleSort = ({ key, direction }: { key: string; direction: "asc" | "desc" }) => {
    setSortField(key as ClientSortField);
    setSortDir(direction);
    setCurrentPage(1); // une nouvelle clé de tri invalide la position courante
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
      <div className="space-y-6 screen-shell harmonized-page" style={{ padding: "24px" }}>
        <div className="harmonized-header" style={{ marginBottom: "24px" }}>
          <div style={{ width: "200px", height: "24px", backgroundColor: "var(--bg-secondary, #f3f4f6)", borderRadius: "4px" }} className="shimmer" />
        </div>
        <SkeletonLoader type="table" rows={6} columns={4} />
      </div>
    );
  }

  return (
    <div className="harmonized-page">
      <Workspace
        title="Clients"
        meta={`${clientsAffiches.length} ${clientsAffiches.length > 1 ? "clients" : "client"}`}
        search={
          <SearchInput
            value={recherche}
            onChange={setRecherche}
            placeholder="Rechercher un nom, un contact, une ville…"
          />
        }
        actions={
          <>
            <Button onClick={exportCSV} title="Exporter en CSV">
              Exporter
            </Button>
            <label className="ui-btn" title="Importer depuis CSV">
              Importer
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                style={{ display: "none" }}
              />
            </label>
            {user?.role === "admin" && (
              <Button
                onClick={handleUnycSync}
                disabled={syncing}
                title="Synchroniser les clients depuis UNYC Atlas"
              >
                {syncing ? "Synchronisation…" : "Synchroniser UNYC"}
              </Button>
            )}
            <Button variant="primary" onClick={() => navigate("/clients/new")}>
              Nouveau client
            </Button>
          </>
        }
        filters={
          <FilterBar
            options={[
              { value: "", label: "Toutes les villes" },
              ...uniqueCities.map((city) => ({ value: city, label: city })),
            ]}
            value={cityFilter}
            onChange={setCityFilter}
            resultCount={{ shown: clientsAffiches.length, total: clients.length }}
          />
        }
      >
        <DataTable
          rows={paginatedClients}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/clients/${c.id}`)}
          emptyLabel="Aucun client ne correspond à cette recherche."
          sort={{ key: sortField, direction: sortDir }}
          onSortChange={handleSort}
          columns={[
            {
              key: "nom",
              header: "Client",
              sortValue: (c) => c.nom,
              render: (c) => (
                <span className="ui-row__main">
                  <span className="ui-row__title">{c.nom}</span>
                  {c.sousLieu ? (
                    <span className="ui-row__meta">{c.sousLieu}</span>
                  ) : null}
                </span>
              ),
            },
            {
              key: "contact",
              header: "Contact",
              width: "190px",
              sortValue: (c) => c.contact,
              render: (c) => (
                <span className="ui-row__main">
                  <span>{c.contact}</span>
                  <span className="ui-row__meta">{c.telephone}</span>
                </span>
              ),
            },
            {
              key: "ville",
              header: "Ville",
              width: "160px",
              hideOnNarrow: true,
              sortValue: (c) => c.ville,
              render: (c) => (
                <span className="ui-row__main">
                  <span>{c.ville}</span>
                  <span className="ui-row__meta">{c.codePostal}</span>
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              width: "104px",
              align: "end",
              render: (c) => (
                <span className="ui-actions" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="quiet"
                    title="Modifier"
                    onClick={() => navigate(`/clients/${c.id}/edit`)}
                  >
                    <AppIcon name="edit" size={15} />
                  </Button>
                  <Button
                    size="sm"
                    variant="quiet"
                    title="Supprimer"
                    onClick={() => handleDelete(c)}
                  >
                    <AppIcon name="trash" size={15} />
                  </Button>
                </span>
              ),
            },
          ]}
        />

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
          totalItems={clientsAffiches.length}
        />
      </Workspace>

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
              width: "100%",
              maxWidth: "min(460px, 100%)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px", display: "flex", justifyContent: "center" }}><AppIcon name="warning" size={38} /></div>
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
              style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><AppIcon name="trash" size={16} /> Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;
import { AppIcon } from "../components/AppIcon";
