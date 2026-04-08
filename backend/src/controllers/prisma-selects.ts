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
