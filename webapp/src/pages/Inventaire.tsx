import { useState, useEffect } from "react";
import moment from "moment";
import { apiService } from "../services/api.service";
import { generateInventoryPDF } from "../utils/inventoryPdf";
import InventoryDiscrepancyModal from "./InventoryDiscrepancyModal";
import type { FilterType, InventorySession } from "./inventory.types";
import { getFilteredInventoryItems } from "./inventory.utils";

function Inventaire() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<InventorySession | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const [itemFilter, setItemFilter] = useState<FilterType>("all");

  // Notes pour la nouvelle session
  const [newSessionNotes, setNewSessionNotes] = useState("");
  // const [showNewSessionModal, setShowNewSessionModal] = useState(false); // REMOVED: Inline UI instead
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);

  // Scan state
  const [scanQuery, setScanQuery] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScannedItem, setLastScannedItem] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await apiService.getInventorySessions();
      setSessions(data);
    } catch (error) {
      console.error("Erreur chargement sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (id: string) => {
    setLoading(true);
    try {
      const data = await apiService.getInventorySession(id);
      setCurrentSession(data);
    } catch (error) {
      console.error("Erreur chargement détail session:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (
      !confirm(
        "Créer un nouvel inventaire va prendre un instantané du stock courant. Continuer ?"
      )
    )
      return;

    try {
      const session = await apiService.createInventorySession({
        notes: newSessionNotes,
      });
      // setShowNewSessionModal(false); // REMOVED
      setNewSessionNotes("");
      loadSessions();
      loadSessionDetails(session.id);
    } catch (error) {
      console.error("Erreur création session:", error);
      alert("Erreur lors de la création de la session");
    }
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession || !scanQuery.trim()) return;

    const query = scanQuery.trim().toLowerCase();

    // Find item by serial number or barcode
    const item = currentSession.items.find((i) => {
      const serial = i.stock.numeroSerie
        ? i.stock.numeroSerie.toLowerCase()
        : "";
      const barcode = i.stock.codeBarre ? i.stock.codeBarre.toLowerCase() : "";
      return serial === query || barcode === query;
    });

    if (item) {
      // Found! Increment quantity
      const currentQty = item.countedQuantity || 0;
      handleUpdateQuantity(item.id, (currentQty + 1).toString());

      setLastScannedItem(item.stock.nomMateriel);
      setScanError(null);
      setScanQuery(""); // Clear input for next scan
    } else {
      // Not found
      setScanError(`Article non trouvé: ${scanQuery}`);
      setLastScannedItem(null);
      setScanQuery(""); // Clear invalid input to allow retry
    }
  };

  const handleUpdateQuantity = (itemId: string, qty: string) => {
    if (!currentSession) return;

    const quantity = qty === "" ? null : parseInt(qty);

    const updatedItems = currentSession.items.map((item) =>
      item.id === itemId ? { ...item, countedQuantity: quantity } : item
    );

    setCurrentSession({ ...currentSession, items: updatedItems });
  };

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    if (!currentSession) return;

    const updatedItems = currentSession.items.map((item) =>
      item.id === itemId ? { ...item, notes } : item
    );

    setCurrentSession({ ...currentSession, items: updatedItems });
  };

  const handleSaveProgress = async () => {
    if (!currentSession) return;

    try {
      await apiService.updateInventoryItems(
        currentSession.id,
        currentSession.items
      );
      alert("Progression sauvegardée !");
      loadSessionDetails(currentSession.id);
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("Erreur lors de la sauvegarde");
    }
  };

  const handleFinalizeClick = () => {
    if (!currentSession) return;
    setShowDiscrepancyModal(true);
  };

  const handleConfirmFinalize = async () => {
    if (!currentSession) return;

    // Original logic moved here
    setShowDiscrepancyModal(false);

    try {
      await apiService.updateInventoryItems(
        currentSession.id,
        currentSession.items
      );
      await apiService.finalizeInventorySession(currentSession.id);
      alert("Inventaire finalisé et stock mis à jour !");
      loadSessions();
      loadSessionDetails(currentSession.id);
    } catch (error) {
      console.error("Erreur finalisation:", error);
      alert("Erreur lors de la finalisation");
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Supprimer cette session d'inventaire ?")) return;
    try {
      await apiService.deleteInventorySession(id);
      loadSessions();
      if (currentSession && currentSession.id === id) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Impossible de supprimer cette session");
    }
  };

  // Stats helpers
  const getSessionStats = () => {
    if (!currentSession)
      return { counted: 0, total: 0, discrepancies: 0, ok: 0 };
    const items = currentSession.items || [];
    const counted = items.filter((i) => i.countedQuantity !== null).length;
    const discrepancies = items.filter(
      (i) =>
        i.countedQuantity !== null && i.countedQuantity !== i.expectedQuantity
    ).length;
    const ok = items.filter(
      (i) =>
        i.countedQuantity !== null && i.countedQuantity === i.expectedQuantity
    ).length;
    return { counted, total: items.length, discrepancies, ok };
  };

  // --- RENDER ---

  if (loading && !currentSession && sessions.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentSession) {
    // VUE DÉTAIL SESSION
    const isCompleted = currentSession.status === "completed";
    const stats = getSessionStats();
    const filteredItems = getFilteredInventoryItems(currentSession, itemFilter);
    const progressPercent =
      stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0;

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
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentSession(null)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 500,
              }}
            >
              ← Retour
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                  📋 Inventaire du{" "}
                  {moment(currentSession.date).format("DD/MM/YYYY")}
                </h1>
                {isCompleted ? (
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                    }}
                  >
                    ✓ Finalisé
                  </span>
                ) : (
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background:
                        "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      color: "white",
                    }}
                  >
                    📝 Brouillon
                  </span>
                )}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {currentSession.items.length} articles à inventorier
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => generateInventoryPDF(currentSession)}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)",
              }}
            >
              🖨️ Export PDF
            </button>
            {!isCompleted && (
              <>
                <button
                  onClick={handleSaveProgress}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.35)",
                  }}
                >
                  💾 Sauvegarder
                </button>
                <button
                  onClick={handleFinalizeClick}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  ✅ Finaliser
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar + Stats */}
        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontWeight: 600 }}>Progression</span>
            <span
              style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
            >
              {stats.counted} / {stats.total} articles comptés
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "12px",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background:
                  progressPercent === 100
                    ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
                borderRadius: "6px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
              <span style={{ fontSize: "0.9rem" }}>{stats.ok} conformes</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
              <span style={{ fontSize: "0.9rem" }}>
                {stats.discrepancies} écarts
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "var(--text-secondary)",
                  opacity: 0.5,
                }}
              />
              <span style={{ fontSize: "0.9rem" }}>
                {stats.total - stats.counted} non comptés
              </span>
            </div>
          </div>
        </div>

        {/* Filters + Search */}
        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            padding: "20px",
          }}
        >
          {/* Scan Input */}
          <form
            onSubmit={handleScan}
            style={{
              flex: "1 1 300px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginRight: "auto", // Push filters to the right if space allows
            }}
          >
            <div style={{ position: "relative", width: "100%" }}>
              <span
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "1.2rem",
                }}
              >
                📷
              </span>
              <input
                type="text"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                placeholder="Scanner N° Série ou Code Barre..."
                className="form-input"
                style={{
                  paddingLeft: "40px",
                  width: "100%",
                  border: scanError
                    ? "1px solid #ef4444"
                    : "1px solid var(--border-color)",
                  backgroundColor: scanError
                    ? "rgba(239, 68, 68, 0.05)"
                    : "var(--bg-secondary)",
                }}
                autoFocus
              />
            </div>
          </form>

          {/* Feedback Messages */}
          <div style={{ width: "100%", marginBottom: "10px" }}>
            {scanError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>❌</span> {scanError}
              </div>
            )}
            {lastScannedItem && !scanError && (
              <div
                className="fade-in"
                style={{
                  color: "#10b981",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>✅</span> Scanné: <strong>{lastScannedItem}</strong> (+1)
              </div>
            )}
          </div>

          {/* Filter buttons */}
          <div className="responsive-stack" style={{ width: "100%" }}>
            {[
              { key: "all", label: "📦 Tous", count: stats.total },
              {
                key: "uncounted",
                label: "⏳ Non comptés",
                count: stats.total - stats.counted,
              },
              {
                key: "discrepancy",
                label: "⚠️ Écarts",
                count: stats.discrepancies,
              },
              { key: "ok", label: "✅ Conformes", count: stats.ok },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setItemFilter(f.key as FilterType)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    itemFilter === f.key
                      ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                      : "var(--bg-secondary)",
                  color: itemFilter === f.key ? "white" : "var(--text-primary)",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {f.label}
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "10px",
                    background:
                      itemFilter === f.key
                        ? "rgba(255,255,255,0.2)"
                        : "var(--border-color)",
                    fontSize: "0.75rem",
                  }}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            padding: "20px",
          }}
        >
          <div className="responsive-scroll">
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Matériel</th>
                <th>Référence</th>
                <th>N° Série</th>
                <th style={{ textAlign: "center" }}>Qté Théorique</th>
                <th style={{ textAlign: "center", width: "120px" }}>
                  Qté Comptée
                </th>
                <th style={{ textAlign: "center" }}>Écart</th>
                <th style={{ width: "150px" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const counted = item.countedQuantity;
                const expected = item.expectedQuantity;
                const diff = counted !== null ? counted - expected : 0;
                const hasDiff = counted !== null && diff !== 0;

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: hasDiff
                        ? "rgba(239, 68, 68, 0.08)"
                        : "inherit",
                    }}
                  >
                    <td>
                      <div className="flex flex-col">
                        <span
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {item.stock.nomMateriel}
                        </span>
                      </div>
                    </td>
                    <td>
                      <code
                        style={{
                          fontSize: "0.85em",
                          background: "var(--bg-secondary)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {item.stock.reference}
                      </code>
                    </td>
                    <td>
                      <code
                        style={{
                          fontSize: "0.85em",
                          background: "var(--bg-secondary)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.stock.numeroSerie || "-"}
                      </code>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#3b82f6",
                        }}
                      >
                        {expected}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {isCompleted ? (
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background: hasDiff
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(16, 185, 129, 0.15)",
                            color: hasDiff ? "#ef4444" : "#10b981",
                          }}
                        >
                          {counted !== null ? counted : "-"}
                        </span>
                      ) : (
                        <input
                          type="number"
                          style={{
                            width: "80px",
                            padding: "8px",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            textAlign: "center",
                            backgroundColor: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            outline: "none",
                          }}
                          value={counted !== null ? counted : ""}
                          onChange={(e) =>
                            handleUpdateQuantity(item.id, e.target.value)
                          }
                          placeholder="-"
                          min="0"
                        />
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {counted !== null ? (
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background:
                              diff > 0
                                ? "rgba(16, 185, 129, 0.15)"
                                : diff < 0
                                ? "rgba(239, 68, 68, 0.15)"
                                : "var(--bg-secondary)",
                            color:
                              diff > 0
                                ? "#10b981"
                                : diff < 0
                                ? "#ef4444"
                                : "var(--text-secondary)",
                          }}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>
                          -
                        </span>
                      )}
                    </td>
                    <td>
                      {isCompleted ? (
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {item.notes || "-"}
                        </span>
                      ) : (
                        <input
                          type="text"
                          placeholder="Notes..."
                          value={item.notes || ""}
                          onChange={(e) =>
                            handleUpdateItemNotes(item.id, e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            fontSize: "0.8rem",
                            backgroundColor: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            outline: "none",
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {filteredItems.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔍</div>
              <p>Aucun article trouvé avec ce filtre</p>
            </div>
          )}
        </div>

        {/* Modal Ecarts (Active Session) */}
        <InventoryDiscrepancyModal
          isOpen={showDiscrepancyModal}
          onClose={() => setShowDiscrepancyModal(false)}
          onConfirm={handleConfirmFinalize}
          items={currentSession ? currentSession.items : []}
        />
      </div>
    );
  }

  // --- VIEW: LIST SESSIONS (START) ---
  return (
    <div className="space-y-6" style={{ color: "var(--text-primary)" }}>
      {/* Header & Start Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start", // changed to align top
          backgroundColor: "var(--bg-primary)",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ flex: 1, minWidth: "300px" }}>
          <h1
            style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}
          >
            📦 Inventaires
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Gérez vos inventaires périodiques pour maintenir la précision du
            stock.
          </p>
        </div>

        {/* Start Inventory Card */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            padding: "20px",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "450px",
            border: "1px solid var(--border-color)",
          }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "15px",
            }}
          >
            🚀 Lancer un nouvel inventaire
          </h3>
          <div
            style={{ display: "flex", gap: "10px", flexDirection: "column" }}
          >
            <input
              type="text"
              placeholder="Note optionnelle (ex: Inventaire fin d'année)..."
              value={newSessionNotes}
              onChange={(e) => setNewSessionNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleCreateSession}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(249, 115, 22, 0.25)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>📸</span> Prendre un instantané & Démarrer
            </button>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                textAlign: "center",
                marginTop: "5px",
              }}
            >
              Cela figera l'état théorique du stock à l'instant T.
            </p>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "30px" }}>
        Historique
      </h2>

      <div className="grid gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="card hover-card"
            onClick={() => loadSessionDetails(session.id)}
            style={{
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  backgroundColor:
                    session.status === "completed"
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(249, 115, 22, 0.1)",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "1.5rem",
                }}
              >
                {session.status === "completed" ? "✅" : "📝"}
              </div>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                  Inventaire du {moment(session.date).format("DD/MM/YYYY")}
                </h3>
                <div className="flex gap-3 text-sm text-gray-500 mt-1">
                  <span>{moment(session.date).format("HH:mm")}</span>
                  {session.notes && <span>• {session.notes}</span>}
                  <span>• {session._count?.items || 0} articles</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {session.status === "completed" ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  Terminé
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                  Brouillon
                </span>
              )}
              {session.status === "draft" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    color: "#ef4444",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  title="Supprimer"
                >
                  🗑️
                </button>
              )}
              <span style={{ color: "var(--text-secondary)" }}>→</span>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-secondary)",
              background: "var(--bg-primary)",
              borderRadius: "12px",
              border: "1px dashed var(--border-color)",
            }}
          >
            Aucun inventaire pour le moment
          </div>
        )}
      </div>
    </div>
  );
}

export default Inventaire;
