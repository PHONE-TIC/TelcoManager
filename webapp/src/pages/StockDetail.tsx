import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";
import StockTransferModal from "../components/StockTransferModal";
import StockLocationModal from "../components/StockLocationModal";
import {
  getMovementMeta,
  getStockQuantityBadgeConfig,
  getStockStatusBadgeConfig,
  resolveStockDetailLocation,
} from "./stock-detail.utils";

import type { Stock, StockMovement } from "../types";

function StockDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const loadStock = useCallback(async () => {
    try {
      const data = await apiService.getStockById(id!);
      setItem(data);
    } catch (err) {
      console.error("Erreur chargement stock:", err);
      setError("Article non trouvé");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMovements = useCallback(async () => {
    try {
      setMovementsLoading(true);
      const data = await apiService.getStockMovements(id!, { limit: 20 });
      setMovements(data.movements || []);
    } catch (err) {
      console.error("Erreur chargement mouvements:", err);
    } finally {
      setMovementsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStock();
    loadMovements();
  }, [loadStock, loadMovements]);


  const handleMoveToHS = async () => {
    if (!item) return;
    if (!window.confirm(`Déplacer "${item.nomMateriel}" vers le stock HS ?`))
      return;
    try {
      await apiService.updateStock(id!, { statut: "hs" });
      loadStock();
    } catch {
      alert("Erreur lors du déplacement");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <button
            onClick={() => navigate("/stock")}
            className="btn btn-secondary mb-4"
          >
            ← Retour au stock
          </button>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-gray-900">
              {error || "Article non trouvé"}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <button
          onClick={() => navigate("/stock")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1.5px solid rgba(255,255,255,0.3)",
            backgroundColor: "rgba(255,255,255,0.05)",
            color: "var(--text-primary)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ← Retour au stock
        </button>
        <div className="mobile-inline-pairs">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3 flex-wrap">
              📦 {item.nomMateriel}
              {(() => {
                const statusBadge = getStockStatusBadgeConfig(item.statut);
                return (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      background: statusBadge.background,
                      color: "white",
                      boxShadow: statusBadge.boxShadow,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {statusBadge.label}
                  </span>
                );
              })()}
            </h1>
            <p className="text-gray-500 mt-1">Référence: {item.reference}</p>
          </div>
          <div className="responsive-stack" style={{ justifyContent: "flex-end" }}>
            <button
              onClick={() => navigate(`/stock/${id}/edit`)}
              className="btn btn-primary"
              style={{
                padding: "6px 12px",
                fontSize: "0.85rem",
              }}
            >
              ✏️ Modifier
            </button>
            {item.statut === "courant" && item.quantite > 0 && (
              <button
                onClick={() => setShowTransferModal(true)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  border: "none",
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🚚 Transférer
              </button>
            )}
            <button
              onClick={() => navigate(`/stock/labels?id=${id}`)}
              style={{
                padding: "6px 12px",
                fontSize: "0.85rem",
                borderRadius: "6px",
                border: "none",
                background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 1px 2px rgba(6, 182, 212, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              🏷️ Imprimer étiquette
            </button>
            {item.statut === "courant" && (
              <button
                onClick={handleMoveToHS}
                className="btn btn-danger"
                style={{
                  padding: "6px 12px",
                  fontSize: "0.85rem",
                }}
              >
                ⚠️ Mettre HS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="mobile-card-grid">
        {/* Main Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            📋 Informations
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">
                  Nom
                </label>
                <div className="font-semibold text-gray-800">
                  {item.nomMateriel}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">
                  Référence
                </label>
                <div className="font-mono text-gray-800">{item.reference}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">
                  N° Série
                </label>
                <div className="font-mono text-gray-800">
                  {item.numeroSerie || "-"}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">
                  Code-barres
                </label>
                <div className="font-mono text-gray-800">
                  {item.codeBarre || "-"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category & Quantity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            📊 Stock
          </h2>
          <div className="space-y-4">
            {/* Catégorie */}
            <div className="mobile-list-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
              <label className="text-sm text-gray-500 uppercase font-medium">
                Catégorie
              </label>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "20px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  color: "white",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.35)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                📁 {item.categorie}
              </span>
            </div>

            {/* Fournisseur */}
            <div className="mobile-list-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
              <label className="text-sm text-gray-500 uppercase font-medium">
                Fournisseur
              </label>
              <span className="text-gray-800 font-medium">
                {item.fournisseur || "-"}
              </span>
            </div>

            {/* Quantité */}
            <div className="mobile-list-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
              <label className="text-sm text-gray-500 uppercase font-medium">
                Quantité
              </label>
              {(() => {
                const quantityBadge = getStockQuantityBadgeConfig(item.quantite);
                return (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "20px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      background: quantityBadge.background,
                      color: "white",
                      boxShadow: quantityBadge.boxShadow,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {quantityBadge.icon} {item.quantite} unité{item.quantite > 1 ? "s" : ""}
                  </span>
                );
              })()}
            </div>

            {/* Statut */}
            <div className="mobile-list-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
              <label className="text-sm text-gray-500 uppercase font-medium">
                Statut
              </label>
              {(() => {
                const statusBadge = getStockStatusBadgeConfig(item.statut);
                return (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "20px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      background: statusBadge.background,
                      color: "white",
                      boxShadow: statusBadge.boxShadow,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {statusBadge.label}
                  </span>
                );
              })()}
            </div>

            {/* Localisation */}
            <div className="mobile-list-row" style={{ padding: "8px 0" }}>
              <label className="text-sm text-gray-500 uppercase font-medium">
                Localisation
              </label>
              {(() => {
                const location = resolveStockDetailLocation(item);

                return (
                  <div className="responsive-stack" style={{ justifyContent: "flex-end" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        borderRadius: "20px",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        backgroundColor: location.bgColor,
                        color: location.color,
                      }}
                    >
                      {location.label}
                    </span>
                    <button
                      onClick={() => setShowLocationModal(true)}
                      title="Modifier la localisation"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        opacity: 0.6,
                        transition: 'opacity 0.2s',
                        padding: '4px'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                    >
                      ✏️
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Notes & History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          📝 Notes & Historique
        </h2>

        {item.notes ? (
          <div className="mb-6">
            <label className="text-xs text-gray-500 uppercase block mb-2">
              Notes
            </label>
            <div
              className="p-4 bg-gray-50 rounded-lg text-gray-700"
              style={{
                backgroundColor: "var(--bg-secondary)",
                whiteSpace: "pre-wrap",
              }}
            >
              {item.notes}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic mb-6">Aucune note</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 pt-4 border-t">
          <div>
            <span className="font-medium">Créé le:</span>{" "}
            {new Date(item.createdAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div>
            <span className="font-medium">Dernière modification:</span>{" "}
            {new Date(item.updatedAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Movement History Timeline */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          📊 Historique des Mouvements
        </h2>

        {movementsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : movements.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">
            Aucun mouvement enregistré
          </p>
        ) : (
          <div className="space-y-4">
            {movements.map((movement) => (
              <div
                key={movement.id}
                className="mobile-history-item"
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: getMovementMeta(movement.type).color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    flexShrink: 0,
                  }}
                >
                  {getMovementMeta(movement.type).icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div className="mobile-list-row" style={{ marginBottom: "4px" }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: getMovementMeta(movement.type).color,
                        fontSize: "0.9rem",
                      }}
                    >
                      {getMovementMeta(movement.type).label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(movement.createdAt).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>

                  <div
                    className="text-sm text-gray-600"
                    style={{ marginBottom: "4px" }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          movement.quantite >= 0
                            ? "rgba(16, 185, 129, 0.1)"
                            : "rgba(239, 68, 68, 0.1)",
                        color: movement.quantite >= 0 ? "#059669" : "#dc2626",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      {movement.quantiteAvant} → {movement.quantiteApres}
                      <span>
                        ({movement.quantite >= 0 ? "+" : ""}
                        {movement.quantite})
                      </span>
                    </span>
                  </div>

                  {movement.reason && (
                    <p className="text-xs text-gray-500">{movement.reason}</p>
                  )}

                  {movement.performedBy && (
                    <p className="text-xs text-gray-400 mt-1">
                      Par: {movement.performedBy.nom}
                      {movement.technicien && ` → ${movement.technicien.nom}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <StockTransferModal
          stockId={id!}
          stockName={item.nomMateriel}
          maxQuantite={item.quantite}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            loadStock();
            loadMovements();
          }}
        />
      )}

      {/* Location Modal */}
      {showLocationModal && item && (
        <StockLocationModal
          stockId={id!}
          currentStatut={item.statut}
          currentTechnicianId={item.technicianStocks?.[0]?.technicien?.id}
          onClose={() => setShowLocationModal(false)}
          onSuccess={() => {
            setShowLocationModal(false);
            loadStock();
            loadMovements();
          }}
        />
      )}
    </div>
  );
}

export default StockDetail;
