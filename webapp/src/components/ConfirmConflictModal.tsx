import React from "react";
import { AppIcon } from "./AppIcon";

interface ConfirmConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflictingIntervention: {
    id: string;
    numero?: string | number;
    titre: string;
    datePlanifiee?: string;
    client?: {
      nom?: string;
    };
  };
  newDate: string;
}

const ConfirmConflictModal: React.FC<ConfirmConflictModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  conflictingIntervention,
  newDate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 11000,
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          width: "100%",
          maxWidth: "min(560px, 100%)",
          backgroundColor: "var(--card-bg, #1e293b)",
          color: "var(--text-primary, #f8fafc)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.3))",
          border: "1px solid var(--border-color, #334155)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-color, #334155)",
            backgroundColor: "var(--bg-subtle, #0f172a)",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "var(--danger-color, #ef4444)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "1.2rem",
              fontWeight: 600,
            }}
          >
            <AppIcon name="warning" size={22} /> Conflit de planning détecté
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary, #94a3b8)",
              padding: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", lineHeight: "1.6" }}>
          <p style={{ margin: "0 0 16px 0", color: "var(--text-primary)" }}>
            Le technicien sélectionné a déjà une intervention planifiée à cette date :
          </p>

          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              margin: "18px 0",
              color: "var(--text-primary)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ color: "var(--danger-color)", fontWeight: 600, fontSize: "1.05rem", marginBottom: "8px" }}>
              {conflictingIntervention.titre}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", color: "var(--text-secondary)" }}>
              <span style={{ fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <AppIcon name="interventions" size={16} />{" "}
                {conflictingIntervention.datePlanifiee
                  ? new Date(conflictingIntervention.datePlanifiee).toLocaleString(
                      "fr-FR"
                    )
                  : "Date non disponible"}
              </span>
              <span style={{ fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <AppIcon name="location" size={16} /> {conflictingIntervention.client?.nom}
              </span>
            </div>
          </div>

          <p style={{ margin: "16px 0 0 0", color: "var(--text-primary)" }}>
            Voulez-vous quand même planifier cette nouvelle intervention à{" "}
            <strong style={{ color: "var(--text-primary)" }}>{new Date(newDate).toLocaleString("fr-FR")}</strong> ?
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 24px",
            borderTop: "1px solid var(--border-color, #334155)",
            backgroundColor: "var(--bg-subtle, #0f172a)",
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Forcer la planification
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmConflictModal;
