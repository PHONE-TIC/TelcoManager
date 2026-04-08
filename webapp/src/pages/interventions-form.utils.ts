import type { Intervention } from "../types";

export function validateInterventionStep(
  step: number,
  formData: {
    clientId: string;
    technicienId: string;
    datePlanifiee: string;
    titre: string;
    description: string;
  }
): boolean {
  switch (step) {
    case 1:
      return !!formData.clientId;
    case 2:
      return !!formData.titre && !!formData.description;
    case 3:
      return !!formData.technicienId && !!formData.datePlanifiee;
    default:
      return false;
  }
}

export function findInterventionConflict(
  interventions: Intervention[],
  techId: string,
  date: string
): Intervention | null {
  if (!techId || !date) return null;

  const newDate = new Date(date);

  return (
    interventions.find((intervention) => {
      if (
        intervention.technicienId !== techId ||
        intervention.statut === "annulee" ||
        intervention.statut === "terminee"
      ) {
        return false;
      }

      const interventionDate = new Date(intervention.datePlanifiee);
      const timeDiff = Math.abs(interventionDate.getTime() - newDate.getTime());
      return timeDiff < 2 * 60 * 60 * 1000;
    }) || null
  );
}

export function filterClientsForSelection(
  clients: Array<{
    id: string;
    nom: string;
    rue?: string;
    ville?: string;
    codePostal?: string;
  }>,
  search: string
) {
  const normalizedSearch = search.toLowerCase();

  return clients.filter(
    (client) =>
      client.nom.toLowerCase().includes(normalizedSearch) ||
      (client.rue && client.rue.toLowerCase().includes(normalizedSearch)) ||
      (client.ville && client.ville.toLowerCase().includes(normalizedSearch))
  );
}

export function filterTechniciansForSelection(
  techniciens: Array<{ id: string; nom: string; role?: string }>,
  search: string
) {
  const normalizedSearch = search.toLowerCase();

  return techniciens.filter(
    (technicien) =>
      technicien.role !== "admin" &&
      (technicien.nom.toLowerCase().includes(normalizedSearch) ||
        (technicien.role && technicien.role.toLowerCase().includes(normalizedSearch)))
  );
}
