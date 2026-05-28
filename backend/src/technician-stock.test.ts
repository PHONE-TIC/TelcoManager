import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addTechnicianStockItem,
  updateTechnicianStockItem,
  transferHsTechnicianStockToGeneralStock,
} from "./services/technician-stock.service";
import { prisma } from "./db";

// Mock the entire db module
vi.mock("./db", () => {
  const mockPrisma = {
    stock: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
    },
    technicianStock: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return {
    prisma: mockPrisma,
  };
});

describe("Technician Stock Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addTechnicianStockItem (P3 Atomic Decrement)", () => {
    it("should return 400 if stockId is missing", async () => {
      const result = await addTechnicianStockItem({
        technicienId: "tech-1",
        quantite: 5,
      });
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("stockId est requis");
    });

    it("should return 400 if quantity is zero or negative", async () => {
      const result = await addTechnicianStockItem({
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: -2,
      });
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("La quantité doit être supérieure à 0");
    });

    it("should atomically decrement stock and add to vehicle when stock is sufficient", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue({ id: "stock-1", quantite: 10 } as any);
      vi.mocked(prisma.stock.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.stock.findUniqueOrThrow).mockResolvedValue({ id: "stock-1", quantite: 8 } as any);
      vi.mocked(prisma.technicianStock.upsert).mockResolvedValue({ id: "t-stock-1", quantite: 2 } as any);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({ id: "m-1" } as any);

      const result = await addTechnicianStockItem({
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: 2,
      });

      expect(prisma.stock.updateMany).toHaveBeenCalledWith({
        where: { id: "stock-1", quantite: { gte: 2 } },
        data: { quantite: { decrement: 2 } },
      });
      expect(prisma.technicianStock.upsert).toHaveBeenCalled();
      expect(prisma.stockMovement.create).toHaveBeenCalled();
      expect(result.status).toBe(201);
    });

    it("should return 400 when stock is insufficient", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue({ id: "stock-1", quantite: 1 } as any);
      vi.mocked(prisma.stock.updateMany).mockResolvedValue({ count: 0 } as any); // atomic check failure

      const result = await addTechnicianStockItem({
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: 5,
      });

      expect(prisma.stock.updateMany).toHaveBeenCalled();
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Quantité insuffisante en stock");
    });
  });

  describe("updateTechnicianStockItem (P1 Validation & P3 Atomic Adjustments)", () => {
    it("should reject negative or non-integer quantities", async () => {
      const result1 = await updateTechnicianStockItem({
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: -5,
      });
      expect(result1.status).toBe(400);
      expect(result1.body.error).toBe("Quantité invalide");

      const result2 = await updateTechnicianStockItem({
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: 2.5,
      });
      expect(result2.status).toBe(400);
      expect(result2.body.error).toBe("Quantité invalide");
    });

    it("should atomically check and decrement warehouse stock when increasing vehicle stock", async () => {
      // current tech stock = 2, target newQty = 5 (diff = 3)
      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue({ technicienId: "tech-1", stockId: "stock-1", quantite: 2 } as any);
      vi.mocked(prisma.stock.findUnique).mockResolvedValue({ id: "stock-1", quantite: 10 } as any);
      vi.mocked(prisma.stock.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.stock.findUniqueOrThrow).mockResolvedValue({ id: "stock-1", quantite: 7 } as any);
      vi.mocked(prisma.technicianStock.upsert).mockResolvedValue({ id: "t-stock-1", quantite: 5 } as any);

      const result = await updateTechnicianStockItem({
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: 5,
      });

      expect(prisma.stock.updateMany).toHaveBeenCalledWith({
        where: { id: "stock-1", quantite: { gte: 3 } },
        data: { quantite: { decrement: 3 } },
      });
      expect(result.status).toBe(200);
    });

    it("should atomically increment warehouse stock when returning vehicle stock", async () => {
      // current tech stock = 5, target newQty = 2 (diff = 3 returned)
      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue({ technicienId: "tech-1", stockId: "stock-1", quantite: 5 } as any);
      vi.mocked(prisma.stock.findUnique).mockResolvedValue({ id: "stock-1", quantite: 10 } as any);
      vi.mocked(prisma.stock.update).mockResolvedValue({ id: "stock-1", quantite: 13 } as any);
      vi.mocked(prisma.technicianStock.update).mockResolvedValue({ id: "t-stock-1", quantite: 2 } as any);

      const result = await updateTechnicianStockItem({
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: 2,
      });

      expect(prisma.stock.update).toHaveBeenCalledWith({
        where: { id: "stock-1" },
        data: { quantite: { increment: 3 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          quantite: 3,
          quantiteAvant: 10,
          quantiteApres: 13,
        }),
      }));
      expect(result.status).toBe(200);
    });
  });

  describe("transferHsTechnicianStockToGeneralStock (P2 HS Return Logics)", () => {
    it("should return 404 if item is not found in vehicle", async () => {
      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue(null);

      const result = await transferHsTechnicianStockToGeneralStock({
        technicienId: "tech-1",
        stockId: "stock-1",
      });

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Article non trouvé");
    });

    it("should return 400 if item is not in HS state", async () => {
      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue({
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: 2,
        etat: "ok",
      } as any);

      const result = await transferHsTechnicianStockToGeneralStock({
        technicienId: "tech-1",
        stockId: "stock-1",
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Seul le matériel HS peut être transféré");
    });

    it("should use Option A (Serialized) if the item has a serial number", async () => {
      const mockTechStock = {
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: 1,
        etat: "hs",
        stock: { id: "stock-1", numeroSerie: "SN-999-XYZ", nomMateriel: "Mat" },
        technicien: { nom: "John Doe" },
      };

      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue(mockTechStock as any);
      vi.mocked(prisma.stock.findUniqueOrThrow).mockResolvedValue({ id: "stock-1", quantite: 10 } as any);

      const result = await transferHsTechnicianStockToGeneralStock({
        technicienId: "tech-1",
        stockId: "stock-1",
      });

      // Assert vehicle stock line is deleted
      expect(prisma.technicianStock.delete).toHaveBeenCalled();
      // Assert central stock line is marked HS and incremented by real quantity (1)
      expect(prisma.stock.update).toHaveBeenCalledWith({
        where: { id: "stock-1" },
        data: {
          statut: "hs",
          quantite: { increment: 1 },
        },
      });
      // Assert movement tracks actual quantity (1) instead of hardcoded constant
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          stockId: "stock-1",
          type: "hs",
          quantite: 1,
          quantiteAvant: 10,
          quantiteApres: 11,
        }),
      }));
      expect(result.status).toBe(200);
    });

    it("should use Option B (Non-serialized separation) if the item is generic", async () => {
      const mockTechStock = {
        technicienId: "tech-1",
        stockId: "stock-1",
        quantite: 5,
        etat: "hs",
        stock: { id: "stock-1", numeroSerie: "", nomMateriel: "Generic RJ45", reference: "RJ45", categorie: "Cables" },
        technicien: { nom: "John Doe" },
      };

      vi.mocked(prisma.technicianStock.findUnique).mockResolvedValue(mockTechStock as any);
      // original stock line has 10 units (which are functional "courant")
      vi.mocked(prisma.stock.findUniqueOrThrow).mockResolvedValue({ id: "stock-1", reference: "RJ45", nomMateriel: "Generic RJ45", quantite: 10 } as any);
      // findFirst returns null (no separate HS line exists yet)
      vi.mocked(prisma.stock.findFirst).mockResolvedValue(null);
      // mock creation of separate HS stock line
      vi.mocked(prisma.stock.create).mockResolvedValue({ id: "stock-hs-line", reference: "RJ45", nomMateriel: "Generic RJ45", quantite: 0 } as any);

      const result = await transferHsTechnicianStockToGeneralStock({
        technicienId: "tech-1",
        stockId: "stock-1",
      });

      // Assert vehicle line deleted
      expect(prisma.technicianStock.delete).toHaveBeenCalled();
      // Assert separate HS line is created with quantity 0
      expect(prisma.stock.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          nomMateriel: "Generic RJ45",
          reference: "RJ45",
          statut: "hs",
          quantite: 0,
        }),
      }));
      // Assert separate HS line is incremented by real quantity (5)
      expect(prisma.stock.update).toHaveBeenCalledWith({
        where: { id: "stock-hs-line" },
        data: { quantite: { increment: 5 } },
      });
      // Assert movement records on HS stock line with real quantity (5)
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          stockId: "stock-hs-line",
          type: "hs",
          quantite: 5,
          quantiteAvant: 0,
          quantiteApres: 5,
        }),
      }));
      expect(result.status).toBe(200);
    });
  });
});
