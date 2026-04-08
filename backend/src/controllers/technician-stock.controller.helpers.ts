import { prisma } from "../index";

export function getTechnicianStockWhere(technicienId: string, stockId: string) {
  return {
    technicienId_stockId: {
      technicienId,
      stockId,
    },
  } as const;
}

export async function findTechnicianStockItem(
  technicienId: string,
  stockId: string
) {
  return prisma.technicianStock.findUnique({
    where: getTechnicianStockWhere(technicienId, stockId),
  });
}
