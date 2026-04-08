export function getInterventionDetailStatusBadgeConfig(statut: string): {
  label: string;
  className: string;
} {
  const badges: Record<string, { label: string; className: string }> = {
    planifiee: { label: "🔵 Planifiée", className: "badge-info" },
    en_cours: { label: "🟠 En cours", className: "badge-warning" },
    terminee: { label: "🟢 Terminée", className: "badge-success" },
    annulee: { label: "🔴 Annulée", className: "badge-danger" },
  };

  return badges[statut] || { label: statut, className: "badge-gray" };
}
