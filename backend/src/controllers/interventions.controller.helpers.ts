import { prisma } from "../index";

export async function getTechnicienNomById(
  technicienId?: string | null
): Promise<string | null> {
  if (!technicienId) return null;

  const technicien = await prisma.technicien.findUnique({
    where: { id: technicienId },
    select: { nom: true },
  });

  return technicien?.nom || null;
}

export async function getClientNomById(
  clientId?: string | null
): Promise<string | null> {
  if (!clientId) return null;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { nom: true },
  });

  return client?.nom || null;
}

export function buildTemporaryInterventionNumero(): string {
  return `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function buildFinalInterventionNumero(compteur: number, year = new Date().getFullYear()): string {
  return `RDV${year}${compteur.toString().padStart(3, "0")}`;
}
