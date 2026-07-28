import { describe, it, expect, vi, beforeEach } from "vitest";
import { moveStockToHs } from "./services/stock-write.service";
import { prisma } from "./db";

vi.mock("./db", () => {
  const mockPrisma = {
    stock: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

const stockNonSerialise = {
  id: "stock-1",
  nomMateriel: "Switch 8 ports",
  marque: "Netgear",
  modele: "GS108",
  reference: "NETRES00001",
  numeroSerie: "",
  categorie: "Reseau",
  fournisseur: "Distri Telecom",
  statut: "courant",
  quantite: 10,
  notes: null,
};

const stockSerialise = {
  ...stockNonSerialise,
  id: "stock-2",
  numeroSerie: "SN-TEST-001",
  quantite: 1,
};

describe("moveStockToHs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("encapsule l'opération dans une transaction", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockNonSerialise as any);
    vi.mocked(prisma.stock.findFirst).mockResolvedValue({ id: "stock-hs", quantite: 3 } as any);

    const result = await moveStockToHs({ stockId: "stock-1", quantite: 2 });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.status).toBe(200);
  });

  it("bascule un article sérialisé en HS sans créer de seconde ligne", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockSerialise as any);

    const result = await moveStockToHs({ stockId: "stock-2" });

    expect(result.status).toBe(200);
    // Une création dupliquerait le numéro de série et violerait l'index unique partiel.
    expect(prisma.stock.create).not.toHaveBeenCalled();
    expect(prisma.stock.update).toHaveBeenCalledWith({
      where: { id: "stock-2" },
      data: expect.objectContaining({ statut: "hs" }),
    });
  });

  it("refuse le déplacement partiel d'un article sérialisé", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue({
      ...stockSerialise,
      quantite: 3,
    } as any);

    const result = await moveStockToHs({ stockId: "stock-2", quantite: 1 });

    expect(result.status).toBe(400);
    expect(prisma.stock.update).not.toHaveBeenCalled();
  });

  it("conserve les attributs d'origine en créant la ligne HS d'un article non sérialisé", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockNonSerialise as any);
    vi.mocked(prisma.stock.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.stock.create).mockResolvedValue({ id: "stock-hs", quantite: 0 } as any);

    const result = await moveStockToHs({ stockId: "stock-1", quantite: 4 });

    expect(result.status).toBe(200);
    expect(prisma.stock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        marque: "Netgear",
        modele: "GS108",
        fournisseur: "Distri Telecom",
        reference: "NETRES00001",
        statut: "hs",
      }),
    });
  });

  it("journalise un mouvement de stock pour l'audit", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockNonSerialise as any);
    vi.mocked(prisma.stock.findFirst).mockResolvedValue({ id: "stock-hs", quantite: 3 } as any);

    await moveStockToHs({ stockId: "stock-1", quantite: 2, performedById: "admin-1" });

    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "hs",
        quantite: 2,
        quantiteAvant: 3,
        quantiteApres: 5,
        performedById: "admin-1",
      }),
    });
  });

  it("agrège sur la ligne HS existante plutôt que d'en créer une nouvelle", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockNonSerialise as any);
    vi.mocked(prisma.stock.findFirst).mockResolvedValue({ id: "stock-hs", quantite: 3 } as any);

    await moveStockToHs({ stockId: "stock-1", quantite: 2 });

    expect(prisma.stock.create).not.toHaveBeenCalled();
    expect(prisma.stock.update).toHaveBeenCalledWith({
      where: { id: "stock-hs" },
      data: expect.objectContaining({ quantite: { increment: 2 } }),
    });
  });

  it("renvoie 404 pour un article inexistant", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue(null);

    const result = await moveStockToHs({ stockId: "inconnu" });

    expect(result.status).toBe(404);
  });

  it("refuse un article qui n'est pas en stock courant", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue({
      ...stockNonSerialise,
      statut: "hs",
    } as any);

    const result = await moveStockToHs({ stockId: "stock-1" });

    expect(result.status).toBe(400);
  });

  it("refuse une quantité supérieure au stock disponible", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockNonSerialise as any);

    const result = await moveStockToHs({ stockId: "stock-1", quantite: 99 });

    expect(result.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuse une quantité invalide", async () => {
    vi.mocked(prisma.stock.findUnique).mockResolvedValue(stockNonSerialise as any);

    const result = await moveStockToHs({ stockId: "stock-1", quantite: 0 });

    expect(result.status).toBe(400);
  });
});
