import { prisma } from "../db";
import { interventionTechnicienListSelect } from "../controllers/prisma-selects";

type ClientListInput = {
  search?: unknown;
  skip: number;
  take: number;
};

export async function getClientList(input: ClientListInput) {
  const where = input.search
    ? {
        OR: [
          {
            nom: { contains: input.search as string, mode: "insensitive" as const },
          },
          {
            contact: {
              contains: input.search as string,
              mode: "insensitive" as const,
            },
          },
          { telephone: { contains: input.search as string } },
        ],
      }
    : {};

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: { nom: "asc" },
    }),
    prisma.client.count({ where }),
  ]);

  return { clients, total };
}

export async function getClientDetails(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          interventions: true,
          equipements: true,
        },
      },
    },
  });
}

export async function getClientInterventionList(id: string, limit: number) {
  return prisma.intervention.findMany({
    where: { clientId: id },
    include: {
      technicien: {
        select: interventionTechnicienListSelect,
      },
    },
    orderBy: { datePlanifiee: "desc" },
    take: limit,
  });
}

export async function getClientEquipmentList(id: string) {
  return prisma.clientEquipment.findMany({
    where: { clientId: id },
    include: {
      stock: {
        select: {
          nomMateriel: true,
          reference: true,
          categorie: true,
        },
      },
    },
    orderBy: { dateInstallation: "desc" },
  });
}
