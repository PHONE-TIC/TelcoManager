import { describe, it, expect, vi, beforeEach } from "vitest";
import { manageInterventionEquipment } from "./services/intervention-equipment.service";
import { prisma } from "./db";

vi.mock("./db", () => {
  const mockPrisma = {
    intervention: { findUnique: vi.fn() },
    stock: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    clientEquipment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    technicianStock: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    interventionEquipment: { create: vi.fn() },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

const intervention = {
  id: "int-1",
  numero: "RDV2026001",
  clientId: "client-1",
  technicienId: "tech-1",
};

const stockItem = {
  id: "stock-1",
  nomMateriel: "Routeur",
  reference: "RT-01",
  numeroSerie: "SN-001",
  statut: "courant",
  quantite: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.intervention.findUnique).mockResolvedValue(intervention as never);
  vi.mocked(prisma.stock.findMany).mockResolvedValue([] as never);
});

describe("manageInterventionEquipment", () => {
  describe("validation des entrées", () => {
    it("refuse une quantité nulle ou négative", async () => {
      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
        quantite: 0,
      });

      expect(result.status).toBe(400);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("refuse une quantité non entière", async () => {
      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
        quantite: 1.5,
      });

      expect(result.status).toBe(400);
    });

    it("exige au moins un identifiant ou un libellé de matériel", async () => {
      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
      });

      expect(result.status).toBe(400);
    });

    it("renvoie 404 pour une intervention inexistante", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue(null);

      const result = await manageInterventionEquipment({
        interventionId: "inconnue",
        action: "install",
        stockId: "stock-1",
      });

      expect(result.status).toBe(404);
    });
  });

  describe("normalisation du numéro de série", () => {
    it("enregistre le numéro de série sous sa forme canonique lors d'un retrait libre", async () => {
      vi.mocked(prisma.stock.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.stock.create).mockResolvedValue({ id: "stock-new" } as never);

      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        marque: "Netgear",
        modele: "GS108",
        categorie: "Reseau",
        reference: "REF-1",
        serialNumber: "  sn-retrait-9  ",
      });

      expect(prisma.stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ numeroSerie: "SN-RETRAIT-9" }),
      });
    });

    it("trace le numéro de série normalisé sur la ligne d'équipement", async () => {
      vi.mocked(prisma.stock.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.stock.create).mockResolvedValue({ id: "stock-new" } as never);

      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        marque: "Netgear",
        modele: "GS108",
        categorie: "Reseau",
        reference: "REF-1",
        serialNumber: " sn-retrait-9 ",
      });

      expect(prisma.interventionEquipment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ serialNumber: "SN-RETRAIT-9" }),
      });
    });

    it("rapproche une saisie du matériel déjà connu malgré casse et espaces", async () => {
      // C'est ce rapprochement qui empêche la création d'un doublon de stock.
      vi.mocked(prisma.stock.findFirst).mockResolvedValue(stockItem as never);
      vi.mocked(prisma.clientEquipment.findFirst).mockResolvedValue(null);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        marque: "Netgear",
        modele: "GS108",
        serialNumber: "  sn-001  ",
      });

      expect(prisma.stock.findFirst).toHaveBeenCalledWith({
        where: { numeroSerie: { equals: "SN-001", mode: "insensitive" } },
      });
      // Matériel connu mais non installé chez ce client : le retrait est refusé.
      expect(result.status).toBe(400);
      expect(prisma.stock.create).not.toHaveBeenCalled();
    });

    it("enregistre une chaîne vide quand aucun numéro de série n'est saisi", async () => {
      vi.mocked(prisma.stock.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.stock.create).mockResolvedValue({ id: "stock-new" } as never);

      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        marque: "Netgear",
        modele: "GS108",
        categorie: "Reseau",
        reference: "REF-1",
      });

      expect(prisma.stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ numeroSerie: "" }),
      });
    });
  });

  describe("installation", () => {
    it("exige un identifiant de stock", async () => {
      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        nom: "Routeur",
      });

      expect(result.status).toBe(400);
    });

    it("renvoie 404 si l'article n'existe pas", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue(null);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
      });

      expect(result.status).toBe(404);
    });

    it("refuse d'installer un matériel hors service", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue({
        ...stockItem,
        statut: "hs",
      } as never);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
      });

      expect(result.status).toBe(400);
      expect(result.body).toHaveProperty("error");
    });

    it("refuse d'installer sans technicien assigné à l'intervention", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        ...intervention,
        technicienId: null,
      } as never);
      vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockItem as never);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
      });

      expect(result.status).toBe(400);
    });

    it("refuse d'installer si le stock du véhicule est insuffisant", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockItem as never);
      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue({
        id: "ts-1",
        quantite: 1,
      } as never);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
        quantite: 3,
      });

      expect(result.status).toBe(400);
      expect(prisma.clientEquipment.create).not.toHaveBeenCalled();
    });

    it("décrémente le stock véhicule et installe chez le client", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockItem as never);
      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue({
        id: "ts-1",
        quantite: 5,
      } as never);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
        quantite: 2,
      });

      expect(result.status).toBe(201);
      expect(prisma.technicianStock.update).toHaveBeenCalledWith({
        where: { id: "ts-1" },
        data: { quantite: { decrement: 2 } },
      });
      expect(prisma.clientEquipment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: "client-1",
          stockId: "stock-1",
          statut: "installe",
        }),
      });
    });

    it("supprime la ligne de stock véhicule une fois épuisée", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockItem as never);
      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue({
        id: "ts-1",
        quantite: 2,
      } as never);

      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
        quantite: 2,
      });

      expect(prisma.technicianStock.delete).toHaveBeenCalledWith({ where: { id: "ts-1" } });
      expect(prisma.technicianStock.update).not.toHaveBeenCalled();
    });

    it("n'écrit rien en mode simulation", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockItem as never);
      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue({
        id: "ts-1",
        quantite: 5,
      } as never);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "install",
        stockId: "stock-1",
        dryRun: true,
      });

      expect(result.status).toBe(200);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.clientEquipment.create).not.toHaveBeenCalled();
    });
  });

  describe("retrait d'un matériel connu du catalogue", () => {
    beforeEach(() => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockItem as never);
      vi.mocked(prisma.stock.findFirst).mockResolvedValue(null);
    });

    it("refuse le retrait d'un matériel non installé chez ce client", async () => {
      vi.mocked(prisma.clientEquipment.findFirst).mockResolvedValue(null);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        stockId: "stock-1",
      });

      expect(result.status).toBe(400);
    });

    it("marque l'équipement client comme retiré et le remonte dans le véhicule", async () => {
      vi.mocked(prisma.clientEquipment.findFirst).mockResolvedValue({
        id: "ce-1",
      } as never);

      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        stockId: "stock-1",
        etat: "ok",
      });

      expect(result.status).toBe(201);
      expect(prisma.clientEquipment.update).toHaveBeenCalledWith({
        where: { id: "ce-1" },
        data: expect.objectContaining({ statut: "retire" }),
      });
      expect(prisma.technicianStock.upsert).toHaveBeenCalled();
    });

    it("bascule l'équipement client en HS quand le matériel est repris défectueux", async () => {
      vi.mocked(prisma.clientEquipment.findFirst).mockResolvedValue({
        id: "ce-1",
      } as never);

      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        stockId: "stock-1",
        etat: "hs",
      });

      expect(prisma.clientEquipment.update).toHaveBeenCalledWith({
        where: { id: "ce-1" },
        data: expect.objectContaining({ statut: "hs" }),
      });
    });

    it("retourne le matériel au stock central en l'absence de technicien assigné", async () => {
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
        ...intervention,
        technicienId: null,
      } as never);
      vi.mocked(prisma.clientEquipment.findFirst).mockResolvedValue({
        id: "ce-1",
      } as never);

      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        stockId: "stock-1",
        etat: "ok",
        quantite: 2,
      });

      expect(prisma.technicianStock.upsert).not.toHaveBeenCalled();
      expect(prisma.stock.update).toHaveBeenCalledWith({
        where: { id: "stock-1" },
        data: { quantite: { increment: 2 } },
      });
    });
  });

  describe("retrait d'un matériel hors catalogue", () => {
    beforeEach(() => {
      vi.mocked(prisma.stock.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.stock.create).mockResolvedValue({ id: "stock-new" } as never);
    });

    it("crée l'article à quantité nulle et le porte au stock du technicien", async () => {
      // La quantité reste à zéro sur la fiche catalogue : l'unité reprise est
      // détenue par le véhicule du technicien, pas par l'entrepôt.
      const result = await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        marque: "Netgear",
        modele: "GS108",
        categorie: "Reseau",
        reference: "REF-1",
      });

      expect(result.status).toBe(201);
      expect(prisma.stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ quantite: 0, statut: "courant" }),
      });
      expect(prisma.technicianStock.upsert).toHaveBeenCalled();
    });

    it("crée l'article directement en HS quand le matériel repris est défectueux", async () => {
      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        marque: "Netgear",
        modele: "GS108",
        categorie: "Reseau",
        reference: "REF-1",
        etat: "hs",
      });

      expect(prisma.stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ statut: "hs" }),
      });
    });

    it("compose un libellé à partir de la marque et du modèle en l'absence de nom", async () => {
      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        marque: "Netgear",
        modele: "GS108",
        categorie: "Reseau",
        reference: "REF-1",
      });

      expect(prisma.stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ nomMateriel: "Netgear GS108" }),
      });
    });

    it("rattache l'opération à l'intervention d'origine dans les notes", async () => {
      await manageInterventionEquipment({
        interventionId: "int-1",
        action: "retrait",
        marque: "Netgear",
        modele: "GS108",
        categorie: "Reseau",
        reference: "REF-1",
      });

      const call = vi.mocked(prisma.stock.create).mock.calls[0][0];
      expect((call.data as { notes: string }).notes).toContain("RDV2026001");
    });
  });
});
