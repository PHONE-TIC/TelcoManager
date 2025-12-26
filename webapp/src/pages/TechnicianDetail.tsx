import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";
import UserAvatar from "../components/UserAvatar";

type TabType = "info" | "stock" | "journal";

function TechnicianDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [technician, setTechnician] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("info");

  // Stock véhicule
  const [vehicleStock, setVehicleStock] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [allStock, setAllStock] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState("");
  const [stockQuantity, setStockQuantity] = useState(1);

  useEffect(() => {
    loadTechnician();
    loadAllStock();
  }, [id]);

  useEffect(() => {
    if (activeTab === "stock" && id) {
      loadVehicleStock();
    }
  }, [activeTab, id]);

  const loadTechnician = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTechnicienById(id!);
      setTechnician(data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllStock = async () => {
    try {
      const data = await apiService.getStock({ statut: "courant", limit: 500 });
      setAllStock(data.stock || data);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const loadVehicleStock = async () => {
    try {
      setLoadingStock(true);
      const stock = await apiService.getTechnicianStock(id!);
      setVehicleStock(stock);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleAddToVehicle = async () => {
    if (!selectedStockItem) return;

    try {
      await apiService.addItemToVehicle(id!, {
        stockId: selectedStockItem,
        quantite: stockQuantity,
      });
      loadVehicleStock();
      setShowAddModal(false);
      setSelectedStockItem("");
      setStockQuantity(1);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'ajout du matériel");
    }
  };

  const handleUpdateQuantity = async (
    stockId: string,
    quantite: number,
    etat?: string
  ) => {
    try {
      await apiService.updateVehicleItemQuantity(id!, stockId, quantite, etat);
      loadVehicleStock();
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleRemoveFromVehicle = async (stockId: string) => {
    if (!confirm("Retirer ce matériel du véhicule ?")) return;

    try {
      await apiService.removeItemFromVehicle(id!, stockId);
      loadVehicleStock();
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="page-container">
        <div className="error-message">Technicien non trouvé</div>
        <button
          onClick={() => navigate("/techniciens")}
          className="btn btn-secondary"
        >
          ← Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* En-tête */}
      <div className="detail-header">
        <div>
          <button
            onClick={() => navigate("/techniciens")}
            className="btn btn-back"
          >
            ← Retour à la liste
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            <UserAvatar name={technician.nom} size="xl" />
            <div>
              <h1 style={{ margin: 0 }}>{technician.nom}</h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "6px",
                }}
              >
                <span
                  className={`badge ${
                    technician.role === "admin"
                      ? "badge-danger"
                      : technician.role === "gestionnaire"
                      ? "bg-red-100 text-red-900"
                      : "badge-info"
                  }`}
                >
                  {technician.role}
                </span>
                <span
                  style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}
                >
                  @{technician.username}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          📋 Informations
        </button>
        {technician.role !== "admin" && technician.role !== "gestionnaire" && (
          <button
            className={`tab ${activeTab === "stock" ? "active" : ""}`}
            onClick={() => setActiveTab("stock")}
          >
            🚗 Stock Véhicule
          </button>
        )}
        <button
          className={`tab ${activeTab === "journal" ? "active" : ""}`}
          onClick={() => setActiveTab("journal")}
        >
          📜 Journal
        </button>
      </div>

      {/* Contenu Onglet Informations */}
      {activeTab === "info" && (
        <div className="tab-content">
          <div className="info-card">
            <h3>Informations du technicien</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Nom complet</label>
                <div className="info-value">
                  <strong>{technician.nom}</strong>
                </div>
              </div>
              <div className="info-item">
                <label>Nom d'utilisateur</label>
                <div className="info-value">{technician.username}</div>
              </div>
              <div className="info-item">
                <label>Rôle</label>
                <div className="info-value">
                  <span
                    className={`badge ${
                      technician.role === "admin"
                        ? "badge-danger"
                        : technician.role === "gestionnaire"
                        ? "bg-red-100 text-red-900"
                        : "badge-info"
                    }`}
                  >
                    {technician.role}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <label>Statut</label>
                <div className="info-value">
                  <span
                    className={
                      technician.active
                        ? "badge badge-success"
                        : "badge badge-danger"
                    }
                  >
                    {technician.active ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <label>Interventions assignées</label>
                <div className="info-value">
                  {technician._count?.interventions || 0}
                </div>
              </div>
              <div className="info-item">
                <label>Créé le</label>
                <div className="info-value">
                  {new Date(technician.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu Onglet Stock Véhicule */}
      {activeTab === "stock" &&
        technician.role !== "admin" &&
        technician.role !== "gestionnaire" && (
          <div className="tab-content">
            <div className="info-card">
              <div className="vehicle-stock-header">
                <h3>🚗 Stock embarqué dans le véhicule</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddModal(true)}
                >
                  + Ajouter matériel
                </button>
              </div>

              {loadingStock ? (
                <div className="loading">Chargement du stock...</div>
              ) : vehicleStock.length > 0 ? (
                <div className="vehicle-stock-list">
                  {vehicleStock.map((item) => (
                    <div key={item.id} className="vehicle-stock-item">
                      <div className="stock-item-info">
                        <strong>{item.stock.nomMateriel}</strong>
                        {item.stock.numeroSerie && (
                          <span
                            style={{
                              color: "var(--primary-color)",
                              fontSize: "0.85rem",
                              marginLeft: "8px",
                            }}
                          >
                            🔢 {item.stock.numeroSerie}
                          </span>
                        )}
                        <small>
                          Réf: {item.stock.reference} | {item.stock.categorie}
                          {item.stock.codeBarre &&
                            ` | Code-barre: ${item.stock.codeBarre}`}
                        </small>
                      </div>
                      <div
                        className="stock-item-actions"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            border: "none",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            backgroundColor:
                              item.etat === "ok" ? "#d1fae5" : "#fee2e2",
                            color: item.etat === "ok" ? "#065f46" : "#991b1b",
                          }}
                          onClick={() =>
                            handleUpdateQuantity(
                              item.stockId,
                              item.quantite,
                              item.etat === "ok" ? "hs" : "ok"
                            )
                          }
                          title="Changer l'état"
                        >
                          {item.etat === "ok" ? "✅ OK" : "❌ HS"}
                        </button>
                        <button
                          className="btn-quantity"
                          onClick={() =>
                            handleUpdateQuantity(
                              item.stockId,
                              item.quantite - 1
                            )
                          }
                          disabled={item.quantite <= 1}
                        >
                          -
                        </button>
                        <span className="quantity-display">
                          {item.quantite}
                        </span>
                        <button
                          className="btn-quantity"
                          onClick={() =>
                            handleUpdateQuantity(
                              item.stockId,
                              item.quantite + 1
                            )
                          }
                        >
                          +
                        </button>
                        <button
                          className="btn-remove"
                          onClick={() => handleRemoveFromVehicle(item.stockId)}
                          title="Retirer du véhicule"
                        >
                          🗑️
                        </button>
                        {item.etat === "hs" && (
                          <button
                            style={{
                              padding: "6px 10px",
                              borderRadius: "8px",
                              border: "none",
                              background:
                                "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                              color: "white",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            onClick={async () => {
                              if (
                                !confirm(
                                  "Transférer ce matériel HS vers le stock HS général ?"
                                )
                              )
                                return;
                              try {
                                await apiService.transferHsToGeneralStock(
                                  id!,
                                  item.stockId
                                );
                                loadVehicleStock();
                              } catch (err) {
                                console.error("Erreur transfert HS:", err);
                                alert("Erreur lors du transfert");
                              }
                            }}
                            title="Transférer vers Stock HS Général"
                          >
                            → Stock HS
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-stock">
                  <p>🚗 Aucun matériel dans le véhicule</p>
                  <p style={{ fontSize: "0.875rem", marginTop: "8px" }}>
                    Cliquez sur "Ajouter matériel" pour charger du matériel dans
                    le véhicule
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Contenu Onglet Journal */}
      {activeTab === "journal" && (
        <div className="tab-content">
          <div className="info-card">
            <h3>Journal d'activité</h3>
            <div className="mb-4">
              <span className="text-gray-500 text-sm">
                Dernière connexion :{" "}
              </span>
              <span className="font-medium">
                {technician.lastLogin
                  ? new Date(technician.lastLogin).toLocaleString("fr-FR")
                  : "Jamais connecté"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {technician.activityLogs?.length > 0 ? (
                    technician.activityLogs.map((log: { id: string; action: string; createdAt: string; details?: string }) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {new Date(log.createdAt).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {log.action === "LOGIN" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Connexion
                            </span>
                          ) : (
                            log.action
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Aucune activité enregistrée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout Stock */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Ajouter matériel au véhicule</h3>
            <div className="form-group">
              <label className="form-label">Matériel</label>
              <select
                className="form-select"
                value={selectedStockItem}
                onChange={(e) => setSelectedStockItem(e.target.value)}
              >
                <option value="">Sélectionner un matériel</option>
                {allStock.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.nomMateriel} - {stock.reference} ({stock.categorie})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantité</label>
              <input
                type="number"
                className="form-input"
                min="1"
                value={stockQuantity}
                onChange={(e) =>
                  setStockQuantity(parseInt(e.target.value) || 1)
                }
              />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                className="btn btn-primary"
                onClick={handleAddToVehicle}
                disabled={!selectedStockItem}
              >
                Ajouter
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TechnicianDetail;
