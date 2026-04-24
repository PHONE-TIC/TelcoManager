import moment from "../utils/momentFrConfig";
import type { Intervention } from "../types";

export function getInterventionStatusBadgeConfig(statut: string): {
  label: string;
  className: string;
} {
  const badges: Record<string, { label: string; className: string }> = {
    planifiee: { label: "Planifiée", className: "bg-blue-100 text-blue-800" },
    en_cours: { label: "En cours", className: "bg-yellow-100 text-yellow-800" },
    terminee: { label: "Terminée", className: "bg-green-100 text-green-800" },
    annulee: { label: "Annulée", className: "bg-red-50 text-red-600" },
  };

  return badges[statut] || {
    label: statut,
    className: "bg-gray-100 text-gray-600",
  };
}

export function getInterventionStatusLabel(statut: string): string {
  return getInterventionStatusBadgeConfig(statut).label;
}

export function buildCalendarEventTitle(intervention: Intervention): string {
  const typeLabel = intervention.type === "Installation" ? "Install" : "SAV";
  const timeLabel = moment(intervention.datePlanifiee).format("HH:mm");
  const clientName = intervention.client?.nom || "Client inconnu";
  const statusLabel = getInterventionStatusLabel(intervention.statut);

  return `[${typeLabel}] [${timeLabel}] ${intervention.titre} - ${clientName} (${statusLabel})`;
}

export function getCalendarTransitionClass(currentDate: Date, nextDate: Date): string {
  return nextDate > currentDate ? "slide-left" : "slide-right";
}
