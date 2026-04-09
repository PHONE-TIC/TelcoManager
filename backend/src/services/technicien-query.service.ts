import { prisma } from "../db";
import { interventionClientListSelect } from "../controllers/prisma-selects";

type TechnicienListInput = {
  active?: unknown;
  skip: number;
  take: number;
};

export async function getTechnicienList(input: TechnicienListInput) {
  const where = input.active !== undefined ? { active: input.active === "true" } : {};

  const [techniciens, total] = await Promise.all([
    prisma.technicien.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: { nom: "asc" },
      select: {
        id: true,
        nom: true,
        username: true,
        role: true,
        active: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: {
            interventions: true,
          },
        },
      },
    }),
    prisma.technicien.count({ where }),
  ]);

  return { techniciens, total };
}

export async function getTechnicienDetails(id: string) {
  return prisma.technicien.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      username: true,
      role: true,
      active: true,
      lastLogin: true,
      createdAt: true,
      _count: {
        select: {
          interventions: true,
        },
      },
      activityLogs: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getTechnicienPlanningList(input: {
  id: string;
  startDate?: unknown;
  endDate?: unknown;
}) {
  const where: {
    technicienId: string;
    datePlanifiee?: { gte?: Date; lte?: Date };
  } = {
    technicienId: input.id,
  };

  if (input.startDate && input.endDate) {
    where.datePlanifiee = {
      gte: new Date(input.startDate as string),
      lte: new Date(input.endDate as string),
    };
  }

  return prisma.intervention.findMany({
    where,
    include: {
      client: {
        select: interventionClientListSelect,
      },
    },
    orderBy: { datePlanifiee: "asc" },
  });
}
