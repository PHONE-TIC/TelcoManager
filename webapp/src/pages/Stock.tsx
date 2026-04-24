import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";
import { useAuth } from "../contexts/useAuth";
import SerialTransferModal from "../components/SerialTransferModal";
import { AppIcon } from "../components/AppIcon";
import type { Technicien, TechnicianStock } from "../types";
import {
  getStockLocation,
  parseSerialNumbers,
  type StockWithRelations,
} from "./stock.utils";
import { buildStockCsvRows, getFilteredStockItems } from "./stock-list.utils";
import "./mobile-refactor.css";
import "./screen-harmonization.css";

function Stock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageStock =
    user?.role === "admin" || user?.role === "gestionnaire";
  const canDeleteStock = user?.role === "admin";
  const [stock, setStock] = useState<StockWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string>("nomMateriel");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedItem, setSelectedItem] = useState<StockWithRelations | null>(
    null
  );
  const [formData, setFormData] = useState({
    nomMateriel: "",
    reference: "",
    numeroSerie: "",
    codeBarre: "",
    categorie: "",
    fournisseur: "",
    quantite: 1,
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [serialNumbersCount, setSerialNumbersCount] = useState(0);

  // Technician Stock Logic
  const [technicians, setTechnicians] = useState<Technicien[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");

  useEffect(() => {
    if (filter === "technician") {
      apiService.getTechniciens({ limit: 100 }).then((data) => {
        const list = Array.isArray(data) ? data : data.techniciens;
        setTechnicians(list.filter((t: Technicien) => t.role === "technicien"));
      });
      setStock([]);
    }
  }, [filter]);

  useEffect(() => {
    if (filter === "technician" && selectedTechnicianId) {
      setLoading(true);
      apiService
        .getTechnicianStock(selectedTechnicianId)
        .then((data) => {
          const formatted = data.map((ts: TechnicianStock) => ({
            ...ts.stock,
            quantite: ts.quantite,
            originalStockId: ts.stockId,
            technicianStockId: ts.id,
          }));
          setStock(formatted as StockWithRelations[]);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [filter, selectedTechnicianId]);

  // Parse serial numbers from comma or newline separated input
  // Handle serial numbers change with auto-quantity update
  const handleSerialNumbersChange = (value: string) => {
    const serialNumbers = parseSerialNumbers(value);
    const count = serialNumbers.length;
    setSerialNumbersCount(count);

    setFormData((prev) => ({
      ...prev,
      numeroSerie: value,
      // Auto-update quantity only for new items (not editing) and only if > 0 serial numbers
      quantite: !selectedItem && count > 0 ? count : prev.quantite,
    }));
  };

  const loadStock = useCallback(async () => {
    if (filter === "technician") return; // Handled by specific effect
    setLoading(true);
    try {
      const data = await apiService.getStock({ statut: filter, limit: 500 });
      setStock(data.stock);
    } catch (error) {
      console.error("Erreur lors du chargement du stock:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  // Get unique categories for filter dropdown
  const categories = useMemo(
    () => [...new Set(stock.map((item) => item.categorie))].sort(),
    [stock]
  );

  const filteredStock = useMemo(
    () => getFilteredStockItems(stock, categoryFilter, sortColumn, sortDirection),
    [stock, categoryFilter, sortColumn, sortDirection]
  );

  // Stock statistics
  const totalItems = stock.length;
  // const lowStockItems = stock.filter((item) => item.quantite <= 2).length; // Unused
  const totalQuantity = stock.reduce((sum, item) => sum + item.quantite, 0);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Nom",
      "Référence",
      "N° Série",
      "Code-barres",
      "Catégorie",
      "Fournisseur",
      "Quantité",
      "Statut",
    ];
    const rows = buildStockCsvRows(filteredStock, filter);
    const csvContent = [
      headers.join(";"),
      ...rows.map((r) => r.join(";")),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock_${filter}_${new Date().toISOString().split("T")[0]
      }.csv`;
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
        nomMateriel: "",
        reference: "",
        numeroSerie: "",
        codeBarre: "",
        categorie: "",
        fournisseur: "",
        quantite: 1,
        notes: "",
      });
      setSelectedItem(null);
      loadStock();
    } catch (error: unknown) {
      console.error("Erreur lors de la sauvegarde:", error);
      const axiosError = error as {
        response?: { data?: { error?: string; message?: string } };
      };
      const errorMessage =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        "Erreur lors de la sauvegarde de l'article";
      setError(errorMessage);
    }
  };

  const handleMoveToHS = async (id: string, nom: string) => {
    if (!confirm(`Déplacer "${nom}" vers le stock HS ?`)) return;

    try {
      await apiService.moveToHS(id, {});
      loadStock();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors du déplacement");
    }
  };

  const handleMoveToSupplier = async (id: string, nom: string) => {
    if (
      !confirm(
        `Renvoyer "${nom}" au fournisseur ?\n\nCela changera le statut de l'article à "Retour Fournisseur".`
      )
    )
      return;

    try {
      // Use updateStock to change status
      await apiService.updateStock(id, { statut: "retour_fournisseur" });
      loadStock();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors du renvoi au fournisseur");
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement "${nom}" ?\n\nCette action est irréversible.`
      )
    )
      return;

    try {
      await apiService.deleteStock(id);
      loadStock();
    } catch (error: unknown) {
      console.error("Erreur:", error);
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 403) {
        alert(
          "Accès refusé - Seuls les administrateurs peuvent supprimer des articles."
        );
      } else {
        alert("Erreur lors de la suppression");
      }
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
    <div className="space-y-6 screen-shell harmonized-page">
      {/* Header */}
      <div className="harmonized-header-with-stats">
        <div className="harmonized-header">
        <div className="harmonized-header-copy">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Stock</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Gestion du matériel et équipements
          </p>
        </div>
        <div className="screen-header-actions">
          <button
            onClick={exportToCSV}
            className="harmonized-secondary-action"
          >
            Exporter CSV
          </button>
          {canManageStock && (
            <>
              <button
                onClick={() => navigate("/stock/transfer")}
                className="harmonized-accent-action"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  boxShadow: "0 2px 8px rgba(139, 92, 246, 0.35)",
                }}
              >
                Transférer
              </button>
              <button
                onClick={() => navigate("/stock/new")}
                className="harmonized-primary-action"
              >
                + Nouveau Matériel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="harmonized-stats-grid screen-summary-strip">
        {[
          {
            value: totalItems,
            label: `Articles ${filter === "hs"
              ? "HS"
              : filter === "retour_fournisseur"
                ? "en Retour"
                : filter === "all"
                  ? "au total"
                  : "en stock"
              }`,
            color: "#f97316",
          },
          { value: totalQuantity, label: "Quantité totale", color: "#3b82f6" },

          { value: categories.length, label: "Catégories", color: "#10b981" },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="harmonized-stat-card"
            style={{ borderLeft: `4px solid ${stat.color}` }}
          >
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      </div>

      <div className="harmonized-surface">
        <div className="screen-filters" style={{ marginBottom: "24px" }}>
          {/* Top Row: Buttons and Search */}
          <div className="harmonized-toolbar">
            {/* Status buttons */}
            <div className="screen-chip-scroll" style={{ width: "100%" }}>
              <button
                className={`harmonized-chip ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
                style={{
                  background:
                    filter === "all"
                      ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                      : undefined,
                }}
              >
                Vue générale
              </button>
              <button
                className={`harmonized-chip ${filter === "courant" ? "active" : ""}`}
                onClick={() => setFilter("courant")}
              >
                Stock courant
              </button>
              <button
                className={`harmonized-chip ${filter === "hs" ? "active" : ""}`}
                style={filter === "hs" ? { background: "#ef4444", color: "white", borderColor: "#ef4444" } : undefined}
                onClick={() => setFilter("hs")}
              >
                Stock HS
              </button>
              <button
                className={`harmonized-chip ${filter === "retour_fournisseur" ? "active" : ""}`}
                onClick={() => setFilter("retour_fournisseur")}
                style={{
                  backgroundColor:
                    filter === "retour_fournisseur" ? "#d97706" : undefined,
                  color: filter === "retour_fournisseur" ? "white" : undefined,
                }}
              >
                ↩️ Retour Fournisseur
              </button>
              {/* Button visible for admin AND gestionnaire */}
              {canManageStock && (
                <button
                  className={`harmonized-chip ${filter === "technician" ? "active" : ""}`}
                  onClick={() => setFilter("technician")}
                  style={{
                    background:
                      filter === "technician"
                        ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                        : undefined,
                    whiteSpace: "normal",
                    textAlign: "center",
                    wordBreak: "break-word",
                  }}
                >
                  Stock technicien
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Dropdowns */}
          <div className="harmonized-filter-group screen-select-row">
            {/* Technician Select (Visible only when filter is technician) */}
            {filter === "technician" && (
              <select
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="harmonized-select"
                style={{
                  border: "2px solid #7c3aed",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <option value="">Sélectionner un technicien...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </select>
            )}

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="harmonized-select"
              style={{ cursor: "pointer" }}
            >
              <option value="all">Toutes catégories</option>
              {categories.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock Table */}
        <div className="responsive-scroll desktop-table-only">
          <table className="table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("nomMateriel")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  Matériel{" "}
                  {sortColumn === "nomMateriel" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("reference")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  Référence{" "}
                  {sortColumn === "reference" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>N° Série</th>
                <th>Fournisseur</th>
                <th
                  onClick={() => handleSort("categorie")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  Catégorie{" "}
                  {sortColumn === "categorie" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("quantite")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  Quantité{" "}
                  {sortColumn === "quantite" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                {filter === "all" && <th>Localisation</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.length > 0 ? (
                filteredStock.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">
                          {item.nomMateriel}
                        </span>
                        {item.codeBarre && (
                          <span className="text-xs text-gray-500" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <AppIcon name="label" size={14} /> {item.codeBarre}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <code
                        style={{
                          fontSize: "0.85em",
                          background: "var(--bg-color)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {item.reference}
                      </code>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.9em" }}>
                      {item.numeroSerie || "-"}
                    </td>
                    <td>
                      {item.fournisseur || (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: "#dbeafe",
                          color: "#1e40af",
                        }}
                      >
                        {item.categorie}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const totalQty =
                          (
                            item as unknown as {
                              _totalQuantityForReference?: number;
                            }
                          )._totalQuantityForReference || item.quantite;
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                backgroundColor:
                                  totalQty <= 0 ? "#fee2e2" : "#d1fae5",
                                color: totalQty <= 0 ? "#991b1b" : "#065f46",
                              }}
                            >
                              {totalQty} unité{totalQty > 1 ? "s" : ""}
                            </span>

                            {totalQty <= 0 && (
                              <span
                                title="Rupture de stock"
                                style={{ cursor: "help" }}
                              >
                                <AppIcon name="warning" size={16} />
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    {filter === "all" && (
                      <td>
                        {(() => {
                          const location = getStockLocation(item);
                          return (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                backgroundColor: location.bgColor,
                                color: location.color,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {location.label}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td>
                      <div className="responsive-stack" style={{ gap: "4px" }}>
                        {/* View Details Button */}
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
                          onClick={() => navigate(`/stock/${item.id}`)}
                          title="Voir détails"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "var(--primary-color)";
                            e.currentTarget.style.color = "white";
                            e.currentTarget.style.borderColor =
                              "var(--primary-color)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.05)";
                            e.currentTarget.style.color = "var(--text-primary)";
                            e.currentTarget.style.borderColor =
                              "rgba(255,255,255,0.25)";
                          }}
                          >
                          <AppIcon name="eye" size={18} />
                        </button>
                        {/* Edit Button */}
                        {canManageStock && (
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
                            onClick={() => navigate(`/stock/${item.id}/edit`)}
                            title="Modifier"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#3b82f6";
                              e.currentTarget.style.color = "white";
                              e.currentTarget.style.borderColor = "#3b82f6";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(255,255,255,0.05)";
                              e.currentTarget.style.color =
                                "var(--text-primary)";
                              e.currentTarget.style.borderColor =
                                "rgba(255,255,255,0.25)";
                            }}
                          >
                            <AppIcon name="edit" size={18} />
                          </button>
                        )}
                        {/* Move to HS Button (only for courant stock) */}
                        {canManageStock && filter === "courant" && (
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
                            onClick={() =>
                              handleMoveToHS(item.id, item.nomMateriel)
                            }
                            title="Déplacer vers HS"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#ef4444";
                              e.currentTarget.style.color = "white";
                              e.currentTarget.style.borderColor = "#ef4444";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(255,255,255,0.05)";
                              e.currentTarget.style.color =
                                "var(--text-primary)";
                              e.currentTarget.style.borderColor =
                                "rgba(255,255,255,0.25)";
                            }}
                          >
                            <AppIcon name="warning" size={18} />
                          </button>
                        )}
                        {/* Return to Supplier Button (for courant and hs stock) */}
                        {canManageStock &&
                          (filter === "courant" || filter === "hs") && (
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
                              onClick={() =>
                                handleMoveToSupplier(item.id, item.nomMateriel)
                              }
                              title="Renvoyer au fournisseur"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#d97706";
                                e.currentTarget.style.color = "white";
                                e.currentTarget.style.borderColor = "#d97706";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(255,255,255,0.05)";
                                e.currentTarget.style.color =
                                  "var(--text-primary)";
                                e.currentTarget.style.borderColor =
                                  "rgba(255,255,255,0.25)";
                              }}
                            >
                              <AppIcon name="return" size={18} />
                            </button>
                          )}
                        {/* Delete Button (Admin only) */}
                        {canDeleteStock && (
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
                            onClick={() =>
                              handleDelete(item.id, item.nomMateriel)
                            }
                            title="Supprimer définitivement"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#dc2626";
                              e.currentTarget.style.color = "white";
                              e.currentTarget.style.borderColor = "#dc2626";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(255,255,255,0.05)";
                              e.currentTarget.style.color =
                                "var(--text-primary)";
                              e.currentTarget.style.borderColor =
                                "rgba(255,255,255,0.25)";
                            }}
                          >
                            <AppIcon name="trash" size={18} />
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
                      <div className="text-4xl mb-4" style={{ display: "flex", justifyContent: "center" }}><AppIcon name="stock" size={40} /></div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Aucun article trouvé
                      </h3>
                      <p className="text-gray-500 mt-2">
                        {filter === "technician"
                          ? "Le stock du technicien est vide"
                          : `Le stock ${filter} est vide`}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-list">
          {filteredStock.length > 0 ? (
            filteredStock.map((item) => {
              const totalQty =
                (item as unknown as { _totalQuantityForReference?: number })
                  ._totalQuantityForReference || item.quantite;
              const location = filter === "all" ? getStockLocation(item) : null;

              return (
                <div key={item.id} className="mobile-list-card">
                  <div className="mobile-list-header">
                    <div>
                      <div className="mobile-list-title">{item.nomMateriel}</div>
                      <div className="mobile-list-subtitle">
                        Réf. {item.reference}
                        {item.codeBarre ? ` • Code-barres ${item.codeBarre}` : ""}
                      </div>
                    </div>
                    <div className="mobile-list-badges">
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: totalQty <= 0 ? "#fee2e2" : "#d1fae5",
                          color: totalQty <= 0 ? "#991b1b" : "#065f46",
                        }}
                      >
                        {totalQty} unité{totalQty > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="mobile-list-grid">
                    <div className="mobile-list-field">
                      <span className="mobile-list-label">Catégorie</span>
                      <span className="mobile-list-value">{item.categorie}</span>
                    </div>
                    <div className="mobile-list-field">
                      <span className="mobile-list-label">Fournisseur</span>
                      <span className="mobile-list-value">{item.fournisseur || "-"}</span>
                    </div>
                    <div className="mobile-list-field">
                      <span className="mobile-list-label">N° série</span>
                      <span className="mobile-list-value">{item.numeroSerie || "-"}</span>
                    </div>
                    {location && (
                      <div className="mobile-list-field">
                        <span className="mobile-list-label">Localisation</span>
                        <span className="mobile-list-value">{location.label}</span>
                      </div>
                    )}
                  </div>

                  <div className="mobile-list-actions">
                    <button
                      className="mobile-action-button"
                      style={{
                        border: "1px solid rgba(255,255,255,0.25)",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate(`/stock/${item.id}`)}
                    >
                      <AppIcon name="eye" size={16} /> Voir
                    </button>
                    {canManageStock && (
                      <button
                        className="mobile-action-button"
                        style={{ border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer" }}
                        onClick={() => navigate(`/stock/${item.id}/edit`)}
                      >
                        <AppIcon name="edit" size={16} /> Modifier
                      </button>
                    )}
                    {canManageStock && filter === "courant" && (
                      <button
                        className="mobile-action-button"
                        style={{ border: "none", backgroundColor: "#ef4444", color: "white", cursor: "pointer" }}
                        onClick={() => handleMoveToHS(item.id, item.nomMateriel)}
                      >
                        <AppIcon name="warning" size={16} /> Mettre HS
                      </button>
                    )}
                    {canManageStock && (filter === "courant" || filter === "hs") && (
                      <button
                        className="mobile-action-button"
                        style={{ border: "none", backgroundColor: "#d97706", color: "white", cursor: "pointer" }}
                        onClick={() => handleMoveToSupplier(item.id, item.nomMateriel)}
                      >
                        <AppIcon name="return" size={16} /> Retour fournisseur
                      </button>
                    )}
                    {canDeleteStock && (
                      <button
                        className="mobile-action-button"
                        style={{ border: "none", backgroundColor: "#dc2626", color: "white", cursor: "pointer" }}
                        onClick={() => handleDelete(item.id, item.nomMateriel)}
                      >
                        <AppIcon name="trash" size={16} /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="mobile-list-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px", display: "flex", justifyContent: "center" }}><AppIcon name="stock" size={36} /></div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Aucun article trouvé</h3>
              <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
                {filter === "technician"
                  ? "Le stock du technicien est vide"
                  : `Le stock ${filter} est vide`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedItem ? "Modifier le matériel" : "Nouveau matériel"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedItem(null);
                }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du matériel *
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    value={formData.nomMateriel}
                    onChange={(e) =>
                      setFormData({ ...formData, nomMateriel: e.target.value })
                    }
                    placeholder="Ex: Switch Cisco 24 ports"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence *
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData({ ...formData, reference: e.target.value })
                    }
                    placeholder="Ex: WS-C2960X-24TD-L"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro(s) de série
                    {!selectedItem && serialNumbersCount > 0 && (
                      <span
                        style={{
                          marginLeft: "8px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: "#dbeafe",
                          color: "#1e40af",
                        }}
                      >
                        {serialNumbersCount} détecté
                        {serialNumbersCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    value={formData.numeroSerie}
                    onChange={(e) => handleSerialNumbersChange(e.target.value)}
                    placeholder={
                      selectedItem
                        ? "Ex: FCW1234ABCD"
                        : "Un numéro par ligne ou séparés par des virgules\nEx: SN001, SN002, SN003"
                    }
                    rows={selectedItem ? 1 : 3}
                    style={{
                      resize: "vertical",
                      minHeight: selectedItem ? "40px" : "70px",
                    }}
                  />
                  {!selectedItem && (
                    <p className="text-xs text-gray-500 mt-1">
                  La quantité s'ajuste automatiquement au nombre de
                      numéros de série
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie *
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    value={formData.categorie}
                    onChange={(e) =>
                      setFormData({ ...formData, categorie: e.target.value })
                    }
                    placeholder="Ex: Réseau, Sécurité, Téléphonie..."
                    list="categories"
                    required
                  />
                  <datalist id="categories">
                    {categories.map((cat, i) => (
                      <option key={i} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fournisseur
                  </label>
                  <select
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer bg-white"
                    value={formData.fournisseur}
                    onChange={(e) =>
                      setFormData({ ...formData, fournisseur: e.target.value })
                    }
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {[
                      "Amazon",
                      "CDiscount",
                      "Effiprod",
                      "EMG",
                      "Francofa",
                      "Initio",
                      "IP&Go",
                      "Itancia",
                      "Networth Télécom",
                      "Office Easy",
                      "OneDirect",
                      "Rexel",
                      "Unyc",
                      "Zicom",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantité *
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    min="1"
                    value={formData.quantite}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantite: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
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
                  {selectedItem ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Serial Transfer Modal */}
      {showTransferModal && (
        <SerialTransferModal
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            loadStock();
          }}
        />
      )}
    </div>
  );
}

export default Stock;
