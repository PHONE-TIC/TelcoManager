import { prisma } from "../index";

const INTERVENTION_LOCK_DURATION_MS = 5 * 60 * 1000;

export async function getInterventionLockConflict(
  interventionId: string,
  userId: string
) {
  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    select: {
      lockedBy: true,
      lockedAt: true,
    },
  });

  if (!intervention) {
    return { missing: true as const };
  }

  if (
    intervention.lockedBy &&
    intervention.lockedBy !== userId &&
    intervention.lockedAt
  ) {
    const lockExpiresAfter = new Date(
      Date.now() - INTERVENTION_LOCK_DURATION_MS
    );

    if (intervention.lockedAt > lockExpiresAfter) {
      const lockingUser = await prisma.technicien.findUnique({
        where: { id: intervention.lockedBy },
        select: { nom: true },
      });

      return {
        missing: false as const,
        lockedBy: lockingUser?.nom || "Un autre utilisateur",
      };
    }
  }

  return { missing: false as const, lockedBy: null };
}

export async function lockInterventionForUser(
  interventionId: string,
  userId: string
) {
  await prisma.intervention.update({
    where: { id: interventionId },
    data: {
      lockedBy: userId,
      lockedAt: new Date(),
    },
  });
}

export async function unlockInterventionById(interventionId: string) {
  await prisma.intervention.update({
    where: { id: interventionId },
    data: {
      lockedBy: null,
      lockedAt: null,
    },
  });
}
