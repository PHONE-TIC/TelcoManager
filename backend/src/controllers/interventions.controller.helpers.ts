import { prisma } from "../db";

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
  return `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function buildFinalInterventionNumero(
  compteur: number,
  year = new Date().getFullYear()
): string {
  return `RDV${year}${compteur.toString().padStart(3, "0")}`;
}

export function isClosedInterventionStatus(statut?: string | null): boolean {
  return statut === "terminee" || statut === "annulee";
}

export function isDateScheduledForToday(datePlanifiee: Date | string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const scheduledDate = new Date(datePlanifiee);
  return scheduledDate >= today && scheduledDate < tomorrow;
}

export function buildInterventionStatusUpdateData(input: {
  statut: string;
  datePriseEnCharge?: string | Date | null;
  commentaireTechnicien?: string | null;
}) {
  const data: Record<string, unknown> = { statut: input.statut };

  if (input.statut === "en_cours" && input.datePriseEnCharge) {
    data.datePriseEnCharge = new Date(input.datePriseEnCharge);
  }

  if (input.statut === "terminee") {
    data.dateRealisee = new Date();
  }

  if (input.commentaireTechnicien) {
    data.commentaireTechnicien = input.commentaireTechnicien;
  }

  return data;
}
