import { prisma } from "../index";

export function normalizeReferenceSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .substring(0, 3)
    .padEnd(3, "X");
}

export async function generateStockReference(
  marque: string,
  categorie: string,
  modele?: string | null
): Promise<string> {
  const existingItem = await prisma.stock.findFirst({
    where: {
      marque: { equals: marque, mode: "insensitive" },
      categorie: { equals: categorie, mode: "insensitive" },
      ...(modele
        ? { modele: { equals: modele, mode: "insensitive" } }
        : { OR: [{ modele: null }, { modele: "" }] }),
    },
    select: { reference: true },
    orderBy: { createdAt: "asc" },
  });

  if (existingItem?.reference) {
    return existingItem.reference;
  }

  const prefix = `${normalizeReferenceSegment(marque)}${normalizeReferenceSegment(
    categorie
  )}`;

  const existingRefs = await prisma.stock.findMany({
    where: {
      reference: {
        startsWith: prefix,
      },
    },
    select: { reference: true },
    orderBy: { reference: "desc" },
    take: 100,
  });

  let maxNumber = 0;
  for (const item of existingRefs) {
    const numPart = item.reference.substring(prefix.length);
    const num = parseInt(numPart, 10);
    if (!Number.isNaN(num) && num > maxNumber) {
      maxNumber = num;
    }
  }

  return `${prefix}${String(maxNumber + 1).padStart(5, "0")}`;
}

export function parseSerialNumbers(numeroSerie?: string | null) {
  return numeroSerie
    ? String(numeroSerie)
        .split(/[,\n]/)
        .map((value: string) => value.trim())
        .filter((value: string) => value.length > 0)
    : [];
}
