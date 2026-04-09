import { prisma } from "../index";
import {
  findTechnicianStockItem,
  getTechnicianStockWhere,
} from "../controllers/technician-stock.controller.helpers";

export async function addTechnicianStockItem(input: {
  technicienId: string;
  stockId?: string;
  quantite?: number;
}) {
  if (!input.stockId) {
    return { status: 400 as const, body: { error: "stockId est requis" } };
  }

  const existing = await findTechnicianStockItem(input.technicienId, input.stockId);

  if (existing) {
    const updated = await prisma.technicianStock.update({
      where: getTechnicianStockWhere(input.technicienId, input.stockId),
      data: {
        quantite: existing.quantite + (input.quantite || 1),
      },
      include: {
        stock: true,
      },
    });

    return { status: 200 as const, body: updated };
  }

  const vehicleItem = await prisma.technicianStock.create({
    data: {
      technicienId: input.technicienId,
      stockId: input.stockId,
      quantite: input.quantite || 1,
    },
    include: {
      stock: true,
    },
  });

  return { status: 201 as const, body: vehicleItem };
}

export async function updateTechnicianStockItem(input: {
  technicienId: string;
  stockId: string;
  quantite: number;
  etat?: string;
}) {
  if (input.quantite <= 0) {
    await prisma.technicianStock.delete({
      where: getTechnicianStockWhere(input.technicienId, input.stockId),
    });

    return {
      status: 200 as const,
      body: { message: "Matériel retiré du véhicule" },
    };
  }

  const updated = await prisma.technicianStock.update({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    data: {
      quantite: input.quantite,
      ...(input.etat && { etat: input.etat }),
    },
    include: {
      stock: true,
    },
  });

  return { status: 200 as const, body: updated };
}

export async function assignTechnicianStockToClient(input: {
  technicienId: string;
  stockId: string;
  clientId?: string;
}) {
  if (!input.clientId) {
    return { status: 400 as const, body: { error: "clientId est requis" } };
  }

  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) {
    return { status: 404 as const, body: { error: "Client non trouvé" } };
  }

  const updated = await prisma.technicianStock.update({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    data: {
      clientId: input.clientId,
      assignedAt: new Date(),
    },
    include: {
      stock: true,
      client: true,
    },
  });

  await prisma.stockMovement.create({
    data: {
      stockId: input.stockId,
      type: "sortie",
      quantite: -1,
      quantiteAvant: 1,
      quantiteApres: 0,
      reason: `Assigné au client: ${client.nom}`,
      technicienId: input.technicienId,
      performedById: input.technicienId,
    },
  });

  return {
    status: 200 as const,
    body: { message: "Matériel assigné au client", item: updated },
  };
}

export async function retrieveTechnicianStockFromClient(input: {
  technicienId: string;
  stockId: string;
  etat?: string;
}) {
  if (!input.etat || !["ok", "hs"].includes(input.etat)) {
    return {
      status: 400 as const,
      body: { error: "etat doit être 'ok' ou 'hs'" },
    };
  }

  const current = await prisma.technicianStock.findUnique({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    include: { client: true, stock: true },
  });

  if (!current) {
    return {
      status: 404 as const,
      body: { error: "Article non trouvé dans le stock technicien" },
    };
  }

  const clientNom = current.client?.nom || "Client inconnu";
  const updated = await prisma.technicianStock.update({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    data: {
      clientId: null,
      assignedAt: null,
      etat: input.etat,
    },
    include: {
      stock: true,
    },
  });

  await prisma.stockMovement.create({
    data: {
      stockId: input.stockId,
      type: "entree",
      quantite: 1,
      quantiteAvant: 0,
      quantiteApres: 1,
      reason: `Repris du client: ${clientNom} (état: ${input.etat.toUpperCase()})`,
      technicienId: input.technicienId,
      performedById: input.technicienId,
    },
  });

  return {
    status: 200 as const,
    body: {
      message: `Matériel repris en état ${input.etat.toUpperCase()}`,
      item: updated,
    },
  };
}

export async function transferHsTechnicianStockToGeneralStock(input: {
  technicienId: string;
  stockId: string;
}) {
  const item = await prisma.technicianStock.findUnique({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    include: { stock: true, technicien: true },
  });

  if (!item) {
    return { status: 404 as const, body: { error: "Article non trouvé" } };
  }

  if (item.etat !== "hs") {
    return {
      status: 400 as const,
      body: { error: "Seul le matériel HS peut être transféré" },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.technicianStock.delete({
      where: getTechnicianStockWhere(input.technicienId, input.stockId),
    });

    await tx.stock.update({
      where: { id: input.stockId },
      data: { statut: "hs" },
    });

    await tx.stockMovement.create({
      data: {
        stockId: input.stockId,
        type: "hs",
        quantite: -1,
        quantiteAvant: 1,
        quantiteApres: 0,
        reason: `Transféré vers stock HS général depuis véhicule ${item.technicien.nom}`,
        technicienId: input.technicienId,
        performedById: input.technicienId,
      },
    });
  });

  return {
    status: 200 as const,
    body: { message: "Matériel HS transféré vers le stock général" },
  };
}
