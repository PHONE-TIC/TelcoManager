import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInventorySession,
  updateInventorySessionItems,
  finalizeInventorySession,
} from "./services/inventory-session.service";
import { prisma } from "./db";

vi.mock("./db", () => {
  const mockPrisma = {
    inventorySession: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    inventoryItem: { createMany: vi.fn(), update: vi.fn() },
    stock: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((arg) =>
      typeof arg === "function" ? arg(mockPrisma) : Promise.all(arg)
    ),
  };
  return { prisma: mockPrisma };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInventorySession", () => {
  it("pré-remplit la session avec le stock courant et sa quantité théorique", async () => {
    vi.mocked(prisma.inventorySession.create).mockResolvedValue({
      id: "session-1",
    } as never);
    vi.mocked(prisma.stock.findMany).mockResolvedValue([
      { id: "stock-1", quantite: 5 },
      { id: "stock-2", quantite: 0 },
    ] as never);

    await createInventorySession("Inventaire trimestriel");

    expect(prisma.stock.findMany).toHaveBeenCalledWith({
      where: { statut: "courant" },
    });
    expect(prisma.inventoryItem.createMany).toHaveBeenCalledWith({
      data: [
        { sessionId: "session-1", stockId: "stock-1", expectedQuantity: 5, countedQuantity: null },
        { sessionId: "session-1", stockId: "stock-2", expectedQuantity: 0, countedQuantity: null },
      ],
    });
  });

  it("n'inclut pas le stock hors service dans le périmètre à compter", async () => {
    vi.mocked(prisma.inventorySession.create).mockResolvedValue({
      id: "session-1",
    } as never);
    vi.mocked(prisma.stock.findMany).mockResolvedValue([] as never);

    await createInventorySession();

    expect(prisma.stock.findMany).toHaveBeenCalledWith({
      where: { statut: "courant" },
    });
  });

  it("crée une session vide sans échouer quand le stock est vide", async () => {
    vi.mocked(prisma.inventorySession.create).mockResolvedValue({
      id: "session-1",
    } as never);
    vi.mocked(prisma.stock.findMany).mockResolvedValue([] as never);

    await createInventorySession();

    expect(prisma.inventoryItem.createMany).not.toHaveBeenCalled();
  });

  it("ouvre la session à l'état brouillon", async () => {
    vi.mocked(prisma.inventorySession.create).mockResolvedValue({
      id: "session-1",
    } as never);
    vi.mocked(prisma.stock.findMany).mockResolvedValue([] as never);

    await createInventorySession();

    expect(prisma.inventorySession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "draft" }),
    });
  });
});

describe("updateInventorySessionItems", () => {
  it("cloisonne chaque mise à jour à la session concernée", async () => {
    // Le sessionId dans la clause where empêche de modifier par erreur
    // la ligne d'une autre session en ne connaissant que son identifiant.
    await updateInventorySessionItems("session-1", [
      { id: "item-1", countedQuantity: 3 },
      { id: "item-2", countedQuantity: null, notes: "Introuvable" },
    ]);

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1", sessionId: "session-1" },
      data: { countedQuantity: 3, notes: undefined },
    });
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "item-2", sessionId: "session-1" },
      data: { countedQuantity: null, notes: "Introuvable" },
    });
  });

  it("applique les comptages dans une transaction unique", async () => {
    await updateInventorySessionItems("session-1", [
      { id: "item-1", countedQuantity: 1 },
    ]);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("finalizeInventorySession", () => {
  it("renvoie 404 pour une session inexistante", async () => {
    vi.mocked(prisma.inventorySession.findUnique).mockResolvedValue(null);

    const result = await finalizeInventorySession("inconnue");

    expect(result.status).toBe(404);
  });

  it("refuse de finaliser une session déjà clôturée", async () => {
    vi.mocked(prisma.inventorySession.findUnique).mockResolvedValue({
      id: "session-1",
      status: "completed",
      items: [],
    } as never);

    const result = await finalizeInventorySession("session-1");

    expect(result.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("aligne le stock sur les quantités réellement comptées", async () => {
    vi.mocked(prisma.inventorySession.findUnique).mockResolvedValue({
      id: "session-1",
      status: "draft",
      items: [
        { stockId: "stock-1", countedQuantity: 3 },
        { stockId: "stock-2", countedQuantity: 0 },
      ],
    } as never);

    const result = await finalizeInventorySession("session-1");

    expect(result.status).toBe(200);
    expect(prisma.stock.update).toHaveBeenCalledWith({
      where: { id: "stock-1" },
      data: { quantite: 3 },
    });
    // Un comptage à zéro est une information, pas une absence de comptage.
    expect(prisma.stock.update).toHaveBeenCalledWith({
      where: { id: "stock-2" },
      data: { quantite: 0 },
    });
  });

  it("laisse intact le stock des articles non comptés", async () => {
    vi.mocked(prisma.inventorySession.findUnique).mockResolvedValue({
      id: "session-1",
      status: "draft",
      items: [
        { stockId: "stock-1", countedQuantity: null },
        { stockId: "stock-2", countedQuantity: 4 },
      ],
    } as never);

    await finalizeInventorySession("session-1");

    expect(prisma.stock.update).toHaveBeenCalledTimes(1);
    expect(prisma.stock.update).toHaveBeenCalledWith({
      where: { id: "stock-2" },
      data: { quantite: 4 },
    });
  });

  it("marque la session comme clôturée", async () => {
    vi.mocked(prisma.inventorySession.findUnique).mockResolvedValue({
      id: "session-1",
      status: "draft",
      items: [],
    } as never);

    await finalizeInventorySession("session-1");

    expect(prisma.inventorySession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { status: "completed" },
    });
  });
});
