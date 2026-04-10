import type { Intervention } from "../types";

export type InterventionSortColumn =
  | "id"
  | "numero"
  | "datePlanifiee"
  | "statut"
  | "client"
  | "technicien"
  | string;

export type InterventionSortDirection = "asc" | "desc";

export function getInterventionSortValue(
  intervention: Intervention,
  sortColumn: InterventionSortColumn
) {
  switch (sortColumn) {
    case "datePlanifiee":
      return new Date(intervention.datePlanifiee).getTime();
    case "statut": {
      const order = { planifiee: 1, en_cours: 2, terminee: 3, annulee: 4 };
      return order[intervention.statut as keyof typeof order] || 5;
    }
    case "client":
      return intervention.client?.nom?.toLowerCase() || "";
    case "technicien":
      return intervention.technicien?.nom?.toLowerCase() || "zzz";
    case "id":
    case "numero": {
      const rawValue = intervention.numero || intervention.id || "";
      const match = rawValue.toString().match(/\d+/);
      const extractedNumber = match ? parseInt(match[0], 10) : 0;
      return extractedNumber !== 0 ? extractedNumber : rawValue;
    }
    default:
      return intervention[sortColumn as keyof Intervention];
  }
}

export function sortInterventionsList(
  list: Intervention[],
  sortColumn: InterventionSortColumn,
  sortDirection: InterventionSortDirection
): Intervention[] {
  return [...list].sort((a, b) => {
    const valueA = getInterventionSortValue(a, sortColumn) ?? "";
    const valueB = getInterventionSortValue(b, sortColumn) ?? "";

    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
}

export function getTodayInterventions(interventions: Intervention[]): Intervention[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return interventions
    .filter((intervention) => {
      const interventionDate = new Date(intervention.datePlanifiee);
      return interventionDate >= today && interventionDate < tomorrow;
    })
    .sort(
      (a, b) =>
        new Date(a.datePlanifiee).getTime() - new Date(b.datePlanifiee).getTime()
    );
}

export function getStatusFilteredInterventions(
  interventions: Intervention[],
  statusFilter: "all" | "planifiee" | "en_cours" | "terminee" | "annulee"
): Intervention[] {
  return interventions
    .filter((intervention) =>
      statusFilter === "all" ? true : intervention.statut === statusFilter
    )
    .sort(
      (a, b) =>
        new Date(b.datePlanifiee).getTime() - new Date(a.datePlanifiee).getTime()
    );
}

export function getOverdueInterventionsCount(interventions: Intervention[]): number {
  const now = new Date();
  return interventions.filter((intervention) => {
    if (intervention.statut === "terminee" || intervention.statut === "annulee") {
      return false;
    }
    return new Date(intervention.datePlanifiee) < now;
  }).length;
}
