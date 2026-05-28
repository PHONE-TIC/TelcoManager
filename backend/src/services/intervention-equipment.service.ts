import { prisma } from "../db";
import { generateStockReference } from "../controllers/stock.controller.helpers";

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
  reference?: string;
  categorie?: string;
  fournisseur?: string;
  dryRun?: boolean;
}) {
  const quantite = input.quantite ?? 1;
  if (!Number.isInteger(quantite) || quantite <= 0) {
    return {
      status: 400 as const,
      body: { error: "Quantité invalide" },
    };
  }

  if (!input.stockId && !input.nom && !input.marque && !input.modele) {
    return {
      status: 400 as const,
      body: { error: "stockId, nom, ou marque/modèle du matériel requis" },
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

  // Si aucun stockId n'est fourni mais qu'on a la marque et le modèle,
  // on recherche si l'équipement existe déjà dans le catalogue (insensible à la casse).
  if (!input.stockId && input.marque && input.modele && !input.serialNumber) {
    const existingStock = await prisma.stock.findFirst({
      where: {
        marque: { equals: input.marque, mode: "insensitive" },
        modele: { equals: input.modele, mode: "insensitive" },
      },
    });
    if (existingStock) {
      input.stockId = existingStock.id;
      if (!input.nom) {
        input.nom = existingStock.nomMateriel;
      }
    }
  }

  // Règles de validation strictes pour le retrait
  if (input.action === "retrait") {
    let resolvedStockId: string | undefined = undefined;

    if (input.serialNumber) {
      const trimmedSerial = input.serialNumber.trim();
      if (trimmedSerial.length > 0) {
        const existing = await prisma.stock.findFirst({
          where: {
            numeroSerie: {
              equals: trimmedSerial,
              mode: "insensitive",
            },
          },
        });
        if (existing) {
          resolvedStockId = existing.id;
        }
      }
    }

    if (!resolvedStockId && input.stockId) {
      const existing = await prisma.stock.findUnique({
        where: { id: input.stockId },
      });
      if (existing) {
        resolvedStockId = existing.id;
      }
    }

    if (resolvedStockId) {
      // Le matériel est connu dans le système, on doit vérifier s'il est installé chez ce client
      const clientEq = await prisma.clientEquipment.findFirst({
        where: {
          clientId: intervention.clientId,
          stockId: resolvedStockId,
          statut: "installe",
        },
      });

      if (!clientEq) {
        return {
          status: 400 as const,
          body: {
            error: "Impossible de retirer ce matériel : ce matériel existe déjà dans le système mais n'est pas installé chez ce client.",
          },
        };
      }

      // Si trouvé, on s'assure qu'on utilise le bon stockId pour continuer
      input.stockId = resolvedStockId;
    }

    if (input.dryRun) {
      return {
        status: 200 as const,
        body: { success: true, stockId: input.stockId || resolvedStockId },
      };
    }
  }

  // =====================================================
  // INSTALLATION — stock vehicle decrement, client install
  // =====================================================
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

    if (stock.statut === "hs") {
      return {
        status: 400 as const,
        body: { error: "Impossible d'installer : ce matériel est noté Hors Service (HS)." },
      };
    }

    if (!intervention.technicienId) {
      return {
        status: 400 as const,
        body: {
          error: "Impossible d'installer : aucun technicien assigné à l'intervention.",
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
            error: "Stock insuffisant dans le véhicule du technicien. Veuillez effectuer un transfert depuis l'entrepôt.",
          },
        };
      }

      if (input.dryRun) {
        return {
          status: 200 as const,
          body: { success: true },
        };
      }

      // Mutation transactionnelle
      return await prisma.$transaction(async (tx) => {
        if (techStock.quantite - quantite <= 0) {
          await tx.technicianStock.delete({
            where: { id: techStock.id },
          });
        } else {
          await tx.technicianStock.update({
            where: { id: techStock.id },
            data: { quantite: { decrement: quantite } },
          });
        }

        await tx.clientEquipment.create({
          data: {
            clientId: intervention.clientId,
            stockId: input.stockId!,
            referenceMateriel: stock.reference,
            statut: "installe",
            notes: `Installé (Int #${intervention.numero})`,
          },
        });

        await tx.interventionEquipment.create({
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
      });
    } catch (error) {
      console.warn("Tech stock update error:", error);
      return {
        status: 400 as const,
        body: { error: "Erreur stock technicien" },
      };
    }
  }

  // =====================================================
  // RETRAIT — free-text entry (no stockId from catalogue)
  // =====================================================
  if (!input.stockId) {
    const nomMateriel =
      input.nom ||
      [input.marque, input.modele].filter(Boolean).join(" ") ||
      "Matériel récupéré";

    let reference = input.reference;
    if (!reference && input.marque && input.categorie) {
      reference = await generateStockReference(input.marque, input.categorie, input.modele);
    } else if (!reference) {
      reference = `RETRAIT-${Date.now()}`;
    }

    const isHs = input.etat === "hs";

    // Mutation transactionnelle
    return await prisma.$transaction(async (tx) => {
      const newStock = await tx.stock.create({
        data: {
          nomMateriel,
          marque: input.marque,
          modele: input.modele,
          reference,
          numeroSerie: input.serialNumber || "",
          categorie: input.categorie || "Retrait technicien",
          fournisseur: input.fournisseur || null,
          quantite: 0,
          statut: isHs ? "hs" : "courant",
          notes: `Repris lors de l'intervention #${intervention.numero}${input.notes ? " — " + input.notes : ""}`,
        },
      });

      if (intervention.technicienId) {
        await tx.technicianStock.upsert({
          where: buildTechnicianStockWhere(intervention.technicienId, newStock.id),
          update: {
            quantite: { increment: quantite },
            etat: isHs ? "hs" : "ok",
          },
          create: {
            technicienId: intervention.technicienId,
            stockId: newStock.id,
            quantite,
            etat: isHs ? "hs" : "ok",
          },
        });
      }

      await tx.interventionEquipment.create({
        data: {
          interventionId: input.interventionId,
          stockId: newStock.id,
          action: "retrait" + (input.etat ? `_${input.etat}` : ""),
          quantite,
          notes: input.notes || `Etat: ${input.etat || "Non spécifié"}`,
          nom: nomMateriel,
          marque: input.marque,
          modele: input.modele,
          serialNumber: input.serialNumber,
        },
      });

      return {
        status: 201 as const,
        body: { success: true, newStockId: newStock.id },
      };
    });
  }

  // =====================================================
  // RETRAIT — known stockId from catalogue
  // =====================================================
  return await prisma.$transaction(async (tx) => {
    await tx.interventionEquipment.create({
      data: {
        interventionId: input.interventionId,
        stockId: input.stockId!,
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
      const clientEq = await tx.clientEquipment.findFirst({
        where: {
          clientId: intervention.clientId,
          stockId: input.stockId,
          statut: "installe",
        },
      });

      if (clientEq) {
        await tx.clientEquipment.update({
          where: { id: clientEq.id },
          data: {
            statut: input.etat === "hs" ? "hs" : "retire",
            notes: `Retiré ${input.etat?.toUpperCase()} (Int #${intervention.numero})`,
          },
        });
      }

      if (intervention.technicienId) {
        await tx.technicianStock.upsert({
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
        await tx.stock.update({
          where: { id: input.stockId },
          data: { quantite: { increment: quantite } },
        });
      }
    }

    return {
      status: 201 as const,
      body: { success: true },
    };
  });
}
