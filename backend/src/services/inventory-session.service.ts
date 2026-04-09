import { prisma } from "../index";

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

  await prisma.$transaction(async (tx) => {
    await tx.inventorySession.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    for (const item of session.items) {
      if (item.countedQuantity !== null) {
        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantite: item.countedQuantity },
        });
      }
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
