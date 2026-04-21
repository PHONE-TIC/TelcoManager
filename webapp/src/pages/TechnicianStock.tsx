import { useEffect, useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { apiService } from "../services/api.service";
import "./TechnicianStock.css";
import "./screen-harmonization.css";
import "./detail-form-harmonization.css";

interface Client {
  id: string;
  nom: string;
}

interface StockItem {
  id: string;
  stockId: string;
  quantite: number;
  etat: string;
  clientId: string | null;
  client?: Client | null;
  stock?: {
    id: string;
    nomMateriel: string;
    reference: string;
    numeroSerie?: string;
    codeBarre?: string;
    categorie: string;
  };
}

export default function TechnicianStock() {
  const { user } = useAuth();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadStock = async () => {
    if (!user?.id) return;

    try {
      const data = await apiService.getTechnicianStock(user.id);
      setStock(Array.isArray(data) ? data : data.stock || []);
    } catch (error) {
      console.error("Erreur lors du chargement du stock:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filteredStock = stock;

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="technician-stock-page harmonized-shell">
      <div className="harmonized-header">
        <h1 className="page-title">🚗 Mon Stock Véhicule</h1>
        <p className="page-subtitle">Gérez les articles dans votre véhicule</p>
      </div>

      <div className="harmonized-card">
        {filteredStock.length > 0 ? (
          <div className="stock-list">
            {filteredStock.map((item) => (
              <div
                key={item.id}
                id={`stock-item-${item.id}`}
                className="stock-item-card"
              >
                <div className="stock-item-info">
                  <h3>{item.stock?.nomMateriel || "Sans nom"}</h3>
                  <p className="stock-item-ref">
                    Réf: {item.stock?.reference || "N/A"}
                  </p>
                  {item.stock?.numeroSerie && (
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--primary-color)",
                        fontWeight: 500,
                      }}
                    >
                      🔢 S/N: {item.stock.numeroSerie}
                    </p>
                  )}
                  <span className="badge badge-info">
                    {item.stock?.categorie || "Non catégorisé"}
                  </span>

                  {/* Client Assignment Badge */}
                  {item.clientId && item.client && (
                    <span
                      style={{
                        display: "inline-block",
                        marginLeft: "8px",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: "#dbeafe",
                        color: "#1e40af",
                      }}
                    >
                      📍 Chez {item.client.nom}
                    </span>
                  )}
                </div>

                <div
                  className="stock-item-actions"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Etat Badge */}
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      backgroundColor:
                        item.etat === "ok" ? "#d1fae5" : "#fee2e2",
                      color: item.etat === "ok" ? "#065f46" : "#991b1b",
                    }}
                  >
                    {item.etat === "ok" ? "✅ OK" : "❌ HS"}
                  </span>

                  {/* Action Buttons */}
                  {/* Assignment is done through intervention closure only */}

                  {/* Retrieval is done through intervention closure only */}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>📦 Aucun article trouvé</p>
            <small>Votre stock véhicule est vide</small>
          </div>
        )}
      </div>

      {/* Assignment and retrieval is now done through intervention closure only */}
    </div>
  );
}
