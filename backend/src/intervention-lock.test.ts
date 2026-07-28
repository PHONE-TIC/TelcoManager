import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getInterventionLockConflict,
  lockInterventionForUser,
  unlockInterventionById,
} from "./services/intervention-lock.service";
import { prisma } from "./db";

vi.mock("./db", () => ({
  prisma: {
    intervention: { findUnique: vi.fn(), update: vi.fn() },
    technicien: { findUnique: vi.fn() },
  },
}));

const LOCK_DURATION_MS = 5 * 60 * 1000;
const NOW = new Date("2026-07-28T12:00:00.000Z");

describe("Verrous d'édition d'intervention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getInterventionLockConflict", () => {
    it("signale une intervention inexistante", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue(null);

      const result = await getInterventionLockConflict("inconnue", "user-1");

      expect(result.missing).toBe(true);
    });

    it("ne signale aucun conflit sur une intervention non verrouillée", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        lockedBy: null,
        lockedAt: null,
      } as never);

      const result = await getInterventionLockConflict("int-1", "user-1");

      expect(result).toEqual({ missing: false, lockedBy: null });
    });

    it("ne signale aucun conflit quand l'utilisateur détient déjà le verrou", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        lockedBy: "user-1",
        lockedAt: new Date(NOW.getTime() - 1000),
      } as never);

      const result = await getInterventionLockConflict("int-1", "user-1");

      expect(result.lockedBy).toBeNull();
    });

    it("signale le conflit en nommant le détenteur du verrou", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        lockedBy: "user-2",
        lockedAt: new Date(NOW.getTime() - 60 * 1000),
      } as never);
      vi.mocked(prisma.technicien.findUnique).mockResolvedValue({
        nom: "Jean Technicien",
      } as never);

      const result = await getInterventionLockConflict("int-1", "user-1");

      expect(result).toEqual({ missing: false, lockedBy: "Jean Technicien" });
    });

    it("reste explicite si le détenteur du verrou est introuvable", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        lockedBy: "user-supprime",
        lockedAt: new Date(NOW.getTime() - 60 * 1000),
      } as never);
      vi.mocked(prisma.technicien.findUnique).mockResolvedValue(null);

      const result = await getInterventionLockConflict("int-1", "user-1");

      expect(result.lockedBy).toBe("Un autre utilisateur");
    });

    it("libère un verrou expiré", async () => {
      // Au-delà de la durée de validité, le verrou ne doit plus bloquer :
      // sinon une session interrompue gèlerait la fiche indéfiniment.
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        lockedBy: "user-2",
        lockedAt: new Date(NOW.getTime() - LOCK_DURATION_MS - 1000),
      } as never);

      const result = await getInterventionLockConflict("int-1", "user-1");

      expect(result.lockedBy).toBeNull();
      expect(prisma.technicien.findUnique).not.toHaveBeenCalled();
    });

    it("maintient le verrou juste avant son expiration", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        lockedBy: "user-2",
        lockedAt: new Date(NOW.getTime() - LOCK_DURATION_MS + 1000),
      } as never);
      vi.mocked(prisma.technicien.findUnique).mockResolvedValue({
        nom: "Jean",
      } as never);

      const result = await getInterventionLockConflict("int-1", "user-1");

      expect(result.lockedBy).toBe("Jean");
    });

    it("ignore un verrou sans horodatage", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        lockedBy: "user-2",
        lockedAt: null,
      } as never);

      const result = await getInterventionLockConflict("int-1", "user-1");

      expect(result.lockedBy).toBeNull();
    });
  });

  describe("lockInterventionForUser", () => {
    it("pose le verrou au nom de l'utilisateur et horodate la prise", async () => {
      await lockInterventionForUser("int-1", "user-1");

      expect(prisma.intervention.update).toHaveBeenCalledWith({
        where: { id: "int-1" },
        data: { lockedBy: "user-1", lockedAt: NOW },
      });
    });
  });

  describe("unlockInterventionById", () => {
    it("efface le détenteur et l'horodatage", async () => {
      await unlockInterventionById("int-1");

      expect(prisma.intervention.update).toHaveBeenCalledWith({
        where: { id: "int-1" },
        data: { lockedBy: null, lockedAt: null },
      });
    });
  });
});
