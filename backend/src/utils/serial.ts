/**
 * Normalisation centralisée des numéros de série.
 *
 * Tous les flux d'écriture (création manuelle, import CSV, retrait d'intervention,
 * transfert HS) doivent passer par ce helper. Sans cela, deux saisies du même
 * matériel physique (" sn123 " et "SN123") créent deux lignes de stock distinctes :
 * l'index unique partiel PostgreSQL porte sur lower(numero_serie) et ne fait pas
 * de trim, il ne rattrape donc pas les espaces parasites.
 */
export function normalizeSerialNumber(value?: string | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().toUpperCase();
}

/**
 * Découpe une saisie multi-séries (séparateurs virgule ou retour ligne) et
 * normalise chaque entrée. Les valeurs vides sont écartées.
 */
export function parseSerialNumbers(numeroSerie?: string | null): string[] {
  if (numeroSerie === null || numeroSerie === undefined) {
    return [];
  }
  return String(numeroSerie)
    .split(/[,\n]/)
    .map((value) => normalizeSerialNumber(value))
    .filter((value) => value.length > 0);
}
