import type { InventoryItem } from "./inventory.types";
import { getInventoryDiscrepancies } from "./inventory.utils";
import { AppIcon } from "../components/AppIcon";

interface InventoryDiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: InventoryItem[];
}

export default function InventoryDiscrepancyModal({
  isOpen,
  onClose,
  onConfirm,
  items,
}: InventoryDiscrepancyModalProps) {
  if (!isOpen) return null;

  const discrepancies = getInventoryDiscrepancies(items);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="fade-in"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderRadius: "12px",
          padding: "30px",
          width: "100%",
          maxWidth: "min(680px, 100%)",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2
          style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px" }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><AppIcon name="warning" size={22} /> Vérification des écarts</span>
        </h2>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: "20px" }}>
          {discrepancies.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                borderRadius: "8px",
                color: "#059669",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><AppIcon name="check-circle" size={18} /> Aucun écart détecté ! Tout est conforme.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p style={{ color: "var(--text-secondary)", marginBottom: "10px" }}>
                Les différences suivantes seront enregistrées comme des mouvements de régularisation :
              </p>
              {discrepancies.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    padding: "10px",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #ef4444",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.stock.nomMateriel}</div>
                    <div
                      style={{
                        fontSize: "0.85em",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Ref: {item.stock.reference}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.9em",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Attendu: {item.expectedQuantity}
                    </div>
                    <div style={{ fontWeight: 700, color: "#ef4444" }}>
                      Compté: {item.countedQuantity} ({item.countedQuantity! - item.expectedQuantity})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onClose}
            className="harmonized-back-button"
            style={{ marginRight: "auto", marginBottom: 0 }}
          >
            ← Retourner au comptage
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#ef4444",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Confirmer et Finaliser
          </button>
        </div>
      </div>
    </div>
  );
}
