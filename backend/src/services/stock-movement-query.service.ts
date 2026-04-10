import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  stockMovementStockSelect,
  stockMovementUserSelect,
} from "../controllers/stock-movement.constants";

function parseNonNegativeInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function getStockMovementList(input: {
  stockId: string;
  limit?: unknown;
  offset?: unknown;
}) {
  const limit = parseNonNegativeInteger(input.limit, 50);
  const offset = parseNonNegativeInteger(input.offset, 0);

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { stockId: input.stockId },
      include: {
        performedBy: {
          select: stockMovementUserSelect,
        },
        technicien: {
          select: stockMovementUserSelect,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.stockMovement.count({
      where: { stockId: input.stockId },
    }),
  ]);

  return {
    movements,
    total,
    limit,
    offset,
  };
}

export async function getAllStockMovementList(input: {
  limit?: unknown;
  offset?: unknown;
  type?: unknown;
  stockId?: unknown;
  startDate?: unknown;
  endDate?: unknown;
}) {
  const limit = parseNonNegativeInteger(input.limit, 100);
  const offset = parseNonNegativeInteger(input.offset, 0);
  const where: Prisma.StockMovementWhereInput = {};

  if (input.type) where.type = input.type;
  if (input.stockId) where.stockId = input.stockId;
  if (input.startDate || input.endDate) {
    where.createdAt = {};
    if (input.startDate) where.createdAt.gte = new Date(input.startDate as string);
    if (input.endDate) where.createdAt.lte = new Date(input.endDate as string);
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        stock: {
          select: stockMovementStockSelect,
        },
        performedBy: {
          select: stockMovementUserSelect,
        },
        technicien: {
          select: stockMovementUserSelect,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    movements,
    total,
    limit,
    offset,
  };
}
