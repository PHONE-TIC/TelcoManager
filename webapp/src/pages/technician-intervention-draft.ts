/**
 * Brouillon de clôture d'intervention, conservé localement.
 *
 * Un technicien renseigne sa fiche par étapes, souvent en mobilité et parfois
 * hors réseau : la saisie en cours est donc persistée à chaque changement
 * d'étape pour survivre à une fermeture d'onglet ou à un rechargement.
 *
 * La forme du brouillon est centralisée ici. Auparavant, la sérialisation était
 * recopiée à chaque transition d'étape : ajouter un champ au formulaire
 * obligeait à modifier tous ces endroits, et en oublier un faisait perdre la
 * saisie sans que rien ne le signale.
 */

export interface ClosureBilling {
  maintenance: boolean;
  garantie: boolean;
  facturable: boolean;
}

export interface ClosureDraft {
  step: number;
  timeArrivee: string;
  timeDepart: string;
  commentaire: string;
  billing: ClosureBilling;
  systemType: string;
  clientRemarks: string;
  clientSigner: string;
  signatureTechnicien: string | null;
  signatureClient: string | null;
}

export function getClosureDraftKey(interventionId: string): string {
  return `closure_draft_${interventionId}`;
}

/**
 * Enregistre le brouillon. L'échec d'écriture (stockage saturé, navigation
 * privée) ne doit jamais interrompre la saisie en cours : il est signalé en
 * console et la fiche continue de fonctionner en mémoire.
 */
export function saveClosureDraft(
  interventionId: string | undefined,
  draft: ClosureDraft
): void {
  if (!interventionId) return;

  try {
    localStorage.setItem(getClosureDraftKey(interventionId), JSON.stringify(draft));
  } catch (err) {
    console.error("Impossible d'enregistrer le brouillon de clôture:", err);
  }
}

/**
 * Relit le brouillon. Renvoie null si aucun brouillon n'existe ou si son
 * contenu est illisible — un stockage corrompu ne doit pas empêcher
 * l'ouverture de la fiche.
 */
export function loadClosureDraft(
  interventionId: string | undefined
): Partial<ClosureDraft> | null {
  if (!interventionId) return null;

  try {
    const raw = localStorage.getItem(getClosureDraftKey(interventionId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return parsed as Partial<ClosureDraft>;
  } catch (err) {
    console.error("Brouillon de clôture illisible, il sera ignoré:", err);
    return null;
  }
}

export function clearClosureDraft(interventionId: string | undefined): void {
  if (!interventionId) return;

  try {
    localStorage.removeItem(getClosureDraftKey(interventionId));
  } catch (err) {
    console.error("Impossible de supprimer le brouillon de clôture:", err);
  }
}
