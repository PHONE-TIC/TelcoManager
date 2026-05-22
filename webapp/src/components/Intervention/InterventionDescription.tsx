import React from "react";
import { AppIcon } from "../AppIcon";

interface InterventionDescriptionProps {
  description?: string;
  notes?: string;
  className?: string;
  style?: React.CSSProperties;
}

function parseDescription(raw?: string): { text: string; dureeMins?: number } {
  if (!raw) return { text: "" };
  const match = raw.match(/__duree_mins:(\d+)__/);
  const dureeMins = match ? parseInt(match[1], 10) : undefined;
  const text = raw.replace(/\n?__duree_mins:\d+__/, "").trim();
  return { text, dureeMins };
}

function formatDuree(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function InterventionDescription({
  description,
  notes,
  className = "info-card harmonized-card",
  style,
}: InterventionDescriptionProps) {
  const { text, dureeMins } = parseDescription(description);

  return (
    <>
      <div className={className} style={{ marginBottom: "15px", ...style }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "var(--primary-color)" }}>
          <AppIcon name="comment" size={18} /> Description
        </h3>
        {text ? (
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{text}</p>
        ) : (
          <p style={{ margin: 0, color: "var(--text-muted, #888)" }}>Aucune description</p>
        )}
        {dureeMins !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border-color, #eee)", fontSize: "0.9em", color: "var(--text-secondary, #555)" }}>
            <AppIcon name="clock" size={15} />
            <span>Durée estimée : <strong>{formatDuree(dureeMins)}</strong></span>
          </div>
        )}
      </div>

      {notes && (
        <div className={className} style={style}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "var(--primary-color)" }}>
            <AppIcon name="comment" size={18} /> Notes
          </h3>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{notes}</p>
        </div>
      )}
    </>
  );
}
