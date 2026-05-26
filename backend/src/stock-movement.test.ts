import { describe, it, expect, vi, beforeEach } from "vitest";
import { transferStockToTechnician } from "./services/stock-movement-write.service";
import { prisma } from "./db";

// Mock the entire db module
vi.mock("./db", () => {
  const mockPrisma = {
    stock: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    technicianStock: {
      upsert: vi.fn(),
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

describe("Stock Movement Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("transferStockToTechnician", () => {
    it("should successfully transfer stock to technician when quantity is sufficient", async () => {
      const mockStock = {
        id: "stock-1",
        nomMateriel: "Cisco IP Phone",
        reference: "CISCO-7945",
        quantite: 10,
        statut: "courant",
      };

      vi.mocked(prisma.stock.findUnique).mockResolvedValue(mockStock as any);
      vi.mocked(prisma.stock.update).mockResolvedValue({ ...mockStock, quantite: 8 } as any);
      vi.mocked(prisma.technicianStock.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({
        id: "m-1",
        stockId: "stock-1",
        type: "transfert",
        quantite: -2,
        quantiteAvant: 10,
        quantiteApres: 8,
      } as any);

      const result = await transferStockToTechnician({
        stockId: "stock-1",
        technicienId: "tech-123",
        quantite: 2,
        performedById: "admin-1",
        reason: "Request",
      });

      expect(prisma.stock.findUnique).toHaveBeenCalledWith({ where: { id: "stock-1" } });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.status).toBe(200);
      if (result.status === 200) {
        expect(result.body.message).toBe("Transfert effectué avec succès");
        expect(result.body.stock.quantite).toBe(8);
        expect(result.body.movement.quantite).toBe(-2);
      }
    });

    it("should return 400 when quantity is insufficient", async () => {
      const mockStock = {
        id: "stock-1",
        nomMateriel: "Cisco IP Phone",
        reference: "CISCO-7945",
        quantite: 1,
        statut: "courant",
      };

      vi.mocked(prisma.stock.findUnique).mockResolvedValue(mockStock as any);

      const result = await transferStockToTechnician({
        stockId: "stock-1",
        technicienId: "tech-123",
        quantite: 5,
        performedById: "admin-1",
      });

      expect(prisma.stock.findUnique).toHaveBeenCalledWith({ where: { id: "stock-1" } });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Quantité insuffisante en stock");
    });

    it("should return 404 when stock item is not found", async () => {
      vi.mocked(prisma.stock.findUnique).mockResolvedValue(null);

      const result = await transferStockToTechnician({
        stockId: "non-existent",
        technicienId: "tech-123",
        quantite: 1,
        performedById: "admin-1",
      });

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Article non trouvé");
    });
  });
});
