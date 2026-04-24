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
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: "100%", maxWidth: "min(560px, 100%)" }}>
        <h3
          style={{
            color: "var(--danger-color)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AppIcon name="warning" size={22} /> Conflit de planning détecté
        </h3>

        <div style={{ marginBottom: "20px", lineHeight: "1.6" }}>
          <p>
            Le technicien sélectionné a déjà une intervention planifiée à cette
            date :
          </p>

          <div
            style={{
              backgroundColor: "#fee2e2",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              margin: "15px 0",
            }}
          >
            <strong>{conflictingIntervention.titre}</strong>
            <br />
            <span style={{ fontSize: "0.9rem" }}>
              <AppIcon name="interventions" size={16} />{" "}
              {conflictingIntervention.datePlanifiee
                ? new Date(conflictingIntervention.datePlanifiee).toLocaleString(
                    "fr-FR"
                  )
                : "Date non disponible"}
            </span>
            <br />
            <span style={{ fontSize: "0.9rem" }}>
              <AppIcon name="location" size={16} /> {conflictingIntervention.client?.nom}
            </span>
          </div>

          <p>
            Voulez-vous quand même planifier cette nouvelle intervention à{" "}
            <strong>{new Date(newDate).toLocaleString("fr-FR")}</strong> ?
          </p>
        </div>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}
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
