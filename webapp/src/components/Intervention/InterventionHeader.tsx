import React from "react";

interface InterventionHeaderProps {
  numero: string;
  titre: string;
  statutBadge: React.ReactNode;
  onBack: () => void;
  actionButton?: React.ReactNode;
  subtitle?: React.ReactNode;
  borderless?: boolean;
}

export function InterventionHeader({
  numero,
  titre,
  statutBadge,
  onBack,
  actionButton,
  subtitle,
  borderless = false,
}: InterventionHeaderProps) {
  return (
    <>
      {/* Top Action Row (Outside Card) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={onBack}
          className="harmonized-back-button"
          style={{ margin: 0, width: "fit-content" }}
        >
          ← Retour
        </button>
        {actionButton && (
          <div style={{ flexGrow: 1, display: "flex", justifyContent: "flex-end" }}>
            {actionButton}
          </div>
        )}
      </div>

      {/* Header Card */}
      <div
        className="tech-header harmonized-header"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          marginBottom: "15px",
          ...(borderless ? { border: "none", borderRadius: 0, margin: 0, padding: 0 } : {}),
        }}
      >
        <div className="title-row" style={{ marginTop: "0" }}>
          <h1>
            <span className="intervention-number">{numero}</span>
            {titre}
          </h1>
          {statutBadge}
        </div>
        {subtitle && (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {subtitle}
          </div>
        )}
      </div>
    </>
  );
}
