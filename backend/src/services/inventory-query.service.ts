import { prisma } from "../db";

export async function getInventorySessions() {
  return prisma.inventorySession.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });
}

export async function getInventorySessionDetails(id: string) {
  return prisma.inventorySession.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          stock: true,
        },
        orderBy: {
          stock: { nomMateriel: "asc" },
        },
      },
    },
  });
}

export async function findStockByBarcode(codeBarre: string) {
  return prisma.stock.findUnique({
    where: { codeBarre },
  });
}
