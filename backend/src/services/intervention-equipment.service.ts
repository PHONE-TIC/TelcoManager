import { prisma } from "../index";

function buildTechnicianStockWhere(technicienId: string, stockId: string) {
  return {
    technicienId_stockId: {
      technicienId,
      stockId,
    },
  } as const;
}

export async function manageInterventionEquipment(input: {
  interventionId: string;
  stockId?: string;
  action: "install" | "retrait";
  quantite?: number;
  notes?: string;
  etat?: "ok" | "hs";
  nom?: string;
  marque?: string;
  modele?: string;
  serialNumber?: string;
}) {
  const quantite = input.quantite ?? 1;

  if (!input.stockId && !input.nom) {
    return {
      status: 400 as const,
      body: { error: "stockId ou nom du matériel requis" },
    };
  }

  const intervention = await prisma.intervention.findUnique({
    where: { id: input.interventionId },
  });

  if (!intervention) {
    return {
      status: 404 as const,
      body: { error: "Intervention non trouvée" },
    };
  }

  if (input.action === "install") {
    if (!input.stockId) {
      return {
        status: 400 as const,
        body: { error: "stockId requis pour installation" },
      };
    }

    const stock = await prisma.stock.findUnique({ where: { id: input.stockId } });
    if (!stock) {
      return {
        status: 404 as const,
        body: { error: "Article non trouvé" },
      };
    }

    if (!intervention.technicienId) {
      return {
        status: 400 as const,
        body: {
          error:
            "Impossible d'installer : aucun technicien assigné à l'intervention.",
        },
      };
    }

    try {
      const techStock = await prisma.technicianStock.findUnique({
        where: buildTechnicianStockWhere(intervention.technicienId, input.stockId),
      });

      if (!techStock || techStock.quantite < quantite) {
        return {
          status: 400 as const,
          body: {
            error:
              "Stock insuffisant dans le véhicule du technicien. Veuillez effectuer un transfert depuis l'entrepôt.",
          },
        };
      }

      if (techStock.quantite - quantite <= 0) {
        await prisma.technicianStock.delete({
          where: { id: techStock.id },
        });
      } else {
        await prisma.technicianStock.update({
          where: { id: techStock.id },
          data: { quantite: { decrement: quantite } },
        });
      }
    } catch (error) {
      console.warn("Tech stock update error:", error);
      return {
        status: 400 as const,
        body: { error: "Erreur stock technicien" },
      };
    }

    await prisma.clientEquipment.create({
      data: {
        clientId: intervention.clientId,
        stockId: input.stockId,
        referenceMateriel: stock.reference,
        statut: "installe",
        notes: `Installé (Int #${intervention.numero})`,
      },
    });

    await prisma.interventionEquipment.create({
      data: {
        interventionId: input.interventionId,
        stockId: input.stockId,
        action: input.action,
        quantite,
        notes: input.notes,
      },
    });

    return {
      status: 201 as const,
      body: { success: true },
    };
  }

  await prisma.interventionEquipment.create({
    data: {
      interventionId: input.interventionId,
      stockId: input.stockId,
      action: input.action + (input.etat ? `_${input.etat}` : ""),
      quantite,
      notes: input.notes || `Etat: ${input.etat || "Non spécifié"}`,
      nom: input.nom,
      marque: input.marque,
      modele: input.modele,
      serialNumber: input.serialNumber,
    },
  });

  if (input.stockId) {
    const clientEq = await prisma.clientEquipment.findFirst({
      where: {
        clientId: intervention.clientId,
        stockId: input.stockId,
        statut: "installe",
      },
    });

    if (clientEq) {
      await prisma.clientEquipment.update({
        where: { id: clientEq.id },
        data: {
          statut: input.etat === "hs" ? "hs" : "retire",
          notes: `Retiré ${input.etat?.toUpperCase()} (Int #${intervention.numero})`,
        },
      });
    }

    if (intervention.technicienId) {
      await prisma.technicianStock.upsert({
        where: buildTechnicianStockWhere(intervention.technicienId, input.stockId),
        update: {
          quantite: { increment: quantite },
          etat: input.etat === "hs" ? "hs" : "ok",
        },
        create: {
          technicienId: intervention.technicienId,
          stockId: input.stockId,
          quantite,
          etat: input.etat === "hs" ? "hs" : "ok",
        },
      });
    } else if (input.etat === "ok") {
      console.warn("Retrait sans technicien : retour stock central (fallback)");
      await prisma.stock.update({
        where: { id: input.stockId },
        data: { quantite: { increment: quantite } },
      });
    }
  }

  return {
    status: 201 as const,
    body: { success: true },
  };
}
