import { Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth.middleware";
import { buildPagination, parsePagination, respondValidationError } from "./controller.utils";
import { stockClientMiniSelect, stockTechnicienMiniSelect } from "./prisma-selects";
import { generateStockReference, parseSerialNumbers } from "./stock.controller.helpers";

export const getAllStock = async (req: AuthRequest, res: Response) => {
  try {
    const { statut, categorie, search, page = "1", limit = "50" } = req.query;
    const { page: currentPage, limit: pageSize, skip } = parsePagination({
      page: page as string,
      limit: limit as string,
    });

    const where: any = {};

    // If statut is not 'all', filter by status
    if (statut && statut !== "all") {
      where.statut = statut;
      // For 'courant' (available) stock, only show items with quantity > 0
      // This hides items that are fully assigned to technicians/clients
      if (statut === "courant") {
        where.quantite = { gt: 0 };
      }
    }
    if (categorie) where.categorie = categorie;
    if (search) {
      where.OR = [
        {
          nomMateriel: {
            contains: search as string,
            mode: "insensitive" as const,
          },
        },
        {
          reference: {
            contains: search as string,
            mode: "insensitive" as const,
          },
        },
        { codeBarre: { contains: search as string } },
        {
          numeroSerie: {
            contains: search as string,
            mode: "insensitive" as const,
          },
        },
      ];
    }

    // Include relations for 'all' view to show location
    const includeRelations = statut === "all";

    const [stock, total] = await Promise.all([
      prisma.stock.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nomMateriel: "asc" },
        include: includeRelations
          ? {
              technicianStocks: {
                include: {
                  technicien: {
                    select: stockTechnicienMiniSelect,
                  },
                  client: {
                    select: stockClientMiniSelect,
                  },
                },
              },
              clientEquipements: {
                include: {
                  client: {
                    select: stockClientMiniSelect,
                  },
                },
              },
            }
          : undefined,
      }),
      prisma.stock.count({ where }),
    ]);

    res.json({
      stock,
      pagination: {
        ...buildPagination(currentPage, pageSize, total),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du stock:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du stock" });
  }
};

export const getStockById = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;

    const stock = await prisma.stock.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            clientEquipements: true,
            interventionEquipements: true,
          },
        },
        technicianStocks: {
          include: {
            technicien: {
              select: { id: true, nom: true },
            },
            client: {
              select: { id: true, nom: true },
            },
          },
        },
        clientEquipements: {
          include: {
            client: {
              select: { id: true, nom: true },
            },
          },
        },
      },
    });

    if (!stock) {
      return res.status(404).json({ error: "Article non trouvé" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'article:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de l'article" });
  }
};

export const getStockByBarcode = async (req: AuthRequest, res: Response) => {
  try {
    const { codeBarre } = req.params;

    const stock = await prisma.stock.findUnique({
      where: { codeBarre },
    });

    if (!stock) {
      return res.status(404).json({ error: "Article non trouvé" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Erreur lors de la recherche par code-barres:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
};

export const getStockBySerial = async (req: AuthRequest, res: Response) => {
  try {
    const { numeroSerie } = req.params;

    const stock = await prisma.stock.findFirst({
      where: { numeroSerie: { equals: numeroSerie, mode: "insensitive" } },
    });

    if (!stock) {
      return res
        .status(404)
        .json({ error: "Article non trouvé avec ce numéro de série" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Erreur lors de la recherche par numéro de série:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
};

export const createStock = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nomMateriel,
      reference,
      marque,
      modele,
      codeBarre,
      categorie,
      statut = "courant",
      quantite = 1,
      notes,
      numeroSerie,
      fournisseur,
      lowStockThreshold,
    } = req.body;

    // Générer la référence automatiquement si marque et catégorie sont fournis et pas de référence manuelle
    let finalReference = reference;
    if (!reference && marque && categorie) {
      finalReference = await generateStockReference(marque, categorie, modele);
    } else if (!reference) {
      return res.status(400).json({
        error:
          "La marque et la catégorie sont requises pour générer la référence automatiquement, ou fournissez une référence manuellement.",
      });
    }

    // Générer nomMateriel automatiquement si non fourni
    const finalNomMateriel =
      nomMateriel ||
      (modele ? `${marque} ${modele}` : `${marque} ${categorie}`);

    // Parse serial numbers (comma or newline separated)
    const serialNumbers = numeroSerie
      ? String(numeroSerie)
          .split(/[,\n]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : [];

    // Check for duplicate serial numbers in the database (only for non-empty serial numbers)
    const nonEmptySerialNumbers = serialNumbers.filter(
      (sn) => sn && sn.trim() !== ""
    );

    if (nonEmptySerialNumbers.length > 0) {
      const existingItems = await prisma.stock.findMany({
        where: {
          numeroSerie: {
            in: nonEmptySerialNumbers,
          },
        },
        include: {
          technicianStocks: {
            include: {
              technicien: {
                select: { nom: true },
              },
            },
          },
          clientEquipements: {
            include: {
              client: {
                select: { nom: true },
              },
            },
          },
        },
      });

      if (existingItems.length > 0) {
        // Build detailed error message with location info
        // Use type assertion to handle Prisma include types
        const duplicates = (existingItems as any[]).map((item) => {
          let location = "Stock principal";

          // Check if assigned to a technician (with null safety)
          if (item.technicianStocks && item.technicianStocks.length > 0) {
            const techStock = item.technicianStocks[0];
            if (techStock.technicien) {
              location = `Véhicule de ${
                techStock.technicien.nom || "Technicien"
              }`;
            }
          }

          // Check if assigned to a client (with null safety)
          if (item.clientEquipements && item.clientEquipements.length > 0) {
            const clientEquip = item.clientEquipements[0];
            if (clientEquip.client) {
              location = `Client: ${clientEquip.client.nom || "Inconnu"}`;
            }
          }

          return {
            numeroSerie: item.numeroSerie,
            reference: item.reference,
            nomMateriel: item.nomMateriel,
            location,
          };
        });

        const duplicateSerials = duplicates
          .map((d) => d.numeroSerie)
          .join(", ");
        const duplicateDetails = duplicates
          .map((d) => `• ${d.numeroSerie} (${d.nomMateriel}) - ${d.location}`)
          .join("\n");

        return res.status(409).json({
          error: `Numéro(s) de série déjà enregistré(s) : ${duplicateSerials}`,
          duplicates,
          details: duplicateDetails,
        });
      }
    }

    // If multiple serial numbers, create individual entries
    if (serialNumbers.length > 1) {
      // Générer des références uniques pour chaque article si nécessaire
      const createdItems = [];
      for (let i = 0; i < serialNumbers.length; i++) {
        const sn = serialNumbers[i];
        let itemRef = finalReference;
        // Si on génère automatiquement, incrémenter pour chaque article
        if (!reference && marque && categorie && i > 0) {
          itemRef = await generateStockReference(marque, categorie, modele);
        }
        const item = await prisma.stock.create({
          data: {
            nomMateriel: finalNomMateriel,
            marque,
            modele,
            reference: itemRef,
            codeBarre: null, // Can't have duplicate barcodes
            categorie,
            statut,
            quantite: 1, // Each serial number = 1 unit
            notes,
            numeroSerie: sn,
            fournisseur,
            lowStockThreshold,
          },
        });
        createdItems.push(item);
      }
      return res
        .status(201)
        .json({ created: createdItems.length, items: createdItems });
    }

    // Single or no serial number - default behavior
    const stock = await prisma.stock.create({
      data: {
        nomMateriel: finalNomMateriel,
        marque,
        modele,
        reference: finalReference,
        codeBarre: codeBarre?.trim() || null,
        categorie,
        statut,
        quantite,
        notes,
        numeroSerie: serialNumbers[0] || "",
        fournisseur,
        lowStockThreshold,
      },
    });

    res.status(201).json(stock);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Code-barres déjà utilisé" });
    }
    console.error("Erreur lors de la création de l'article:", error);
    res.status(500).json({ error: "Erreur lors de la création de l'article" });
  }
};

export const updateStock = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      nomMateriel,
      reference,
      marque,
      modele,
      codeBarre,
      categorie,
      statut,
      quantite,
      notes,
      numeroSerie,
      fournisseur,
      lowStockThreshold,
    } = req.body;

    const data: any = {
      ...(nomMateriel && { nomMateriel }),
      ...(reference && { reference }),
      ...(marque !== undefined && { marque }),
      ...(modele !== undefined && { modele }),
      ...(codeBarre !== undefined && { codeBarre: codeBarre?.trim() || null }),
      ...(categorie && { categorie }),
      ...(statut && { statut }),
      ...(quantite !== undefined && { quantite }),
      ...(notes !== undefined && { notes }),
      ...(numeroSerie !== undefined && { numeroSerie }),
      ...(fournisseur !== undefined && { fournisseur }),
      ...(lowStockThreshold !== undefined && { lowStockThreshold }),
    };

    const stock = await prisma.stock.update({
      where: { id },
      data,
    });

    res.json(stock);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Article non trouvé" });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Code-barres déjà utilisé" });
    }
    console.error("Erreur lors de la mise à jour de l'article:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour de l'article" });
  }
};

export const deleteStock = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    await prisma.stock.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Article non trouvé" });
    }
    // Foreign key constraint violation
    if (error.code === "P2003") {
      return res.status(409).json({
        error:
          "Impossible de supprimer cet article car il est lié à des interventions ou des équipements clients.",
      });
    }
    console.error("Erreur lors de la suppression de l'article:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la suppression de l'article" });
  }
};

export const moveToHS = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantite, notes } = req.body;

    const stockCourant = await prisma.stock.findUnique({
      where: { id },
    });

    if (!stockCourant) {
      return res.status(404).json({ error: "Article non trouvé" });
    }

    if (stockCourant.statut !== "courant") {
      return res
        .status(400)
        .json({ error: "Cet article n'est pas en stock courant" });
    }

    const qteADeplacer = quantite || stockCourant.quantite;

    if (qteADeplacer > stockCourant.quantite) {
      return res.status(400).json({ error: "Quantité insuffisante en stock" });
    }

    // Diminuer le stock courant
    await prisma.stock.update({
      where: { id },
      data: {
        quantite: stockCourant.quantite - qteADeplacer,
      },
    });

    // Créer ou mettre à jour le stock HS
    const stockHS = await prisma.stock.findFirst({
      where: {
        reference: stockCourant.reference,
        statut: "hs",
      },
    });

    if (stockHS) {
      await prisma.stock.update({
        where: { id: stockHS.id },
        data: {
          quantite: stockHS.quantite + qteADeplacer,
          notes: notes || stockHS.notes,
        },
      });
    } else {
      await prisma.stock.create({
        data: {
          nomMateriel: stockCourant.nomMateriel,
          reference: stockCourant.reference,
          categorie: stockCourant.categorie,
          statut: "hs",
          quantite: qteADeplacer,
          notes: notes || "Matériel hors service",
        },
      });
    }

    res.json({
      message: `${qteADeplacer} unité(s) déplacée(s) vers le stock HS`,
    });
  } catch (error) {
    console.error("Erreur lors du déplacement vers HS:", error);
    res.status(500).json({ error: "Erreur lors du déplacement" });
  }
};

export const getStockStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalCourant, totalHS, categories, stockFaible] = await Promise.all([
      prisma.stock.aggregate({
        where: { statut: "courant" },
        _sum: { quantite: true },
        _count: true,
      }),
      prisma.stock.aggregate({
        where: { statut: "hs" },
        _sum: { quantite: true },
        _count: true,
      }),
      prisma.stock.groupBy({
        by: ["categorie"],
        _sum: { quantite: true },
        _count: true,
      }),
      prisma.stock.findMany({
        where: {
          statut: "courant",
          quantite: { lte: 5 },
        },
        orderBy: { quantite: "asc" },
        take: 10,
      }),
    ]);

    res.json({
      stockCourant: {
        totalArticles: totalCourant._count,
        totalQuantite: totalCourant._sum.quantite || 0,
      },
      stockHS: {
        totalArticles: totalHS._count,
        totalQuantite: totalHS._sum.quantite || 0,
      },
      parCategorie: categories.map((cat) => ({
        categorie: cat.categorie,
        articles: cat._count,
        quantite: cat._sum.quantite || 0,
      })),
      stockFaible,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des statistiques" });
  }
};
