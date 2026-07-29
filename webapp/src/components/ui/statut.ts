/**
 * Correspondance entre les statuts métier et les tons de l'interface.
 *
 * Isolée des composants : un statut ajouté côté backend se déclare ici, à un
 * seul endroit, et l'ensemble des écrans le rend correctement.
 */

export type StateTone = "run" | "wait" | "done" | "off";

const STATUT_TONES: Record<string, StateTone> = {
  en_cours: "run",
  planifiee: "wait",
  terminee: "done",
  annulee: "off",
};

const STATUT_LABELS: Record<string, string> = {
  en_cours: "En cours",
  planifiee: "Planifiée",
  terminee: "Terminée",
  annulee: "Annulée",
};

export function toneForStatut(statut: string): StateTone {
  return STATUT_TONES[statut] ?? "off";
}

/** Retombe sur la valeur brute plutôt que d'afficher un vide si le statut est inconnu. */
export function labelForStatut(statut: string): string {
  return STATUT_LABELS[statut] ?? statut;
}
