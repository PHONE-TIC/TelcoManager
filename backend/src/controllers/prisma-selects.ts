/**
 * Champs d'intervention renvoyés par les vues de liste (liste, calendrier,
 * tableau de bord, rapports).
 *
 * Sans sélection explicite, Prisma remonte toutes les colonnes — dont
 * `signature` et `signatureTechnicien`, qui contiennent des images manuscrites
 * encodées en base64. Ces deux champs représentaient à eux seuls l'essentiel de
 * la charge utile des listes alors qu'ils n'y sont jamais affichés : ils ne
 * servent qu'à la fiche détaillée et au rapport PDF.
 *
 * `notes` et `commentaireTechnicien`, également en Text et propres au détail,
 * sont écartés pour la même raison.
 */
export const interventionListSelect = {
  id: true,
  numero: true,
  titre: true,
  description: true,
  type: true,
  statut: true,
  datePlanifiee: true,
  datePriseEnCharge: true,
  dateRealisee: true,
  heureArrivee: true,
  heureDepart: true,
  clientId: true,
  clientNom: true,
  technicienId: true,
  technicienNom: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const interventionClientListSelect = {
  id: true,
  nom: true,
  rue: true,
  codePostal: true,
  ville: true,
  telephone: true,
} as const;

export const interventionTechnicienListSelect = {
  id: true,
  nom: true,
  username: true,
} as const;

export const stockTechnicienMiniSelect = {
  id: true,
  nom: true,
} as const;

export const stockClientMiniSelect = {
  id: true,
  nom: true,
} as const;
