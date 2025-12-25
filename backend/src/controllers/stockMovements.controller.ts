import { Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth.middleware";

// Get movements for a specific stock item
export const getStockMovements = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const movements = await prisma.stockMovement.findMany({
      where: { stockId: id },
      include: {
        performedBy: {
          select: { id: true, nom: true, username: true },
        },
        technicien: {
          select: { id: true, nom: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.stockMovement.count({
      where: { stockId: id },
    });

    res.json({
      movements,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error("Erreur récupération mouvements stock:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Get all movements (for dashboard/reports)
export const getAllMovements = async (req: AuthRequest, res: Response) => {
  try {
    const {
      limit = 100,
      offset = 0,
      type,
      stockId,
      startDate,
      endDate,
    } = req.query;

    const where: any = {};

    if (type) where.type = type;
    if (stockId) where.stockId = stockId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        stock: {
          select: {
            id: true,
            nomMateriel: true,
            reference: true,
            categorie: true,
          },
        },
        performedBy: {
          select: { id: true, nom: true, username: true },
        },
        technicien: {
          select: { id: true, nom: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.stockMovement.count({ where });

    res.json({
      movements,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error("Erreur récupération tous mouvements:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Create a stock movement (internal helper, also exported for use in other controllers)
export const createMovement = async (data: {
  stockId: string;
  type: "entree" | "sortie" | "transfert" | "ajustement" | "hs" | "creation";
  quantite: number;
  quantiteAvant: number;
  quantiteApres: number;
  reason?: string;
  technicienId?: string;
  performedById: string;
}) => {
  return prisma.stockMovement.create({
    data: {
      stockId: data.stockId,
      type: data.type,
      quantite: data.quantite,
      quantiteAvant: data.quantiteAvant,
      quantiteApres: data.quantiteApres,
      reason: data.reason,
      technicienId: data.technicienId,
      performedById: data.performedById,
    },
  });
};

// Transfer stock to technician
export const transferToTechnician = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // stock ID
    const { technicienId, quantite, reason } = req.body;
    const performedById = req.user!.id;

    if (!technicienId || !quantite || quantite <= 0) {
      return res.status(400).json({ error: "Technicien et quantité requis" });
    }

    // Get current stock
    const stock = await prisma.stock.findUnique({ where: { id } });
    if (!stock) {
      return res.status(404).json({ error: "Article non trouvé" });
    }

    if (stock.quantite < quantite) {
      return res.status(400).json({ error: "Quantité insuffisante en stock" });
    }

    // Execute transfer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Decrease central stock
      const updatedStock = await tx.stock.update({
        where: { id },
        data: { quantite: stock.quantite - quantite },
      });

      // Increase technician stock (upsert)
      await tx.technicianStock.upsert({
        where: {
          technicienId_stockId: {
            technicienId,
            stockId: id,
          },
        },
        update: {
          quantite: { increment: quantite },
        },
        create: {
          technicienId,
          stockId: id,
          quantite,
        },
      });

      // Log movement
      const movement = await tx.stockMovement.create({
        data: {
          stockId: id,
          type: "transfert",
          quantite: -quantite,
          quantiteAvant: stock.quantite,
          quantiteApres: stock.quantite - quantite,
          reason: reason || `Transfert vers technicien`,
          technicienId,
          performedById,
        },
      });

      return { updatedStock, movement };
    });

    res.json({
      message: "Transfert effectué avec succès",
      stock: result.updatedStock,
      movement: result.movement,
    });
  } catch (error) {
    console.error("Erreur transfert stock:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Bulk import stock items
export const bulkImportStock = async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;
    const performedById = req.user!.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Liste d'articles requise" });
    }

    const results = {
      created: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // Validate required fields
        if (!item.nomMateriel || !item.reference || !item.categorie) {
          results.errors.push({
            row: i + 1,
            error:
              "Champs requis manquants (nomMateriel, reference, categorie)",
          });
          continue;
        }

        // Create stock item
        const stock = await prisma.stock.create({
          data: {
            nomMateriel: item.nomMateriel,
            reference: item.reference,
            numeroSerie: item.numeroSerie || "",
            codeBarre: item.codeBarre || null,
            categorie: item.categorie,
            fournisseur: item.fournisseur || null,
            quantite: Number(item.quantite) || 1,
            lowStockThreshold: Number(item.lowStockThreshold) || 5,
            notes: item.notes || null,
          },
        });

        // Log creation movement
        await prisma.stockMovement.create({
          data: {
            stockId: stock.id,
            type: "creation",
            quantite: stock.quantite,
            quantiteAvant: 0,
            quantiteApres: stock.quantite,
            reason: "Import CSV",
            performedById,
          },
        });

        results.created++;
      } catch (err: any) {
        results.errors.push({
          row: i + 1,
          error: err.message || "Erreur inconnue",
        });
      }
    }

    res.json({
      message: `Import terminé: ${results.created} articles créés`,
      ...results,
    });
  } catch (error) {
    console.error("Erreur import stock:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Bulk transfer stock
export const bulkTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const { sourceType, sourceId, destType, destId, items } = req.body;
    const performedById = req.user!.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Liste d'articles requise" });
    }

    // Validate types
    if (
      !["warehouse", "technician"].includes(sourceType) ||
      !["warehouse", "technician"].includes(destType)
    ) {
      return res
        .status(400)
        .json({ error: "Type de source ou destination invalide" });
    }
    if (sourceType === destType && sourceType === "warehouse") {
      return res
        .status(400)
        .json({ error: "Transfert Entrepôt vers Entrepôt inutile" });
    }
    if (sourceType === "technician" && !sourceId)
      return res.status(400).json({ error: "Source ID requis" });
    if (destType === "technician" && !destId)
      return res.status(400).json({ error: "Destination ID requis" });

    const results = await prisma.$transaction(async (tx) => {
      const movements = [];

      for (const item of items) {
        const { stockId, quantite, status } = item; // status: 'ok' | 'hs'
        const qty = Number(quantite);
        const itemStatus = status || "ok";

        // Logic based on types
        if (sourceType === "warehouse" && destType === "technician") {
          // Warehouse -> Tech
          const stock = await tx.stock.findUnique({ where: { id: stockId } });
          if (!stock || stock.quantite < qty)
            throw new Error(
              `Stock insuffisant pour l'article ${
                stock ? stock.nomMateriel : stockId
              }`
            );

          await tx.stock.update({
            where: { id: stockId },
            data: { quantite: { decrement: qty } },
          });
          await tx.technicianStock.upsert({
            where: { technicienId_stockId: { technicienId: destId, stockId } },
            update: { quantite: { increment: qty } },
            create: { technicienId: destId, stockId, quantite: qty },
          });

          movements.push({
            stockId,
            type: "transfert",
            quantite: -qty,
            quantiteAvant: stock.quantite,
            quantiteApres: stock.quantite - qty,
            reason: `Transfert Entrepôt -> Technicien`,
            technicienId: destId,
            performedById,
          });
        } else if (sourceType === "technician" && destType === "warehouse") {
          // Tech -> Warehouse (Return)
          const techStock = await tx.technicianStock.findUnique({
            where: {
              technicienId_stockId: { technicienId: sourceId, stockId },
            },
          });
          if (!techStock || techStock.quantite < qty)
            throw new Error(
              `Stock technicien insuffisant pour l'article ${stockId}`
            );

          // Strictly enforce status based on source state
          const finalStatus = techStock.etat || "ok";

          // Calculate new quantity
          const newQty = techStock.quantite - qty;

          if (newQty <= 0) {
            // Remove completely
            await tx.technicianStock.delete({
              where: {
                technicienId_stockId: { technicienId: sourceId, stockId },
              },
            });
          } else {
            // Decrement
            await tx.technicianStock.update({
              where: {
                technicienId_stockId: { technicienId: sourceId, stockId },
              },
              data: { quantite: newQty },
            });
          }

          // Handle Destination Stock (OK vs HS)
          if (finalStatus === "hs") {
            const currentStock = await tx.stock.findUnique({
              where: { id: stockId },
            });
            if (!currentStock)
              throw new Error("Article original non trouvé en base");

            if (currentStock.numeroSerie) {
              await tx.stock.update({
                where: { id: stockId },
                data: {
                  quantite: { increment: qty },
                  statut: "hs",
                },
              });

              movements.push({
                stockId,
                type: "hs",
                quantite: qty,
                quantiteAvant: currentStock.quantite,
                quantiteApres: currentStock.quantite + qty,
                reason: `Retour Technicien (HS)`,
                technicienId: sourceId,
                performedById,
              });
            } else {
              let hsStock = await tx.stock.findFirst({
                where: {
                  reference: currentStock.reference,
                  statut: "hs",
                  nomMateriel: currentStock.nomMateriel,
                },
              });

              if (!hsStock) {
                hsStock = await tx.stock.create({
                  data: {
                    nomMateriel: currentStock.nomMateriel,
                    reference: currentStock.reference,
                    categorie: currentStock.categorie,
                    statut: "hs",
                    quantite: 0,
                    codeBarre: null,
                    lowStockThreshold: 0,
                  },
                });
              }

              await tx.stock.update({
                where: { id: hsStock.id },
                data: { quantite: { increment: qty } },
              });

              movements.push({
                stockId: hsStock.id,
                type: "hs",
                quantite: qty,
                quantiteAvant: hsStock.quantite,
                quantiteApres: hsStock.quantite + qty,
                reason: `Retour Technicien (HS) - Origine: ${stockId}`,
                technicienId: sourceId,
                performedById,
              });
            }
          } else {
            // Return OK
            const stock = await tx.stock.update({
              where: { id: stockId },
              data: { quantite: { increment: qty } },
            });

            movements.push({
              stockId,
              type: "transfert",
              quantite: qty,
              quantiteAvant: stock.quantite - qty,
              quantiteApres: stock.quantite,
              reason: `Transfert Technicien -> Entrepôt`,
              technicienId: sourceId,
              performedById,
            });
          }
        } else if (sourceType === "technician" && destType === "technician") {
          // Tech -> Tech
          const techStock = await tx.technicianStock.findUnique({
            where: {
              technicienId_stockId: { technicienId: sourceId, stockId },
            },
          });
          if (!techStock || techStock.quantite < qty)
            throw new Error(
              `Stock technicien insuffisant pour l'article ${stockId}`
            );

          const newQty = techStock.quantite - qty;

          if (newQty <= 0) {
            await tx.technicianStock.delete({
              where: {
                technicienId_stockId: { technicienId: sourceId, stockId },
              },
            });
          } else {
            await tx.technicianStock.update({
              where: {
                technicienId_stockId: { technicienId: sourceId, stockId },
              },
              data: { quantite: newQty },
            });
          }

          await tx.technicianStock.upsert({
            where: { technicienId_stockId: { technicienId: destId, stockId } },
            update: { quantite: { increment: qty } },
            create: { technicienId: destId, stockId, quantite: qty },
          });

          // For Tech->Tech, central stock doesn't change.
          const stock = await tx.stock.findUnique({ where: { id: stockId } });
          movements.push({
            stockId,
            type: "transfert",
            quantite: 0,
            quantiteAvant: stock?.quantite || 0,
            quantiteApres: stock?.quantite || 0,
            reason: `Transfert Technicien -> Technicien`,
            technicienId: destId, // destination tech
            performedById,
          });
        }
      }

      // Batch create movements
      if (movements.length > 0) {
        await tx.stockMovement.createMany({ data: movements });
      }

      return movements;
    });

    res.json({
      message: "Transfert effectué avec succès",
      count: results.length,
    });
  } catch (error: any) {
    console.error("Erreur bulk transfer:", error);
    res
      .status(500)
      .json({ error: error.message || "Erreur lors du transfert" });
  }
};
