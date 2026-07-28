import { prisma } from "../db";

export async function createInventorySession(notes?: string) {
  return prisma.$transaction(async (tx) => {
    const newSession = await tx.inventorySession.create({
      data: {
        status: "draft",
        notes,
        date: new Date(),
      },
    });

    const allStock = await tx.stock.findMany({
      where: { statut: "courant" },
    });

    if (allStock.length > 0) {
      await tx.inventoryItem.createMany({
        data: allStock.map((item) => ({
          sessionId: newSession.id,
          stockId: item.id,
          expectedQuantity: item.quantite,
          countedQuantity: null,
        })),
      });
    }

    return newSession;
  });
}

export async function updateInventorySessionItems(
  sessionId: string,
  items: Array<{ id: string; countedQuantity: number | null; notes?: string }>
) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.inventoryItem.update({
        where: { id: item.id, sessionId },
        data: {
          countedQuantity: item.countedQuantity,
          notes: item.notes,
        },
      })
    )
  );

  await prisma.inventorySession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });
}

export async function finalizeInventorySession(sessionId: string) {
  const session = await prisma.inventorySession.findUnique({
    where: { id: sessionId },
    include: { items: true },
  });

  if (!session) {
    return {
      status: 404 as const,
      body: { error: "Session non trouvée" },
    };
  }

  if (session.status === "completed") {
    return {
      status: 400 as const,
      body: { error: "Session déjà finalisée" },
    };
  }

  const countedItems = session.items.filter((item) => item.countedQuantity !== null);

  // Les articles comptés sont regroupés par quantité constatée : un inventaire
  // porte couramment sur plusieurs centaines de références, et les mettre à jour
  // une par une maintenait la transaction ouverte le temps d'autant d'allers-
  // retours. Les quantités se répétant beaucoup (0, 1, 2…), le regroupement
  // ramène l'opération à quelques requêtes.
  const idsByQuantity = new Map<number, string[]>();
  for (const item of countedItems) {
    const quantity = item.countedQuantity as number;
    const ids = idsByQuantity.get(quantity);
    if (ids) ids.push(item.stockId);
    else idsByQuantity.set(quantity, [item.stockId]);
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventorySession.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    for (const [quantity, stockIds] of idsByQuantity) {
      await tx.stock.updateMany({
        where: { id: { in: stockIds } },
        data: { quantite: quantity },
      });
    }
  });

  return {
    status: 200 as const,
    body: { success: true },
  };
}

export async function deleteInventorySession(sessionId: string) {
  await prisma.inventorySession.delete({
    where: { id: sessionId },
  });
}
