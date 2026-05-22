/**
 * Shared constants and utilities for stock/equipment forms.
 * Used by both the admin StockForm and the technician RetraitSerialModal.
 */

/** List of equipment categories available for stock classification. */
export const STOCK_CATEGORIES = [
  "Téléphone IP",
  "Téléphone analogique",
  "Téléphone DECT",
  "Borne DECT IP",
  "Borne DECT Analogique",
  "Téléphone IP DECT",
  "Accessoires DECT",
  "Accessoires Téléphone Fixe",
  "Répéteur DECT",
  "PBX Analogique",
  "PBX IP",
  "Accessoires PBX",
  "Routeur",
  "Accessoires routeur",
  "Onduleur",
  "Accessoires Onduleur",
  "SBC-PC",
  "Cartes SIM",
  "Casque",
  "Switch",
] as const;

/** List of known suppliers. */
export const STOCK_SUPPLIERS = [
  "Amazon",
  "CDiscount",
  "Effiprod",
  "EMG",
  "Francofa",
  "Initio",
  "IP&Go",
  "Itancia",
  "Networth Télécom",
  "Office Easy",
  "OneDirect",
  "Rexel",
  "Unyc",
  "Zicom",
] as const;

/**
 * Sanitizes a string for use in reference codes:
 * removes accents, keeps only letters, uppercases, takes first 3 chars (padded with X).
 */
export function cleanRefSegment(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .substring(0, 3)
    .padEnd(3, "X");
}

/**
 * Generates a reference preview string from brand and category.
 * @param marque - Equipment brand
 * @param categorie - Equipment category
 * @param digits - Optional 5-digit suffix (omit for placeholder "XXXXX")
 */
export function generateReferencePreview(
  marque: string,
  categorie: string,
  digits?: string
): string {
  if (!marque || !categorie) return "";
  return `${cleanRefSegment(marque)}${cleanRefSegment(categorie)}${digits || "XXXXX"}`;
}
