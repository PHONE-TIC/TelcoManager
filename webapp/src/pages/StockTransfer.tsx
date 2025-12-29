import React, { useState, useEffect, useRef } from "react";
import { apiService } from "../services/api.service";
import { useNavigate } from "react-router-dom";

interface Technician {
  id: string;
  nom: string;
  role: string;
}

interface TransferItem {
  id: string; // unique ID for list (can be serial or stockId + date)
  stockId: string;
  nomMateriel: string;
  numeroSerie?: string;
  codeBarre?: string;
  quantite: number;
  status: "ok" | "error";
  message?: string;
  itemStatus?: "ok" | "hs"; // New field for return status
}

interface TechnicianStockItem {
  stockId: string;
  quantite: number;
}

const StockTransfer = () => {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [sourceType, setSourceType] = useState<"warehouse" | "technician">(
    "warehouse"
  );
  const [sourceId, setSourceId] = useState<string>("");
  const [destType, setDestType] = useState<"warehouse" | "technician">(
    "technician"
  );
  const [destId, setDestId] = useState<string>("");

  const [scanInput, setScanInput] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      const data = await apiService.getTechniciens({ limit: 100 });
      if (Array.isArray(data)) {
        setTechnicians(data.filter((t: Technician) => t.role === "technicien"));
      } else if (data && data.techniciens) {
        setTechnicians(
          data.techniciens.filter((t: Technician) => t.role === "technicien")
        );
      } else {
        setTechnicians([]);
      }
    } catch (err) {
      console.error("Erreur chargement techniciens", err);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanInput.trim();
    if (!code) return;

    try {
      // Try to find item
      let stockItem;
      try {
        stockItem = await apiService.getStockBySerial(code);
      } catch {
        try {
          stockItem = await apiService.getStockByBarcode(code);
        } catch {
          setError(`Article non trouvé pour le code: ${code}`);
          setScanInput("");
          return;
        }
      }

      if (!stockItem) return;

      // Check if duplicate for serialized items
      if (
        stockItem.numeroSerie &&
        items.some((i) => i.stockId === stockItem.id)
      ) {
        setError(
          `Ce matériel (${stockItem.nomMateriel} - ${stockItem.numeroSerie}) est déjà dans la liste.`
        );
        setScanInput("");
        return;
      }

      // Check for validation if source is technician
      if (sourceType === "technician") {
        if (!sourceId) {
          setError("Veuillez sélectionner un technicien source.");
          setScanInput("");
          return;
        }
        try {
          const techStockList = await apiService.getTechnicianStock(sourceId);
          const isInStock = Array.isArray(techStockList)
            ? techStockList.some(
                (i: TechnicianStockItem) =>
                  i.stockId === stockItem.id && i.quantite > 0
              )
            : false;

          if (!isInStock) {
            setError(
              "Ce matériel n'est pas présent dans le stock du technicien sélectionné."
            );
            setScanInput("");
            return;
          }
        } catch (e) {
          console.error("Erreur vérification stock technicien", e);
          // Optional: block or warn? Blocking is safer.
          setError("Impossible de vérifier le stock du technicien.");
          setScanInput("");
          return;
        }
      }

      const isSerialScan = stockItem.numeroSerie === code;

      const existingIndex = items.findIndex(
        (i) =>
          i.stockId === stockItem.id && !i.numeroSerie && i.itemStatus === "ok" // Only group generic if same status (default ok)
      );

      if (existingIndex >= 0 && !isSerialScan) {
        const newItems = [...items];
        newItems[existingIndex].quantite += 1;
        setItems(newItems);
      } else {
        setItems((prev) => [
          {
            id: isSerialScan ? code : `${stockItem.id}-${Date.now()}`,
            stockId: stockItem.id,
            nomMateriel: stockItem.nomMateriel,
            numeroSerie: isSerialScan ? code : undefined,
            codeBarre: !isSerialScan ? stockItem.codeBarre : undefined,
            quantite: 1,
            status: "ok",
            itemStatus: "ok", // Default status
          },
          ...prev,
        ]);
      }

      setScanInput("");
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la recherche");
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStatusChange = (index: number, newStatus: "ok" | "hs") => {
    const newItems = [...items];
    newItems[index].itemStatus = newStatus;
    setItems(newItems);
  };

  const handleValidate = async () => {
    if (items.length === 0) return;
    if (sourceType === "technician" && !sourceId) {
      setError("Source requise");
      return;
    }
    if (destType === "technician" && !destId) {
      setError("Destination requise");
      return;
    }
    if (
      sourceType === destType &&
      (sourceType === "warehouse" || sourceId === destId)
    ) {
      setError("Source et Destination identiques");
      return;
    }

    setLoading(true);
    try {
      await apiService.bulkTransfer({
        sourceType,
        sourceId: sourceType === "technician" ? sourceId : undefined,
        destType,
        destId: destType === "technician" ? destId : undefined,
        items: items.map((i) => ({
          stockId: i.stockId,
          quantite: i.quantite,
          status: i.itemStatus, // Pass selected status
        })),
      });
      setSuccess("Transfert réussi !");
      setItems([]);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error(err);
      setError((err as any).response?.data?.error || "Erreur lors du transfert");
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "var(--bg-secondary, #f8fafc)",
    border: "1px solid var(--border-color, #e2e8f0)",
    borderRadius: "12px",
    fontSize: "0.95rem",
    color: "var(--text-primary, #1e293b)",
    outline: "none",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const cardStyle = {
    backgroundColor: "var(--bg-primary, #ffffff)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    border: "1px solid var(--border-color, #e2e8f0)",
  };

  const labelStyle = {
    display: "block",
    fontWeight: 600,
    color: "var(--text-secondary, #64748b)",
    marginBottom: "8px",
    fontSize: "0.875rem",
  };

  const selectionButtonStyle = (isActive: boolean, color: string) => ({
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: isActive ? `2px solid ${color}` : "1px solid var(--border-color)",
    backgroundColor: isActive ? `${color}15` : "transparent", // 15 = low opacity hex
    color: isActive ? color : "var(--text-secondary)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              background:
                "linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "8px",
            }}
          >
            Transfert de Matériel
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Déplacez du matériel entre l'entrepôt et les techniciens
          </p>
        </div>
        <button
          onClick={() => navigate("/stock")}
          className="btn btn-secondary"
        >
          ← Retour au Stock
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        {/* Source Card */}
        <div style={cardStyle}>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--text-primary)",
            }}
          >
            <span
              style={{
                backgroundColor: "#eff6ff",
                color: "#3b82f6",
                padding: "8px",
                borderRadius: "10px",
              }}
            >
              📤
            </span>
            Source
          </h2>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Type de source</label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setSourceType("warehouse")}
                style={selectionButtonStyle(
                  sourceType === "warehouse",
                  "#3b82f6"
                )}
              >
                🏢 Stock Courant
              </button>
              <button
                onClick={() => setSourceType("technician")}
                style={selectionButtonStyle(
                  sourceType === "technician",
                  "#3b82f6"
                )}
              >
                👷 Technicien
              </button>
            </div>
          </div>

          {sourceType === "technician" && (
            <div className="fade-in">
              <label style={labelStyle}>Sélectionner le technicien</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Choisir...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Destination Card */}
        <div style={cardStyle}>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--text-primary)",
            }}
          >
            <span
              style={{
                backgroundColor: "#f0fdf4",
                color: "#22c55e",
                padding: "8px",
                borderRadius: "10px",
              }}
            >
              📥
            </span>
            Destination
          </h2>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Type de destination</label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setDestType("warehouse")}
                style={selectionButtonStyle(
                  destType === "warehouse",
                  "#22c55e"
                )}
              >
                🏢 Stock Courant
              </button>
              <button
                onClick={() => setDestType("technician")}
                style={selectionButtonStyle(
                  destType === "technician",
                  "#22c55e"
                )}
              >
                👷 Technicien
              </button>
            </div>
          </div>

          {destType === "technician" && (
            <div className="fade-in">
              <label style={labelStyle}>Sélectionner le technicien</label>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Choisir...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Scan Area */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <form
          onSubmit={handleScan}
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "250px" }}>
            <label style={labelStyle}>
              Scanner ou saisir un numéro de série / code-barres
            </label>
            <div style={{ position: "relative" }}>
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: "44px",
                  fontSize: "1.1rem",
                }}
                placeholder="Scanner ici..."
                autoFocus
              />
              <span
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "1.2rem",
                }}
              >
                🔍
              </span>
            </div>
          </div>
          <button
            type="submit"
            style={{
              padding: "14px 28px",
              borderRadius: "12px",
              border: "none",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            Ajouter
          </button>
        </form>

        {error && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "#fef2f2",
              color: "#ef4444",
              border: "1px solid #fee2e2",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "#f0fdf4",
              color: "#16a34a",
              border: "1px solid #dcfce7",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ✅ {success}
          </div>
        )}
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              paddingBottom: "16px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Articles à transférer{" "}
              <span
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  padding: "4px 8px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  marginLeft: "8px",
                }}
              >
                {items.length}
              </span>
            </h3>
            <button
              onClick={() => setItems([])}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Tout effacer
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0 8px",
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "0 16px" }}>Article</th>
                  <th style={{ padding: "0 16px" }}>Identifiant</th>
                  {sourceType === "technician" && destType === "warehouse" && (
                    <th style={{ padding: "0 16px" }}>Etat</th>
                  )}
                  <th style={{ padding: "0 16px", textAlign: "center" }}>
                    Quantité
                  </th>
                  <th style={{ padding: "0 16px", textAlign: "right" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      transition: "transform 0.1s",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px",
                        borderRadius: "10px 0 0 10px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.nomMateriel}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        fontFamily: "monospace",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {item.numeroSerie || item.codeBarre || "—"}
                    </td>

                    {sourceType === "technician" &&
                      destType === "warehouse" && (
                        <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleStatusChange(idx, "ok")}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border:
                                  item.itemStatus === "ok"
                                    ? "2px solid #22c55e"
                                    : "1px solid var(--border-color)",
                                backgroundColor:
                                  item.itemStatus === "ok"
                                    ? "#f0fdf4"
                                    : "white",
                                color:
                                  item.itemStatus === "ok"
                                    ? "#22c55e"
                                    : "var(--text-secondary)",
                                fontWeight: 600,
                                fontSize: "0.8rem",
                                cursor: "pointer",
                              }}
                            >
                              OK
                            </button>
                            <button
                              onClick={() => handleStatusChange(idx, "hs")}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border:
                                  item.itemStatus === "hs"
                                    ? "2px solid #ef4444"
                                    : "1px solid var(--border-color)",
                                backgroundColor:
                                  item.itemStatus === "hs"
                                    ? "#fef2f2"
                                    : "white",
                                color:
                                  item.itemStatus === "hs"
                                    ? "#ef4444"
                                    : "var(--text-secondary)",
                                fontWeight: 600,
                                fontSize: "0.8rem",
                                cursor: "pointer",
                              }}
                            >
                              HS
                            </button>
                          </div>
                        </td>
                      )}

                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#dbeafe",
                          color: "#1e40af",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                        }}
                      >
                        {item.quantite}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderRadius: "0 10px 10px 0",
                        textAlign: "right",
                      }}
                    >
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: "#fee2e2",
                          border: "none",
                          color: "#ef4444",
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={handleValidate}
              disabled={loading}
              style={{
                padding: "16px 32px",
                borderRadius: "12px",
                border: "none",
                background: loading
                  ? "var(--bg-secondary)"
                  : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: loading ? "var(--text-secondary)" : "white",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading
                  ? "none"
                  : "0 4px 12px rgba(37, 99, 235, 0.3)",
                transform: "translateY(0)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Traitement..." : "Valider le transfert"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransfer;
